import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Alert } from '../../../lib/alert';
import { CheckCircle2, Circle, Repeat } from 'lucide-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { PlusButton } from '../../../components/ui/PlusButton';
import { TaskCalendar } from '../../../components/tasks/TaskCalendar';
import { TaskFormModal } from '../../../components/tasks/TaskFormModal';
import { useAuthStore } from '../../../store/authStore';
import { useHouseStore } from '../../../store/houseStore';
import { supabase } from '../../../lib/supabase';
import { subscribeToHouseTables } from '../../../lib/realtime';
import { useTheme } from '../../../lib/theme';
import {
  dayStatus,
  isDoneOn,
  isWeekly,
  loadCompletions,
  occursOn,
  setWeeklyDone,
  whenLabel,
  completionKey,
  type Completions,
} from '../../../lib/tasks';

type Room = { id: string; name: string };
type Member = {
  user_id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
};
type Task = {
  id: string;
  title: string;
  status: 'pending' | 'done';
  week_day: number | null;
  due_date: string | null;
  room_id: string | null;
  assigned_to: string | null;
};

export default function TareasScreen() {
  const user = useAuthStore((s) => s.user);
  const houseId = useHouseStore((s) => s.currentHouseId);
  const theme = useTheme();

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completions>(new Set());
  const [members, setMembers] = useState<Member[]>([]);

  // ── formulario de tarea (crear / editar) ──
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadData = useCallback(async () => {
    if (!houseId) return;
    const [roomsRes, tasksRes, membersRes, completionsSet] = await Promise.all([
      supabase.from('rooms').select('id, name').eq('house_id', houseId).order('name'),
      supabase
        .from('tasks')
        .select('id, title, status, week_day, due_date, room_id, assigned_to')
        .eq('house_id', houseId)
        .order('created_at', { ascending: false }),
      supabase
        .from('house_members')
        .select('user_id, users:user_id (email, username, avatar_url)')
        .eq('house_id', houseId),
      loadCompletions(houseId),
    ]);

    if (roomsRes.data) setRooms(roomsRes.data);
    if (tasksRes.data) setTasks(tasksRes.data as Task[]);
    setCompletions(completionsSet);
    if (membersRes.data) {
      setMembers(
        membersRes.data.map((m) => {
          const u = m.users as { email: string; username: string | null; avatar_url: string | null } | null;
          return {
            user_id: m.user_id,
            email: u?.email ?? '',
            username: u?.username ?? null,
            avatar_url: u?.avatar_url ?? null,
          };
        }),
      );
    }
  }, [houseId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!houseId) return;
    return subscribeToHouseTables(houseId, ['tasks', 'task_completions'], () => { void loadData(); });
  }, [houseId, loadData]);

  const visibleTasks =
    selectedDate === null ? tasks : tasks.filter((t) => occursOn(t, selectedDate));

  async function toggleTask(task: Task) {
    if (isWeekly(task)) {
      // Las semanales se marcan solo en el día elegido.
      if (!selectedDate || !houseId) return;
      const key = completionKey(task.id, selectedDate);
      const done = !completions.has(key);
      const flip = (on: boolean) =>
        setCompletions((prev) => {
          const next = new Set(prev);
          if (on) next.add(key);
          else next.delete(key);
          return next;
        });
      flip(done);
      const { error } = await setWeeklyDone(task, houseId, selectedDate, done, user?.id);
      if (error) {
        flip(!done);
        Alert.alert('Error al actualizar tarea', error.message);
      }
      return;
    }
    const next = task.status === 'pending' ? 'done' : 'pending';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    const { error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      Alert.alert('Error al actualizar tarea', error.message);
    }
  }

  function openCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function memberById(id: string | null) {
    return members.find((m) => m.user_id === id) ?? null;
  }
  function roomById(id: string | null) {
    return rooms.find((r) => r.id === id) ?? null;
  }

  if (!houseId) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text variant="heading">Sin hogar activo</Text>
          <Text variant="body" color="secondary">
            Ve a Inicio y entra en uno de tus hogares.
          </Text>
        </View>
      </Screen>
    );
  }

  // Un único margen lateral para cabecera, calendario y tareas.
  const gutter = theme.spacing.md;

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: theme.spacing.md, paddingHorizontal: gutter }}>
        <Text variant="title" style={{ flex: 1 }}>Tareas</Text>
        <PlusButton onPress={openCreate} accessibilityLabel="Nueva tarea" />
      </View>

      {/* calendario fijo: solo las tareas hacen scroll */}
      <View style={{ paddingHorizontal: gutter, paddingBottom: theme.spacing.md }}>
        <TaskCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          dayStatus={(date) => dayStatus(tasks, date, completions)}
        />
      </View>

      {/* task list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 4, paddingBottom: theme.spacing.lg, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >

        {visibleTasks.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <Text variant="body" color="secondary">
              Sin tareas para este día.
            </Text>
          </View>
        ) : (
          visibleTasks.map((task) => {
            const assignee = memberById(task.assigned_to);
            const room = roomById(task.room_id);
            const done = selectedDate ? isDoneOn(task, selectedDate, completions) : task.status === 'done';
            // En "Todas" una semanal no tiene un día concreto que marcar.
            const toggleable = selectedDate !== null || !isWeekly(task);
            const when = selectedDate === null ? whenLabel(task) : null;
            return (
              <Pressable key={task.id} onPress={() => openEdit(task)} accessibilityHint="Editar tarea">
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {toggleable ? (
                      <Pressable onPress={() => toggleTask(task)} hitSlop={8}>
                        {done ? (
                          <CheckCircle2 size={24} color={theme.colors.success} />
                        ) : (
                          <Circle size={24} color={theme.colors.border} />
                        )}
                      </Pressable>
                    ) : (
                      <Repeat size={22} color={theme.colors.textSecondary} />
                    )}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        variant="bodyBold"
                        style={done ? { textDecorationLine: 'line-through', opacity: 0.5 } : undefined}
                      >
                        {task.title}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {room ? (
                          <View
                            style={{
                              backgroundColor: theme.colors.primaryMuted,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: theme.radii.pill,
                            }}
                          >
                            <Text variant="caption" color="primary">
                              {room.name}
                            </Text>
                          </View>
                        ) : null}
                        {when ? (
                          <Text variant="caption" color="secondary">
                            {when}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {assignee ? (
                      <Avatar
                        uri={assignee.avatar_url}
                        name={assignee.username ?? assignee.email}
                        size={32}
                      />
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>


      {houseId && user ? (
        <TaskFormModal
          visible={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={() => void loadData()}
          houseId={houseId}
          userId={user.id}
          rooms={rooms}
          members={members}
          onRoomCreated={(room) => setRooms((prev) => [...prev, room])}
          selectedDate={selectedDate}
          task={editingTask}
        />
      ) : null}
    </Screen>
  );
}
