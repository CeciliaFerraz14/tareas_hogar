-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 24 · Mascotas, fase 2: dueños, la manada, avisos, compra y notas
--
--   · pets.owner_id: la persona responsable de la mascota, o null = del piso.
--     Si esa persona sale del hogar, la mascota pasa a ser del piso.
--   · La manada: una rutina o un apunte con pet_id null es de todas las
--     mascotas del hogar (limpiar los areneros, comprar arena…).
--   · Rutinas semanales: frequency 'weekly' con week_days (0=Lun … 6=Dom),
--     como las tareas semanales del hogar.
--   · Avisos (Web Push): remind = true → cuando toca y nadie lo ha marcado.
--     Las diarias, a cada hora de times; las demás, a remind_at del día que
--     toca. Los recibe quien es responsable; si alguna de las mascotas no
--     tiene, todo el hogar. Lo lanza pg_cron cada 5 minutos.
--   · pet_items: pendientes, cosas que comprar y notas, de una mascota o de la
--     manada. Los pendientes de pet_tasks se copian aquí; pet_tasks queda sin uso.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Dueño ──────────────────────────────────────────────────────────────────
alter table public.pets add column owner_id uuid;
alter table public.pets add constraint pets_owner_member foreign key (house_id, owner_id)
  references public.house_members (house_id, user_id) on delete set null (owner_id);
create index pets_owner_idx on public.pets (house_id, owner_id);

grant insert (owner_id), update (owner_id) on public.pets to authenticated;

-- ─── Rutinas: de la manada, semanales y con aviso ───────────────────────────
alter table public.pet_routines alter column pet_id drop not null;
alter table public.pet_routines add column week_days smallint[];
alter table public.pet_routines add column remind boolean not null default false;
alter table public.pet_routines add column remind_at time not null default '10:00';

alter table public.pet_routines drop constraint pet_routines_frequency_check;
alter table public.pet_routines add constraint pet_routines_frequency_check
  check (frequency in ('daily', 'weekly', 'interval', 'monthly'));

alter table public.pet_routines drop constraint pet_routines_schedule;
alter table public.pet_routines add constraint pet_routines_schedule check (
  (frequency = 'daily' and times is not null and cardinality(times) between 1 and 6
     and week_days is null and interval_days is null and month_day is null)
  or (frequency = 'weekly' and week_days is not null and cardinality(week_days) between 1 and 7
     and array_position(week_days, null) is null and 0 <= all (week_days) and 6 >= all (week_days)
     and times is null and interval_days is null and month_day is null)
  or (frequency = 'interval' and interval_days is not null and interval_days between 2 and 90
     and times is null and week_days is null and month_day is null)
  or (frequency = 'monthly' and month_day is not null and month_day between 1 and 28
     and times is null and week_days is null and interval_days is null)
);

grant insert (week_days, remind, remind_at),
      update (pet_id, week_days, remind, remind_at)
  on public.pet_routines to authenticated;

-- ─── Pendientes, compra y notas ─────────────────────────────────────────────
create table public.pet_items (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses (id) on delete cascade,
  pet_id      uuid,
  kind        text not null check (kind in ('todo', 'buy', 'note')),
  title       text not null,
  done        boolean not null default false,
  done_by     uuid references public.users (id) on delete set null,
  done_at     timestamptz,
  created_by  uuid default auth.uid() references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint pet_items_pet_same_house foreign key (pet_id, house_id)
    references public.pets (id, house_id) on delete cascade,
  constraint pet_items_title_length check (
    char_length(btrim(title)) between 1 and (case when kind = 'note' then 1000 else 120 end)
  ),
  -- Una nota no se tacha.
  constraint pet_items_note_not_done check (kind <> 'note' or not done)
);

create index pet_items_house_idx      on public.pet_items (house_id, created_at);
create index pet_items_pet_idx        on public.pet_items (pet_id, house_id);
create index pet_items_done_by_idx    on public.pet_items (done_by);
create index pet_items_created_by_idx on public.pet_items (created_by);

create trigger pet_items_updated_at before update on public.pet_items
  for each row execute function private.set_updated_at();

grant select,
      insert (house_id, pet_id, kind, title, done, done_by, done_at, created_by),
      update (pet_id, title, done, done_by, done_at),
      delete
  on public.pet_items to authenticated;

alter table public.pet_items enable row level security;

create policy pet_items_select on public.pet_items for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy pet_items_insert on public.pet_items for insert to authenticated
  with check (house_id in (select private.user_house_ids()) and created_by = (select auth.uid()));
