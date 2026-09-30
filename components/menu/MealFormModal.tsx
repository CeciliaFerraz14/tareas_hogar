import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Alert } from '../../lib/alert';
import { BookOpen, Trash2 } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { DAY_NAMES, dateKey, shortDate, weekDayOf } from '../../lib/tasks';
import {
  MEAL_SUGGESTIONS,
  MEAL_TITLE_MAX,
  ingredientsSummary,
  normalizeTitle,
  slotLabel,
  type MealEntry,
  type MealSlot,
  type Recipe,
} from '../../lib/meals';

/** Cuántas recetas se sugieren a la vez. */
const MAX_RECIPE_CHIPS = 8;

export type MealMember = {
  user_id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
};

type MealFormModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Tras guardar o borrar: la pantalla recarga el menú. */
  onSaved: () => void;
  houseId: string;
  userId: string;
  members: MealMember[];
  /** El recetario del hogar, para elegir el plato de ahí. */
  recipes: Recipe[];
  /** Quién ha dicho si come en casa en este hueco (user_id → sí/no). */
  attendance: Map<string, boolean>;
  /** El hueco que se está rellenando. */
  date: Date;
  slot: MealSlot;
  /** Si ya hay plato en ese hueco, se edita; si no, se crea. */
  entry: MealEntry | null;
};

