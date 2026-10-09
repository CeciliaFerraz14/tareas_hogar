-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 27 · Límite de sugerencias sin recursión
--
-- La política de insert de feedback contaba los envíos con una subconsulta a la
-- propia tabla, y Postgres la rechaza («infinite recursion detected in policy»).
-- El recuento pasa a una función security definer, como private.user_house_ids().
-- ════════════════════════════════════════════════════════════════════════════

create or replace function private.feedback_sent_last_hour()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.feedback
  where user_id = (select auth.uid()) and created_at > now() - interval '1 hour';
$$;

revoke all on function private.feedback_sent_last_hour() from public, anon;
grant execute on function private.feedback_sent_last_hour() to authenticated;

drop policy feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()) and private.feedback_sent_last_hour() < 10);
