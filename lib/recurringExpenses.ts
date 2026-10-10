import {
  Building2,
  Droplet,
  Flame,
  Home,
  Receipt,
  ShieldCheck,
  Smartphone,
  Tv,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import type { Database } from '../types/database.types';

// Gastos fijos de la casa (alquiler, luz, internet…): lo que cuesta al mes, sin
// repartir ni generar deudas. Tabla recurring_expenses (HOMI · 30).

export type RecurringPeriod = 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';
export type RecurringCategory =
  | 'rent' | 'power' | 'gas' | 'water' | 'internet' | 'phone'
  | 'insurance' | 'community' | 'subscription' | 'other';

export type RecurringExpense = Omit<Database['public']['Tables']['recurring_expenses']['Row'], 'period' | 'category'> & {
  period: RecurringPeriod;
  category: RecurringCategory;
};

/** Cuántos meses cubre cada pago. */
export const PERIODS: Record<RecurringPeriod, { label: string; months: number }> = {
  monthly:   { label: 'Cada mes', months: 1 },
  bimonthly: { label: 'Cada 2 meses', months: 2 },
  quarterly: { label: 'Cada 3 meses', months: 3 },
  yearly:    { label: 'Cada año', months: 12 },
};

/** `variable`: el importe cambia cada factura; al elegirla se marca como aproximado. */
export const CATEGORIES: Record<RecurringCategory, { label: string; Icon: LucideIcon; variable: boolean }> = {
  rent:         { label: 'Alquiler', Icon: Home, variable: false },
  power:        { label: 'Luz', Icon: Zap, variable: true },
  gas:          { label: 'Gas', Icon: Flame, variable: true },
  water:        { label: 'Agua', Icon: Droplet, variable: true },
  internet:     { label: 'Internet', Icon: Wifi, variable: false },
  phone:        { label: 'Teléfono', Icon: Smartphone, variable: false },
  insurance:    { label: 'Seguro', Icon: ShieldCheck, variable: false },
  community:    { label: 'Comunidad', Icon: Building2, variable: false },
  subscription: { label: 'Suscripción', Icon: Tv, variable: false },
  other:        { label: 'Otro', Icon: Receipt, variable: false },
};

export const CATEGORY_ORDER = Object.keys(CATEGORIES) as RecurringCategory[];

/** Lo que toca al mes: un pago anual de 120 € son 10 € al mes. */
export function monthlyAmount(e: Pick<RecurringExpense, 'amount' | 'period'>): number {
  return Number(e.amount) / PERIODS[e.period].months;
}

/** 1.292,25: con punto de miles siempre (toLocaleString no lo pone en 4 cifras). */
export function formatEuros(n: number): string {
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return `${n < -0.004 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}
