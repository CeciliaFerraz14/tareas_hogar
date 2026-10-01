-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 25 · Mascotas dentro o fuera de la manada
--
--   · pets.in_pack: si la mascota forma parte de la manada (por defecto, sí).
--     Una mascota fuera de la manada (el perro de otro compañero…) no comparte
--     las rutinas ni los apuntes de la manada.
--   · Los avisos de una rutina de la manada van a quien se encarga de las
--     mascotas que forman parte de ella (antes: de todas las del hogar).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.pets add column in_pack boolean not null default true;

grant insert (in_pack), update (in_pack) on public.pets to authenticated;

create or replace function private.pet_routine_recipients(p_house_id uuid, p_pet_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when bool_or(p.owner_id is null) then null
    else array_agg(distinct p.owner_id)
  end
  from public.pets p
  where p.house_id = p_house_id
    and (case when p_pet_id is null then p.in_pack else p.id = p_pet_id end);
$$;

revoke all on function private.pet_routine_recipients(uuid, uuid) from public, anon, authenticated;
