-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 33 · Editar y borrar gastos compartidos
--
-- Quien apuntó el gasto, quien lo pagó o un propietario del hogar puede
-- corregirlo o borrarlo.
--   · update_expense: cambia concepto, importe, quién pagó y entre quién se
--     reparte, y rehace el reparto en céntimos como create_expense. Si alguien
--     ya ha liquidado su parte, solo deja cambiar el concepto: cambiar el
--     reparto descuadraría lo que ya se pagó.
--   · El borrado ya lo hacía la RLS (quien lo apuntó o un propietario); ahora
--     también quien lo pagó.
-- ════════════════════════════════════════════════════════════════════════════

alter policy expenses_delete on public.expenses
  using (
    created_by = (select auth.uid())
    or paid_by = (select auth.uid())
    or house_id in (select private.owned_house_ids())
  );

create or replace function public.update_expense(
  p_expense_id  uuid,
  p_title       text,
  p_amount      numeric,
  p_paid_by     uuid,
  p_split_among uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title    text := btrim(p_title);
  v_expense  public.expenses;
  v_members  uuid[];
  v_current  uuid[];
  v_settled  boolean;
  v_n        int;
  v_cents    bigint;
  v_base     bigint;
  v_rest     int;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;

  select * into v_expense from public.expenses where id = p_expense_id for update;
  if v_expense.id is null
     or v_expense.house_id not in (select private.user_house_ids())
     or not (
       v_expense.created_by = auth.uid()
       or v_expense.paid_by = auth.uid()
       or v_expense.house_id in (select private.owned_house_ids())
     ) then
    raise exception 'Solo puede cambiarlo quien lo apuntó, quien lo pagó o un propietario del hogar.'
      using errcode = '42501';
  end if;

  if v_title is null or char_length(v_title) not between 1 and 120 then
    raise exception 'El título debe tener entre 1 y 120 caracteres.' using errcode = 'HM020';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'El importe debe ser mayor que 0 y con 2 decimales como mucho.' using errcode = 'HM021';
  end if;

  select array_agg(distinct u order by u) into v_members from unnest(p_split_among) as u;
  v_n := coalesce(cardinality(v_members), 0);

  if v_n = 0 then
    raise exception 'Elige al menos una persona para repartir el gasto.' using errcode = 'HM022';
  end if;

  select array_agg(user_id order by user_id) into v_current
  from public.expense_splits where expense_id = p_expense_id;

  -- ¿Alguien (que no sea quien pagó) ya ha liquidado su parte?
  select exists (
    select 1 from public.expense_splits
    where expense_id = p_expense_id and is_settled and user_id is distinct from v_expense.paid_by
  ) into v_settled;

  if p_amount = v_expense.amount
     and p_paid_by is not distinct from v_expense.paid_by
     and v_members = v_current then
    -- Solo cambia el concepto: el reparto se queda como está.
    update public.expenses set title = v_title where id = p_expense_id;
    return;
  end if;

  if v_settled then
    raise exception 'Alguien ya ha liquidado su parte. Para cambiar el importe o el reparto, bórralo y apúntalo de nuevo.'
      using errcode = 'HM024';
  end if;

  if (
    select count(*) from public.house_members
    where house_id = v_expense.house_id and user_id = any (v_members || p_paid_by)
  ) <> cardinality(array(select distinct u from unnest(v_members || p_paid_by) u)) then
    raise exception 'Quien paga y quienes reparten tienen que ser miembros del hogar.' using errcode = 'HM023';
  end if;

  update public.expenses
  set title = v_title, amount = p_amount, paid_by = p_paid_by
  where id = p_expense_id;

  delete from public.expense_splits where expense_id = p_expense_id;

  v_cents := (p_amount * 100)::bigint;
  v_base  := v_cents / v_n;
  v_rest  := (v_cents % v_n)::int;

  insert into public.expense_splits (expense_id, user_id, amount_owed, is_settled)
  select
    p_expense_id,
    m.user_id,
    (v_base + case when m.ord <= v_rest then 1 else 0 end) / 100.0,
    m.user_id = p_paid_by
  from unnest(v_members) with ordinality as m (user_id, ord);
end;
$$;

revoke all on function public.update_expense(uuid, text, numeric, uuid, uuid[]) from public, anon;
grant execute on function public.update_expense(uuid, text, numeric, uuid, uuid[]) to authenticated;
