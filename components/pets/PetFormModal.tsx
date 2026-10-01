import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Camera, Check, Trash2 } from 'lucide-react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Alert } from '../../lib/alert';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { chooseImageSource, pickSquareImage, uploadPublicImage, type ImageSource } from '../../lib/images';
import { PetAvatar } from './PetAvatar';
import { useTheme } from '../../lib/theme';
import { dateKey } from '../../lib/tasks';
import {
  PET_PHOTOS_BUCKET,
  PET_TYPES,
  petPhotoPath,
  routineRows,
  scheduleLabel,
  suggestedRoutines,
  type Pet,
  type PetTypeValue,
} from '../../lib/pets';

type PetFormModalProps = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  houseId: string;
  userId: string;
  /** Si se pasa, se edita esta mascota; si no, se crea una nueva. */
  pet: Pet | null;
};

const isPetType = (v: string | null): v is PetTypeValue => PET_TYPES.some((t) => t.value === v);

/**
 * Nueva mascota (con sus rutinas de siempre ya propuestas según el tipo) o
 * editar su nombre y tipo.
 */
export function PetFormModal({ visible, onClose, onSaved, houseId, userId, pet }: PetFormModalProps) {
  const theme = useTheme();
  const editing = Boolean(pet);

  const [name, setName] = useState('');
  const [type, setType] = useState<PetTypeValue>('perro');
  // Índices de las rutinas sugeridas que se crearán (todas marcadas al principio).
  const [picked, setPicked] = useState<Set<number>>(new Set());
  // Foto elegida (se sube al guardar) o petición de quitar la que tiene.
  const [photoAsset, setPhotoAsset] = useState<ImagePickerAsset | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestions = suggestedRoutines(type);

  useEffect(() => {
    if (!visible) return;
    setName(pet?.name ?? '');
    const initialType = isPetType(pet?.type ?? null) ? (pet?.type as PetTypeValue) : 'perro';
    setType(initialType);
    setPicked(new Set(suggestedRoutines(initialType).map((_, i) => i)));
    setPhotoAsset(null);
    setRemovePhoto(false);
  }, [visible]);

  const photoPreview = photoAsset?.uri ?? (removePhoto ? null : (pet?.photo_url ?? null));

  async function pickPhoto(source: ImageSource) {
    const asset = await pickSquareImage(source);
    if (!asset) return;
    setPhotoAsset(asset);
    setRemovePhoto(false);
  }

  /** Sube la foto elegida y la guarda en la mascota. Devuelve el error, si lo hay. */
  async function savePhoto(petId: string): Promise<string | null> {
    if (photoAsset) {
      const { url, error } = await uploadPublicImage(PET_PHOTOS_BUCKET, petPhotoPath(houseId, petId), photoAsset);
      if (error || !url) return error ?? 'No se pudo subir la foto.';
      const { error: updateError } = await supabase.from('pets').update({ photo_url: url }).eq('id', petId);
      return updateError?.message ?? null;
    }
    if (removePhoto && pet?.photo_url) {
      const { error } = await supabase.from('pets').update({ photo_url: null }).eq('id', petId);
      if (error) return error.message;
      // El fichero sobra; si no se puede borrar, no pasa nada (se pisará con la próxima foto).
      void supabase.storage.from(PET_PHOTOS_BUCKET).remove([petPhotoPath(houseId, petId)]).then(() => undefined);
    }
    return null;
  }

  function chooseType(next: PetTypeValue) {
    setType(next);
    setPicked(new Set(suggestedRoutines(next).map((_, i) => i)));
  }

  function togglePicked(i: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('Falta el nombre', '¿Cómo se llama?'); return; }
    setSaving(true);
    try {
      let petId: string;
      if (pet) {
        const { error } = await supabase.from('pets').update({ name: trimmed, type }).eq('id', pet.id);
        if (error) { Alert.alert('No se pudo guardar', error.message); return; }
        petId = pet.id;
      } else {
        const { data, error } = await supabase.from('pets').insert({ house_id: houseId, name: trimmed, type }).select('id').single();
        if (error || !data) { Alert.alert('No se pudo guardar la mascota', error?.message ?? ''); return; }
        const drafts = suggestions.filter((_, i) => picked.has(i));
        if (drafts.length > 0) {
          const { error: routinesError } = await supabase
            .from('pet_routines')
            .insert(routineRows(houseId, data.id, userId, drafts, dateKey(new Date())));
          if (routinesError) Alert.alert('La mascota está, pero faltan rutinas', routinesError.message);
        }
        petId = data.id;
      }
      const photoError = await savePhoto(petId);
      if (photoError) Alert.alert('La mascota está guardada, pero la foto no', photoError);
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!pet) return;
    Alert.alert('Borrar mascota', `¿Borrar a ${pet.name}? Se borran también sus rutinas y su historial.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('pets').delete().eq('id', pet.id);
          if (error) { Alert.alert('No se pudo borrar', error.message); return; }
          if (pet.photo_url) void supabase.storage.from(PET_PHOTOS_BUCKET).remove([petPhotoPath(houseId, pet.id)]).then(() => undefined);
          onClose();
          onSaved();
        },
      },
    ]);
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
            <Text variant="heading" style={{ flex: 1 }}>{editing ? 'Editar mascota' : 'Nueva mascota'}</Text>
            {editing ? (
              <Pressable onPress={confirmDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar mascota">
                <Trash2 size={22} color={theme.colors.danger} />
              </Pressable>
            ) : null}
          </View>

          {/* foto */}
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => chooseImageSource(`Foto de ${name.trim() || 'tu mascota'}`, (source) => void pickPhoto(source))}
              accessibilityRole="button"
              accessibilityLabel={photoPreview ? 'Cambiar la foto' : 'Añadir una foto'}
            >
              <PetAvatar photoUrl={photoPreview} type={type} size={96} />
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: theme.borderWidth,
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.peach,
                }}
              >
                <Camera size={16} color={theme.colors.textOnFill} />
              </View>
            </Pressable>
            {photoPreview ? (
              <Pressable onPress={() => { setPhotoAsset(null); setRemovePhoto(true); }} accessibilityRole="button" hitSlop={6}>
                <Text variant="label" color="accent">Quitar foto</Text>
              </Pressable>
            ) : (
              <Text variant="caption" color="secondary">Toca para añadir una foto</Text>
            )}
          </View>

          <Input label="Nombre" placeholder="Ej. Luna, Mochi…" value={name} onChangeText={setName} autoFocus={!editing} maxLength={40} />

          <View style={{ gap: 6 }}>
            <Text variant="label" color="secondary">Tipo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PET_TYPES.map((t) => {
                const on = type === t.value;
                return (
                  <Pressable key={t.value} onPress={() => chooseType(t.value)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: theme.radii.pill,
                        borderWidth: theme.borderWidth,
                        borderColor: on ? theme.colors.outline : 'transparent',
                        backgroundColor: on ? theme.colors.peach : theme.colors.surface,
                      }}
                    >
                      <Text style={{ fontSize: 16, lineHeight: 20 }}>{t.emoji}</Text>
                      <Text variant="label" color={on ? 'onFill' : 'secondary'}>{t.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!editing ? (
            <View style={{ gap: 8 }}>
              <Text variant="label" color="secondary">Sus rutinas (luego puedes cambiarlas)</Text>
              {suggestions.map((s, i) => {
                const on = picked.has(i);
                return (
                  <Pressable
                    key={`${type}-${i}`}
                    onPress={() => togglePicked(i)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      borderRadius: theme.radii.md,
                      borderWidth: theme.borderWidth,
                      borderColor: on ? theme.colors.outline : theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Text style={{ fontSize: 20, lineHeight: 26 }}>{s.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyBold">{s.title}</Text>
                      <Text variant="caption" color="secondary">{scheduleLabel(s)}</Text>
                    </View>
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: theme.borderWidth,
                        borderColor: theme.colors.outline,
                        backgroundColor: on ? theme.colors.lime : theme.colors.surface,
                      }}
                    >
                      {on ? <Check size={15} color={theme.colors.textOnFill} strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Button title={editing ? 'Guardar cambios' : 'Añadir mascota'} loading={saving} onPress={save} />
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
