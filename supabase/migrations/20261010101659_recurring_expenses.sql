-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 30 · Gastos fijos de la casa
--
-- Alquiler, luz, gas, internet… Lo que cuesta la casa cada mes, de un vistazo.
-- No se reparte ni genera deudas: es aparte de expenses/expense_splits y no
-- toca los balances de la Hucha. Lo ve y lo edita todo el hogar.
--   · period: cada cuánto se paga; la app lo pasa a su parte mensual.
--   · variable: el importe cambia cada vez (luz, gas…) y es aproximado.
-- ════════════════════════════════════════════════════════════════════════════

create table public.recurring_expenses (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 60),
  amount      numeric(12, 2) not null check (amount > 0 and amount < 1000000),
  period      text not null default 'monthly'
                check (period in ('monthly', 'bimonthly', 'quarterly', 'yearly')),
  category    text not null default 'other'
                check (category in ('rent', 'power', 'gas', 'water', 'internet', 'phone',
                                    'insurance', 'community', 'subscription', 'other')),
  variable    boolean not null default false,
  created_by  uuid default auth.uid() references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index recurring_expenses_house_idx      on public.recurring_expenses (house_id, created_at);
create index recurring_expenses_created_by_idx on public.recurring_expenses (created_by);

create trigger recurring_expenses_updated_at before update on public.recurring_expenses
  for each row execute function private.set_updated_at();

grant select,
      insert (house_id, title, amount, period, category, variable, created_by),
      update (title, amount, period, category, variable),
      delete
  on public.recurring_expenses to authenticated;

alter table public.recurring_expenses enable row level security;

create policy recurring_expenses_select on public.recurring_expenses for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy recurring_expenses_insert on public.recurring_expenses for insert to authenticated
  with check (house_id in (select private.user_house_ids()) and created_by = (select auth.uid()));
create policy recurring_expenses_update on public.recurring_expenses for update to authenticated
  using (house_id in (select private.user_house_ids()))
  with check (house_id in (select private.user_house_ids()));
create policy recurring_expenses_delete on public.recurring_expenses for delete to authenticated
  using (house_id in (select private.user_house_ids()));
