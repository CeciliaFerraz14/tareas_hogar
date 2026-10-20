import { supabase } from './supabase';

// Una tarea puede ser:
//   · semanal   → week_day (0=Lunes … 6=Domingo). Se completa día a día en task_completions.
//   · de un día → due_date ('YYYY-MM-DD'). Su estado es tasks.status.
//   · sin día   → ambos null. Su estado es tasks.status.
// Las de un día y las semanales pueden llevar hora (due_time); a esa hora se
// avisa si nadie la ha marcado (send_task_reminders, pg_cron).

export type ScheduledTask = {
  id: string;
  status: 'pending' | 'done';
  week_day: number | null;
  due_date: string | null;
  due_time?: string | null;
};

export type TaskWhen = 'none' | 'once' | 'weekly';

export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
export const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** 0=Lunes … 6=Domingo. */
export function weekDayOf(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Fecha local en formato 'YYYY-MM-DD' (no UTC: toISOString cambiaría de día de noche). */
export function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** '2026-09-25' → '25 sep'. */
export function shortDate(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

export function isWeekly(task: ScheduledTask): boolean {
  return task.week_day !== null && task.due_date === null;
}

export function occursOn(task: ScheduledTask, date: Date): boolean {
  if (task.due_date !== null) return task.due_date === dateKey(date);
  return task.week_day === weekDayOf(date);
}

/** Claves `${task_id}|${date}` de los días en que se completó cada tarea semanal. */
export type Completions = Set<string>;

export const completionKey = (taskId: string, date: Date | string) =>
  `${taskId}|${typeof date === 'string' ? date : dateKey(date)}`;

export function isDoneOn(task: ScheduledTask, date: Date, completions: Completions): boolean {
  return isWeekly(task) ? completions.has(completionKey(task.id, date)) : task.status === 'done';
}

/** Estado de un día del calendario: sin tareas, con pendientes o todas hechas. */
export function dayStatus(
  tasks: ScheduledTask[],
  date: Date,
  completions: Completions,
): 'none' | 'pending' | 'done' {
  const today = tasks.filter((t) => occursOn(t, date));
  if (today.length === 0) return 'none';
  return today.every((t) => isDoneOn(t, date, completions)) ? 'done' : 'pending';
}

/** '18:30:00' (time de Postgres) → '18:30'. */
export function shortTime(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null;
}

/** Orden de un día: primero las que tienen hora, de la más temprana a la más tardía. */
export function byTime(a: ScheduledTask, b: ScheduledTask): number {
  if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
  return Number(!a.due_time) - Number(!b.due_time);
}

/** Texto de cuándo toca la tarea, para la vista "Todas". */
export function whenLabel(task: ScheduledTask): string | null {
  const time = shortTime(task.due_time);
  const day =
    task.due_date !== null ? shortDate(task.due_date) : task.week_day !== null ? `Cada ${DAY_NAMES[task.week_day]}` : null;
  return day && time ? `${day} · ${time}` : day;
}

/** 'YYYY-MM-DD' → Date local (new Date('YYYY-MM-DD') sería medianoche UTC). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function whenOf(task: ScheduledTask): TaskWhen {
  if (task.due_date !== null) return 'once';
  if (task.week_day !== null) return 'weekly';
  return 'none';
}

/**
 * Columnas week_day/due_date/due_time para guardar una tarea: `date` para 'once',
 * `weekDay` para 'weekly'. Sin día no hay hora.
 */
export function scheduleFields(when: TaskWhen, date: Date, weekDay: number = weekDayOf(date), time: string | null = null) {
  return {
    week_day: when === 'weekly' ? weekDay : null,
    due_date: when === 'once' ? dateKey(date) : null,
    due_time: when === 'none' ? null : time,
  };
}

export async function loadCompletions(houseId: string): Promise<Completions> {
  const { data } = await supabase.from('task_completions').select('task_id, date').eq('house_id', houseId);
  return new Set((data ?? []).map((c) => completionKey(c.task_id, c.date)));
}

/** Marca o desmarca una tarea semanal en un día concreto. */
export async function setWeeklyDone(
  task: ScheduledTask,
  houseId: string,
  date: Date,
  done: boolean,
  userId: string | undefined,
) {
  if (done) {
    return supabase
      .from('task_completions')
      .insert({ task_id: task.id, house_id: houseId, date: dateKey(date), completed_by: userId ?? null });
  }
  return supabase.from('task_completions').delete().eq('task_id', task.id).eq('date', dateKey(date));
}
