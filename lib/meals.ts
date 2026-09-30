import { dateKey, shortDate, weekDayOf } from './tasks';

// Menú semanal: un plato por hueco (día + comida/cena) y hogar.
// En la base de datos es meal_plan_entries, con unique (house_id, date, slot).

export type MealSlot = 'lunch' | 'dinner';

export const MEAL_SLOTS: readonly { key: MealSlot; label: string }[] = [
  { key: 'lunch', label: 'Comida' },
  { key: 'dinner', label: 'Cena' },
];

export type MealEntry = {
  id: string;
  date: string;
  slot: MealSlot;
  title: string;
  cook_id: string | null;
};

/** Atajos del formulario para los días sin plato de verdad. */
export const MEAL_SUGGESTIONS = ['Sobras', 'Pedimos fuera', 'Cada uno lo suyo'] as const;

/** Límite de meal_plan_entries.title. */
export const MEAL_TITLE_MAX = 120;

export function isMealSlot(value: string): value is MealSlot {
  return value === 'lunch' || value === 'dinner';
}

export function slotLabel(slot: MealSlot): string {
  return MEAL_SLOTS.find((s) => s.key === slot)?.label ?? slot;
}

/** Clave `${fecha}|${hueco}` para encontrar el plato de cada hueco. */
export const mealKey = (date: Date | string, slot: MealSlot) =>
  `${typeof date === 'string' ? date : dateKey(date)}|${slot}`;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Lunes de la semana de `date` (a medianoche, hora local). */
export function startOfWeek(date: Date): Date {
  return addDays(date, -weekDayOf(date));
}

/** Los 7 días (lunes → domingo) de la semana que empieza en `monday`. */
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** '29 sep – 5 oct'. */
export function weekRangeLabel(monday: Date): string {
  return `${shortDate(dateKey(monday))} – ${shortDate(dateKey(addDays(monday, 6)))}`;
}

/** 'Esta semana', 'La semana que viene'… o el rango de fechas. */
export function weekTitle(weekOffset: number, monday: Date): string {
  if (weekOffset === 0) return 'Esta semana';
  if (weekOffset === 1) return 'La semana que viene';
  if (weekOffset === -1) return 'La semana pasada';
  return weekRangeLabel(monday);
}
