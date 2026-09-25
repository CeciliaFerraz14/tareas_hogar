-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 06 · Foto del hogar
--
-- Cualquier miembro puede cambiar la foto (el nombre sigue siendo cosa de los
-- propietarios). Como la RLS de houses solo deja actualizar a propietarios, el
-- cambio va por una RPC que comprueba la pertenencia.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.houses add column avatar_url text;

create or replace function public.set_house_avatar(p_house_id uuid, p_avatar_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;

  if not exists (
    select 1 from public.house_members
    where house_id = p_house_id and user_id = auth.uid()
  ) then
    raise exception 'No eres miembro de este hogar.' using errcode = 'HM030';
  end if;

  -- Solo se acepta la foto del propio hogar en nuestro bucket (o null para quitarla).
  if p_avatar_url is not null
     and p_avatar_url not like '%/storage/v1/object/public/house-avatars/' || p_house_id::text || '.%' then
    raise exception 'La foto del hogar no es válida.' using errcode = 'HM031';
  end if;

  update public.houses set avatar_url = p_avatar_url where id = p_house_id;
end;
$$;

revoke all on function public.set_house_avatar(uuid, text) from public, anon;
grant execute on function public.set_house_avatar(uuid, text) to authenticated;

-- ─── Storage: house-avatars/<house_id>.<ext> ────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('house-avatars', 'house-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy house_avatars_select_member on storage.objects for select to authenticated
  using (
    bucket_id = 'house-avatars'
    and split_part(name, '.', 1) in (select h::text from private.user_house_ids() as h)
  );
create policy house_avatars_insert_member on storage.objects for insert to authenticated
  with check (
    bucket_id = 'house-avatars'
    and split_part(name, '.', 1) in (select h::text from private.user_house_ids() as h)
  );
create policy house_avatars_update_member on storage.objects for update to authenticated
  using (
    bucket_id = 'house-avatars'
    and split_part(name, '.', 1) in (select h::text from private.user_house_ids() as h)
  )
  with check (
    bucket_id = 'house-avatars'
    and split_part(name, '.', 1) in (select h::text from private.user_house_ids() as h)
  );
create policy house_avatars_delete_member on storage.objects for delete to authenticated
  using (
    bucket_id = 'house-avatars'
    and split_part(name, '.', 1) in (select h::text from private.user_house_ids() as h)
  );
