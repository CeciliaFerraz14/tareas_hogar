import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '../lib/alert';
import { supabase } from '../lib/supabase';
import { subscribeToHouseTables } from '../lib/realtime';
import { completionKey, dateKey, isDoneOn, isWeekly, setWeeklyDone, weekDayOf, type Completions } from '../lib/tasks';

export type HomeMember = {
  user_id: string;
  name: string;
  avatar_url: string | null;
};

export type HouseSummary = {
  tasksTodayPending: number;
  shoppingPending: number;
  unreadMessages: number;
  /** Plato de hoy de cada hueco del menú (null si no hay nada apuntado). */
  lunchToday: string | null;
  dinnerToday: string | null;
};

export type TodayTask = {
  id: string;
  house_id: string;
  title: string;
  status: 'pending' | 'done';
  week_day: number | null;
  due_date: string | null;
  assigned_to: string | null;
  done: boolean;
};

const RELOAD_DEBOUNCE_MS = 300;

function displayName(u: { username: string | null; email: string } | null): string {
  return u?.username?.trim() || u?.email.split('@')[0] || '—';
}

/**
 * Datos de Inicio: mi nombre, los miembros y el resumen de cada hogar (tareas de
 * hoy, compra, mensajes sin leer y menú de hoy) y "Para hoy": las tareas de hoy que son mías o
 * de nadie, de todos mis hogares. Se mantiene al día en tiempo real.
 */
export function useHomeSummary(userId: string | undefined, houseIds: string[]) {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [membersByHouse, setMembersByHouse] = useState<Record<string, HomeMember[]>>({});
  const [summaryByHouse, setSummaryByHouse] = useState<Record<string, HouseSummary>>({});
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const today = new Date();
    const todayKey = dateKey(today);

    const [profileRes, membersRes, summaryRes, tasksRes, completionsRes] = await Promise.all([
      supabase.from('users').select('username, email').eq('id', userId).maybeSingle(),
      supabase.from('house_members').select('house_id, user_id, joined_at, users:user_id (username, avatar_url, email)'),
      supabase.rpc('my_house_summaries', { p_today: todayKey }),
      supabase
        .from('tasks')
        .select('id, house_id, title, status, week_day, due_date, assigned_to')
        .or(`due_date.eq.${todayKey},and(due_date.is.null,week_day.eq.${weekDayOf(today)})`)
        .order('created_at', { ascending: true }),
      supabase.from('task_completions').select('task_id, date').eq('date', todayKey),
    ]);

    if (profileRes.data) setFirstName(displayName(profileRes.data).split(' ')[0]);

    if (membersRes.data) {
      const byHouse: Record<string, HomeMember[]> = {};
      const sorted = [...membersRes.data].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
      for (const m of sorted) {
        (byHouse[m.house_id] ??= []).push({
          user_id: m.user_id,
          name: displayName(m.users),
          avatar_url: m.users?.avatar_url ?? null,
        });
      }
      setMembersByHouse(byHouse);
    }

    if (summaryRes.data) {
      const byHouse: Record<string, HouseSummary> = {};
      for (const s of summaryRes.data) {
        byHouse[s.house_id] = {
          tasksTodayPending: s.tasks_today_pending,
          shoppingPending: s.shopping_pending,
          unreadMessages: s.unread_messages,
          lunchToday: s.lunch_today ?? null,
          dinnerToday: s.dinner_today ?? null,
        };
      }
      setSummaryByHouse(byHouse);
    }

    if (tasksRes.data) {
      const completions: Completions = new Set((completionsRes.data ?? []).map((c) => completionKey(c.task_id, c.date)));
      const mine = tasksRes.data
        // Para hoy: las mías y las que no son de nadie.
        .filter((t) => t.assigned_to === userId || t.assigned_to === null)
        .map((t) => {
          const task = { ...t, status: t.status === 'done' ? 'done' as const : 'pending' as const };
          return { ...task, done: isDoneOn(task, today, completions) };
        })
        // Lo pendiente primero.
        .sort((a, b) => Number(a.done) - Number(b.done));
      setTodayTasks(mine);
    }
  }, [userId]);

  // Tiempo real: cualquier cambio en mis hogares recarga el resumen (agrupado).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const houseKey = houseIds.join(',');
  useEffect(() => {
    if (!houseKey) return;
    const reloadSoon = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { void load(); }, RELOAD_DEBOUNCE_MS);
    };
    const offs = houseKey.split(',').map((id) =>
      subscribeToHouseTables(
        id,
        ['tasks', 'task_completions', 'shopping_items', 'house_messages', 'house_chat_reads', 'meal_plan_entries'],
        reloadSoon,
      ),
    );
    return () => {
      for (const off of offs) off();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [houseKey, load]);

  /** Marca o desmarca una tarea de "Para hoy" (las semanales, solo el día de hoy). */
  async function toggleTodayTask(task: TodayTask) {
    const done = !task.done;
    const flip = (value: boolean) =>
      setTodayTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: value } : t)));
    flip(done);
    const { error } = isWeekly(task)
      ? await setWeeklyDone(task, task.house_id, new Date(), done, userId)
      : await supabase.from('tasks').update({ status: done ? 'done' : 'pending' }).eq('id', task.id);
    if (error) {
      flip(!done);
      Alert.alert('Error al actualizar la tarea', error.message);
    }
  }

  return { firstName, membersByHouse, summaryByHouse, todayTasks, toggleTodayTask, reload: load };
}
