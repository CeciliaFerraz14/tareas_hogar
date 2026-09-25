-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 10 · Orden personal de la lista de hogares
--
-- Cada persona ordena sus hogares arrastrándolos; el orden es suyo y no cambia
-- el de los demás, por eso vive en su fila de house_members. Los hogares sin
-- posición (recién creados o unidos) salen arriba, del más reciente al más viejo.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.house_members add column sort_order integer;

create index house_members_user_order_idx on public.house_members (user_id, sort_order);

-- Solo la propia fila, y solo la posición (el rol sigue sin poder tocarse).
grant update (sort_order) on public.house_members to authenticated;

create policy house_members_update_own_order on public.house_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Guarda el orden completo de una vez: p_house_ids[1] va primero.
create or replace function public.reorder_my_houses(p_house_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.house_members m
  set sort_order = x.ord::integer
  from unnest(p_house_ids) with ordinality as x (house_id, ord)
  where m.house_id = x.house_id
    and m.user_id = (select auth.uid());
$$;

revoke all on function public.reorder_my_houses(uuid[]) from public, anon;
grant execute on function public.reorder_my_houses(uuid[]) to authenticated;
