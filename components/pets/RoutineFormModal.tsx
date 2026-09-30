import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Minus, Plus, Trash2, X } from 'lucide-react-native';
import { Alert } from '../../lib/alert';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { dateKey } from '../../lib/tasks';
import {
  ROUTINE_EMOJIS,
  ROUTINE_TITLE_MAX,
  TIME_PRESETS,
  normalizeTime,
  routineRows,
  type PetFrequency,
  type PetRoutine,
} from '../../lib/pets';

type RoutineFormModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Tras guardar o borrar: la pantalla recarga. */
  onSaved: () => void;
  houseId: string;
  userId: string;
  petId: string;
  petName: string;
  /** Si se pasa, se edita esta rutina; si no, se crea una nueva. */
  routine: PetRoutine | null;
};

const FREQUENCIES: { value: PetFrequency; label: string }[] = [
  { value: 'daily', label: 'A diario' },
  { value: 'interval', label: 'Cada X días' },
  { value: 'monthly', label: 'Una vez al mes' },
];

/** Crear o editar una rutina: qué, con qué icono y cada cuánto. */
export function RoutineFormModal({ visible, onClose, onSaved, houseId, userId, petId, petName, routine }: RoutineFormModalProps) {
  const theme = useTheme();
  const editing = Boolean(routine);

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState<string>('🍖');
  const [frequency, setFrequency] = useState<PetFrequency>('daily');
  const [times, setTimes] = useState<string[]>([]);
  const [customTime, setCustomTime] = useState('');
  const [intervalDays, setIntervalDays] = useState(2);
  const [monthDay, setMonthDay] = useState(1);
  const [saving, setSaving] = useState(false);

  // Cada vez que se abre, parte de la rutina a editar o de una nueva.
  useEffect(() => {
    if (!visible) return;
    setTitle(routine?.title ?? '');
    setEmoji(routine?.emoji ?? '🍖');
    setFrequency(routine?.frequency ?? 'daily');
    setTimes(routine?.times ?? ['09:00']);
    setCustomTime('');
    setIntervalDays(routine?.interval_days ?? 2);
    setMonthDay(routine?.month_day ?? 1);
  }, [visible]);

  function toggleTime(time: string) {
    setTimes((prev) => (prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time].sort()));
  }

  function addCustomTime() {
    const time = normalizeTime(customTime);
    if (!time) {
      Alert.alert('Hora no válida', 'Escríbela así: 08:30 o 21:00.');
      return;
    }
    if (!times.includes(time)) setTimes((prev) => [...prev, time].sort());
    setCustomTime('');
  }

  async function save() {
    if (!title.trim()) { Alert.alert('Falta el nombre', 'Por ejemplo: Comida, Paseo, Arena…'); return; }
    if (frequency === 'daily' && times.length === 0) { Alert.alert('Faltan las horas', 'Elige al menos una hora del día.'); return; }
    if (frequency === 'daily' && times.length > 6) { Alert.alert('Demasiadas horas', 'Como mucho 6 al día.'); return; }
    const [row] = routineRows(houseId, petId, userId, [{
      title,
      emoji,
      frequency,
      times,
      interval_days: intervalDays,
      month_day: monthDay,
    }], routine?.start_date ?? dateKey(new Date()));
    setSaving(true);
    try {
      const { error } = routine
        ? await supabase
            .from('pet_routines')
            .update({ title: row.title, emoji: row.emoji, frequency: row.frequency, times: row.times, interval_days: row.interval_days, month_day: row.month_day })
            .eq('id', routine.id)
        : await supabase.from('pet_routines').insert({ ...row, position: 99 });
      if (error) { Alert.alert('No se pudo guardar la rutina', error.message); return; }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!routine) return;
    Alert.alert('Borrar rutina', `¿Borrar «${routine.title}» de ${petName}? También se borra su historial.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('pet_routines').delete().eq('id', routine.id);
          if (error) { Alert.alert('No se pudo borrar', error.message); return; }
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
              <Text variant="heading">{editing ? 'Editar rutina' : 'Nueva rutina'}</Text>
              <Text variant="caption" color="secondary">{petName}</Text>
            </View>
            {editing ? (
              <Pressable onPress={confirmDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar rutina">
                <Trash2 size={22} color={theme.colors.danger} />
              </Pressable>
            ) : null}
          </View>

          <Input label="Qué hay que hacer" placeholder="Ej. Comida, Paseo, Arena…" value={title} onChangeText={setTitle} maxLength={ROUTINE_TITLE_MAX} />

          <View style={{ gap: 6 }}>
            <Text variant="label" color="secondary">Icono</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ROUTINE_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setEmoji(e)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: emoji === e }}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: theme.borderWidth,
                    borderColor: emoji === e ? theme.colors.outline : 'transparent',
                    backgroundColor: emoji === e ? theme.colors.peach : theme.colors.surface,
                  }}
                >
                  <Text style={{ fontSize: 20, lineHeight: 26 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="label" color="secondary">Cada cuánto</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FREQUENCIES.map((f) => (
                <Pressable key={f.value} onPress={() => setFrequency(f.value)} accessibilityRole="button" accessibilityState={{ selected: frequency === f.value }}>
                  <View style={chip(frequency === f.value)}>
                    <Text variant="label" color={frequency === f.value ? 'inverse' : 'secondary'}>{f.label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {frequency === 'daily' ? (
            <View style={{ gap: 8 }}>
              <Text variant="label" color="secondary">A qué horas</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[...new Set([...TIME_PRESETS, ...times])].sort().map((time) => {
                  const on = times.includes(time);
                  return (
                    <Pressable key={time} onPress={() => toggleTime(time)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                      <View style={{ ...chip(on), flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text variant="label" color={on ? 'inverse' : 'secondary'}>{time}</Text>
                        {on ? <X size={12} color={theme.colors.textInverse} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Input
                  containerStyle={{ flex: 1 }}
                  style={{ paddingVertical: 10 }}
                  placeholder="Otra hora (ej. 07:45)"
                  value={customTime}
                  onChangeText={setCustomTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  returnKeyType="done"
                  onSubmitEditing={addCustomTime}
                />
                <Button title="Añadir" variant="secondary" fullWidth={false} onPress={addCustomTime} />
              </View>
            </View>
          ) : frequency === 'interval' ? (
            <Stepper label="Cada cuántos días" value={intervalDays} min={2} max={90} onChange={setIntervalDays} suffix={(n) => `cada ${n} días`} />
          ) : (
            <Stepper label="Qué día del mes" value={monthDay} min={1} max={28} onChange={setMonthDay} suffix={(n) => `el día ${n}`} />
          )}

          <Button title={editing ? 'Guardar cambios' : 'Crear rutina'} loading={saving} onPress={save} />
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type StepperProps = { label: string; value: number; min: number; max: number; onChange: (n: number) => void; suffix: (n: number) => string };

function Stepper({ label, value, min, max, onChange, suffix }: StepperProps) {
  const theme = useTheme();
  const button = (Icon: typeof Plus, next: number, a11y: string) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, next)))}
      disabled={next < min || next > max}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.outline,
        backgroundColor: theme.colors.surface,
        opacity: next < min || next > max ? 0.4 : 1,
        ...(pressed ? theme.shadows.none : theme.shadows.small),
      })}
    >
      <Icon size={20} color={theme.colors.textPrimary} />
    </Pressable>
  );
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" color="secondary">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        {button(Minus, value - 1, 'Menos')}
        <Text variant="heading" style={{ minWidth: 120, textAlign: 'center' }}>{suffix(value)}</Text>
        {button(Plus, value + 1, 'Más')}
      </View>
    </View>
  );
}
