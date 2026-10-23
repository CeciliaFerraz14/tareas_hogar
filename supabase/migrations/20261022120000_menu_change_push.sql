-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · Avisos al hogar cuando se añade o cambia un plato del menú
--
--   Hasta ahora el menú solo avisaba a quien cocina (enqueue_cook_push, evento
--   cook_assigned). Esto añade un aviso a TODO el hogar cuando alguien:
--     · añade un plato nuevo a un hueco           (INSERT)
--     · cambia el plato o su receta de un hueco    (UPDATE de title/recipe_id)
--   (Quitar un plato no avisa; cambiar solo el cocinero ya lo cubre cook_push.)
--
--   Mismo camino que el resto: trigger → pg_net → Edge Function send-push, con
--   el nuevo evento 'menu_changed'. Se respeta la categoría "menu" de
--   notification_prefs (quien la apague, no recibe nada).
--
--   Anti-spam: notification_throttle agrupa los cambios de una misma persona en
--   un solo aviso por hogar cada 2 minutos (igual que la lista de la compra).
--   Así copiar una semana o rellenar varios huecos seguidos manda un único push.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function private.enqueue_menu_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text := private.vault_secret('push_function_url');
  v_secret text := private.vault_secret('push_webhook_secret');
  v_sent   integer;
begin
  -- Sin configurar (p. ej. en una copia local): no se hace nada.
  if v_url is null or v_secret is null then
    return null;
  end if;

  -- En un UPDATE, solo si de verdad cambió el plato o su receta (no el cocinero,
  -- que ya avisa enqueue_cook_push).
  if tg_op = 'UPDATE'
     and old.title is not distinct from new.title
     and old.recipe_id is not distinct from new.recipe_id then
    return null;
  end if;

  -- Fuera de una acción de usuario, o si es un día ya pasado: nada.
  if auth.uid() is null
     or new.date < (now() at time zone 'Europe/Madrid')::date then
    return null;
  end if;

  -- Un aviso por hogar y persona cada 2 min: agrupa copiar semana / varios huecos.
  insert into private.notification_throttle as t (house_id, actor_id, kind, last_sent_at)
  values (new.house_id, auth.uid(), 'menu', now())
  on conflict (house_id, actor_id, kind) do update
    set last_sent_at = now()
    where t.last_sent_at < now() - interval '2 minutes'
  returning 1 into v_sent;
  if v_sent is null then return null; end if;  -- ya se avisó hace poco

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object(
      'table', 'meal_plan_entries',
      'event', 'menu_changed',
      'actor_id', auth.uid(),
      'record', to_jsonb(new)
    )
  );
  return null;
end;
$$;

revoke all on function private.enqueue_menu_push() from public, anon, authenticated;

create trigger meal_plan_entries_menu_push
  after insert or update of title, recipe_id on public.meal_plan_entries
  for each row execute function private.enqueue_menu_push();
