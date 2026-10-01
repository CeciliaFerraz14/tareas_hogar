import { supabase } from './supabase';
import { addDays } from './meals';
import { DAY_NAMES, dateKey, parseDateKey, shortDate, weekDayOf } from './tasks';

// Mascotas: rutinas que se repiten (pet_routines) y quién las ha hecho (pet_logs).
//   · daily    → cada día a unas horas; cada hora es una "toma" (slot 0, 1, 2…)
//   · weekly   → unos días de la semana (week_days: 0=Lunes … 6=Domingo)
//   · interval → cada N días desde start_date
//   · monthly  → un día de cada mes
// Una toma hecha = una fila en pet_logs con (routine_id, for_date, slot). La base de
// datos no deja marcar la misma toma dos veces (unique), así nadie repite comida.
//
// Una rutina o un apunte (pet_items) con pet_id null es de la manada: de las
// mascotas del hogar que forman parte de ella (in_pack). Con remind, la base de
// datos avisa cuando toca y nadie lo ha marcado (a las horas de las diarias o a
// remind_at de las demás): a quien es responsable de las mascotas o, si alguna
// es del piso, a todo el hogar.

export const PET_TYPES = [
  { value: 'perro', label: 'Perro', emoji: '🐶' },
  { value: 'gato', label: 'Gato', emoji: '🐱' },
  { value: 'conejo', label: 'Conejo', emoji: '🐰' },
  { value: 'pájaro', label: 'Pájaro', emoji: '🐦' },
  { value: 'pez', label: 'Pez', emoji: '🐟' },
  { value: 'otro', label: 'Otro', emoji: '🐾' },
] as const;

export type PetTypeValue = (typeof PET_TYPES)[number]['value'];

export function petEmoji(type: string | null): string {
  return PET_TYPES.find((t) => t.value === type)?.emoji ?? '🐾';
}

export type PetFrequency = 'daily' | 'weekly' | 'interval' | 'monthly';

/** owner_id: quien es responsable; null = del piso. in_pack: si forma parte de la manada. */
export type Pet = { id: string; name: string; type: string | null; photo_url: string | null; owner_id: string | null; in_pack: boolean };

/** A quién va algo: una mascota (su id) o la manada (null). */
export type PetTarget = string | null;

export type PetRoutine = {
  id: string;
  pet_id: PetTarget;
  title: string;
  emoji: string;
  frequency: PetFrequency;
  /** 'HH:MM' (la base de datos las da como 'HH:MM:SS'; se recortan al cargar). */
  times: string[] | null;
  week_days: number[] | null;
  interval_days: number | null;
  month_day: number | null;
  start_date: string;
  position: number;
  remind: boolean;
  /** 'HH:MM': hora del aviso de las que no son diarias. */
  remind_at: string;
};

export type PetLog = {
  id: string;
  routine_id: string;
  for_date: string;
  slot: number;
  done_by: string | null;
  done_at: string;
};

/** Lo necesario para crear una rutina (formulario y sugerencias). */
export type RoutineDraft = {
  title: string;
  emoji: string;
  frequency: PetFrequency;
  times?: string[];
  week_days?: number[];
  interval_days?: number;
  month_day?: number;
  remind?: boolean;
  remind_at?: string;
};

/** Pendientes (de una vez), cosas que comprar y notas. */
export type PetItemKind = 'todo' | 'buy' | 'note';

export type PetItem = {
  id: string;
  pet_id: PetTarget;
  kind: PetItemKind;
  title: string;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  created_by: string | null;
  created_at: string;
};

export const PET_ITEM_KINDS: Record<PetItemKind, { label: string; title: string; placeholder: string; max: number }> = {
  todo: { label: 'Pendiente', title: 'Pendientes', placeholder: 'Ej. Veterinario el jueves, vacuna…', max: 120 },
  buy: { label: 'Comprar', title: 'Para comprar', placeholder: 'Ej. Arena, pienso, antiparasitario…', max: 120 },
  note: { label: 'Nota', title: 'Notas', placeholder: 'Ej. Es alérgico al pollo. Veterinario: 600 000 000', max: 1000 },
};

