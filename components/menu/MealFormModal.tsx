import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Alert } from '../../lib/alert';
import { Trash2 } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { DAY_NAMES, dateKey, shortDate, weekDayOf } from '../../lib/tasks';
import { MEAL_SUGGESTIONS, MEAL_TITLE_MAX, slotLabel, type MealEntry, type MealSlot } from '../../lib/meals';

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
  date,
  slot,
  entry,
}: MealFormModalProps) {
  const theme = useTheme();
  const editing = Boolean(entry);

  const [title, setTitle] = useState('');
  const [cookId, setCookId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Cada vez que se abre, parte del plato del hueco o de un formulario vacío.
  useEffect(() => {
    if (!visible) return;
    setTitle(entry?.title ?? '');
    setCookId(entry?.cook_id ?? null);
    // Solo al abrir: no pisar lo que se está escribiendo si la pantalla recarga.
  }, [visible]);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('¿Qué se come?', 'Escribe el plato o elige una de las opciones rápidas.');
      return;
    }
    setSaving(true);
    try {
      const { error } = entry
        ? await supabase.from('meal_plan_entries').update({ title: trimmed, cook_id: cookId }).eq('id', entry.id)
        : await supabase.from('meal_plan_entries').insert({
            house_id: houseId,
            date: dateKey(date),
            slot,
            title: trimmed,
            cook_id: cookId,
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
            onChangeText={setTitle}
            maxLength={MEAL_TITLE_MAX}
            autoFocus={!editing}
            returnKeyType="done"
            onSubmitEditing={save}
          />

          {/* opciones rápidas */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MEAL_SUGGESTIONS.map((suggestion) => (
              <Pressable key={suggestion} onPress={() => setTitle(suggestion)} accessibilityRole="button">
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

          <Button title={editing ? 'Guardar cambios' : 'Apuntar plato'} loading={saving} onPress={save} />
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
