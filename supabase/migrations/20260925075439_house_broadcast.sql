-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 08 · Realtime por hogar con Broadcast (incluye los borrados)
--
-- postgres_changes no envía los DELETE a quien escucha con filtro (house_id=eq.X),
-- así que un artículo borrado no desaparecía en los otros móviles. Con Broadcast
-- desde la base de datos, un trigger publica cada cambio en un canal privado
-- `house:<house_id>:<tabla>` y la RLS de realtime.messages deja escucharlo solo
-- a los miembros de ese hogar.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function private.broadcast_house_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_house_id uuid := case tg_op when 'DELETE' then old.house_id else new.house_id end;
begin
  perform realtime.broadcast_changes(
    'house:' || v_house_id::text || ':' || tg_table_name,  -- topic
    tg_op,                                                 -- event
    tg_op,                                                 -- operation
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

revoke all on function private.broadcast_house_change() from public, anon, authenticated;

-- Solo los miembros de un hogar pueden escuchar sus canales privados.
create policy house_members_receive_broadcasts on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and split_part((select realtime.topic()), ':', 1) = 'house'
    and split_part((select realtime.topic()), ':', 2) in (select h::text from private.user_house_ids() as h)
  );

-- ─── Lista de la compra ─────────────────────────────────────────────────────
create trigger shopping_items_broadcast
  after insert or update or delete on public.shopping_items
  for each row execute function private.broadcast_house_change();

-- Ya no escucha por postgres_changes.
alter publication supabase_realtime drop table public.shopping_items;