export const ROUTINE_EMOJIS = ['🍖', '💧', '🧹', '💊', '🛁', '🪮', '✂️', '🎾', '🐾'] as const;
export const TIME_PRESETS = ['08:00', '09:00', '14:00', '18:00', '20:00', '21:30'] as const;
export const ROUTINE_TITLE_MAX = 60;

/** Rutinas que se proponen al crear una mascota, según su tipo. */
export function suggestedRoutines(type: PetTypeValue): RoutineDraft[] {
  const food: RoutineDraft = { title: 'Comida', emoji: '🍖', frequency: 'daily', times: ['08:00', '20:00'] };
  switch (type) {
    case 'perro':
      return [food, { title: 'Agua limpia', emoji: '💧', frequency: 'daily', times: ['09:00'] }];
    case 'gato':
      return [food, { title: 'Agua limpia', emoji: '💧', frequency: 'daily', times: ['09:00'] }, { title: 'Arena', emoji: '🧹', frequency: 'interval', interval_days: 2, remind: true }];
    case 'conejo':
      return [{ ...food, title: 'Heno y comida' }, { title: 'Limpiar la jaula', emoji: '🧹', frequency: 'interval', interval_days: 3, remind: true }];
    case 'pájaro':
      return [{ title: 'Comida y agua', emoji: '🍖', frequency: 'daily', times: ['09:00'] }, { title: 'Limpiar la jaula', emoji: '🧹', frequency: 'interval', interval_days: 3, remind: true }];
    case 'pez':
      return [{ title: 'Comida', emoji: '🍖', frequency: 'daily', times: ['09:00'] }, { title: 'Cambiar el agua', emoji: '💧', frequency: 'interval', interval_days: 14, remind: true }];
    case 'otro':
      return [{ title: 'Comida', emoji: '🍖', frequency: 'daily', times: ['09:00'] }];
  }
}

/** '8:30' o '08:30' → '08:30'; null si no es una hora válida. */
export function normalizeTime(text: string): string | null {
  const m = /^(\d{1,2})[:.h]?(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const andList = (items: readonly string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;

/** 'Cada día · 08:00 y 20:00' · 'Cada lunes' · 'Cada 2 días' · 'El día 1 de cada mes'. */
export function scheduleLabel(r: PetRoutine | RoutineDraft): string {
  if (r.frequency === 'daily') return `Cada día · ${andList(r.times ?? [])}`;
  if (r.frequency === 'weekly') {
    const days = [...(r.week_days ?? [])].sort((a, b) => a - b);
    if (days.length === 7) return 'Todos los días';
    return days.length === 1 ? `Cada ${DAY_NAMES[days[0]]}` : `Los ${andList(days.map((d) => DAY_NAMES[d]))}`;
  }
  if (r.frequency === 'interval') return `Cada ${r.interval_days} días`;
  return `El día ${r.month_day} de cada mes`;
}

/**
 * Última fecha (≤ hoy) en la que tocaba una rutina de cada N días o mensual. null
 * si aún no ha tocado nunca: lo de antes de crear la rutina no cuenta (una
 * mensual del día 1 creada el 30 no está "atrasada desde el 1").
 */
export function dueDate(r: PetRoutine, today: Date): Date | null {
  const due = candidateDueDate(r, today);
  return due && dateKey(due) >= r.start_date ? due : null;
}

/** El primer día desde `from` (incluido, hasta 7 adelante o atrás) que cae en uno de `days`. */
function matchingWeekDay(days: number[], from: Date, step: 1 | -1): Date | null {
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i * step);
    if (days.includes(weekDayOf(d))) return d;
  }
  return null;
}

function candidateDueDate(r: PetRoutine, today: Date): Date | null {
  if (r.frequency === 'weekly' && r.week_days?.length) return matchingWeekDay(r.week_days, today, -1);
  if (r.frequency === 'interval' && r.interval_days) {
    const start = parseDateKey(r.start_date);
    const days = Math.round((today.getTime() - start.getTime()) / 86_400_000);
    if (days < 0) return null;
    return addDays(start, Math.floor(days / r.interval_days) * r.interval_days);
  }
  if (r.frequency === 'monthly' && r.month_day) {
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), r.month_day);
    return today.getDate() >= r.month_day ? thisMonth : new Date(today.getFullYear(), today.getMonth() - 1, r.month_day);
  }
  return null;
}

