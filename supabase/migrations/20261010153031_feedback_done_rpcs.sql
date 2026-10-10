-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 32 · Cerrar sugerencias desde el Buzón avisando a quien las mandó
--
--   · close_feedback(id, reply): la marca como hecha, guarda la nota y avisa.
--   · set_feedback_status: igual que antes (vista, reabrir…), y si es 'done'
--     también avisa, para que no haya un camino que se lo salte.
--   · list_inbox: como list_feedback, más la nota, si ya se avisó y si queda
--     alguien a quien avisar (la cuenta puede estar borrada).
-- list_feedback se queda por compatibilidad (cambiar lo que devuelve obliga a
-- borrarla); la app ya usa list_inbox.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function private.close_feedback(p_id uuid, p_status text, p_reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.feedback;
begin
  update public.feedback
  set status = p_status,
      reply  = case when p_status = 'done' and nullif(btrim(p_reply), '') is not null
                    then btrim(p_reply) else reply end
  where id = p_id
  returning * into v_row;

  if v_row.status = 'done' and v_row.done_notified_at is null and v_row.user_id is not null then
    update public.feedback set done_notified_at = now() where id = p_id returning * into v_row;
    perform private.enqueue_feedback_done_push(v_row);
  end if;
end;
$$;

revoke all on function private.close_feedback(uuid, text, text) from public, anon, authenticated;

create or replace function public.set_feedback_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Solo para quien lleva HOMI' using errcode = '42501';
  end if;
  perform private.close_feedback(p_id, p_status, null);
end;
$$;

create or replace function public.close_feedback(p_id uuid, p_reply text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Solo para quien lleva HOMI' using errcode = '42501';
  end if;
  perform private.close_feedback(p_id, 'done', p_reply);
end;
$$;

revoke all on function public.close_feedback(uuid, text) from public, anon;
grant execute on function public.close_feedback(uuid, text) to authenticated;

create or replace function public.list_inbox()
returns table (
  id uuid,
  kind text,
  message text,
  app_version text,
  device text,
  status text,
  created_at timestamptz,
  author_name text,
  author_email text,
  has_author boolean,
  reply text,
  done_notified_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Solo para quien lleva HOMI' using errcode = '42501';
  end if;
  return query
    select f.id, f.kind, f.message, f.app_version, f.device, f.status, f.created_at,
           nullif(btrim(u.username), ''), u.email, f.user_id is not null, f.reply, f.done_notified_at
    from public.feedback f
    left join public.users u on u.id = f.user_id
    order by f.created_at desc
    limit 500;
end;
$$;

revoke all on function public.list_inbox() from public, anon;
grant execute on function public.list_inbox() to authenticated;
