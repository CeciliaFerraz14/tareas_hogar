-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 21 · Menú, fase 3: ¿comes en casa?, avisos al cocinero y copiar semana
--
--   · meal_attendance: cada persona dice si come (o cena) en casa. Va por hueco
--     (día + comida/cena), no por plato: se puede contestar antes de que haya
--     plato, y cambiar el plato no borra las respuestas. Cada uno solo toca lo
--     suyo, con la RPC set_meal_attendance.
--   · Avisos al cocinero (Web Push, como el resto):
--       - al apuntarte otra persona para cocinar   → "🍳 Ana te ha apuntado…"
--       - a las 10:00 (hora de Madrid) del día que cocinas → "🍳 Hoy cocinas tú"
--     El recordatorio lo lanza pg_cron. Todas las casas de HOMI están en España,
--     así que la hora es la de Europe/Madrid (el servidor va en UTC).
--   · Nueva categoría "menu" en notification_prefs para poder apagarlos.
--   · copy_meal_week: copia los platos de una semana a otra, solo en los huecos
--     vacíos y sin cocinero (si no, llegaría un aviso por cada plato copiado).
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron with schema pg_catalog;

-- ─── ¿Comes en casa? ────────────────────────────────────────────────────────
create table public.meal_attendance (
  house_id    uuid not null references public.houses (id) on delete cascade,
  date        date not null,
  slot        text not null check (slot in ('lunch', 'dinner')),
  user_id     uuid not null default auth.uid(),
  eating      boolean not null,
  updated_at  timestamptz not null default now(),
  primary key (house_id, date, slot, user_id),
  -- Si alguien sale del hogar, sus respuestas se van con él.
  constraint meal_attendance_member foreign key (house_id, user_id)
    references public.house_members (house_id, user_id) on delete cascade
);

create trigger meal_attendance_updated_at before update on public.meal_attendance
  for each row execute function private.set_updated_at();

grant select, insert (house_id, date, slot, eating), update (eating), delete
  on public.meal_attendance to authenticated;

alter table public.meal_attendance enable row level security;

create policy meal_attendance_select on public.meal_attendance for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy meal_attendance_insert on public.meal_attendance for insert to authenticated
  with check (user_id = (select auth.uid()) and house_id in (select private.user_house_ids()));
create policy meal_attendance_update on public.meal_attendance for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy meal_attendance_delete on public.meal_attendance for delete to authenticated
  using (user_id = (select auth.uid()));

create trigger meal_attendance_broadcast
  after insert or update or delete on public.meal_attendance
  for each row execute function private.broadcast_house_change();

