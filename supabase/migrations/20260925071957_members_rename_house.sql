-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 07 · Cualquier miembro puede renombrar el hogar
--
-- La policy pasa de propietarios a miembros. El privilegio de columna sigue
-- siendo solo update(name): la foto va por set_house_avatar y borrar el hogar
-- sigue siendo cosa de propietarios.
-- ════════════════════════════════════════════════════════════════════════════

drop policy houses_update on public.houses;

create policy houses_update on public.houses for update to authenticated
  using (id in (select private.user_house_ids()))
  with check (id in (select private.user_house_ids()));
