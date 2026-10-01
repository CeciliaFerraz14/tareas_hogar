import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, Moon, Sun } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { supabase } from '../../lib/supabase';
import { subscribeToHouseTables } from '../../lib/realtime';
import { useTheme } from '../../lib/theme';
import { dateKey } from '../../lib/tasks';
import { MEAL_SLOTS, isMealSlot, type MealSlot } from '../../lib/meals';

type TodayMealsProps = {
  houseId: string;
  onOpenMenu: () => void;
};

/** "Hoy se come": la comida y la cena de hoy del hogar. Lleva al menú semanal. */
export function TodayMeals({ houseId, onOpenMenu }: TodayMealsProps) {
  const theme = useTheme();
  const [titles, setTitles] = useState<Record<MealSlot, string | null>>({ lunch: null, dinner: null });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('meal_plan_entries')
      .select('slot, title')
      .eq('house_id', houseId)
      .eq('date', dateKey(new Date()));
    const next: Record<MealSlot, string | null> = { lunch: null, dinner: null };
    for (const e of data ?? []) if (isMealSlot(e.slot)) next[e.slot] = e.title;
    setTitles(next);
  }, [houseId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(
    () => subscribeToHouseTables(houseId, ['meal_plan_entries'], () => { void load(); }),
    [houseId, load],
  );

  return (
    <Card padded={false} style={{ ...theme.shadows.small, paddingVertical: 6 }}>
      {MEAL_SLOTS.map(({ key: slot, label }, i) => {
        const title = titles[slot];
        const Icon = slot === 'lunch' ? Sun : Moon;
        return (
          <Pressable
            key={slot}
            onPress={onOpenMenu}
            accessibilityRole="link"
            accessibilityLabel={`${label}: ${title ?? 'sin planear'}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: 10,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: theme.colors.border,
              backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
            })}
          >
            <Icon size={20} color={slot === 'lunch' ? theme.colors.mustard : theme.colors.accent} strokeWidth={2.4} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="secondary">{label}</Text>
              <Text variant="bodyBold" numberOfLines={1} color={title ? 'primary' : 'secondary'}>
                {title ?? 'Sin planear'}
              </Text>
            </View>
          </Pressable>
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
