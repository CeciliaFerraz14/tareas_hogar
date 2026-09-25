-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 01 · Esquema base
--
-- Convenciones:
--   · PK uuid con gen_random_uuid(). Timestamps en timestamptz.
--   · Toda tabla "de hogar" lleva house_id. Cuando una fila depende de otra del
--     mismo hogar (tarea → estancia, completado → tarea, asignado → miembro) se
--     usa una FK compuesta (x_id, house_id) para que la base de datos garantice
--     que nunca se mezclan datos de dos hogares.
--   · Las columnas de autoría (created_by, added_by…) toman auth.uid() por
--     defecto y apuntan a users con ON DELETE SET NULL: borrar una cuenta nunca
--     queda bloqueado ni se lleva por delante el contenido del hogar.
--   · Asignar a alguien = FK a house_members: solo se puede asignar a miembros y,
--     si alguien sale del hogar, sus tareas quedan sin asignar automáticamente.
--   · Las funciones internas viven en el schema `private`, que la API no expone.
-- ════════════════════════════════════════════════════════════════════════════

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- updated_at automático
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── Perfiles (1:1 con auth.users) ──────────────────────────────────────────
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  username    text check (char_length(btrim(username)) between 1 and 40),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Hogares y miembros ─────────────────────────────────────────────────────
create table public.houses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  created_by  uuid default auth.uid() references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.house_members (
  house_id   uuid not null references public.houses (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (house_id, user_id)
);

create table public.invitations (
  id             uuid primary key default gen_random_uuid(),
  house_id       uuid not null references public.houses (id) on delete cascade,
  created_by     uuid default auth.uid() references public.users (id) on delete set null,
  invited_email  text,
  token          text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  status         text not null default 'pending'
                 check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at     timestamptz not null default (now() + interval '7 days'),
  created_at     timestamptz not null default now()
);

-- ─── Tareas ─────────────────────────────────────────────────────────────────
create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  created_at  timestamptz not null default now(),
  unique (id, house_id)
);

create table public.task_templates (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  created_at  timestamptz not null default now()
);

-- Programación de una tarea:
--   · semanal   → week_day (0 = lunes … 6 = domingo), due_date null. Su estado
--                 va en task_completions, una fila por día hecho.
--   · un día    → due_date, week_day null. Su estado es tasks.status.
--   · sin día   → ambos null. Su estado es tasks.status.
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  house_id     uuid not null references public.houses (id) on delete cascade,
  room_id      uuid,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  description  text check (char_length(description) <= 2000),
  assigned_to  uuid,
  due_date     date,
  week_day     smallint check (week_day between 0 and 6),
  status       text not null default 'pending' check (status in ('pending', 'done')),
  created_by   uuid default auth.uid() references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, house_id),
  constraint tasks_single_schedule check (due_date is null or week_day is null),
  constraint tasks_room_same_house foreign key (room_id, house_id)
    references public.rooms (id, house_id) on delete set null (room_id),
  constraint tasks_assignee_is_member foreign key (house_id, assigned_to)
    references public.house_members (house_id, user_id) on delete set null (assigned_to)
);

create table public.task_completions (
  task_id       uuid not null,
  house_id      uuid not null references public.houses (id) on delete cascade,
  date          date not null,
  completed_by  uuid default auth.uid() references public.users (id) on delete set null,
  completed_at  timestamptz not null default now(),
  primary key (task_id, date),
  constraint task_completions_task_same_house foreign key (task_id, house_id)
    references public.tasks (id, house_id) on delete cascade
);

-- ─── Chat ───────────────────────────────────────────────────────────────────
create table public.house_messages (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.users (id) on delete cascade,
  content     text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at  timestamptz not null default now()
);

-- Chat dentro de una tarea (con fotos)
create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null,
  house_id    uuid not null references public.houses (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.users (id) on delete cascade,
  content     text check (char_length(content) <= 2000),
  image_url   text,
  created_at  timestamptz not null default now(),
  constraint chat_messages_not_empty check (content is not null or image_url is not null),
  constraint chat_messages_task_same_house foreign key (task_id, house_id)
    references public.tasks (id, house_id) on delete cascade
);

