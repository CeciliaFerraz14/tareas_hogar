-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 09 · Tareas y chat también por Broadcast
--
-- Mismo mecanismo que la lista de la compra (08): cada cambio, incluidos los
-- borrados, se publica en `house:<house_id>:<tabla>` y solo lo escuchan los
-- miembros. Con esto ninguna tabla usa ya postgres_changes.
-- ════════════════════════════════════════════════════════════════════════════

create trigger tasks_broadcast
  after insert or update or delete on public.tasks
  for each row execute function private.broadcast_house_change();

create trigger task_completions_broadcast
  after insert or update or delete on public.task_completions
  for each row execute function private.broadcast_house_change();

create trigger house_messages_broadcast
  after insert or update or delete on public.house_messages
  for each row execute function private.broadcast_house_change();

create trigger chat_messages_broadcast
  after insert or update or delete on public.chat_messages
  for each row execute function private.broadcast_house_change();

alter publication supabase_realtime drop table
  public.tasks,
  public.task_completions,
  public.house_messages,
  public.chat_messages;
