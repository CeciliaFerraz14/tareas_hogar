-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 13 · Notificaciones push (Web Push para la PWA)
--
--   algo nuevo en el hogar ──trigger──► pg_net (HTTP, tras el commit)
--        ──► Edge Function send-push ──► navegadores de los demás miembros
--
-- Secretos (NO van en git: se guardan en Vault aparte, ver README):
--   vapid_public_key, vapid_private_key, vapid_subject,
--   push_webhook_secret, push_function_url
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net with schema extensions;

-- ─── Suscripciones: la "dirección" push de cada navegador ───────────────────
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
grant select, delete on public.push_subscriptions to authenticated;
create policy push_subscriptions_select_own on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_delete_own on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Guardar la suscripción de este navegador. Si antes era de otra cuenta (se cerró
-- sesión y entró otra persona), pasa a ser mía: el navegador es de quien lo usa.
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        updated_at = now();
end;
$$;

-- ─── Preferencias (los interruptores de Ajustes) ────────────────────────────
-- Sin fila = todo activado.
create table public.notification_prefs (
  user_id     uuid primary key default auth.uid() references public.users (id) on delete cascade,
  chat        boolean not null default true,
  tasks       boolean not null default true,
  shopping    boolean not null default true,
  expenses    boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;
grant select, insert (chat, tasks, shopping, expenses), update (chat, tasks, shopping, expenses)
  on public.notification_prefs to authenticated;
create policy notification_prefs_select_own on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_prefs_insert_own on public.notification_prefs for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notification_prefs_update_own on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger notification_prefs_updated_at before update on public.notification_prefs
  for each row execute function private.set_updated_at();

-- ─── Claves y secretos (Vault) ──────────────────────────────────────────────
create or replace function private.vault_secret(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;

revoke all on function private.vault_secret(text) from public, anon, authenticated;

-- La clave pública VAPID la necesita el navegador para suscribirse.
create or replace function public.get_vapid_public_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.vault_secret('vapid_public_key');
$$;

-- Todo lo demás, solo para la Edge Function (service_role).
create or replace function public.get_push_config()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'vapid_public_key',  private.vault_secret('vapid_public_key'),
    'vapid_private_key', private.vault_secret('vapid_private_key'),
    'vapid_subject',     private.vault_secret('vapid_subject'),
    'webhook_secret',    private.vault_secret('push_webhook_secret')
  );
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.get_vapid_public_key() from public, anon;
revoke all on function public.get_push_config() from public, anon, authenticated;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.get_vapid_public_key() to authenticated;
grant execute on function public.get_push_config() to service_role;

-- ─── Antispam de la compra ──────────────────────────────────────────────────
-- Si alguien añade varias cosas seguidas, solo se avisa de la primera (una vez
-- cada 2 minutos por persona y hogar).
create table private.notification_throttle (
  house_id      uuid not null,
  actor_id      uuid not null,
  kind          text not null,
  last_sent_at  timestamptz not null,
  primary key (house_id, actor_id, kind)
);

-- ─── Trigger: avisar a la Edge Function ─────────────────────────────────────
create or replace function private.enqueue_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text := private.vault_secret('push_function_url');
  v_secret text := private.vault_secret('push_webhook_secret');
  v_sent   integer;
begin
  -- Sin configurar (p. ej. en una copia local): no se hace nada.
  if v_url is null or v_secret is null then
    return null;
  end if;

  if tg_table_name = 'shopping_items' then
    if new.added_by is null then return null; end if;
    insert into private.notification_throttle as t (house_id, actor_id, kind, last_sent_at)
    values (new.house_id, new.added_by, 'shopping', now())
    on conflict (house_id, actor_id, kind) do update
      set last_sent_at = now()
      where t.last_sent_at < now() - interval '2 minutes'
    returning 1 into v_sent;
    if v_sent is null then return null; end if;  -- ya se avisó hace poco
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object('table', tg_table_name, 'record', to_jsonb(new))
  );
  return null;
end;
$$;

revoke all on function private.enqueue_push() from public, anon, authenticated;

create trigger house_messages_push after insert on public.house_messages
  for each row execute function private.enqueue_push();
create trigger tasks_push after insert on public.tasks
  for each row execute function private.enqueue_push();
create trigger shopping_items_push after insert on public.shopping_items
  for each row execute function private.enqueue_push();
create trigger expenses_push after insert on public.expenses
  for each row execute function private.enqueue_push();
