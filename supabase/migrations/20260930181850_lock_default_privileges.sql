-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 17 · Cerrar los privilegios por defecto de Supabase
--
-- Supabase trae una regla (default privileges del rol postgres en `public`) que
-- da TODOS los privilegios a `authenticated` en cada tabla nueva, TRUNCATE
-- incluido, y TRUNCATE se salta la RLS. En 03 solo se le quitó a anon, así que
-- las tablas creadas después tenían, además de sus grant por columna, permiso
-- para vaciarlas enteras o reescribir cualquier columna:
--   · house_chat_reads    → borrar los checks de todos los hogares
--   · notification_prefs  → cambiar user_id
--   · push_subscriptions  → borrar las suscripciones push de todo el mundo
--
-- 1. A esas tablas se les quita todo y se les vuelve a dar solo lo que ya
--    decían sus migraciones (11 y 13).
-- 2. La regla por defecto deja de dar nada a authenticated (ni secuencias a
--    anon): a partir de ahora cada tabla nueva empieza sin privilegios y hay
--    que darle los suyos con grant, como el resto del esquema.
-- ════════════════════════════════════════════════════════════════════════════

revoke all on public.house_chat_reads   from anon, authenticated;
revoke all on public.notification_prefs from anon, authenticated;
revoke all on public.push_subscriptions from anon, authenticated;

grant select, insert (house_id, delivered_at, read_at), update (delivered_at, read_at)
  on public.house_chat_reads to authenticated;
grant select, insert (chat, tasks, shopping, expenses), update (chat, tasks, shopping, expenses)
  on public.notification_prefs to authenticated;
grant select, delete
  on public.push_subscriptions to authenticated;

alter default privileges for role postgres in schema public revoke all on tables    from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
