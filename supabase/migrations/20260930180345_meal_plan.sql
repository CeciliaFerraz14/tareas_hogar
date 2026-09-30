-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 15 · Menú semanal (fase 1)
--
-- Un menú común por hogar: cada día tiene dos huecos, comida y cena, y en cada
-- uno cabe un plato (texto libre) y, si se quiere, quién cocina.
--
--   · unique (house_id, date, slot) → un solo plato por hueco. Si dos personas
--     lo rellenan a la vez, la segunda recibe un error y la app recarga.
--   · cook_id → FK compuesta a house_members, como tasks.assigned_to: solo se
--     puede elegir a alguien del hogar y, si se va, el plato queda sin cocinero.
--   · Tiempo real por Broadcast (trigger broadcast_house_change, ver 08).
--   · my_house_summaries devuelve también la comida y la cena de hoy para Inicio.
-- ════════════════════════════════════════════════════════════════════════════

create table public.meal_plan_entries (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses (id) on delete cascade,
  date        date not null,
  slot        text not null check (slot in ('lunch', 'dinner')),
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  cook_id     uuid,
  created_by  uuid default auth.uid() references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (house_id, date, slot),
  constraint meal_plan_cook_is_member foreign key (house_id, cook_id)
    references public.house_members (house_id, user_id) on delete set null (cook_id)
);

-- El unique (house_id, date, slot) ya sirve para "el menú de esta semana".
create index meal_plan_entries_cook_idx       on public.meal_plan_entries (house_id, cook_id);
create index meal_plan_entries_created_by_idx on public.meal_plan_entries (created_by);

create trigger meal_plan_entries_updated_at before update on public.meal_plan_entries
  for each row execute function private.set_updated_at();

-- ─── Privilegios y RLS ──────────────────────────────────────────────────────
-- Cambiar un plato de día u hueco = borrarlo y crearlo otra vez, así que
-- date y slot no se pueden actualizar.
grant select,
      insert (house_id, date, slot, title, cook_id, created_by),
      update (title, cook_id),
      delete                                                        on public.meal_plan_entries to authenticated;

alter table public.meal_plan_entries enable row level security;

create policy meal_plan_entries_select on public.meal_plan_entries for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy meal_plan_entries_insert on public.meal_plan_entries for insert to authenticated
  with check (
    house_id in (select private.user_house_ids())
    and created_by = (select auth.uid())
  );
create policy meal_plan_entries_update on public.meal_plan_entries for update to authenticated
  using (house_id in (select private.user_house_ids()))
  with check (house_id in (select private.user_house_ids()));
create policy meal_plan_entries_delete on public.meal_plan_entries for delete to authenticated
  using (house_id in (select private.user_house_ids()));

-- ─── Tiempo real ────────────────────────────────────────────────────────────
create trigger meal_plan_entries_broadcast
  after insert or update or delete on public.meal_plan_entries
  for each row execute function private.broadcast_house_change();

-- ─── Resumen de Inicio: + comida y cena de hoy ──────────────────────────────
-- Cambia el tipo que devuelve, y eso no se puede hacer con create or replace.
drop function public.my_house_summaries(date);

create function public.my_house_summaries(p_today date)
returns table (
  house_id            uuid,
  tasks_today_pending integer,
  shopping_pending    integer,
  unread_messages     integer,
  lunch_today         text,
  dinner_today        text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    me.house_id,

    -- Tareas de hoy sin hacer: las de ese día (status) y las semanales de ese
    -- día de la semana que no tienen completado hoy. 0 = lunes, como la app.
    (select count(*)::integer
       from public.tasks t
      where t.house_id = me.house_id
        and (
          (t.due_date = p_today and t.status = 'pending')
          or (
            t.due_date is null
            and t.week_day = extract(isodow from p_today)::integer - 1
            and not exists (
              select 1 from public.task_completions c
              where c.task_id = t.id and c.date = p_today
            )
          )
        )),

    (select count(*)::integer
       from public.shopping_items s
      where s.house_id = me.house_id and not s.is_purchased),

    -- Mensajes de los demás posteriores a lo último que leí (y a cuando entré).
    (select count(*)::integer
       from public.house_messages m
      where m.house_id = me.house_id
        and m.user_id <> me.user_id
        and m.created_at > greatest(me.joined_at, coalesce(r.read_at, me.joined_at))),

    (select e.title from public.meal_plan_entries e
      where e.house_id = me.house_id and e.date = p_today and e.slot = 'lunch'),

    (select e.title from public.meal_plan_entries e
      where e.house_id = me.house_id and e.date = p_today and e.slot = 'dinner')

  from public.house_members me
  left join public.house_chat_reads r
    on r.house_id = me.house_id and r.user_id = me.user_id
  where me.user_id = (select auth.uid());
$$;

revoke all on function public.my_house_summaries(date) from public, anon;
grant execute on function public.my_house_summaries(date) to authenticated;
