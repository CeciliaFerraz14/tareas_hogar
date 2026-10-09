-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 26 · Sugerencias y errores
--
-- Desde Ajustes (y Más) cualquiera puede mandar una sugerencia o reportar un
-- fallo. Se guarda con la versión de la app y el dispositivo para poder
-- reproducirlo. Cada persona solo ve lo suyo; se leen desde el panel de
-- Supabase (status: new → seen → done, a mano).
-- Máximo 10 envíos por persona y hora, para que nadie lo llene sin querer.
-- ════════════════════════════════════════════════════════════════════════════

create table public.feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid default auth.uid() references public.users (id) on delete set null,
  kind         text not null check (kind in ('suggestion', 'bug')),
  message      text not null check (char_length(btrim(message)) between 1 and 2000),
  app_version  text check (char_length(app_version) <= 120),
  device       text check (char_length(device) <= 300),
  status       text not null default 'new' check (status in ('new', 'seen', 'done')),
  created_at   timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_user_id_idx    on public.feedback (user_id, created_at);

grant select,
      insert (user_id, kind, message, app_version, device)
  on public.feedback to authenticated;

alter table public.feedback enable row level security;

create policy feedback_select_own on public.feedback for select to authenticated
  using (user_id = (select auth.uid()));
create policy feedback_insert_own on public.feedback for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      select count(*) from public.feedback f
      where f.user_id = (select auth.uid()) and f.created_at > now() - interval '1 hour'
    ) < 10
  );
