import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Alert } from '../../lib/alert';
import { Plus, Trash2, X } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { RECIPE_LIMITS, type Recipe } from '../../lib/meals';

type RecipeFormModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Tras guardar o borrar: la pantalla recarga el recetario. */
  onSaved: () => void;
  houseId: string;
  /** Si se pasa, se edita esta receta; si no, se crea una nueva. */
  recipe: Recipe | null;
};

/** Una fila del formulario. `key` es solo para React: las filas se añaden y se quitan. */
type IngredientRow = { key: number; name: string; quantity: string };

/** Formulario de receta: nombre, ingredientes (con cantidad) y notas. */
export function RecipeFormModal({ visible, onClose, onSaved, houseId, recipe }: RecipeFormModalProps) {
  const theme = useTheme();
  const editing = Boolean(recipe);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<IngredientRow[]>([]);
  // La fila recién añadida recibe el foco para ir escribiendo seguido.
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const nextKey = useRef(0);

  const newRow = (name = '', quantity = ''): IngredientRow => ({ key: nextKey.current++, name, quantity });

  // Cada vez que se abre, parte de la receta a editar o de un formulario vacío.
  useEffect(() => {
    if (!visible) return;
    setTitle(recipe?.title ?? '');
    setNotes(recipe?.notes ?? '');
    const initial = recipe?.ingredients.map((i) => newRow(i.name, i.quantity ?? '')) ?? [];
    setRows(initial.length > 0 ? initial : [newRow()]);
    setFocusKey(null);
    // Solo al abrir: no pisar lo que se está escribiendo si la pantalla recarga.
  }, [visible]);

  function updateRow(key: number, patch: Partial<Omit<IngredientRow, 'key'>>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (rows.length >= RECIPE_LIMITS.ingredients) return;
    const row = newRow();
    setRows((prev) => [...prev, row]);
    setFocusKey(row.key);
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length === 1 ? [newRow()] : prev.filter((r) => r.key !== key)));
  }

  async function save() {
    if (!title.trim()) {
      Alert.alert('Falta el nombre', 'Escribe cómo se llama la receta.');
      return;
    }
    setSaving(true);
    try {
      // Todo o nada: la receta y sus ingredientes se guardan en la misma transacción.
      const { error } = await supabase.rpc('save_recipe', {
        p_house_id: houseId,
        p_recipe_id: recipe?.id,
        p_title: title,
        p_notes: notes,
        p_ingredients: rows
          .filter((r) => r.name.trim())
          .map((r) => ({ name: r.name, quantity: r.quantity })),
      });
      if (error) { Alert.alert('No se pudo guardar la receta', error.message); return; }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!recipe) return;
    Alert.alert(
      'Borrar receta',
      `¿Borrar "${recipe.title}" del recetario? Los platos del menú que la usan se quedan, pero sin sus ingredientes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
            setDeleting(false);
            if (error) { Alert.alert('No se pudo borrar la receta', error.message); return; }
            onClose();
            onSaved();
          },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={{ flex: 1, minHeight: 60, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
        <ScrollView
          style={{ flexGrow: 0, maxHeight: '88%', backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl }}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 36 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="heading" style={{ flex: 1 }}>{editing ? 'Editar receta' : 'Nueva receta'}</Text>
            {editing ? (
              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Borrar receta"
              >
                <Trash2 size={22} color={theme.colors.danger} />
              </Pressable>
            ) : null}
          </View>

          <Input
            label="Nombre"
            placeholder="Ej. Lentejas de la abuela"
            value={title}
            onChangeText={setTitle}
            maxLength={RECIPE_LIMITS.title}
            autoFocus={!editing}
          />

          {/* ingredientes */}
          <View style={{ gap: 8 }}>
            <Text variant="label" color="secondary">Ingredientes</Text>
            {rows.map((row, index) => (
              <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Input
                  containerStyle={{ flex: 1 }}
                  style={{ paddingVertical: 10, paddingHorizontal: theme.spacing.md }}
                  placeholder={index === 0 ? 'Ej. Lentejas' : 'Ingrediente'}
                  value={row.name}
                  onChangeText={(name) => updateRow(row.key, { name })}
                  maxLength={RECIPE_LIMITS.ingredient}
                  autoFocus={row.key === focusKey}
                  accessibilityLabel={`Ingrediente ${index + 1}`}
                />
                <Input
                  containerStyle={{ width: 92 }}
                  style={{ paddingVertical: 10, paddingHorizontal: theme.spacing.md }}
                  placeholder={index === 0 ? '400 g' : 'Cant.'}
                  value={row.quantity}
                  onChangeText={(quantity) => updateRow(row.key, { quantity })}
                  maxLength={RECIPE_LIMITS.quantity}
                  returnKeyType={index === rows.length - 1 ? 'next' : 'done'}
                  onSubmitEditing={index === rows.length - 1 ? addRow : undefined}
                  accessibilityLabel={`Cantidad del ingrediente ${index + 1}`}
                />
                <Pressable
                  onPress={() => removeRow(row.key)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ingrediente ${index + 1}`}
                >
                  <X size={18} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            ))}
            {rows.length < RECIPE_LIMITS.ingredients ? (
              <Pressable onPress={addRow} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: theme.radii.pill,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: theme.colors.border,
                  }}
                >
                  <Plus size={14} color={theme.colors.textSecondary} />
                  <Text variant="label" color="secondary">Añadir ingrediente</Text>
                </View>
              </Pressable>
            ) : null}
          </View>

          <Input
            label="Notas (opcional)"
            placeholder="Pasos, trucos, para cuántos es…"
            value={notes}
            onChangeText={setNotes}
            maxLength={RECIPE_LIMITS.notes}
            multiline
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />

          <Button title={editing ? 'Guardar cambios' : 'Guardar receta'} loading={saving} onPress={save} />
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
