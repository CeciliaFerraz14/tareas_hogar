-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 16 · Menú semanal: solo los privilegios que usa la app
--
-- Supabase da por defecto TODOS los privilegios a `authenticated` en cada tabla
-- nueva (también TRUNCATE, que se salta la RLS). Los grant por columna de 15 se
-- sumaban a esos en vez de sustituirlos, así que se podía cambiar date/slot o
-- vaciar la tabla entera. Primero se quita todo y luego se da lo justo.
-- ════════════════════════════════════════════════════════════════════════════

revoke all on public.meal_plan_entries from anon, authenticated;

grant select,
      insert (house_id, date, slot, title, cook_id, created_by),
      update (title, cook_id),
      delete                                                        on public.meal_plan_entries to authenticated;
