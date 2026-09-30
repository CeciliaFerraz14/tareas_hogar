-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 19 · add_meals_to_shopping: nombre y orden de las cantidades
--
--   · Si un ingrediente se escribe distinto en dos recetas ("Chorizo" y
--     "chorizo"), se queda como aparece la primera vez en el menú (antes ganaba
--     el primero en orden alfabético, que ponía "chorizo" en minúscula).
--   · Las cantidades van en el orden del menú: día a día, primero la comida y
--     luego la cena (antes 'dinner' < 'lunch' ponía la cena delante).
-- ════════════════════════════════════════════════════════════════════════════

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
  with used as (
    select
      lower(btrim(ri.name)) as key,
      btrim(ri.name)        as name,
      ri.quantity,
      row_number() over (
        order by e.date, case e.slot when 'lunch' then 0 else 1 end, ri.position
      ) as ord
    from public.meal_plan_entries e
    join public.recipe_ingredients ri
      on ri.recipe_id = e.recipe_id and ri.house_id = e.house_id
    where e.house_id = p_house_id
      and e.date between p_from and p_to
  ),
  wanted as (
    select
      u.key,
      (array_agg(u.name order by u.ord))[1]         as name,
      string_agg(u.quantity, ' + ' order by u.ord)  as quantity
    from used u
    group by u.key
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
