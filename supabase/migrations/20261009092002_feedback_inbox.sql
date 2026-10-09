-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 29 · Buzón de sugerencias en la app
--
-- Quien está en private.app_admins ve en la app (Más → Buzón) todas las
-- sugerencias y errores, con el nombre de quien los manda, y las marca como
-- vistas o hechas. Va por funciones porque la RLS de users no deja ver a gente
-- de otros hogares; todas comprueban is_app_admin() antes de hacer nada.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.app_admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

create or replace function public.list_feedback()
returns table (
  id uuid,
  kind text,
  message text,
  app_version text,
  device text,
  status text,
  created_at timestamptz,
  author_name text,
  author_email text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Solo para quien lleva HOMI' using errcode = '42501';
  end if;
  return query
    select f.id, f.kind, f.message, f.app_version, f.device, f.status, f.created_at,
           nullif(btrim(u.username), ''), u.email
    from public.feedback f
    left join public.users u on u.id = f.user_id
    order by f.created_at desc
    limit 500;
end;
$$;

revoke all on function public.list_feedback() from public, anon;
grant execute on function public.list_feedback() to authenticated;

-- El CHECK de feedback.status ya limita los valores (new, seen, done).
create or replace function public.set_feedback_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Solo para quien lleva HOMI' using errcode = '42501';
  end if;
  update public.feedback set status = p_status where id = p_id;
end;
$$;

revoke all on function public.set_feedback_status(uuid, text) from public, anon;
grant execute on function public.set_feedback_status(uuid, text) to authenticated;
