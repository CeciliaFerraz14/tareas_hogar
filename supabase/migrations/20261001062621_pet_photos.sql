-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 23 · Fotos de las mascotas
--
-- Bucket público pet-photos con un fichero por mascota: <house_id>/<pet_id>.<ext>.
-- Cualquier miembro del hogar puede poner o cambiar la foto de sus mascotas
-- (pets.photo_url ya se podía actualizar). Para que nadie apunte la foto a una
-- URL cualquiera, un CHECK solo acepta la de esa mascota en este bucket.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- La primera carpeta es el hogar. SELECT hace falta para el upsert; las URLs
-- públicas no pasan por RLS, así que no se puede listar el bucket.
create policy pet_photos_select_member on storage.objects for select to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] in (select h::text from private.user_house_ids() as h));
create policy pet_photos_insert_member on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-photos' and (storage.foldername(name))[1] in (select h::text from private.user_house_ids() as h));
create policy pet_photos_update_member on storage.objects for update to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] in (select h::text from private.user_house_ids() as h))
  with check (bucket_id = 'pet-photos' and (storage.foldername(name))[1] in (select h::text from private.user_house_ids() as h));
create policy pet_photos_delete_member on storage.objects for delete to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] in (select h::text from private.user_house_ids() as h));

alter table public.pets add constraint pets_photo_from_bucket check (
  photo_url is null
  or photo_url like '%/storage/v1/object/public/pet-photos/' || house_id::text || '/' || id::text || '.%'
);
