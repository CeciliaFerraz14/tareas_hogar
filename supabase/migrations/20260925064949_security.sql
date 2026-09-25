-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 03 · Seguridad: privilegios por columna + RLS
--
-- Modelo:
--   · anon no toca ninguna tabla. Todo requiere sesión.
--   · authenticated solo tiene los privilegios que la app usa, y los UPDATE van
--     por columna: nadie puede reescribir autoría, house_id, email ni rol.
--   · Las altas en houses y house_members solo ocurren vía RPC (create_house,
--     accept_invitation), así nadie puede colarse en un hogar ajeno.
--   · Las policies llaman a los helpers dentro de (select …) para que Postgres
--     los evalúe una vez por consulta y no una vez por fila.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Helpers ────────────────────────────────────────────────────────────────
-- security definer: leen house_members sin pasar por su propia RLS (evita
-- recursión). Viven en `private`, así que no son invocables por la API.
create or replace function private.user_house_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select house_id from public.house_members where user_id = (select auth.uid());
$$;

create or replace function private.owned_house_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select house_id from public.house_members
  where user_id = (select auth.uid()) and role = 'owner';
$$;

revoke all on function private.user_house_ids()  from public, anon;
revoke all on function private.owned_house_ids() from public, anon;
grant execute on function private.user_house_ids()  to authenticated;
grant execute on function private.owned_house_ids() to authenticated;

-- ─── Privilegios ────────────────────────────────────────────────────────────
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;

grant select, update (username, avatar_url)                         on public.users to authenticated;
grant select, update (name), delete                                 on public.houses to authenticated;
grant select, delete                                                on public.house_members to authenticated;
grant select, insert (house_id, invited_email), update (status), delete
                                                                    on public.invitations to authenticated;
grant select, insert (house_id, name), update (name), delete        on public.rooms to authenticated;
grant select, insert (room_id, title), update (title), delete       on public.task_templates to authenticated;
grant select,
      insert (house_id, room_id, title, description, assigned_to, due_date, week_day, status, created_by),
      update (room_id, title, description, assigned_to, due_date, week_day, status),
      delete                                                        on public.tasks to authenticated;
grant select, insert (task_id, house_id, date, completed_by), delete on public.task_completions to authenticated;
grant select, insert (house_id, user_id, content), delete           on public.house_messages to authenticated;
grant select, insert (task_id, house_id, user_id, content, image_url), delete
                                                                    on public.chat_messages to authenticated;
grant select,
      insert (house_id, title, added_by),
      update (title, is_purchased, purchased_by),
      delete                                                        on public.shopping_items to authenticated;
grant select, insert (house_id, title, amount, paid_by), delete     on public.expenses to authenticated;
grant select, insert (expense_id, user_id, amount_owed, is_settled), update (is_settled)
                                                                    on public.expense_splits to authenticated;
grant select, insert (house_id, name, type, photo_url), update (name, type, photo_url), delete
                                                                    on public.pets to authenticated;
grant select,
      insert (pet_id, title, assigned_to, due_date, status),
      update (title, assigned_to, due_date, status),
      delete                                                        on public.pet_tasks to authenticated;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.users            enable row level security;
alter table public.houses           enable row level security;
alter table public.house_members    enable row level security;
alter table public.invitations      enable row level security;
alter table public.rooms            enable row level security;
alter table public.task_templates   enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_completions enable row level security;
alter table public.house_messages   enable row level security;
alter table public.chat_messages    enable row level security;
alter table public.shopping_items   enable row level security;
alter table public.expenses         enable row level security;
alter table public.expense_splits   enable row level security;
alter table public.pets             enable row level security;
alter table public.pet_tasks        enable row level security;

-- users: me veo a mí y a quien comparte hogar conmigo; solo edito mi perfil.
create policy users_select on public.users for select to authenticated
  using (
    id = (select auth.uid())
    or id in (
      select m.user_id from public.house_members m
      where m.house_id in (select private.user_house_ids())
    )
  );
create policy users_update on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- houses: alta solo vía create_house. Renombrar/borrar: propietarios.
create policy houses_select on public.houses for select to authenticated
  using (id in (select private.user_house_ids()));
create policy houses_update on public.houses for update to authenticated
  using (id in (select private.owned_house_ids()))
  with check (id in (select private.owned_house_ids()));
create policy houses_delete on public.houses for delete to authenticated
  using (id in (select private.owned_house_ids()));

-- house_members: alta solo vía RPC. Salir uno mismo, o echar si eres propietario.
create policy house_members_select on public.house_members for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy house_members_delete on public.house_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or house_id in (select private.owned_house_ids())
  );

-- invitations: las gestiona el propietario. El invitado entra con accept_invitation.
create policy invitations_select on public.invitations for select to authenticated
  using (house_id in (select private.owned_house_ids()));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    house_id in (select private.owned_house_ids())
    and created_by = (select auth.uid())
  );
create policy invitations_update on public.invitations for update to authenticated
  using (house_id in (select private.owned_house_ids()))
  with check (house_id in (select private.owned_house_ids()));
create policy invitations_delete on public.invitations for delete to authenticated
  using (house_id in (select private.owned_house_ids()));

-- rooms / pets: cualquier miembro del hogar.
create policy rooms_select on public.rooms for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy rooms_insert on public.rooms for insert to authenticated
  with check (house_id in (select private.user_house_ids()));
create policy rooms_update on public.rooms for update to authenticated
  using (house_id in (select private.user_house_ids()))
  with check (house_id in (select private.user_house_ids()));
create policy rooms_delete on public.rooms for delete to authenticated
  using (house_id in (select private.user_house_ids()));

