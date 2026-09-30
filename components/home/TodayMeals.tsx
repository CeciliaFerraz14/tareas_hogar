import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, Moon, Sun } from 'lucide-react-native';
import { Alert } from '../../lib/alert';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { supabase } from '../../lib/supabase';
import { subscribeToHouseTables } from '../../lib/realtime';
import { useTheme } from '../../lib/theme';
import { dateKey } from '../../lib/tasks';
import { MEAL_SLOTS, isMealSlot, type MealSlot } from '../../lib/meals';

type SlotToday = { title: string | null; eating: boolean | null };

type TodayMealsProps = {
  houseId: string;
  userId: string;
  onOpenMenu: () => void;
};

/**
 * "Hoy se come": la comida y la cena de hoy del hogar, y mi respuesta a
 * "¿comes en casa?", que se puede cambiar desde aquí sin entrar al menú.
 */
export function TodayMeals({ houseId, userId, onOpenMenu }: TodayMealsProps) {
  const theme = useTheme();
  const [slots, setSlots] = useState<Record<MealSlot, SlotToday>>({
    lunch: { title: null, eating: null },
    dinner: { title: null, eating: null },
  });

  const load = useCallback(async () => {
    const today = dateKey(new Date());
    const [entriesRes, attendanceRes] = await Promise.all([
      supabase.from('meal_plan_entries').select('slot, title').eq('house_id', houseId).eq('date', today),
      supabase.from('meal_attendance').select('slot, eating').eq('house_id', houseId).eq('date', today).eq('user_id', userId),
    ]);
    const next: Record<MealSlot, SlotToday> = { lunch: { title: null, eating: null }, dinner: { title: null, eating: null } };
    for (const e of entriesRes.data ?? []) if (isMealSlot(e.slot)) next[e.slot].title = e.title;
    for (const a of attendanceRes.data ?? []) if (isMealSlot(a.slot)) next[a.slot].eating = a.eating;
    setSlots(next);
  }, [houseId, userId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(
    () => subscribeToHouseTables(houseId, ['meal_plan_entries', 'meal_attendance'], () => { void load(); }),
    [houseId, load],
  );

  async function answer(slot: MealSlot, value: boolean) {
    const previous = slots[slot].eating;
    const next = previous === value ? null : value; // tocar la misma respuesta la quita
    setSlots((s) => ({ ...s, [slot]: { ...s[slot], eating: next } }));
    const { error } = await supabase.rpc('set_meal_attendance', {
      p_house_id: houseId,
      p_date: dateKey(new Date()),
      p_slot: slot,
      p_eating: next ?? undefined,
    });
    if (error) {
      setSlots((s) => ({ ...s, [slot]: { ...s[slot], eating: previous } }));
      Alert.alert('No se pudo guardar tu respuesta', error.message);
    }
  }

  return (
    <Card padded={false} style={{ ...theme.shadows.small, paddingVertical: 6 }}>
      {MEAL_SLOTS.map(({ key: slot, label }, i) => {
        const { title, eating } = slots[slot];
        const Icon = slot === 'lunch' ? Sun : Moon;
        return (
          <View
            key={slot}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: 10,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <Icon size={20} color={slot === 'lunch' ? theme.colors.mustard : theme.colors.accent} strokeWidth={2.4} />
            <Pressable onPress={onOpenMenu} accessibilityRole="link" style={{ flex: 1 }}>
              <Text variant="caption" color="secondary">{label}</Text>
              <Text variant="bodyBold" numberOfLines={1} color={title ? 'primary' : 'secondary'}>
                {title ?? 'Sin planear'}
              </Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={slot === 'lunch' ? '¿Comes en casa?' : '¿Cenas en casa?'}>
              <AnswerChip label={slot === 'lunch' ? 'Como' : 'Ceno'} selected={eating === true} onPress={() => void answer(slot, true)} />
              <AnswerChip label="No" selected={eating === false} onPress={() => void answer(slot, false)} tone="no" />
            </View>
          </View>
        );
      })}
      <Pressable
        onPress={onOpenMenu}
        accessibilityRole="link"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingHorizontal: theme.spacing.lg, paddingTop: 2, paddingBottom: 6 }}
      >
        <Text variant="label" color="accent">Ver el menú de la semana</Text>
        <ChevronRight size={16} color={theme.colors.accent} />
      </Pressable>
    </Card>
  );
}

function AnswerChip({ label, selected, onPress, tone = 'yes' }: { label: string; selected: boolean; onPress: () => void; tone?: 'yes' | 'no' }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={4}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.radii.pill,
        borderWidth: theme.borderWidth,
        borderColor: selected ? theme.colors.outline : theme.colors.border,
        backgroundColor: selected ? (tone === 'yes' ? theme.colors.lime : theme.colors.peach) : 'transparent',
      }}
    >
      <Text variant="label" color={selected ? 'onFill' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}
