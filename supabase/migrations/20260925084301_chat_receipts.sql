-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 11 · Checks de llegado y leído en el chat del hogar
--
-- En vez de una fila por mensaje y persona, cada miembro tiene una "marca de
-- agua" por hogar: hasta qué mensaje le ha llegado (delivered_at) y hasta cuál
-- ha leído (read_at). Un mensaje está:
--   · llegado → todos los demás miembros tienen delivered_at >= su created_at
--   · leído   → todos los demás miembros tienen read_at      >= su created_at
-- (solo cuentan quienes ya eran miembros cuando se envió).
-- ════════════════════════════════════════════════════════════════════════════

create table public.house_chat_reads (
  house_id      uuid not null,
  user_id       uuid not null default auth.uid(),
  delivered_at  timestamptz,
  read_at       timestamptz,
  primary key (house_id, user_id),
  -- Si alguien sale del hogar, su marca desaparece con él.
  constraint house_chat_reads_member foreign key (house_id, user_id)
    references public.house_members (house_id, user_id) on delete cascade,
  -- Lo leído siempre ha llegado.
  constraint house_chat_reads_read_implies_delivered
    check (read_at is null or (delivered_at is not null and read_at <= delivered_at))
);

alter table public.house_chat_reads enable row level security;

grant select, insert (house_id, delivered_at, read_at), update (delivered_at, read_at)
  on public.house_chat_reads to authenticated;

create policy house_chat_reads_select on public.house_chat_reads for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy house_chat_reads_insert on public.house_chat_reads for insert to authenticated
  with check (user_id = (select auth.uid()) and house_id in (select private.user_house_ids()));
create policy house_chat_reads_update on public.house_chat_reads for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Los cambios llegan en vivo al que envió (ve pasar sus checks a azul).
create trigger house_chat_reads_broadcast
  after insert or update or delete on public.house_chat_reads
  for each row execute function private.broadcast_house_change();

-- ─── RPC: me han llegado los mensajes de todos mis hogares ──────────────────
-- La app la llama al abrirse, al volver del segundo plano y cada vez que llega
-- un mensaje nuevo a cualquiera de mis hogares.
create or replace function public.mark_my_chats_delivered()
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.house_chat_reads as r (house_id, delivered_at)
  select msg.house_id, max(msg.created_at)
  from public.house_messages msg
  where msg.house_id in (select private.user_house_ids())
  group by msg.house_id
  on conflict (house_id, user_id) do update
    set delivered_at = excluded.delivered_at
    where r.delivered_at is null or excluded.delivered_at > r.delivered_at;
$$;

-- ─── RPC: he leído el chat de un hogar hasta p_up_to ────────────────────────
-- p_up_to es el created_at del último mensaje que se ve en pantalla.
create or replace function public.mark_chat_read(p_house_id uuid, p_up_to timestamptz)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.house_chat_reads as r (house_id, delivered_at, read_at)
  values (p_house_id, least(p_up_to, now()), least(p_up_to, now()))
  on conflict (house_id, user_id) do update
    set read_at      = greatest(r.read_at, excluded.read_at),
        delivered_at = greatest(r.delivered_at, excluded.delivered_at)
    where r.read_at is null or excluded.read_at > r.read_at;
$$;

revoke all on function public.mark_my_chats_delivered()           from public, anon;
revoke all on function public.mark_chat_read(uuid, timestamptz)   from public, anon;
grant execute on function public.mark_my_chats_delivered()         to authenticated;
grant execute on function public.mark_chat_read(uuid, timestamptz) to authenticated;
