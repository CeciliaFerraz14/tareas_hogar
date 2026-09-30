import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Circle, CheckCircle2, MoreHorizontal, Plus, X } from 'lucide-react-native';
import { Alert } from '../../../../lib/alert';
import { Screen } from '../../../../components/ui/Screen';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { PlusButton } from '../../../../components/ui/PlusButton';
import { PetFormModal } from '../../../../components/pets/PetFormModal';
import { RoutineFormModal } from '../../../../components/pets/RoutineFormModal';
import { useAuthStore } from '../../../../store/authStore';
import { useSyncActiveHouse } from '../../../../store/houseStore';
import { supabase } from '../../../../lib/supabase';
import { subscribeToHouseTables } from '../../../../lib/realtime';
import { useTheme } from '../../../../lib/theme';
import { dateKey, shortDate } from '../../../../lib/tasks';
import {
  agoLabel,
  currentOccurrences,
  lastLog,
  loadPetBoard,
  markDone,
  nextDate,
  petEmoji,
  scheduleLabel,
  type Occurrence,
  type Pet,
  type PetLog,
  type PetRoutine,
} from '../../../../lib/pets';

/** Tareas de una vez (la tabla pet_tasks de antes): veterinario, comprar pienso… */
type PetTask = { id: string; pet_id: string; title: string; status: 'pending' | 'done' };

