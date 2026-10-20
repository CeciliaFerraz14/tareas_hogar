-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 27 · Tareas con hora
--
--   · tasks.due_time: hora opcional de una tarea de un día o semanal (una
--     tarea sin día no puede tener hora).
--   · Aviso (Web Push) a esa hora si nadie la ha marcado: a quien la tiene
--     asignada o, si no es de nadie, a todo el hogar. Respeta el interruptor
--     de Tareas de Ajustes. Lo lanza pg_cron cada 5 minutos, en hora de
--     Madrid, como las rutinas de las mascotas.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.tasks add column due_time time;
alter table public.tasks add constraint tasks_time_needs_day
  check (due_time is null or due_date is not null or week_day is not null);

grant insert (due_time), update (due_time) on public.tasks to authenticated;

-- ─── Recordatorios ──────────────────────────────────────────────────────────
-- Qué avisos ya se han mandado. La hora va en la clave: si se cambia, se
-- vuelve a avisar a la nueva.
create table private.task_reminders_sent (
  task_id   uuid not null references public.tasks (id) on delete cascade,
  for_date  date not null,
  at        time not null,
  sent_at   timestamptz not null default now(),
  primary key (task_id, for_date, at)
);

-- Cada 5 minutos: las tareas de hoy cuya hora ya ha llegado (hace menos de
-- 2 h, por si un cron se salta), sin marcar y sin avisar. Si se creó o se
-- cambió después de su hora, no se avisa: ya se sabe.
create or replace function private.send_task_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text := private.vault_secret('push_function_url');
  v_secret text := private.vault_secret('push_webhook_secret');
  v_now    timestamp := now() at time zone 'Europe/Madrid';
  v_today  date := v_now::date;
  v_sent   integer := 0;
  v_new    integer;
  r        record;
begin
  if v_url is null or v_secret is null then
    return 0;
  end if;

  delete from private.task_reminders_sent where for_date < v_today - 7;

  for r in
    select t.id, t.house_id, t.title, t.assigned_to, t.due_time
    from public.tasks t
    where t.due_time is not null
      and (v_today + t.due_time) between v_now - interval '2 hours' and v_now
      and (t.updated_at at time zone 'Europe/Madrid') < (v_today + t.due_time)
      and (
        -- De un día: hoy y sin hacer.
        (t.due_date = v_today and t.status = 'pending')
        -- Semanal: hoy le toca y nadie la ha marcado hoy.
        or (t.due_date is null and t.week_day = extract(isodow from v_today)::int - 1
            and not exists (
              select 1 from public.task_completions c
              where c.task_id = t.id and c.date = v_today
            ))
      )
  loop
    v_new := null;
    insert into private.task_reminders_sent (task_id, for_date, at)
    values (r.id, v_today, r.due_time)
    on conflict do nothing
    returning 1 into v_new;
    continue when v_new is null;  -- ya se avisó

    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      body    := jsonb_build_object(
        'table', 'tasks',
        'event', 'task_reminder',
        'record', jsonb_build_object(
          'id', r.id,
          'house_id', r.house_id,
          'title', r.title,
          'assigned_to', r.assigned_to,
          'at', to_char(r.due_time, 'HH24:MI'),
          -- null = todo el hogar.
          'recipient_ids', case when r.assigned_to is null then null else jsonb_build_array(r.assigned_to) end
        )
      )
    );
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function private.send_task_reminders() from public, anon, authenticated;

select cron.schedule('homi-task-reminders', '*/5 * * * *', 'select private.send_task_reminders()');
