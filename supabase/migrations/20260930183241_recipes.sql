-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 18 · Recetario y "pasar el menú a la compra" (menú, fase 2)
--
--   recipes ──< recipe_ingredients           el recetario de cada hogar
--      ▲
--      └── meal_plan_entries.recipe_id       un plato del menú puede ser una receta
--
--   · Una receta y sus ingredientes se guardan juntos con save_recipe (todo o
--     nada). Los ingredientes no se escriben sueltos desde la app.
--   · No puede haber dos recetas con el mismo nombre en un hogar (sin contar
--     mayúsculas ni espacios), así el menú puede enlazar un plato escrito a mano
--     con su receta.
--   · Si se renombra una receta, los platos del menú que la usan cambian con
--     ella. Si se borra, los platos se quedan, pero sin receta.
--   · add_meals_to_shopping mete en la lista de la compra los ingredientes de
--     los platos de unas fechas, juntando repetidos y saltándose lo que ya está
--     pendiente en la lista.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Tablas ─────────────────────────────────────────────────────────────────
create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  notes       text check (char_length(notes) <= 2000),
  created_by  uuid default auth.uid() references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, house_id)
);

create unique index recipes_house_title_key on public.recipes (house_id, lower(btrim(title)));
create index recipes_created_by_idx on public.recipes (created_by);

create table public.recipe_ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null,
  house_id    uuid not null references public.houses (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  quantity    text check (char_length(btrim(quantity)) between 1 and 30),
  position    smallint not null default 0,
  constraint recipe_ingredients_recipe_same_house foreign key (recipe_id, house_id)
    references public.recipes (id, house_id) on delete cascade
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, house_id, position);
create index recipe_ingredients_house_idx  on public.recipe_ingredients (house_id);

alter table public.meal_plan_entries
  add column recipe_id uuid,
  add constraint meal_plan_recipe_same_house foreign key (recipe_id, house_id)
    references public.recipes (id, house_id) on delete set null (recipe_id);

create index meal_plan_entries_recipe_idx on public.meal_plan_entries (recipe_id, house_id);

create trigger recipes_updated_at before update on public.recipes
  for each row execute function private.set_updated_at();

-- Renombrar una receta renombra sus platos del menú.
create or replace function private.sync_meal_titles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.meal_plan_entries
     set title = new.title
   where recipe_id = new.id
     and house_id = new.house_id
     and title is distinct from new.title;
  return null;
end;
$$;

create trigger recipes_sync_meal_titles
  after update of title on public.recipes
  for each row execute function private.sync_meal_titles();

-- ─── Privilegios y RLS ──────────────────────────────────────────────────────
-- Desde 17 las tablas nuevas nacen sin privilegios: aquí va todo lo que hay.
grant select, insert (house_id, title, notes, created_by), update (title, notes), delete
  on public.recipes to authenticated;
grant select, insert (recipe_id, house_id, name, quantity, position), delete
  on public.recipe_ingredients to authenticated;
grant insert (recipe_id), update (recipe_id)
  on public.meal_plan_entries to authenticated;

alter table public.recipes            enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy recipes_select on public.recipes for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy recipes_insert on public.recipes for insert to authenticated
  with check (
    house_id in (select private.user_house_ids())
    and created_by = (select auth.uid())
  );
create policy recipes_update on public.recipes for update to authenticated
  using (house_id in (select private.user_house_ids()))
  with check (house_id in (select private.user_house_ids()));
create policy recipes_delete on public.recipes for delete to authenticated
  using (house_id in (select private.user_house_ids()));

-- La FK compuesta ya garantiza que house_id es el de la receta.
create policy recipe_ingredients_select on public.recipe_ingredients for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy recipe_ingredients_insert on public.recipe_ingredients for insert to authenticated
  with check (house_id in (select private.user_house_ids()));
create policy recipe_ingredients_delete on public.recipe_ingredients for delete to authenticated
  using (house_id in (select private.user_house_ids()));

-- ─── Tiempo real ────────────────────────────────────────────────────────────
-- Basta con recipes: save_recipe siempre toca la fila de la receta, también
-- cuando solo cambian los ingredientes.
create trigger recipes_broadcast
  after insert or update or delete on public.recipes
  for each row execute function private.broadcast_house_change();