create policy pets_select on public.pets for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy pets_insert on public.pets for insert to authenticated
  with check (house_id in (select private.user_house_ids()));
create policy pets_update on public.pets for update to authenticated
  using (house_id in (select private.user_house_ids()))
  with check (house_id in (select private.user_house_ids()));
create policy pets_delete on public.pets for delete to authenticated
  using (house_id in (select private.user_house_ids()));

-- task_templates: a través de su estancia.
create policy task_templates_all on public.task_templates for all to authenticated
  using (room_id in (select r.id from public.rooms r where r.house_id in (select private.user_house_ids())))
  with check (room_id in (select r.id from public.rooms r where r.house_id in (select private.user_house_ids())));

-- tasks: cualquier miembro; al crear, el autor soy yo.
create policy tasks_select on public.tasks for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    house_id in (select private.user_house_ids())
    and created_by = (select auth.uid())
  );
create policy tasks_update on public.tasks for update to authenticated
  using (house_id in (select private.user_house_ids()))
  with check (house_id in (select private.user_house_ids()));
create policy tasks_delete on public.tasks for delete to authenticated
  using (house_id in (select private.user_house_ids()));

-- task_completions: la FK compuesta ya garantiza que house_id es el de la tarea.
create policy task_completions_select on public.task_completions for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy task_completions_insert on public.task_completions for insert to authenticated
  with check (
    house_id in (select private.user_house_ids())
    and completed_by = (select auth.uid())
  );
create policy task_completions_delete on public.task_completions for delete to authenticated
  using (house_id in (select private.user_house_ids()));

-- Mensajes: leen los miembros; escribo y borro solo los míos.
create policy house_messages_select on public.house_messages for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy house_messages_insert on public.house_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and house_id in (select private.user_house_ids())
  );
create policy house_messages_delete on public.house_messages for delete to authenticated
  using (user_id = (select auth.uid()));

create policy chat_messages_select on public.chat_messages for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and house_id in (select private.user_house_ids())
  );
create policy chat_messages_delete on public.chat_messages for delete to authenticated
  using (user_id = (select auth.uid()));

-- shopping_items
create policy shopping_items_select on public.shopping_items for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy shopping_items_insert on public.shopping_items for insert to authenticated
  with check (
    house_id in (select private.user_house_ids())
    and added_by = (select auth.uid())
  );
create policy shopping_items_update on public.shopping_items for update to authenticated
  using (house_id in (select private.user_house_ids()))
  with check (
    house_id in (select private.user_house_ids())
    and (
      purchased_by is null
      or purchased_by in (select m.user_id from public.house_members m
                          where m.house_id = shopping_items.house_id)
    )
  );
create policy shopping_items_delete on public.shopping_items for delete to authenticated
  using (house_id in (select private.user_house_ids()));

-- expenses: se crean con create_expense. Borra quien lo creó o un propietario.
create policy expenses_select on public.expenses for select to authenticated
  using (house_id in (select private.user_house_ids()));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (
    house_id in (select private.user_house_ids())
    and created_by = (select auth.uid())
    and paid_by in (select m.user_id from public.house_members m where m.house_id = expenses.house_id)
  );
create policy expenses_delete on public.expenses for delete to authenticated
  using (
    created_by = (select auth.uid())
    or house_id in (select private.owned_house_ids())
  );

-- expense_splits: las ve el hogar; las crea quien crea el gasto; salda el
-- deudor o quien pagó.
create policy expense_splits_select on public.expense_splits for select to authenticated
  using (
    expense_id in (
      select e.id from public.expenses e where e.house_id in (select private.user_house_ids())
    )
  );
create policy expense_splits_insert on public.expense_splits for insert to authenticated
  with check (
    exists (
      select 1
      from public.expenses e
      join public.house_members m on m.house_id = e.house_id and m.user_id = expense_splits.user_id
      where e.id = expense_splits.expense_id
        and e.created_by = (select auth.uid())
    )
  );
create policy expense_splits_update on public.expense_splits for update to authenticated
  using (
    user_id = (select auth.uid())
    or expense_id in (select e.id from public.expenses e where e.paid_by = (select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    or expense_id in (select e.id from public.expenses e where e.paid_by = (select auth.uid()))
  );

-- pet_tasks: a través de la mascota; solo se asigna a miembros de ese hogar.
create policy pet_tasks_select on public.pet_tasks for select to authenticated
  using (pet_id in (select p.id from public.pets p where p.house_id in (select private.user_house_ids())));
create policy pet_tasks_insert on public.pet_tasks for insert to authenticated
  with check (
    exists (
      select 1 from public.pets p
      where p.id = pet_tasks.pet_id
        and p.house_id in (select private.user_house_ids())
        and (
          pet_tasks.assigned_to is null
          or exists (select 1 from public.house_members m
                     where m.house_id = p.house_id and m.user_id = pet_tasks.assigned_to)
        )
    )
  );
create policy pet_tasks_update on public.pet_tasks for update to authenticated
  using (pet_id in (select p.id from public.pets p where p.house_id in (select private.user_house_ids())))
  with check (
    exists (
      select 1 from public.pets p
      where p.id = pet_tasks.pet_id
        and p.house_id in (select private.user_house_ids())
        and (
          pet_tasks.assigned_to is null
          or exists (select 1 from public.house_members m
                     where m.house_id = p.house_id and m.user_id = pet_tasks.assigned_to)
        )
    )
  );
create policy pet_tasks_delete on public.pet_tasks for delete to authenticated
  using (pet_id in (select p.id from public.pets p where p.house_id in (select private.user_house_ids())));