create policy pet_items_update on public.pet_items for update to authenticated
  using (house_id in (select private.user_house_ids()))
  with check (house_id in (select private.user_house_ids()));
create policy pet_items_delete on public.pet_items for delete to authenticated
  using (house_id in (select private.user_house_ids()));

create trigger pet_items_broadcast
  after insert or update or delete on public.pet_items
  for each row execute function private.broadcast_house_change();

-- Los pendientes de antes pasan aquí.
insert into public.pet_items (house_id, pet_id, kind, title, created_by, created_at)
select p.house_id, t.pet_id, 'todo', t.title, null, t.created_at
from public.pet_tasks t
join public.pets p on p.id = t.pet_id
where t.status = 'pending';

-- ─── Preferencias: avisos de las mascotas ───────────────────────────────────
alter table public.notification_prefs add column pets boolean not null default true;
grant insert (pets), update (pets) on public.notification_prefs to authenticated;

-- ─── Recordatorios ──────────────────────────────────────────────────────────
-- Qué tomas ya se han avisado, para no repetir.
create table private.pet_reminders_sent (
  routine_id  uuid not null references public.pet_routines (id) on delete cascade,
  for_date    date not null,
  slot        smallint not null,
  sent_at     timestamptz not null default now(),
  primary key (routine_id, for_date, slot)
);

-- Quién recibe el aviso de una rutina: los responsables de las mascotas a las
-- que toca (una, o toda la manada). null = todo el hogar (alguna no tiene).
create or replace function private.pet_routine_recipients(p_house_id uuid, p_pet_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when bool_or(p.owner_id is null) then null
    else array_agg(distinct p.owner_id)
  end
  from public.pets p
  where p.house_id = p_house_id and (p_pet_id is null or p.id = p_pet_id);
$$;

revoke all on function private.pet_routine_recipients(uuid, uuid) from public, anon, authenticated;

-- Cada 5 minutos: las tomas de hoy cuya hora ya ha llegado (hace menos de 2 h,
-- por si un cron se salta), sin marcar y sin avisar. Hora de Madrid, como el
-- recordatorio del cocinero.
create or replace function private.send_pet_reminders()
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

  delete from private.pet_reminders_sent where for_date < v_today - 7;

  for r in
    with due as (
      -- Diarias: cada hora es una toma.
      select rt.id, rt.house_id, rt.pet_id, rt.title, rt.emoji, (s.n - 1)::smallint as slot, s.t as at
      from public.pet_routines rt
      cross join lateral unnest(rt.times) with ordinality as s(t, n)
      where rt.remind and rt.frequency = 'daily' and rt.start_date <= v_today
      union all
      -- Las demás: una toma el día que toca, a remind_at.
      select rt.id, rt.house_id, rt.pet_id, rt.title, rt.emoji, 0::smallint, rt.remind_at
      from public.pet_routines rt
      where rt.remind and rt.start_date <= v_today and (
        (rt.frequency = 'weekly' and (extract(isodow from v_today)::int - 1) = any (rt.week_days))
        or (rt.frequency = 'interval' and (v_today - rt.start_date) % rt.interval_days = 0)
        or (rt.frequency = 'monthly' and extract(day from v_today)::int = rt.month_day)
      )
    )
    select d.*, pt.name as pet_name
    from due d
    left join public.pets pt on pt.id = d.pet_id
    where (v_today + d.at) between v_now - interval '2 hours' and v_now
      and not exists (
        select 1 from public.pet_logs l
        where l.routine_id = d.id and l.for_date = v_today and l.slot = d.slot
      )
  loop
    v_new := null;
    insert into private.pet_reminders_sent (routine_id, for_date, slot)
    values (r.id, v_today, r.slot)
    on conflict do nothing
    returning 1 into v_new;
    continue when v_new is null;  -- ya se avisó

    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      body    := jsonb_build_object(
        'table', 'pet_routines',
        'event', 'pet_reminder',
        'record', jsonb_build_object(
          'id', r.id,
          'house_id', r.house_id,
          'title', r.title,
          'emoji', r.emoji,
          'pet_name', r.pet_name,
          'at', to_char(r.at, 'HH24:MI'),
          'slot', r.slot,
          'recipient_ids', to_jsonb(private.pet_routine_recipients(r.house_id, r.pet_id))
        )
      )
    );
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function private.send_pet_reminders() from public, anon, authenticated;

select cron.schedule('homi-pet-reminders', '*/5 * * * *', 'select private.send_pet_reminders()');
