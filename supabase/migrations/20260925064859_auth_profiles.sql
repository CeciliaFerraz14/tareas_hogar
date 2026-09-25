-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 02 · Perfiles sincronizados con Supabase Auth
-- ════════════════════════════════════════════════════════════════════════════

-- Alta: cada cuenta nueva tiene su perfil en public.users.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Cambio de email en Auth → se refleja en el perfil.
create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

revoke all on function private.handle_new_user()          from public, anon, authenticated;
revoke all on function private.handle_user_email_change() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- Cuentas que ya existían antes de este esquema.
insert into public.users (id, email)
select id, email from auth.users where email is not null
on conflict (id) do nothing;
