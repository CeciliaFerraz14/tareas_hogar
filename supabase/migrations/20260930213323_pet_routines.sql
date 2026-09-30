-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 22 · Mascotas, fase 1: rutinas y "¿ha comido ya?"
--
--   pets ──< pet_routines ──< pet_logs
--
--   · pet_routines: lo que se repite. Tres formas:
--       daily    → cada día a unas horas         (times: 1 a 6 horas)
--       interval → cada N días desde start_date  (interval_days: 2 a 90)
--       monthly  → un día de cada mes            (month_day: 1 a 28)
--   · pet_logs: cada vez que alguien lo hace. unique (routine_id, for_date, slot):
--     una misma toma (p. ej. la comida de las 20:00 de hoy) solo se puede marcar
--     una vez, así nadie le da de comer dos veces. for_date es el día al que
--     cuenta (la fecha la pone la app, en su zona horaria) y slot, cuál de las
--     horas del día (0 = la primera).
--   · pet_tasks (las tareas sueltas de antes) se quedan como "pendientes" de
--     una vez: veterinario, comprar pienso…
-- ════════════════════════════════════════════════════════════════════════════

alter table public.pets add constraint pets_id_house_key unique (id, house_id);

create table public.pet_routines (
  id             uuid primary key default gen_random_uuid(),
  house_id       uuid not null references public.houses (id) on delete cascade,
  pet_id         uuid not null,
  title          text not null check (char_length(btrim(title)) between 1 and 60),
  emoji          text not null default '🐾' check (char_length(emoji) between 1 and 8),
  frequency      text not null check (frequency in ('daily', 'interval', 'monthly')),
  times          time[],
  interval_days  smallint,
  month_day      smallint,
  start_date     date not null default current_date,
  position       smallint not null default 0,
  created_by     uuid default auth.uid() references public.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (id, house_id),
  constraint pet_routines_pet_same_house foreign key (pet_id, house_id)
    references public.pets (id, house_id) on delete cascade,
  -- Cada forma usa solo su dato (los "is not null" hacen falta: un CHECK con NULL pasa).
  constraint pet_routines_schedule check (
    (frequency = 'daily' and times is not null and cardinality(times) between 1 and 6
       and interval_days is null and month_day is null)
    or (frequency = 'interval' and interval_days is not null and interval_days between 2 and 90
       and times is null and month_day is null)
    or (frequency = 'monthly' and month_day is not null and month_day between 1 and 28
       and times is null and interval_days is null)
  )
);

create index pet_routines_pet_idx        on public.pet_routines (pet_id, house_id, position);
create index pet_routines_house_idx      on public.pet_routines (house_id);
create index pet_routines_created_by_idx on public.pet_routines (created_by);

create table public.pet_logs (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses (id) on delete cascade,
  routine_id  uuid not null,
  for_date    date not null,
  slot        smallint not null default 0 check (slot between 0 and 5),
  done_by     uuid default auth.uid() references public.users (id) on delete set null,
  done_at     timestamptz not null default now(),
  unique (routine_id, for_date, slot),
  constraint pet_logs_routine_same_house foreign key (routine_id, house_id)
    references public.pet_routines (id, house_id) on delete cascade
);

create index pet_logs_house_date_idx on public.pet_logs (house_id, for_date desc);
create index pet_logs_routine_idx    on public.pet_logs (routine_id, house_id);
create index pet_logs_done_by_idx    on public.pet_logs (done_by);

-- ─── Privilegios y RLS ──────────────────────────────────────────────────────
grant select,
      insert (house_id, pet_id, title, emoji, frequency, times, interval_days, month_day, start_date, position, created_by),
      update (title, emoji, frequency, times, interval_days, month_day, start_date, position),
      delete
  on public.pet_routines to authenticated;
grant select, insert (house_id, routine_id, for_date, slot, done_by), delete
  on public.pet_logs to authenticated;

alter table public.pet_routines enable row level security;
alter table public.pet_logs     enable row level security;

create policy pet_routines_select on public.pet_routines for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy pet_routines_insert on public.pet_routines for insert to authenticated
  with check (house_id in (select private.user_house_ids()) and created_by = (select auth.uid()));
create policy pet_routines_update on public.pet_routines for update to authenticated
  using (house_id in (select private.user_house_ids()))
  with check (house_id in (select private.user_house_ids()));
create policy pet_routines_delete on public.pet_routines for delete to authenticated
  using (house_id in (select private.user_house_ids()));

-- Marcar: yo. Desmarcar (por si fue sin querer): cualquiera del hogar.
create policy pet_logs_select on public.pet_logs for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy pet_logs_insert on public.pet_logs for insert to authenticated
  with check (house_id in (select private.user_house_ids()) and done_by = (select auth.uid()));
create policy pet_logs_delete on public.pet_logs for delete to authenticated
  using (house_id in (select private.user_house_ids()));

-- ─── Tiempo real ────────────────────────────────────────────────────────────
-- pet_tasks no lleva house_id, así que no puede usar broadcast_house_change: la
-- app la recarga cuando cambia algo de pets.
create trigger pets_broadcast
  after insert or update or delete on public.pets
  for each row execute function private.broadcast_house_change();
create trigger pet_routines_broadcast
  after insert or update or delete on public.pet_routines
  for each row execute function private.broadcast_house_change();
create trigger pet_logs_broadcast
  after insert or update or delete on public.pet_logs
  for each row execute function private.broadcast_house_change();
