-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 12 · Resumen de cada hogar para Inicio
--
-- Una sola llamada devuelve, por cada hogar mío: tareas de hoy sin hacer, cosas
-- pendientes en la lista de la compra y mensajes que aún no he leído. La fecha
-- de "hoy" la manda la app (el servidor está en UTC; el día cambia a otra hora).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.my_house_summaries(p_today date)
returns table (
  house_id            uuid,
  tasks_today_pending integer,
  shopping_pending    integer,
  unread_messages     integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    me.house_id,

    -- Tareas de hoy sin hacer: las de ese día (status) y las semanales de ese
    -- día de la semana que no tienen completado hoy. 0 = lunes, como la app.
    (select count(*)::integer
       from public.tasks t
      where t.house_id = me.house_id
        and (
          (t.due_date = p_today and t.status = 'pending')
          or (
            t.due_date is null
            and t.week_day = extract(isodow from p_today)::integer - 1
            and not exists (
              select 1 from public.task_completions c
              where c.task_id = t.id and c.date = p_today
            )
          )
        )),

    (select count(*)::integer
       from public.shopping_items s
      where s.house_id = me.house_id and not s.is_purchased),

    -- Mensajes de los demás posteriores a lo último que leí (y a cuando entré).
    (select count(*)::integer
       from public.house_messages m
      where m.house_id = me.house_id
        and m.user_id <> me.user_id
        and m.created_at > greatest(me.joined_at, coalesce(r.read_at, me.joined_at)))

  from public.house_members me
  left join public.house_chat_reads r
    on r.house_id = me.house_id and r.user_id = me.user_id
  where me.user_id = (select auth.uid());
$$;

revoke all on function public.my_house_summaries(date) from public, anon;
grant execute on function public.my_house_summaries(date) to authenticated;
