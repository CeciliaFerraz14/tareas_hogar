import { supabase } from './supabase';
import { dateKey, shortDate, weekDayOf } from './tasks';

// Menú semanal: un plato por hueco (día + comida/cena) y hogar.
// En la base de datos es meal_plan_entries, con unique (house_id, date, slot).
// Un plato puede venir del recetario (recipe_id) y entonces sus ingredientes
// se pueden pasar a la lista de la compra (RPC add_meals_to_shopping).

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
  recipe_id: string | null;
};

export type RecipeIngredient = { name: string; quantity: string | null };

export type Recipe = {
  id: string;
  title: string;
  notes: string | null;
  ingredients: RecipeIngredient[];
};

/**
 * ¿Quién come en casa? Por hueco (`mealKey`): user_id → true (come) / false (no).
 * Quien no está en el mapa aún no ha contestado.
 */
export type Attendance = Map<string, Map<string, boolean>>;

/** '3 comen · 1 no', o null si nadie ha contestado. */
export function attendanceSummary(answers: Map<string, boolean> | undefined): string | null {
  if (!answers || answers.size === 0) return null;
  const yes = [...answers.values()].filter(Boolean).length;
  const no = answers.size - yes;
  const parts = [
    yes > 0 ? `${yes} ${yes === 1 ? 'come' : 'comen'}` : null,
    no > 0 ? `${no} no` : null,
  ].filter((p): p is string => p !== null);
  return parts.join(' · ');
}

/** Límites de recipes y recipe_ingredients (los comprueba también save_recipe). */
export const RECIPE_LIMITS = { title: 120, notes: 2000, ingredient: 80, quantity: 30, ingredients: 50 } as const;

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

/** Nombre de receta tal como lo compara la base de datos: sin mayúsculas ni espacios de más. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/** 'Lentejas, chorizo, zanahoria…' para las listas. */
export function ingredientsSummary(ingredients: RecipeIngredient[], max = 3): string {
  if (ingredients.length === 0) return 'Sin ingredientes';
  const names = ingredients.slice(0, max).map((i, n) => (n === 0 ? i.name : i.name.toLowerCase()));
  return names.join(', ') + (ingredients.length > max ? '…' : '');
}

/** El recetario de un hogar, por orden alfabético y con los ingredientes en su orden. */
export async function loadRecipes(houseId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, notes, recipe_ingredients (name, quantity, position)')
    .eq('house_id', houseId)
    .order('title');
  if (error) throw error;
  return (data ?? []).map(({ recipe_ingredients, ...recipe }) => ({
    ...recipe,
    ingredients: [...recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map(({ name, quantity }) => ({ name, quantity })),
  }));
}
