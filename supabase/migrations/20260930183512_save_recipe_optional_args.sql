-- ════════════════════════════════════════════════════════════════════════════
-- HOMI · 20 · save_recipe: p_recipe_id y p_notes opcionales
--
-- Con default null, los tipos generados los marcan como opcionales y la app
-- puede no mandarlos (receta nueva, sin notas) sin trucos de tipos. Un
-- parámetro con default tiene que ir detrás de los que no lo tienen, así que
-- cambia el orden: hay que borrar la función y crearla otra vez. La app la
-- llama con nombres (p_title: …), así que el orden le da igual.
-- ════════════════════════════════════════════════════════════════════════════

drop function public.save_recipe(uuid, uuid, text, text, jsonb);

-- p_recipe_id null = receta nueva. p_ingredients = [{"name": "…", "quantity": "…"}, …]
-- en el orden en que se ven; los que no tienen nombre se ignoran.
create function public.save_recipe(
  p_house_id    uuid,
  p_title       text,
  p_ingredients jsonb,
  p_recipe_id   uuid default null,
  p_notes       text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_title       text := btrim(p_title);
  v_notes       text := nullif(btrim(p_notes), '');
  v_ingredients jsonb := case when jsonb_typeof(p_ingredients) = 'array' then p_ingredients else '[]'::jsonb end;
  v_id          uuid;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = 'HM001';
  end if;

  if v_title is null or char_length(v_title) not between 1 and 120 then
    raise exception 'El nombre de la receta debe tener entre 1 y 120 caracteres.' using errcode = 'HM040';
  end if;

  if jsonb_array_length(v_ingredients) > 50 then
    raise exception 'Una receta puede tener como mucho 50 ingredientes.' using errcode = 'HM043';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_ingredients) i
    where char_length(btrim(i->>'name')) > 80 or char_length(btrim(i->>'quantity')) > 30
  ) then
    raise exception 'Cada ingrediente puede tener hasta 80 caracteres, y su cantidad hasta 30.' using errcode = 'HM044';
  end if;

  begin
    if p_recipe_id is null then
      insert into public.recipes (house_id, title, notes, created_by)
      values (p_house_id, v_title, v_notes, auth.uid())
      returning id into v_id;
    else
      -- Siempre se actualiza la fila (aunque no cambie nada) para que el resto
      -- del piso reciba el aviso en tiempo real.
      update public.recipes
         set title = v_title, notes = v_notes
       where id = p_recipe_id and house_id = p_house_id
      returning id into v_id;

      if v_id is null then
        raise exception 'Esta receta ya no existe.' using errcode = 'HM041';
      end if;

      delete from public.recipe_ingredients where recipe_id = v_id and house_id = p_house_id;
    end if;
  exception when unique_violation then
    raise exception 'Ya hay una receta que se llama "%".', v_title using errcode = 'HM042';
  end;

  insert into public.recipe_ingredients (recipe_id, house_id, name, quantity, position)
  select v_id, p_house_id, btrim(x.i->>'name'), nullif(btrim(x.i->>'quantity'), ''), (x.ord - 1)::smallint
  from jsonb_array_elements(v_ingredients) with ordinality as x (i, ord)
  where nullif(btrim(x.i->>'name'), '') is not null;

  return v_id;
end;
$$;

revoke all on function public.save_recipe(uuid, text, jsonb, uuid, text) from public, anon;
grant execute on function public.save_recipe(uuid, text, jsonb, uuid, text) to authenticated;