export default function MascotasScreen() {
  const { id: houseId } = useLocalSearchParams<{ id: string }>();
  useSyncActiveHouse(houseId);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const theme = useTheme();

  const [pets, setPets] = useState<Pet[]>([]);
  const [routines, setRoutines] = useState<PetRoutine[]>([]);
  const [logs, setLogs] = useState<PetLog[]>([]);
  const [tasks, setTasks] = useState<PetTask[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  // Reloj para que "hace 5 min" y lo atrasado se actualicen solos.
  const [now, setNow] = useState(() => new Date());

  // Formularios (lo abierto se guarda aparte de `…Open` para que se cierren con su animación).
  const [petForm, setPetForm] = useState<{ open: boolean; pet: Pet | null }>({ open: false, pet: null });
  const [routineForm, setRoutineForm] = useState<{ open: boolean; pet: Pet | null; routine: PetRoutine | null }>({ open: false, pet: null, routine: null });
  const [taskForm, setTaskForm] = useState<{ open: boolean; pet: Pet | null }>({ open: false, pet: null });

  const loadData = useCallback(async () => {
    if (!houseId) return;
    try {
      const board = await loadPetBoard(houseId);
      setPets(board.pets);
      setRoutines(board.routines);
      setLogs(board.logs);
      const [tasksRes, membersRes] = await Promise.all([
        board.pets.length > 0
          ? supabase.from('pet_tasks').select('id, pet_id, title, status').in('pet_id', board.pets.map((p) => p.id)).eq('status', 'pending').order('created_at')
          : Promise.resolve({ data: [] }),
        supabase.from('house_members').select('user_id, users:user_id (username, email)').eq('house_id', houseId),
      ]);
      setTasks((tasksRes.data ?? []) as PetTask[]);
      setNames(Object.fromEntries((membersRes.data ?? []).map((m) => [m.user_id, m.users?.username?.trim() || m.users?.email.split('@')[0] || '—'])));
      setNow(new Date());
    } catch (e) {
      Alert.alert('Error al cargar las mascotas', e instanceof Error ? e.message : String(e));
    }
  }, [houseId]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Tiempo real: lo que marca uno lo ven los demás al momento.
  useEffect(() => {
    if (!houseId) return;
    return subscribeToHouseTables(houseId, ['pets', 'pet_routines', 'pet_logs'], () => { void loadData(); });
  }, [houseId, loadData]);

  async function handleRefresh() { setRefreshing(true); await loadData(); setRefreshing(false); }

  const nameOf = (id: string | null) => (id === user?.id ? 'Tú' : (id && names[id]) || 'Alguien');

  async function toggleOccurrence(occ: Occurrence, petName: string) {
    if (!houseId || !user) return;
    if (occ.log) {
      const log = occ.log;
      Alert.alert(
        'Desmarcar',
        `${nameOf(log.done_by)} ${log.done_by === user.id ? 'lo marcaste' : 'lo marcó'} ${agoLabel(log.done_at, now)}. ¿Quitar la marca de «${occ.routine.title}» de ${petName}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Quitar',
            style: 'destructive',
            onPress: async () => {
              setLogs((prev) => prev.filter((l) => l.id !== log.id));
              const { error } = await supabase.from('pet_logs').delete().eq('id', log.id);
              if (error) { Alert.alert('No se pudo desmarcar', error.message); void loadData(); }
            },
          },
        ],
      );
      return;
    }
    // Se marca al momento; si falla, se deshace.
    const optimistic: PetLog = {
      id: `tmp-${occ.routine.id}-${occ.forDate}-${occ.slot}`,
      routine_id: occ.routine.id,
      for_date: occ.forDate,
      slot: occ.slot,
      done_by: user.id,
      done_at: new Date().toISOString(),
    };
    setLogs((prev) => [...prev, optimistic]);
    const { error } = await markDone(houseId, occ, user.id);
    if (error) {
      setLogs((prev) => prev.filter((l) => l.id !== optimistic.id));
      if (error.code === '23505') {
        Alert.alert('¡Ya estaba hecho!', 'Otra persona lo acaba de marcar. Así no se repite.');
      } else {
        Alert.alert('No se pudo marcar', error.message);
      }
    }
    void loadData();
  }

  async function toggleTask(task: PetTask) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    const { error } = await supabase.from('pet_tasks').update({ status: 'done' }).eq('id', task.id);
    if (error) { Alert.alert('No se pudo actualizar', error.message); void loadData(); }
  }

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>Mascotas</Text>
        <PlusButton onPress={() => setPetForm({ open: true, pet: null })} accessibilityLabel="Nueva mascota" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.lg, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        {pets.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
            <Text style={{ fontSize: 56, lineHeight: 64 }}>🐾</Text>
            <Text variant="heading">Aún no hay mascotas</Text>
            <Text variant="body" align="center">
              Añade las mascotas del piso y sus rutinas (comida, paseos, arena…) para saber siempre si ya están hechas.
            </Text>
            <Button title="Añadir mascota" fullWidth={false} onPress={() => setPetForm({ open: true, pet: null })} />
          </View>
        ) : (
          pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              routines={routines.filter((r) => r.pet_id === pet.id)}
              logs={logs}
              tasks={tasks.filter((t) => t.pet_id === pet.id)}
              now={now}
              nameOf={nameOf}
              onToggle={(occ) => void toggleOccurrence(occ, pet.name)}
              onEditPet={() => setPetForm({ open: true, pet })}
              onAddRoutine={() => setRoutineForm({ open: true, pet, routine: null })}
              onEditRoutine={(routine) => setRoutineForm({ open: true, pet, routine })}
              onAddTask={() => setTaskForm({ open: true, pet })}
              onDoneTask={(task) => void toggleTask(task)}
            />
          ))
        )}
      </ScrollView>

      {houseId && user ? (
        <>
          <PetFormModal
            visible={petForm.open}
            onClose={() => setPetForm((f) => ({ ...f, open: false }))}
            onSaved={() => void loadData()}
            houseId={houseId}
            userId={user.id}
            pet={petForm.pet}
          />
          {routineForm.pet ? (
            <RoutineFormModal
              visible={routineForm.open}
              onClose={() => setRoutineForm((f) => ({ ...f, open: false }))}
              onSaved={() => void loadData()}
              houseId={houseId}
              userId={user.id}
              petId={routineForm.pet.id}
              petName={routineForm.pet.name}
              routine={routineForm.routine}
            />
          ) : null}
          <TaskFormModal
            visible={taskForm.open}
            petName={taskForm.pet?.name ?? ''}
            onClose={() => setTaskForm((f) => ({ ...f, open: false }))}
            onSave={async (title) => {
              if (!taskForm.pet) return false;
              const { error } = await supabase.from('pet_tasks').insert({ pet_id: taskForm.pet.id, title, assigned_to: null });
              if (error) { Alert.alert('No se pudo guardar', error.message); return false; }
              void loadData();
              return true;
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

type PetCardProps = {
  pet: Pet;
  routines: PetRoutine[];
  logs: PetLog[];
  tasks: PetTask[];
  now: Date;
  nameOf: (id: string | null) => string;
  onToggle: (occ: Occurrence) => void;
  onEditPet: () => void;
  onAddRoutine: () => void;
  onEditRoutine: (routine: PetRoutine) => void;
  onAddTask: () => void;
  onDoneTask: (task: PetTask) => void;
};

function PetCard({ pet, routines, logs, tasks, now, nameOf, onToggle, onEditPet, onAddRoutine, onEditRoutine, onAddTask, onDoneTask }: PetCardProps) {
  const theme = useTheme();
  const pendingNow = routines
    .flatMap((r) => currentOccurrences(r, logs, now))
    .filter((o) => !o.log && (o.late || o.routine.frequency !== 'daily')).length;

  return (
    <Card padded={false} style={{ paddingVertical: theme.spacing.md, gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: theme.spacing.md }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.mustard,
            ...theme.shadows.small,
          }}
        >
          <Text style={{ fontSize: 28, lineHeight: 34 }}>{petEmoji(pet.type)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{pet.name}</Text>
          <Text variant="caption" color="secondary">
            {pendingNow === 0 ? 'Todo al día' : pendingNow === 1 ? '1 cosa por hacer' : `${pendingNow} cosas por hacer`}
          </Text>
        </View>
        <Pressable onPress={onEditPet} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Editar ${pet.name}`}>
          <MoreHorizontal size={22} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {routines.map((routine) => (
        <RoutineRow key={routine.id} routine={routine} logs={logs} now={now} nameOf={nameOf} onToggle={onToggle} onEdit={() => onEditRoutine(routine)} />
      ))}

      {tasks.length > 0 ? (
        <View style={{ paddingHorizontal: theme.spacing.md, gap: 4, marginTop: 4 }}>
          <Text variant="label" color="secondary">Pendientes</Text>
          {tasks.map((task) => (
            <Pressable key={task.id} onPress={() => onDoneTask(task)} accessibilityRole="checkbox" accessibilityState={{ checked: false }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <Circle size={22} color={theme.colors.border} />
              <Text variant="body" style={{ flex: 1 }}>{task.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.md, marginTop: 4 }}>
        <DashedButton label="Rutina" onPress={onAddRoutine} />
        <DashedButton label="Pendiente" onPress={onAddTask} />
      </View>
    </Card>
  );
}

type RoutineRowProps = {
  routine: PetRoutine;
  logs: PetLog[];
  now: Date;
  nameOf: (id: string | null) => string;
  onToggle: (occ: Occurrence) => void;
  onEdit: () => void;
};

function RoutineRow({ routine, logs, now, nameOf, onToggle, onEdit }: RoutineRowProps) {
  const theme = useTheme();
  const occurrences = currentOccurrences(routine, logs, now);
  const last = lastLog(routine.id, logs);
  const allDone = occurrences.length > 0 && occurrences.every((o) => o.log);
  const next = routine.frequency !== 'daily' ? nextDate(routine, now) : null;

  let footer = last ? `Última vez ${agoLabel(last.done_at, now)} · ${nameOf(last.done_by)}` : 'Aún sin hacer';
  if (routine.frequency !== 'daily' && next && (allDone || occurrences.length === 0)) {
    footer += ` · Próxima: ${next.getTime() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() ? 'hoy' : shortDate(dateKey(next))}`;
  }

  return (
    <View style={{ paddingHorizontal: theme.spacing.md, paddingVertical: 8, gap: 6, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityHint="Editar rutina" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 20, lineHeight: 26 }}>{routine.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text variant="bodyBold">{routine.title}</Text>
          <Text variant="caption" color="secondary">{scheduleLabel(routine)}</Text>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {occurrences.map((occ) => (
          <OccurrenceChip key={`${occ.forDate}-${occ.slot}`} occ={occ} nameOf={nameOf} onPress={() => onToggle(occ)} />
        ))}
      </View>
      <Text variant="caption" color="secondary">{footer}</Text>
    </View>
  );
}

/** Una toma: melocotón si va con retraso, lima con quién la hizo si está hecha. */
function OccurrenceChip({ occ, nameOf, onPress }: { occ: Occurrence; nameOf: (id: string | null) => string; onPress: () => void }) {
  const theme = useTheme();
  const done = Boolean(occ.log);
  const who = occ.log ? nameOf(occ.log.done_by) : null;
  const label = done ? `${occ.label} · ${who}` : occ.late ? `${occ.label} · toca` : occ.label;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${occ.routine.title}, ${label}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.radii.pill,
        borderWidth: theme.borderWidth,
        borderColor: done || occ.late ? theme.colors.outline : theme.colors.border,
        backgroundColor: done ? theme.colors.lime : occ.late ? theme.colors.peach : theme.colors.surface,
        ...(done || occ.late ? (pressed ? theme.shadows.none : theme.shadows.small) : null),
        ...(pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null),
      })}
    >
      {done ? <Check size={15} color={theme.colors.textOnFill} strokeWidth={3} /> : <CheckCircle2 size={15} color={occ.late ? theme.colors.textOnFill : theme.colors.textSecondary} />}
      <Text variant="label" color={done || occ.late ? 'onFill' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}

function DashedButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Añadir ${label.toLowerCase()}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.radii.pill,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
      })}
    >
      <Plus size={14} color={theme.colors.textSecondary} />
      <Text variant="label" color="secondary">{label}</Text>
    </Pressable>
  );
}

/** Pendiente de una vez (veterinario, comprar pienso…). */
function TaskFormModal({ visible, petName, onClose, onSave }: { visible: boolean; petName: string; onClose: () => void; onSave: (title: string) => Promise<boolean> }) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) setTitle(''); }, [visible]);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    const ok = await onSave(trimmed);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
        <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl, padding: theme.spacing.lg, paddingBottom: 36, gap: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="heading">Nuevo pendiente</Text>
              <Text variant="caption" color="secondary">{petName} · algo de una sola vez</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <Input placeholder="Ej. Veterinario el jueves, comprar pienso…" value={title} onChangeText={setTitle} autoFocus maxLength={120} returnKeyType="done" onSubmitEditing={save} />
          <Button title="Añadir" loading={saving} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
