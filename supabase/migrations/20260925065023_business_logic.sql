-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 04 · Lógica de negocio: RPCs e invariantes
--
-- Los mensajes de error van en español y llevan un código propio (HM0xx) para
-- que la app pueda mostrarlos tal cual o reconocerlos.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Invariante: un hogar con gente siempre tiene propietario ───────────────
-- Si sale el último propietario, hereda el rol el miembro más antiguo. Si sale
-- el último miembro, el hogar se borra (no quedan hogares huérfanos).
create or replace function private.handle_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heir uuid;
begin
  if not exists (select 1 from public.house_members where house_id = old.house_id) then
    delete from public.houses where id = old.house_id;
    return null;
  end if;

  if old.role = 'owner' and not exists (
    select 1 from public.house_members where house_id = old.house_id and role = 'owner'
  ) then
    select user_id into v_heir
    from public.house_members
    where house_id = old.house_id
    order by joined_at, user_id
    limit 1;

    update public.house_members
    set role = 'owner'
    where house_id = old.house_id and user_id = v_heir;
  end if;

  return null;
end;
$$;

revoke all on function private.handle_member_removed() from public, anon, authenticated;

create trigger house_members_after_delete
  after delete on public.house_members
  for each row execute function private.handle_member_removed();

-- ─── Invariante: settled_at acompaña a is_settled ───────────────────────────
create or replace function private.sync_settled_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.settled_at := case when new.is_settled then coalesce(new.settled_at, now()) end;
  return new;
end;
$$;

create trigger expense_splits_settled_at
  before insert or update of is_settled on public.expense_splits
  for each row execute function private.sync_settled_at();

-- ─── RPC: crear hogar ───────────────────────────────────────────────────────
-- security definer: es la única vía para dar de alta un hogar y su propietario.
create or replace function public.create_house(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id  uuid := auth.uid();
  v_name     text := btrim(p_name);
  v_house_id uuid;
begin
  if v_user_id is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;

  if v_name is null or char_length(v_name) not between 1 and 60 then
    raise exception 'El nombre del hogar debe tener entre 1 y 60 caracteres.' using errcode = 'HM002';
  end if;

  insert into public.houses (name, created_by)
  values (v_name, v_user_id)
  returning id into v_house_id;

  insert into public.house_members (house_id, user_id, role)
  values (v_house_id, v_user_id, 'owner');

  return v_house_id;
end;
$$;

-- ─── RPC: unirse con un código de invitación ────────────────────────────────
-- security definer: el invitado no puede leer invitations (RLS) ni insertarse
-- en house_members por su cuenta.
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_inv     public.invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;

  select * into v_inv
  from public.invitations
  where token = btrim(lower(p_token))
  for update;

  if not found then
    raise exception 'El código no es válido.' using errcode = 'HM010';
  end if;

  -- Ya soy miembro: no gasto la invitación, simplemente entro.
  if exists (
    select 1 from public.house_members
    where house_id = v_inv.house_id and user_id = v_user_id
  ) then
    return v_inv.house_id;
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'Este código ya se ha usado o se ha anulado.' using errcode = 'HM011';
  end if;

  if v_inv.expires_at < now() then
    raise exception 'Este código ha caducado. Pide uno nuevo.' using errcode = 'HM012';
  end if;

  insert into public.house_members (house_id, user_id, role)
  values (v_inv.house_id, v_user_id, 'member');

  update public.invitations set status = 'accepted' where id = v_inv.id;

  return v_inv.house_id;
end;
$$;

-- ─── RPC: crear gasto con su reparto ────────────────────────────────────────
-- security invoker: corre con los permisos (y la RLS) de quien llama.
-- El reparto se hace en céntimos y el resto se reparte de uno en uno, así la
-- suma de las partes es siempre exactamente el importe.
create or replace function public.create_expense(
  p_house_id    uuid,
  p_title       text,
  p_amount      numeric,
  p_paid_by     uuid,
  p_split_among uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_title      text := btrim(p_title);
  v_members    uuid[];
  v_n          int;
  v_cents      bigint;
  v_base       bigint;
  v_rest       int;
  v_expense_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;

  if v_title is null or char_length(v_title) not between 1 and 120 then
    raise exception 'El título debe tener entre 1 y 120 caracteres.' using errcode = 'HM020';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'El importe debe ser mayor que 0 y con 2 decimales como mucho.' using errcode = 'HM021';
  end if;

  select array_agg(distinct u) into v_members from unnest(p_split_among) as u;
  v_n := coalesce(cardinality(v_members), 0);

  if v_n = 0 then
    raise exception 'Elige al menos una persona para repartir el gasto.' using errcode = 'HM022';
  end if;

  if (
    select count(*) from public.house_members
    where house_id = p_house_id and user_id = any (v_members || p_paid_by)
  ) <> cardinality(array(select distinct u from unnest(v_members || p_paid_by) u)) then
    raise exception 'Quien paga y quienes reparten tienen que ser miembros del hogar.' using errcode = 'HM023';
  end if;

  insert into public.expenses (house_id, title, amount, paid_by)
  values (p_house_id, v_title, p_amount, p_paid_by)
  returning id into v_expense_id;

  v_cents := (p_amount * 100)::bigint;
  v_base  := v_cents / v_n;
  v_rest  := (v_cents % v_n)::int;

  insert into public.expense_splits (expense_id, user_id, amount_owed, is_settled)
  select
    v_expense_id,
    m.user_id,
    (v_base + case when m.ord <= v_rest then 1 else 0 end) / 100.0,
    m.user_id = p_paid_by
  from unnest(v_members) with ordinality as m (user_id, ord);

  return v_expense_id;
end;
$$;

-- Las RPC solo para usuarios con sesión.
revoke all on function public.create_house(text)                               from public, anon;
revoke all on function public.accept_invitation(text)                          from public, anon;
revoke all on function public.create_expense(uuid, text, numeric, uuid, uuid[]) from public, anon;
grant execute on function public.create_house(text)                               to authenticated;
grant execute on function public.accept_invitation(text)                          to authenticated;
grant execute on function public.create_expense(uuid, text, numeric, uuid, uuid[]) to authenticated;

-- Funciones nuevas en public: no ejecutables por defecto (hay que concederlas).
alter default privileges in schema public revoke execute on functions from public, anon;
