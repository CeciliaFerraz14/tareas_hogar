import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { Alert } from '../../../../lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Circle, Plus } from 'lucide-react-native';
import { Screen } from '../../../../components/ui/Screen';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Avatar } from '../../../../components/ui/Avatar';
import { useAuthStore } from '../../../../store/authStore';
import { supabase } from '../../../../lib/supabase';
import { useTheme } from '../../../../lib/theme';

const PET_TYPES = [
  { value: 'perro', label: 'Perro', emoji: '🐶' },
  { value: 'gato', label: 'Gato', emoji: '🐱' },
  { value: 'conejo', label: 'Conejo', emoji: '🐰' },
  { value: 'pájaro', label: 'Pájaro', emoji: '🐦' },
  { value: 'pez', label: 'Pez', emoji: '🐟' },
  { value: 'otro', label: 'Otro', emoji: '🐾' },
] as const;

type PetTypeValue = (typeof PET_TYPES)[number]['value'];

type Pet = { id: string; name: string; type: string | null };

type PetTask = {
  id: string;
  pet_id: string;
  title: string;
  assigned_to: string | null;
  due_date: string | null;
  status: 'pending' | 'done';
};

type Member = {
  user_id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
};

function petEmoji(type: string | null): string {
  return PET_TYPES.find((t) => t.value === type)?.emoji ?? '🐾';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function MascotasScreen() {
  const { id: houseId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const theme = useTheme();

  const [pets, setPets] = useState<Pet[]>([]);
  const [tasks, setTasks] = useState<PetTask[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [expandedPetId, setExpandedPetId] = useState<string | null>(null);
  const [filterPending, setFilterPending] = useState(false);

  // add-pet modal
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<PetTypeValue>('perro');
  const [savingPet, setSavingPet] = useState(false);

  // add-task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskPetId, setTaskPetId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState<string | null>(null);
  const [savingTask, setSavingTask] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!houseId) return;

    const [petsRes, membersRes] = await Promise.all([
      supabase.from('pets').select('id, name, type').eq('house_id', houseId).order('name'),
      supabase
        .from('house_members')
        .select('user_id, users:user_id (email, username, avatar_url)')
        .eq('house_id', houseId),
    ]);

    const petList: Pet[] = (petsRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
    }));
    setPets(petList);

    if (membersRes.data) {
      setMembers(
        membersRes.data.map((m) => {
          const u = m.users as { email: string; username: string | null; avatar_url: string | null } | null;
          return { user_id: m.user_id, email: u?.email ?? '', username: u?.username ?? null, avatar_url: u?.avatar_url ?? null };
        }),
      );
    }

    if (petList.length > 0) {
      const { data: tasksData } = await supabase
        .from('pet_tasks')
        .select('id, pet_id, title, assigned_to, due_date, status')
        .in('pet_id', petList.map((p) => p.id))
        .order('status', { ascending: true }); // pending first
      setTasks((tasksData ?? []) as PetTask[]);
    } else {
      setTasks([]);
    }
  }, [houseId]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleRefresh() { setRefreshing(true); await loadData(); setRefreshing(false); }

  // ── pets ──────────────────────────────────────────────────────────────────

  function openAddPet() {
    setPetName('');
    setPetType('perro');
    setPetModalOpen(true);
  }

  async function createPet() {
    const name = petName.trim();
    if (!name) { Alert.alert('Nombre requerido'); return; }
    if (!houseId) return;
    setSavingPet(true);
    try {
      const { data, error } = await supabase
        .from('pets')
        .insert({ house_id: houseId, name, type: petType })
        .select('id, name, type')
        .single();
      if (error || !data) { Alert.alert('No se pudo guardar la mascota', error?.message ?? ''); return; }
      setPets((prev) => [...prev, { id: data.id, name: data.name, type: data.type }].sort((a, b) => a.name.localeCompare(b.name)));
      setExpandedPetId(data.id);
      setPetModalOpen(false);
    } finally {
      setSavingPet(false);
    }
  }

  // ── tasks ─────────────────────────────────────────────────────────────────

  function openAddTask(petId: string) {
    setTaskPetId(petId);
    setTaskTitle('');
    setTaskAssignee(user?.id ?? null);
    setTaskModalOpen(true);
  }

  async function createTask() {
    const title = taskTitle.trim();
    if (!title) { Alert.alert('Título requerido'); return; }
    if (!taskPetId) return;
    setSavingTask(true);
    try {
      const { data, error } = await supabase
        .from('pet_tasks')
        .insert({ pet_id: taskPetId, title, assigned_to: taskAssignee })
        .select('id, pet_id, title, assigned_to, due_date, status')
        .single();
      if (error || !data) { Alert.alert('No se pudo crear la tarea', error?.message ?? ''); return; }
      setTasks((prev) => [data as PetTask, ...prev]);
      setTaskModalOpen(false);
    } finally {
      setSavingTask(false);
    }
  }

  async function toggleTask(task: PetTask) {
    const next = task.status === 'pending' ? 'done' : 'pending';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    const { error } = await supabase.from('pet_tasks').update({ status: next }).eq('id', task.id);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      Alert.alert('Error al actualizar', error.message);
    }
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const memberById = (id: string | null) => members.find((m) => m.user_id === id) ?? null;

  function petTasks(petId: string) {
    const all = tasks.filter((t) => t.pet_id === petId);
    return filterPending ? all.filter((t) => t.status === 'pending') : all;
  }

  function pendingCount(petId: string) {
    return tasks.filter((t) => t.pet_id === petId && t.status === 'pending').length;
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Screen>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="heading">Mascotas</Text>
        </View>
      </View>

      {/* filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.lg }}>
        {(['todas', 'pendientes'] as const).map((f) => {
          const active = f === 'pendientes' ? filterPending : !filterPending;
          return (
            <Pressable key={f} onPress={() => setFilterPending(f === 'pendientes')}>
              <View style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radii.pill,
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
              }}>
                <Text variant="label" color={active ? 'inverse' : 'secondary'} style={{ textTransform: 'capitalize' }}>{f}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* pet list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        {pets.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
            <Text style={{ fontSize: 48 }}>🐾</Text>
            <Text variant="body" color="secondary">Aún no hay mascotas registradas.</Text>
          </View>
        ) : (
          pets.map((pet) => {
            const expanded = expandedPetId === pet.id;
            const petTaskList = petTasks(pet.id);
            const pending = pendingCount(pet.id);

            return (
              <Card key={pet.id} style={{ padding: 0, overflow: 'hidden' }}>
                {/* pet header row */}
                <Pressable
                  onPress={() => setExpandedPetId(expanded ? null : pet.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: theme.spacing.md }}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: theme.colors.primaryMuted,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 22 }}>{petEmoji(pet.type)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold">{pet.name}</Text>
                    {pet.type ? (
                      <Text variant="caption" color="secondary" style={{ textTransform: 'capitalize' }}>{pet.type}</Text>
                    ) : null}
                  </View>
                  {pending > 0 ? (
                    <View style={{
                      backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill,
                      paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center',
                    }}>
                      <Text variant="caption" color="inverse">{pending}</Text>
                    </View>
                  ) : null}
                  {expanded
                    ? <ChevronDown size={20} color={theme.colors.textSecondary} />
                    : <ChevronRight size={20} color={theme.colors.textSecondary} />}
                </Pressable>

                {/* tasks (expanded) */}
                {expanded ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                    {petTaskList.length === 0 ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text variant="caption" color="secondary">
                          {filterPending ? 'No hay tareas pendientes.' : 'Sin tareas aún.'}
                        </Text>
                      </View>
                    ) : (
                      petTaskList.map((task) => {
                        const assignee = memberById(task.assigned_to);
                        const done = task.status === 'done';
                        return (
                          <View
                            key={task.id}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 12,
                              paddingHorizontal: theme.spacing.md, paddingVertical: 10,
                              borderBottomWidth: 1, borderBottomColor: theme.colors.border,
                            }}
                          >
                            <Pressable onPress={() => toggleTask(task)} hitSlop={8}>
                              {done
                                ? <CheckCircle2 size={22} color={theme.colors.success} />
                                : <Circle size={22} color={theme.colors.border} />}
                            </Pressable>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text
                                variant="body"
                                style={done ? { textDecorationLine: 'line-through', opacity: 0.45 } : undefined}
                              >
                                {task.title}
                              </Text>
                              {task.due_date ? (
                                <Text variant="caption" color="secondary">{formatDate(task.due_date)}</Text>
                              ) : null}
                            </View>
                            {assignee ? (
                              <Avatar uri={assignee.avatar_url} name={assignee.username ?? assignee.email} size={28} />
                            ) : null}
                          </View>
                        );
                      })
                    )}

                    {/* add task row */}
                    <Pressable
                      onPress={() => openAddTask(pet.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingHorizontal: theme.spacing.md, paddingVertical: 12,
                      }}
                    >
                      <Plus size={16} color={theme.colors.primary} />
                      <Text variant="label" color="primary">Añadir tarea</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <View style={{ padding: theme.spacing.lg }}>
        <Pressable
          onPress={openAddPet}
          style={{
            backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingVertical: 14, ...theme.shadows.soft, borderWidth: theme.borderWidth, borderColor: theme.colors.outline,
          }}
        >
          <Plus size={20} color="#fff" />
          <Text variant="bodyBold" color="inverse">Añadir mascota</Text>
        </Pressable>
      </View>

      {/* ── add pet modal ── */}
      <Modal visible={petModalOpen} animationType="slide" transparent onRequestClose={() => setPetModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setPetModalOpen(false)} />
          <ScrollView
            style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl }}
            contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 36 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />
            <Text variant="heading">Nueva mascota</Text>

            <Input label="Nombre" placeholder="Ej. Luna, Mochi…" value={petName} onChangeText={setPetName} autoFocus />

            <View style={{ gap: 6 }}>
              <Text variant="label" color="secondary">Tipo</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PET_TYPES.map((t) => {
                  const active = petType === t.value;
                  return (
                    <Pressable key={t.value} onPress={() => setPetType(t.value)}>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radii.pill,
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      }}>
                        <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                        <Text variant="label" color={active ? 'inverse' : 'secondary'}>{t.label}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Button title="Guardar mascota" loading={savingPet} onPress={createPet} />
            <Button title="Cancelar" variant="ghost" onPress={() => setPetModalOpen(false)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── add task modal ── */}
      <Modal visible={taskModalOpen} animationType="slide" transparent onRequestClose={() => setTaskModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setTaskModalOpen(false)} />
          <ScrollView
            style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl }}
            contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 36 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />
            <Text variant="heading">
              Nueva tarea{taskPetId ? ` · ${pets.find((p) => p.id === taskPetId)?.name ?? ''}` : ''}
            </Text>

            <Input label="Tarea" placeholder="Ej. Dar de comer, Paseo, Medicación…" value={taskTitle} onChangeText={setTaskTitle} autoFocus />

            {members.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text variant="label" color="secondary">Asignar a</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <Pressable onPress={() => setTaskAssignee(null)}>
                      <View style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: taskAssignee === null ? theme.colors.primary : theme.colors.surface,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: taskAssignee === null ? 0 : 1.5, borderColor: theme.colors.border,
                      }}>
                        <Text variant="caption" color={taskAssignee === null ? 'inverse' : 'secondary'}>—</Text>
                      </View>
                    </Pressable>
                    {members.map((m) => (
                      <Pressable key={m.user_id} onPress={() => setTaskAssignee(m.user_id)}>
                        <View style={{ borderRadius: 22, borderWidth: taskAssignee === m.user_id ? 2.5 : 0, borderColor: theme.colors.primary }}>
                          <Avatar uri={m.avatar_url} name={m.username ?? m.email} size={40} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}

            <Button title="Crear tarea" loading={savingTask} onPress={createTask} />
            <Button title="Cancelar" variant="ghost" onPress={() => setTaskModalOpen(false)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
