-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 28 · Aviso de sugerencias y errores
--
-- Cada fila nueva de feedback manda una notificación a quien lleva HOMI, no al
-- hogar. Quién la recibe está en private.app_admins (no se ve desde la API).
-- Para darte de alta, una vez y a mano desde el SQL Editor:
--   insert into private.app_admins (user_id) values ('<tu id de public.users>');
-- Se envía con la Edge Function send-push, como el resto de avisos.
-- ════════════════════════════════════════════════════════════════════════════

create table private.app_admins (
  user_id uuid primary key references public.users (id) on delete cascade
);

create or replace function private.enqueue_feedback_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text := private.vault_secret('push_function_url');
  v_secret text := private.vault_secret('push_webhook_secret');
  v_ids    uuid[];
begin
  -- Sin configurar (p. ej. en una copia local) o sin nadie a quien avisar: nada.
  if v_url is null or v_secret is null then
    return null;
  end if;
  select array_agg(user_id) into v_ids from private.app_admins;
  if v_ids is null then
    return null;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object(
      'table', 'feedback',
      'record', to_jsonb(new) || jsonb_build_object('recipient_ids', to_jsonb(v_ids))
    )
  );
  return null;
end;
$$;

revoke all on function private.enqueue_feedback_push() from public, anon, authenticated;

create trigger feedback_push after insert on public.feedback
  for each row execute function private.enqueue_feedback_push();