/** La siguiente vez que tocará (después de la actual). */
export function nextDate(r: PetRoutine, today: Date): Date | null {
  const due = dueDate(r, today);
  if (r.frequency === 'weekly' && r.week_days?.length) {
    // Aún no ha tocado nunca: desde que empieza (o desde hoy).
    const start = parseDateKey(r.start_date);
    const from = due ? addDays(due, 1) : start > today ? start : today;
    return matchingWeekDay(r.week_days, from, 1);
  }
  if (r.frequency === 'interval' && r.interval_days) {
    return due ? addDays(due, r.interval_days) : parseDateKey(r.start_date);
  }
  if (r.frequency === 'monthly' && r.month_day) {
    if (due) return new Date(due.getFullYear(), due.getMonth() + 1, r.month_day);
    // Aún no ha tocado nunca: el próximo día del mes que toca, desde hoy.
    return today.getDate() <= r.month_day
      ? new Date(today.getFullYear(), today.getMonth(), r.month_day)
      : new Date(today.getFullYear(), today.getMonth() + 1, r.month_day);
  }
  return null;
}

/** Una toma concreta de una rutina: la de las 20:00 de hoy, la arena de este martes… */
export type Occurrence = {
  routine: PetRoutine;
  forDate: string;
  slot: number;
  /** '08:00', 'Hoy', 'Desde el 3 oct'… */
  label: string;
  log: PetLog | null;
  /** Ya debería estar hecha y no lo está. */
  late: boolean;
};

/**
 * Las tomas que cuentan ahora: en las diarias, todas las de hoy; en las demás, la
 * última que tocaba (si no se hizo, sigue pendiente y se marca como atrasada).
 */
export function currentOccurrences(r: PetRoutine, logs: PetLog[], now: Date): Occurrence[] {
  const todayKey = dateKey(now);
  const find = (forDate: string, slot: number) =>
    logs.find((l) => l.routine_id === r.id && l.for_date === forDate && l.slot === slot) ?? null;

  if (r.frequency === 'daily') {
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return (r.times ?? []).map((time, slot) => {
      const log = find(todayKey, slot);
      return { routine: r, forDate: todayKey, slot, label: time, log, late: !log && time <= nowHHMM };
    });
  }

  const due = dueDate(r, now);
  if (!due) return [];
  const dueKey = dateKey(due);
  const log = find(dueKey, 0);
  return [{
    routine: r,
    forDate: dueKey,
    slot: 0,
    label: dueKey === todayKey ? 'Hoy' : `Desde el ${shortDate(dueKey)}`,
    log,
    late: !log && dueKey < todayKey,
  }];
}

/** La última vez que se hizo una rutina. */
export function lastLog(routineId: string, logs: PetLog[]): PetLog | null {
  let last: PetLog | null = null;
  for (const l of logs) if (l.routine_id === routineId && (!last || l.done_at > last.done_at)) last = l;
  return last;
}

/** 'hace 5 min' · 'hace 2 h' · 'ayer a las 20:10' · '3 oct'. */
export function agoLabel(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  if (dateKey(then) === dateKey(now)) return `hace ${Math.round(minutes / 60)} h`;
  const time = then.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (dateKey(then) === dateKey(addDays(now, -1))) return `ayer a las ${time}`;
  return shortDate(dateKey(then));
}

const toHHMM = (t: string) => t.slice(0, 5);

/** Días de historial que se cargan (cubre la rutina más espaciada, 90 días). */
const LOG_DAYS = 92;

/** Lo tachado se sigue viendo (tachado) durante un día, por si fue sin querer. */
const DONE_VISIBLE_MS = 24 * 60 * 60 * 1000;