-- ─── RPC: guardar una receta con sus ingredientes ───────────────────────────
-- p_recipe_id null = receta nueva. p_ingredients = [{"name": "…", "quantity": "…"}, …]
-- en el orden en que se ven; los que no tienen nombre se ignoran.
create or replace function public.save_recipe(
  p_house_id    uuid,
  p_recipe_id   uuid,
  p_title       text,
  p_notes       text,
  p_ingredients jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_title       text := btrim(p_title);
  v_notes       text := nullif(btrim(p_notes), '');
  v_ingredients jsonb := case when jsonb_typeof(p_ingredients) = 'array' then p_ingredients else '[]'::jsonb end;
  v_id          uuid;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;

  if v_title is null or char_length(v_title) not between 1 and 120 then
    raise exception 'El nombre de la receta debe tener entre 1 y 120 caracteres.' using errcode = 'HM040';
  end if;

  if jsonb_array_length(v_ingredients) > 50 then
    raise exception 'Una receta puede tener como mucho 50 ingredientes.' using errcode = 'HM043';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_ingredients) i
    where char_length(btrim(i->>'name')) > 80 or char_length(btrim(i->>'quantity')) > 30
  ) then
    raise exception 'Cada ingrediente puede tener hasta 80 caracteres, y su cantidad hasta 30.' using errcode = 'HM044';
  end if;

  begin
    if p_recipe_id is null then
      insert into public.recipes (house_id, title, notes, created_by)
      values (p_house_id, v_title, v_notes, auth.uid())
      returning id into v_id;
    else
      -- Siempre se actualiza la fila (aunque no cambie nada) para que el resto
      -- del piso reciba el aviso en tiempo real.
      update public.recipes
         set title = v_title, notes = v_notes
       where id = p_recipe_id and house_id = p_house_id
      returning id into v_id;

      if v_id is null then
        raise exception 'Esta receta ya no existe.' using errcode = 'HM041';
      end if;

      delete from public.recipe_ingredients where recipe_id = v_id and house_id = p_house_id;
    end if;
  exception when unique_violation then
    raise exception 'Ya hay una receta que se llama "%".', v_title using errcode = 'HM042';
  end;

  insert into public.recipe_ingredients (recipe_id, house_id, name, quantity, position)
  select v_id, p_house_id, btrim(x.i->>'name'), nullif(btrim(x.i->>'quantity'), ''), (x.ord - 1)::smallint
  from jsonb_array_elements(v_ingredients) with ordinality as x (i, ord)
  where nullif(btrim(x.i->>'name'), '') is not null;

  return v_id;
end;
$$;

-- ─── RPC: pasar los ingredientes del menú a la lista de la compra ───────────
-- Junta los ingredientes de los platos con receta entre p_from y p_to. Si uno
-- se repite, va una sola vez con las cantidades sumadas en texto: "Tomate
-- (2 + 500 g)". Lo que ya está pendiente en la lista (mismo nombre, sin contar
-- mayúsculas ni lo que va entre paréntesis) no se vuelve a añadir.
create or replace function public.add_meals_to_shopping(p_house_id uuid, p_from date, p_to date)
returns table (added integer, already_listed integer)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;

  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 31 then
    raise exception 'Las fechas no son válidas.' using errcode = 'HM045';
  end if;

  return query
  with wanted as (
    select
      lower(btrim(ri.name))                                        as key,
      min(btrim(ri.name))                                          as name,
      string_agg(ri.quantity, ' + ' order by e.date, e.slot, ri.position) as quantity
    from public.meal_plan_entries e
    join public.recipe_ingredients ri
      on ri.recipe_id = e.recipe_id and ri.house_id = e.house_id
    where e.house_id = p_house_id
      and e.date between p_from and p_to
    group by 1
  ),
  pending as (
    select lower(btrim(regexp_replace(s.title, '\s*\(.*\)\s*$', ''))) as key
    from public.shopping_items s
    where s.house_id = p_house_id and not s.is_purchased
  ),
  inserted as (
    insert into public.shopping_items (house_id, title, added_by)
    select p_house_id, left(w.name || coalesce(' (' || w.quantity || ')', ''), 120), auth.uid()
    from wanted w
    where not exists (select 1 from pending p where p.key = w.key)
    order by w.name
    returning 1
  )
  select
    (select count(*) from inserted)::integer,
    ((select count(*) from wanted) - (select count(*) from inserted))::integer;
end;
$$;

revoke all on function public.save_recipe(uuid, uuid, text, text, jsonb)     from public, anon;
revoke all on function public.add_meals_to_shopping(uuid, date, date)       from public, anon;
grant execute on function public.save_recipe(uuid, uuid, text, text, jsonb)  to authenticated;
grant execute on function public.add_meals_to_shopping(uuid, date, date)    to authenticated;
