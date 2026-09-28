-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 14 · Avisos al tachar tareas y cosas de la compra
--
--   tarea hecha           ──► "✅ Ana ha hecho una tarea"
--   1.er producto tachado ──► "🛒 ¡Ana está haciendo la compra!"  (una vez por viaje)
--   último producto       ──► "✅ ¡Compra hecha!"                  (sustituye al anterior)
--
-- Mismo camino que 13_web_push: trigger → pg_net → Edge Function send-push,
-- ahora con un campo `event` para distinguir estos avisos de los de "algo nuevo".
-- Desmarcar no avisa a nadie.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function private.enqueue_done_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text := private.vault_secret('push_function_url');
  v_secret text := private.vault_secret('push_webhook_secret');
  v_actor  uuid;
  v_event  text;
  v_last   timestamptz;
begin
  -- Sin configurar (p. ej. en una copia local): no se hace nada.
  if v_url is null or v_secret is null then
    return null;
  end if;

  -- Quién lo ha tachado. `tasks` no guarda quién la completó: es quien hace el UPDATE.
  if tg_table_name = 'tasks' then
    v_actor := auth.uid();
  elsif tg_table_name = 'task_completions' then
    v_actor := coalesce(new.completed_by, auth.uid());
  else
    v_actor := coalesce(new.purchased_by, auth.uid());
  end if;
  if v_actor is null then return null; end if;

  if tg_table_name in ('tasks', 'task_completions') then
    v_event := 'task_done';

  elsif not exists (
    select 1 from public.shopping_items s
    where s.house_id = new.house_id and not s.is_purchased
  ) then
    -- Era lo último de la lista: compra terminada y se cierra el "viaje" de todos.
    v_event := 'shopping_finished';
    delete from private.notification_throttle t
    where t.house_id = new.house_id and t.kind = 'shopping_trip';

  else
    -- Un "viaje" = tachar cosas sin pasar 30 minutos entre una y otra. Solo se
    -- avisa al empezarlo; cada tachado alarga el viaje.
    select t.last_sent_at into v_last
    from private.notification_throttle t
    where t.house_id = new.house_id and t.actor_id = v_actor and t.kind = 'shopping_trip'
    for update;

    insert into private.notification_throttle as t (house_id, actor_id, kind, last_sent_at)
    values (new.house_id, v_actor, 'shopping_trip', now())
    on conflict (house_id, actor_id, kind) do update set last_sent_at = now();

    if v_last is not null and v_last > now() - interval '30 minutes' then
      return null;  -- sigue el mismo viaje: ya se avisó
    end if;
    v_event := 'shopping_started';
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object(
      'table', tg_table_name, 'event', v_event, 'actor_id', v_actor, 'record', to_jsonb(new)
    )
  );
  return null;
end;
$$;

revoke all on function private.enqueue_done_push() from public, anon, authenticated;

-- Tareas de un día o sin día: pasan de 'pending' a 'done'.
create trigger tasks_done_push after update of status on public.tasks
  for each row when (old.status = 'pending' and new.status = 'done')
  execute function private.enqueue_done_push();

-- Tareas semanales: una fila por día hecho.
create trigger task_completions_push after insert on public.task_completions
  for each row execute function private.enqueue_done_push();

-- Compra: un producto pasa a comprado.
create trigger shopping_items_done_push after update of is_purchased on public.shopping_items
  for each row when (not old.is_purchased and new.is_purchased)
  execute function private.enqueue_done_push();
