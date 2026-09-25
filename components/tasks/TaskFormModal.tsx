import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Alert } from '../../lib/alert';
import { Plus, Trash2 } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import {
  DAY_NAMES,
  dateKey,
  parseDateKey,
  scheduleFields,
  shortDate,
  weekDayOf,
  whenOf,
  type TaskWhen,
} from '../../lib/tasks';

export type TaskRoom = { id: string; name: string };
export type TaskMember = {
  user_id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
};
export type EditableTask = {
  id: string;
  title: string;
  status: 'pending' | 'done';
  week_day: number | null;
  due_date: string | null;
  room_id: string | null;
  assigned_to: string | null;
};

type TaskFormModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Tras crear, editar o borrar: la pantalla recarga sus datos. */
  onSaved: () => void;
  houseId: string;
  userId: string;
  rooms: TaskRoom[];
  members: TaskMember[];
  onRoomCreated: (room: TaskRoom) => void;
  /** Día elegido en el calendario (null = vista "Todas"). */
  selectedDate: Date | null;
  /** Si se pasa, el formulario edita esta tarea; si no, crea una nueva. */
  task?: EditableTask | null;
};

/** Formulario de tarea, compartido por crear y editar. */
export function TaskFormModal({
  visible,
  onClose,
  onSaved,
  houseId,
  userId,
  rooms,
  members,
  onRoomCreated,
  selectedDate,
  task,
}: TaskFormModalProps) {
  const theme = useTheme();
  const editing = Boolean(task);

  const [title, setTitle] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [when, setWhen] = useState<TaskWhen>('once');
  const [date, setDate] = useState(() => new Date());
  const [weekDay, setWeekDay] = useState(0);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);

  // Cada vez que se abre, parte de la tarea a editar o de valores nuevos.
  useEffect(() => {
    if (!visible) return;
    const base = task?.due_date ? parseDateKey(task.due_date) : (selectedDate ?? new Date());
    setTitle(task?.title ?? '');
    setRoomId(task?.room_id ?? null);
    setWhen(task ? whenOf(task) : selectedDate ? 'once' : 'none');
    setDate(base);
    setWeekDay(task?.week_day ?? weekDayOf(base));
    setAssignee(task?.assigned_to ?? null);
    // Solo al abrir: no pisar lo que se está editando si la pantalla recarga.
  }, [visible]);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Título requerido', 'Escribe un título para la tarea.');
      return;
    }
    const fields = {
      title: trimmed,
      room_id: roomId,
      assigned_to: assignee,
      ...scheduleFields(when, date, weekDay),
    };
    setSaving(true);
    try {
      const { error } = task
        ? await supabase.from('tasks').update(fields).eq('id', task.id)
        : await supabase.from('tasks').insert({ ...fields, house_id: houseId, created_by: userId });
      if (error) {
        Alert.alert(task ? 'No se pudo guardar la tarea' : 'No se pudo crear la tarea', error.message);
        return;
      }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!task) return;
    Alert.alert('Eliminar tarea', `¿Seguro que quieres eliminar "${task.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const { error } = await supabase.from('tasks').delete().eq('id', task.id);
          setDeleting(false);
          if (error) { Alert.alert('No se pudo eliminar la tarea', error.message); return; }
          onClose();
          onSaved();
        },
      },
    ]);
  }

  async function createRoom() {
    const name = newRoomName.trim();
    if (!name) return;
    setSavingRoom(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({ house_id: houseId, name })
        .select('id, name')
        .single();
      if (error || !data) { Alert.alert('No se pudo crear la estancia', error?.message ?? ''); return; }
      onRoomCreated(data);
      setRoomId(data.id);
      setNewRoomName('');
      setNewRoomOpen(false);
    } finally {
      setSavingRoom(false);
    }
  }

  const whenOptions: { value: TaskWhen; label: string }[] = [
    { value: 'none', label: 'Sin día' },
    { value: 'once', label: `Solo el ${shortDate(dateKey(date))}` },
    { value: 'weekly', label: `Cada ${DAY_NAMES[weekDay]}` },
  ];

  const chip = (selected: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
  });

  return (
    <>
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
              <Text variant="heading" style={{ flex: 1 }}>{editing ? 'Editar tarea' : 'Nueva tarea'}</Text>
              {editing ? (
                <Pressable
                  onPress={confirmDelete}
                  disabled={deleting}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar tarea"
                >
                  <Trash2 size={22} color={theme.colors.danger} />
                </Pressable>
              ) : null}
            </View>

            <Input label="Título" placeholder="Ej. Fregar los platos" value={title} onChangeText={setTitle} />

            {/* when picker */}
            <View style={{ gap: 6 }}>
              <Text variant="label" color="secondary">Cuándo</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {whenOptions.map(({ value, label }) => (
                  <Pressable key={value} onPress={() => setWhen(value)}>
                    <View style={chip(when === value)}>
                      <Text variant="label" color={when === value ? 'inverse' : 'secondary'}>{label}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* room picker */}
            <View style={{ gap: 6 }}>
              <Text variant="label" color="secondary">Estancia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => setRoomId(null)}>
                    <View style={chip(roomId === null)}>
                      <Text variant="label" color={roomId === null ? 'inverse' : 'secondary'}>Ninguna</Text>
                    </View>
                  </Pressable>
                  {rooms.map((r) => (
                    <Pressable key={r.id} onPress={() => setRoomId(r.id)}>
                      <View style={chip(roomId === r.id)}>
                        <Text variant="label" color={roomId === r.id ? 'inverse' : 'secondary'}>{r.name}</Text>
                      </View>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setNewRoomOpen(true)}>
                    <View style={{ ...chip(false), borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Plus size={14} color={theme.colors.textSecondary} />
                      <Text variant="label" color="secondary">Nueva</Text>
                    </View>
                  </Pressable>
                </View>
              </ScrollView>
            </View>

            {/* assignee picker */}
            {members.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text variant="label" color="secondary">Asignar a</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <Pressable onPress={() => setAssignee(null)}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: assignee === null ? theme.colors.primary : theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: assignee === null ? 0 : 1.5, borderColor: theme.colors.border }}>
                        <Text variant="caption" color={assignee === null ? 'inverse' : 'secondary'}>—</Text>
                      </View>
                    </Pressable>
                    {members.map((m) => (
                      <Pressable key={m.user_id} onPress={() => setAssignee(m.user_id)}>
                        <View style={{ borderRadius: 22, borderWidth: assignee === m.user_id ? 2.5 : 0, borderColor: theme.colors.primary }}>
                          <Avatar uri={m.avatar_url} name={m.username ?? m.email} size={40} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}

            <Button title={editing ? 'Guardar cambios' : 'Crear tarea'} loading={saving} onPress={save} />
            <Button title="Cancelar" variant="ghost" onPress={onClose} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── new room modal ── */}
      <Modal visible={newRoomOpen} animationType="fade" transparent onRequestClose={() => setNewRoomOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: theme.spacing.lg }}>
          <View style={{ backgroundColor: theme.colors.background, borderRadius: theme.radii.lg, padding: theme.spacing.lg, gap: theme.spacing.lg }}>
            <Text variant="heading">Nueva estancia</Text>
            <Input label="Nombre" placeholder="Ej. Cocina, Baño..." value={newRoomName} onChangeText={setNewRoomName} autoFocus />
            <Button title="Crear" loading={savingRoom} onPress={createRoom} />
            <Button title="Cancelar" variant="ghost" onPress={() => { setNewRoomOpen(false); setNewRoomName(''); }} />
          </View>
        </View>
      </Modal>
    </>
  );
}