-- p_eating: true = como en casa, false = no, null = borrar mi respuesta.
create or replace function public.set_meal_attendance(
  p_house_id uuid,
  p_date     date,
  p_slot     text,
  p_eating   boolean default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;
  if p_slot is null or p_slot not in ('lunch', 'dinner') then
    raise exception 'Ese hueco del menú no existe.' using errcode = 'HM047';
  end if;

  if p_eating is null then
    delete from public.meal_attendance
    where house_id = p_house_id and date = p_date and slot = p_slot and user_id = auth.uid();
  else
    insert into public.meal_attendance as a (house_id, date, slot, eating)
    values (p_house_id, p_date, p_slot, p_eating)
    on conflict (house_id, date, slot, user_id) do update
      set eating = excluded.eating
      where a.eating is distinct from excluded.eating;
  end if;
end;
$$;

-- ─── Copiar una semana ──────────────────────────────────────────────────────
-- p_from y p_to son lunes. Devuelve cuántos platos se han copiado.
create or replace function public.copy_meal_week(p_house_id uuid, p_from date, p_to date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_copied integer;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;
  if p_from is null or p_to is null or p_from = p_to
     or extract(isodow from p_from) <> 1 or extract(isodow from p_to) <> 1 then
    raise exception 'Las semanas no son válidas.' using errcode = 'HM046';
  end if;

  insert into public.meal_plan_entries (house_id, date, slot, title, recipe_id, created_by)
  select e.house_id, e.date + (p_to - p_from), e.slot, e.title, e.recipe_id, auth.uid()
  from public.meal_plan_entries e
  where e.house_id = p_house_id
    and e.date between p_from and p_from + 6
  on conflict (house_id, date, slot) do nothing;

  get diagnostics v_copied = row_count;
  return v_copied;
end;
$$;

-- ─── Preferencias: avisos del menú ──────────────────────────────────────────
alter table public.notification_prefs add column menu boolean not null default true;
grant insert (menu), update (menu) on public.notification_prefs to authenticated;

-- ─── Aviso: te han apuntado para cocinar ────────────────────────────────────
create or replace function private.enqueue_cook_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text := private.vault_secret('push_function_url');
  v_secret text := private.vault_secret('push_webhook_secret');
begin
  if v_url is null or v_secret is null then
    return null;
  end if;

  -- Solo si hay cocinero nuevo, lo ha puesto otra persona y no es un día pasado.
  if new.cook_id is null
     or (tg_op = 'UPDATE' and old.cook_id is not distinct from new.cook_id)
     or auth.uid() is null
     or new.cook_id = auth.uid()
     or new.date < (now() at time zone 'Europe/Madrid')::date then
    return null;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object(
      'table', 'meal_plan_entries',
      'event', 'cook_assigned',
      'actor_id', auth.uid(),
      'record', to_jsonb(new)
    )
  );
  return null;
end;
$$;

revoke all on function private.enqueue_cook_push() from public, anon, authenticated;

create trigger meal_plan_entries_cook_push
  after insert or update of cook_id on public.meal_plan_entries
  for each row execute function private.enqueue_cook_push();

-- ─── Recordatorio: hoy cocinas tú ───────────────────────────────────────────
-- La llama pg_cron a las 8:00 y a las 9:00 UTC; solo hace algo cuando en Madrid
-- son las 10 (verano UTC+2, invierno UTC+1). p_force es para probarla a mano.
-- notification_throttle evita mandar dos recordatorios el mismo día.
create or replace function private.send_cook_reminders(p_force boolean default false)
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
  if not p_force and extract(hour from v_now) <> 10 then
    return 0;
  end if;

  for r in
    select
      e.house_id,
      e.cook_id,
      jsonb_agg(
        jsonb_build_object(
          'slot', e.slot,
          'title', e.title,
          'eating', (select count(*) from public.meal_attendance a
                     where a.house_id = e.house_id and a.date = e.date and a.slot = e.slot and a.eating)
        )
        order by case e.slot when 'lunch' then 0 else 1 end
      ) as meals
    from public.meal_plan_entries e
    where e.date = v_today and e.cook_id is not null
    group by e.house_id, e.cook_id
  loop
    v_new := null;
    insert into private.notification_throttle as t (house_id, actor_id, kind, last_sent_at)
    values (r.house_id, r.cook_id, 'cook_reminder', now())
    on conflict (house_id, actor_id, kind) do update
      set last_sent_at = now()
      where (t.last_sent_at at time zone 'Europe/Madrid')::date < v_today
    returning 1 into v_new;
    continue when v_new is null;  -- hoy ya se le avisó

    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      body    := jsonb_build_object(
        'table', 'meal_plan_entries',
        'event', 'cook_reminder',
        'record', jsonb_build_object('house_id', r.house_id, 'cook_id', r.cook_id, 'date', v_today, 'meals', r.meals)
      )
    );
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function private.send_cook_reminders(boolean) from public, anon, authenticated;

select cron.schedule('homi-cook-reminders', '0 8,9 * * *', 'select private.send_cook_reminders()');

-- ─── RPC: permisos ──────────────────────────────────────────────────────────
revoke all on function public.set_meal_attendance(uuid, date, text, boolean) from public, anon;
revoke all on function public.copy_meal_week(uuid, date, date)               from public, anon;
grant execute on function public.set_meal_attendance(uuid, date, text, boolean) to authenticated;
grant execute on function public.copy_meal_week(uuid, date, date)               to authenticated;
