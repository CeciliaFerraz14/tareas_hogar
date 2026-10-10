-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 31 · Aviso a quien mandó la sugerencia cuando está hecha
--
-- Al marcar una sugerencia o un error como hecho desde el Buzón, quien lo mandó
-- recibe una notificación, con una nota opcional de qué se ha hecho (reply).
-- Solo se avisa una vez (done_notified_at): reabrirla y volver a cerrarla no
-- repite el aviso. Se envía con la Edge Function send-push (event feedback_done).
-- Las funciones que lo usan están en 32.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.feedback add column reply text check (char_length(reply) <= 300);
alter table public.feedback add column done_notified_at timestamptz;

create or replace function private.enqueue_feedback_done_push(p_feedback public.feedback)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text := private.vault_secret('push_function_url');
  v_secret text := private.vault_secret('push_webhook_secret');
begin
  if v_url is null or v_secret is null or p_feedback.user_id is null then
    return;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object('table', 'feedback', 'event', 'feedback_done', 'record', to_jsonb(p_feedback))
  );
end;
$$;

revoke all on function private.enqueue_feedback_done_push(public.feedback) from public, anon, authenticated;