-- ─── Lista de la compra ─────────────────────────────────────────────────────
create table public.shopping_items (
  id            uuid primary key default gen_random_uuid(),
  house_id      uuid not null references public.houses (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  is_purchased  boolean not null default false,
  added_by      uuid default auth.uid() references public.users (id) on delete set null,
  purchased_by  uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Hucha ──────────────────────────────────────────────────────────────────
-- Los gastos se crean con la RPC create_expense (gasto + reparto atómicos).
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  amount      numeric(12, 2) not null check (amount > 0),
  paid_by     uuid references public.users (id) on delete set null,
  created_by  uuid default auth.uid() references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.expense_splits (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references public.expenses (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  amount_owed  numeric(12, 2) not null check (amount_owed >= 0),
  is_settled   boolean not null default false,
  settled_at   timestamptz,
  unique (expense_id, user_id)
);

-- ─── Mascotas ───────────────────────────────────────────────────────────────
create table public.pets (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  type        text,
  photo_url   text,
  created_at  timestamptz not null default now()
);

create table public.pet_tasks (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references public.pets (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  assigned_to  uuid references public.users (id) on delete set null,
  due_date     date,
  status       text not null default 'pending' check (status in ('pending', 'done')),
  created_at   timestamptz not null default now()
);

-- ─── Índices ────────────────────────────────────────────────────────────────
-- Uno por cada FK que no esté ya cubierta por una PK/unique, más los de consulta.
create index houses_created_by_idx          on public.houses (created_by);
create index house_members_user_idx         on public.house_members (user_id);
create index invitations_house_idx          on public.invitations (house_id);
create index invitations_created_by_idx     on public.invitations (created_by);
create index rooms_house_idx                on public.rooms (house_id, name);
create index task_templates_room_idx        on public.task_templates (room_id);
create index tasks_house_idx                on public.tasks (house_id);
create index tasks_room_idx                 on public.tasks (room_id, house_id);
create index tasks_assignee_idx             on public.tasks (house_id, assigned_to);
create index tasks_created_by_idx           on public.tasks (created_by);
create index task_completions_house_idx     on public.task_completions (house_id);
create index task_completions_task_idx      on public.task_completions (task_id, house_id);
create index task_completions_user_idx      on public.task_completions (completed_by);
create index house_messages_house_idx       on public.house_messages (house_id, created_at desc);
create index house_messages_user_idx        on public.house_messages (user_id);
create index chat_messages_task_idx         on public.chat_messages (task_id, house_id, created_at);
create index chat_messages_house_idx        on public.chat_messages (house_id);
create index chat_messages_user_idx         on public.chat_messages (user_id);
create index shopping_items_house_idx       on public.shopping_items (house_id, created_at);
create index shopping_items_added_by_idx    on public.shopping_items (added_by);
create index shopping_items_purchased_idx   on public.shopping_items (purchased_by);
create index expenses_house_idx             on public.expenses (house_id, created_at desc);
create index expenses_paid_by_idx           on public.expenses (paid_by);
create index expenses_created_by_idx        on public.expenses (created_by);
create index expense_splits_user_idx        on public.expense_splits (user_id);
create index pets_house_idx                 on public.pets (house_id, name);
create index pet_tasks_pet_idx              on public.pet_tasks (pet_id);
create index pet_tasks_assignee_idx         on public.pet_tasks (assigned_to);

-- ─── updated_at ─────────────────────────────────────────────────────────────
create trigger users_updated_at          before update on public.users
  for each row execute function private.set_updated_at();
create trigger houses_updated_at         before update on public.houses
  for each row execute function private.set_updated_at();
create trigger tasks_updated_at          before update on public.tasks
  for each row execute function private.set_updated_at();
create trigger shopping_items_updated_at before update on public.shopping_items
  for each row execute function private.set_updated_at();
create trigger expenses_updated_at       before update on public.expenses
  for each row execute function private.set_updated_at();
