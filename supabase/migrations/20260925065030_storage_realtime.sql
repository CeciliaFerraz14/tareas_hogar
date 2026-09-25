-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 05 · Storage (avatares) y Realtime
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Avatares ───────────────────────────────────────────────────────────────
-- Bucket público (las URLs se leen sin sesión) pero cada usuario solo puede
-- escribir su propio fichero: <user_id>.<ext>. Máx. 5 MB, solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatar_read   on storage.objects;
drop policy if exists avatar_upload on storage.objects;
drop policy if exists avatar_update on storage.objects;
drop policy if exists avatar_delete on storage.objects;
drop policy if exists avatars_select_own on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;

-- SELECT sobre el propio fichero hace falta para el upsert. No se permite
-- listar el bucket: las URLs públicas no pasan por RLS.
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and split_part(name, '.', 1) = (select auth.uid())::text);
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '.', 1) = (select auth.uid())::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '.', 1) = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and split_part(name, '.', 1) = (select auth.uid())::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and split_part(name, '.', 1) = (select auth.uid())::text);

-- ─── Realtime ───────────────────────────────────────────────────────────────
-- Realtime respeta la RLS: cada cliente solo recibe cambios de sus hogares.
alter publication supabase_realtime add table
  public.tasks,
  public.task_completions,
  public.shopping_items,
  public.house_messages,
  public.chat_messages;