/** Mascotas, rutinas, registros recientes y apuntes de un hogar. */
export async function loadPetBoard(houseId: string) {
  const since = dateKey(addDays(new Date(), -LOG_DAYS));
  const doneSince = new Date(Date.now() - DONE_VISIBLE_MS).toISOString();
  const [petsRes, routinesRes, logsRes, itemsRes] = await Promise.all([
    supabase.from('pets').select('id, name, type, photo_url, owner_id, in_pack').eq('house_id', houseId).order('name'),
    supabase
      .from('pet_routines')
      .select('id, pet_id, title, emoji, frequency, times, week_days, interval_days, month_day, start_date, position, remind, remind_at')
      .eq('house_id', houseId)
      .order('position')
      .order('created_at'),
    supabase
      .from('pet_logs')
      .select('id, routine_id, for_date, slot, done_by, done_at')
      .eq('house_id', houseId)
      .gte('for_date', since),
    supabase
      .from('pet_items')
      .select('id, pet_id, kind, title, done, done_by, done_at, created_by, created_at')
      .eq('house_id', houseId)
      .or(`done.eq.false,done_at.gte."${doneSince}"`)
      .order('created_at'),
  ]);
  if (petsRes.error) throw petsRes.error;
  const routines: PetRoutine[] = (routinesRes.data ?? []).map((r) => ({
    ...r,
    frequency: r.frequency as PetFrequency,
    times: r.times ? r.times.map(toHHMM) : null,
    remind_at: toHHMM(r.remind_at),
  }));
  return {
    pets: (petsRes.data ?? []) as Pet[],
    routines,
    logs: (logsRes.data ?? []) as PetLog[],
    items: (itemsRes.data ?? []) as PetItem[],
  };
}

/** 'Aviso a las 10:00' · 'Con aviso' (las diarias avisan a sus horas) · null sin aviso. */
export function reminderLabel(r: PetRoutine): string | null {
  if (!r.remind) return null;
  return r.frequency === 'daily' ? 'Con aviso' : `Aviso a las ${r.remind_at}`;
}

/** Un miembro del hogar, para elegir responsable y decir a quién llegan los avisos. */
export type PetMember = { user_id: string; name: string; avatar_url: string | null };

/**
 * A quién avisa una rutina (igual que private.pet_routine_recipients): a quien es
 * responsable de las mascotas a las que toca; null = a todo el hogar (alguna es del piso).
 */
export function reminderRecipients(target: PetTarget, pets: Pet[]): string[] | null {
  const concerned = target === null ? pets.filter((p) => p.in_pack) : pets.filter((p) => p.id === target);
  if (concerned.length === 0 || concerned.some((p) => !p.owner_id)) return null;
  return [...new Set(concerned.map((p) => p.owner_id as string))];
}

/** Nombre de a quién va algo: la mascota o «La manada». */
export function targetName(target: PetTarget, pets: Pet[]): string {
  return target === null ? 'La manada' : (pets.find((p) => p.id === target)?.name ?? '');
}

/** Bucket y ruta de la foto de una mascota: pet-photos/<house_id>/<pet_id>.jpg. */
export const PET_PHOTOS_BUCKET = 'pet-photos';
export const petPhotoPath = (houseId: string, petId: string) => `${houseId}/${petId}.jpg`;

/** Marca una toma como hecha por mí. Si otra persona se ha adelantado, lo dice. */
export async function markDone(houseId: string, occ: Occurrence, userId: string) {
  return supabase.from('pet_logs').insert({
    house_id: houseId,
    routine_id: occ.routine.id,
    for_date: occ.forDate,
    slot: occ.slot,
    done_by: userId,
  });
}

/** Filas para insertar las rutinas de una mascota (o de la manada, con petId null). */
export function routineRows(houseId: string, petId: PetTarget, userId: string, drafts: RoutineDraft[], startDate: string) {
  return drafts.map((d, i) => ({
    house_id: houseId,
    pet_id: petId,
    title: d.title.trim(),
    emoji: d.emoji,
    frequency: d.frequency,
    times: d.frequency === 'daily' ? [...(d.times ?? [])].sort() : null,
    week_days: d.frequency === 'weekly' ? [...(d.week_days ?? [0])].sort((a, b) => a - b) : null,
    interval_days: d.frequency === 'interval' ? (d.interval_days ?? 2) : null,
    month_day: d.frequency === 'monthly' ? (d.month_day ?? 1) : null,
    start_date: startDate,
    remind: d.remind ?? false,
    remind_at: d.remind_at ?? '10:00',
    position: i,
    created_by: userId,
  }));
}
