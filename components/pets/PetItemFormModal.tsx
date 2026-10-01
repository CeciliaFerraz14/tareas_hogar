import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Alert } from '../../lib/alert';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TargetPicker } from './TargetPicker';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { PET_ITEM_KINDS, targetName, type Pet, type PetItem, type PetItemKind, type PetTarget } from '../../lib/pets';

type PetItemFormModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Tras guardar o borrar: la pantalla recarga. */
  onSaved: () => void;
  houseId: string;
  userId: string;
  pets: Pet[];
  kind: PetItemKind;
  /** Para quién es el apunte nuevo (una mascota o la manada, null). */
  target: PetTarget;
  /** Si se pasa, se edita este apunte; si no, se crea uno nuevo. */
  item: PetItem | null;
};

/** Un pendiente, algo que comprar o una nota, de una mascota o de toda la manada. */
export function PetItemFormModal({ visible, onClose, onSaved, houseId, userId, pets, kind, target: initialTarget, item }: PetItemFormModalProps) {
  const theme = useTheme();
  const meta = PET_ITEM_KINDS[kind];
  const isNote = kind === 'note';

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState<PetTarget>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(item?.title ?? '');
    setTarget(item ? item.pet_id : initialTarget);
  }, [visible]);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { error } = item
        ? await supabase.from('pet_items').update({ title: trimmed, pet_id: target }).eq('id', item.id)
        : await supabase.from('pet_items').insert({ house_id: houseId, pet_id: target, kind, title: trimmed, created_by: userId });
      if (error) { Alert.alert('No se pudo guardar', error.message); return; }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!item) return;
    Alert.alert(`Borrar ${meta.label.toLowerCase()}`, `¿Borrar «${item.title.length > 60 ? `${item.title.slice(0, 59)}…` : item.title}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('pet_items').delete().eq('id', item.id);
          if (error) { Alert.alert('No se pudo borrar', error.message); return; }
          onClose();
          onSaved();
        },
      },
    ]);
  }

  const heading = item
    ? { todo: 'Editar pendiente', buy: 'Editar compra', note: 'Editar nota' }[kind]
    : { todo: 'Nuevo pendiente', buy: 'Para comprar', note: 'Nueva nota' }[kind];

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
            <View style={{ flex: 1 }}>
              <Text variant="heading">{heading}</Text>
              <Text variant="caption" color="secondary">{targetName(target, pets)}</Text>
            </View>
            {item ? (
              <Pressable onPress={confirmDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar">
                <Trash2 size={22} color={theme.colors.danger} />
              </Pressable>
            ) : null}
          </View>

          {pets.length > 1 || target === null ? <TargetPicker pets={pets} value={target} onChange={setTarget} /> : null}

          <Input
            placeholder={meta.placeholder}
            value={title}
            onChangeText={setTitle}
            autoFocus={!item}
            maxLength={meta.max}
            multiline={isNote}
            style={isNote ? { minHeight: 110, textAlignVertical: 'top' } : undefined}
            returnKeyType={isNote ? 'default' : 'done'}
            onSubmitEditing={isNote ? undefined : save}
          />
          <Button title={item ? 'Guardar cambios' : 'Añadir'} loading={saving} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