/** Hoja para apuntar (o cambiar) el plato de una comida o cena. */
export function MealFormModal({
  visible,
  onClose,
  onSaved,
  houseId,
  userId,
  members,
  recipes,
  attendance,
  date,
  slot,
  entry,
}: MealFormModalProps) {
  const theme = useTheme();
  const editing = Boolean(entry);

  const [title, setTitle] = useState('');
  const [cookId, setCookId] = useState<string | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  // Mi respuesta a "¿comes en casa?" (null = sin contestar). Se guarda al tocarla.
  const [myEating, setMyEating] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Cada vez que se abre, parte del plato del hueco o de un formulario vacío.
  useEffect(() => {
    if (!visible) return;
    setTitle(entry?.title ?? '');
    setCookId(entry?.cook_id ?? null);
    setRecipeId(entry?.recipe_id ?? null);
    setMyEating(attendance.get(userId) ?? null);
    // Solo al abrir: no pisar lo que se está escribiendo si la pantalla recarga.
  }, [visible]);

  const selectedRecipe = recipes.find((r) => r.id === recipeId) ?? null;

  // Si se cambia el texto y ya no es el de la receta elegida, deja de ser esa receta.
  function changeTitle(text: string) {
    setTitle(text);
    if (selectedRecipe && normalizeTitle(text) !== normalizeTitle(selectedRecipe.title)) setRecipeId(null);
  }

  function pickRecipe(recipe: Recipe) {
    setTitle(recipe.title);
    setRecipeId(recipe.id);
  }

  // Recetas que encajan con lo escrito (todas si no hay nada escrito).
  const query = normalizeTitle(title);
  const recipeChips = (query && !selectedRecipe
    ? recipes.filter((r) => normalizeTitle(r.title).includes(query))
    : recipes
  ).slice(0, MAX_RECIPE_CHIPS);

  // Va aparte del plato: se puede contestar aunque aún no haya nada apuntado.
  async function answerEating(value: boolean) {
    const previous = myEating;
    const next = previous === value ? null : value; // tocar la misma respuesta la quita
    setMyEating(next);
    const { error } = await supabase.rpc('set_meal_attendance', {
      p_house_id: houseId,
      p_date: dateKey(date),
      p_slot: slot,
      p_eating: next ?? undefined,
    });
    if (error) {
      setMyEating(previous);
      Alert.alert('No se pudo guardar tu respuesta', error.message);
      return;
    }
    onSaved();
  }

  const nameOf = (id: string) => {
    const m = members.find((x) => x.user_id === id);
    return m?.username?.trim() || m?.email.split('@')[0] || '—';
  };
  const others = [...attendance.entries()].filter(([id]) => id !== userId);
  const othersYes = others.filter(([, eating]) => eating).map(([id]) => nameOf(id));
  const othersNo = others.filter(([, eating]) => !eating).map(([id]) => nameOf(id));

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('¿Qué se come?', 'Escribe el plato o elige una de las opciones rápidas.');
      return;
    }
    // Escrito a mano pero igual que una receta del recetario: se enlaza con ella.
    const recipe = selectedRecipe ?? recipes.find((r) => normalizeTitle(r.title) === normalizeTitle(trimmed)) ?? null;
    const fields = { title: recipe?.title ?? trimmed, cook_id: cookId, recipe_id: recipe?.id ?? null };
    setSaving(true);
    try {
      const { error } = entry
        ? await supabase.from('meal_plan_entries').update(fields).eq('id', entry.id)
        : await supabase.from('meal_plan_entries').insert({
            ...fields,
            house_id: houseId,
            date: dateKey(date),
            slot,
            created_by: userId,
          });
      if (error) {
        // unique (house_id, date, slot): alguien ha rellenado este hueco a la vez.
        if (error.code === '23505') {
          Alert.alert('Alguien se te ha adelantado', 'Otra persona acaba de apuntar un plato aquí. Ábrelo de nuevo para cambiarlo.');
          onClose();
          onSaved();
          return;
        }
        Alert.alert('No se pudo guardar el plato', error.message);
        return;
      }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!entry) return;
    Alert.alert('Quitar plato', `¿Quitar "${entry.title}" del menú?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const { error } = await supabase.from('meal_plan_entries').delete().eq('id', entry.id);
          setDeleting(false);
          if (error) { Alert.alert('No se pudo quitar el plato', error.message); return; }
          onClose();
          onSaved();
        },
      },
    ]);
  }

  const chip = (selected: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
        <ScrollView
          style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl }}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 36 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{slotLabel(slot)}</Text>
              <Text variant="caption" color="secondary">
                {`${DAY_NAMES[weekDayOf(date)]}, ${shortDate(dateKey(date))}`}
              </Text>
            </View>
            {editing ? (
              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Quitar plato"
              >
                <Trash2 size={22} color={theme.colors.danger} />
              </Pressable>
            ) : null}
          </View>

          <Input
            label="Plato"
            placeholder={slot === 'lunch' ? 'Ej. Lentejas' : 'Ej. Tortilla de patatas'}
            value={title}
            onChangeText={changeTitle}
            maxLength={MEAL_TITLE_MAX}
            autoFocus={!editing}
            returnKeyType="done"
            onSubmitEditing={save}
          />

          {selectedRecipe ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8 }}>
              <BookOpen size={14} color={theme.colors.accent} />
              <Text variant="caption" color="secondary" style={{ flex: 1 }} numberOfLines={2}>
                {selectedRecipe.ingredients.length > 0
                  ? `Del recetario · ${ingredientsSummary(selectedRecipe.ingredients)}`
                  : 'Del recetario · sin ingredientes todavía'}
              </Text>
            </View>
          ) : null}

          {/* del recetario */}
          {recipeChips.length > 0 ? (
            <View style={{ gap: 6 }}>
              <Text variant="label" color="secondary">Del recetario</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {recipeChips.map((recipe) => (
                    <Pressable key={recipe.id} onPress={() => pickRecipe(recipe)} accessibilityRole="button" accessibilityState={{ selected: recipe.id === recipeId }}>
                      <View style={{ ...chip(recipe.id === recipeId), flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <BookOpen size={14} color={recipe.id === recipeId ? theme.colors.textInverse : theme.colors.textSecondary} />
                        <Text variant="label" color={recipe.id === recipeId ? 'inverse' : 'secondary'}>{recipe.title}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {/* opciones rápidas */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MEAL_SUGGESTIONS.map((suggestion) => (
              <Pressable key={suggestion} onPress={() => changeTitle(suggestion)} accessibilityRole="button">
                <View style={chip(title.trim() === suggestion)}>
                  <Text variant="label" color={title.trim() === suggestion ? 'inverse' : 'secondary'}>{suggestion}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* quién cocina */}
          {members.length > 0 ? (
            <View style={{ gap: 6 }}>
              <Text variant="label" color="secondary">Cocina</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Pressable onPress={() => setCookId(null)} accessibilityLabel="Nadie en concreto">
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cookId === null ? theme.colors.primary : theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: cookId === null ? 0 : 1.5, borderColor: theme.colors.border }}>
                      <Text variant="caption" color={cookId === null ? 'inverse' : 'secondary'}>—</Text>
                    </View>
                  </Pressable>
                  {members.map((m) => (
                    <Pressable key={m.user_id} onPress={() => setCookId(m.user_id)} accessibilityLabel={m.username ?? m.email}>
                      <View style={{ borderRadius: 22, borderWidth: cookId === m.user_id ? 2.5 : 0, borderColor: theme.colors.primary }}>
                        <Avatar uri={m.avatar_url} name={m.username ?? m.email} size={40} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {/* ¿comes en casa? */}
          <View style={{ gap: 6 }}>
            <Text variant="label" color="secondary">{slot === 'lunch' ? '¿Comes en casa?' : '¿Cenas en casa?'}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                { value: true, label: 'Sí' },
                { value: false, label: 'No' },
              ] as const).map(({ value, label }) => (
                <Pressable
                  key={label}
                  onPress={() => void answerEating(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: myEating === value }}
                >
                  <View style={{ ...chip(myEating === value), minWidth: 64, alignItems: 'center' }}>
                    <Text variant="label" color={myEating === value ? 'inverse' : 'secondary'}>{label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {othersYes.length > 0 || othersNo.length > 0 ? (
              <Text variant="caption" color="secondary">
                {[
                  othersYes.length > 0 ? `${slot === 'lunch' ? 'Comen' : 'Cenan'}: ${othersYes.join(', ')}` : null,
                  othersNo.length > 0 ? `No: ${othersNo.join(', ')}` : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>

          <Button title={editing ? 'Guardar cambios' : 'Apuntar plato'} loading={saving} onPress={save} />
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
