import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Alert } from '../../../../lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Moon, Plus, ShoppingCart, Sun } from 'lucide-react-native';
import { Screen } from '../../../../components/ui/Screen';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { Avatar } from '../../../../components/ui/Avatar';
import { Button } from '../../../../components/ui/Button';
import { MealFormModal, type MealMember } from '../../../../components/menu/MealFormModal';
import { useAuthStore } from '../../../../store/authStore';
import { supabase } from '../../../../lib/supabase';
import { subscribeToHouseTables } from '../../../../lib/realtime';
import { useTheme } from '../../../../lib/theme';
import { DAY_NAMES, dateKey, parseDateKey, shortDate, weekDayOf } from '../../../../lib/tasks';
import {
  MEAL_SLOTS,
  addDays,
  isMealSlot,
  loadRecipes,
  mealKey,
  startOfWeek,
  weekDays,
  weekRangeLabel,
  weekTitle,
  type MealEntry,
  type MealSlot,
  type Recipe,
} from '../../../../lib/meals';

type OpenSlot = { date: Date; slot: MealSlot; entry: MealEntry | null };

export default function MenuScreen() {
  const { id: houseId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const theme = useTheme();

  // 0 = esta semana, 1 = la siguiente, -1 = la anterior…
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<Map<string, MealEntry>>(new Map());
  const [members, setMembers] = useState<MealMember[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sendingToShopping, setSendingToShopping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // El hueco abierto se guarda aparte de `formOpen` para que la hoja se cierre con su animación.
  const [openSlot, setOpenSlot] = useState<OpenSlot | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const todayKey = dateKey(new Date());
  const monday = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => weekDays(monday), [monday]);

  const loadData = useCallback(async () => {
    if (!houseId) return;
    const [entriesRes, membersRes, recipesList] = await Promise.all([
      supabase
        .from('meal_plan_entries')
        .select('id, date, slot, title, cook_id, recipe_id')
        .eq('house_id', houseId)
        .gte('date', dateKey(monday))
        .lte('date', dateKey(addDays(monday, 6))),
      supabase
        .from('house_members')
        .select('user_id, users:user_id (email, username, avatar_url)')
        .eq('house_id', houseId)
        .order('joined_at', { ascending: true }),
      // Sin recetario el menú sigue funcionando: solo faltan las sugerencias.
      loadRecipes(houseId).catch(() => null),
    ]);
    if (entriesRes.error) { Alert.alert('Error al cargar el menú', entriesRes.error.message); return; }
    const byKey = new Map<string, MealEntry>();
    for (const e of entriesRes.data ?? []) {
      if (isMealSlot(e.slot)) byKey.set(mealKey(e.date, e.slot), { ...e, slot: e.slot });
    }
    setEntries(byKey);
    if (recipesList) setRecipes(recipesList);
    if (membersRes.data) {
      setMembers(
        membersRes.data.map((m) => ({
          user_id: m.user_id,
          email: m.users?.email ?? '',
          username: m.users?.username ?? null,
          avatar_url: m.users?.avatar_url ?? null,
        })),
      );
    }
  }, [houseId, monday]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleRefresh() { setRefreshing(true); await loadData(); setRefreshing(false); }

  // Realtime por Broadcast: si alguien cambia un plato o una receta, se ve al momento.
  useEffect(() => {
    if (!houseId) return;
    return subscribeToHouseTables(houseId, ['meal_plan_entries', 'recipes'], () => { void loadData(); });
  }, [houseId, loadData]);

  const memberById = (id: string | null) => members.find((m) => m.user_id === id) ?? null;
  const planned = days.reduce((n, day) => n + MEAL_SLOTS.filter(({ key }) => entries.has(mealKey(day, key))).length, 0);

  // Pasar a la compra: los platos con receta de hoy (o del lunes, si la semana
  // aún no ha empezado) al domingo. Lo que ya pasó no hace falta comprarlo.
  const sundayKey = dateKey(addDays(monday, 6));
  const shoppingFromKey = dateKey(monday) > todayKey ? dateKey(monday) : todayKey;
  const weekIsOver = sundayKey < todayKey;
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const dishesWithIngredients = [...entries.values()].filter(
    (e) => e.date >= shoppingFromKey && e.recipe_id && (recipeById.get(e.recipe_id)?.ingredients.length ?? 0) > 0,
  ).length;

  function confirmAddToShopping() {
    const from = shoppingFromKey === todayKey ? 'de hoy' : `del ${DAY_NAMES[weekDayOf(parseDateKey(shoppingFromKey))]}`;
    Alert.alert(
      'Pasar a la compra',
      `Se añadirán a la lista los ingredientes de los platos ${from} al domingo. Lo que ya esté pendiente en la lista no se repite.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Añadir', onPress: () => void addToShopping() },
      ],
    );
  }

  async function addToShopping() {
    if (!houseId) return;
    setSendingToShopping(true);
    const { data, error } = await supabase.rpc('add_meals_to_shopping', {
      p_house_id: houseId,
      p_from: shoppingFromKey,
      p_to: sundayKey,
    });
    setSendingToShopping(false);
    if (error) { Alert.alert('No se pudo pasar a la compra', error.message); return; }
    const added = data?.[0]?.added ?? 0;
    const already = data?.[0]?.already_listed ?? 0;
    if (added === 0) {
      Alert.alert('Ya estaba todo', 'Los ingredientes de estos platos ya están pendientes en la lista de la compra.');
      return;
    }
    Alert.alert(
      '¡A la lista!',
      `${added === 1 ? 'Se ha añadido 1 ingrediente' : `Se han añadido ${added} ingredientes`} a la compra` +
        (already > 0 ? ` (${already} ya ${already === 1 ? 'estaba' : 'estaban'}).` : '.'),
      [
        { text: 'Cerrar', style: 'cancel' },
        { text: 'Ver la lista', onPress: () => router.push(`/(app)/house/${houseId}/compra`) },
      ],
    );
  }

  const gutter = theme.spacing.md;

  function renderSlot(day: Date, slot: MealSlot, label: string) {
    const entry = entries.get(mealKey(day, slot)) ?? null;
    const cook = memberById(entry?.cook_id ?? null);
    const Icon = slot === 'lunch' ? Sun : Moon;
    return (
      <Pressable
        key={slot}
        onPress={() => { setOpenSlot({ date: day, slot, entry }); setFormOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={entry ? `${label}: ${entry.title}` : `Añadir ${label.toLowerCase()}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderRadius: theme.radii.md,
          backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
        })}
      >
        <Icon size={18} color={slot === 'lunch' ? theme.colors.mustard : theme.colors.accent} strokeWidth={2.4} />
        <Text variant="caption" color="secondary" style={{ width: 58 }}>{label}</Text>
        {entry ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="bodyBold" style={{ flexShrink: 1 }} numberOfLines={2}>{entry.title}</Text>
            {entry.recipe_id ? (
              <BookOpen size={14} color={theme.colors.textSecondary} accessibilityLabel="Del recetario" />
            ) : null}
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Plus size={14} color={theme.colors.textSecondary} />
            <Text variant="caption" color="secondary">Añadir</Text>
          </View>
        )}
        {cook ? <Avatar uri={cook.avatar_url} name={cook.username ?? cook.email} size={28} /> : null}
      </Pressable>
    );
  }

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: gutter }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="heading">Menú semanal</Text>
          <Text variant="caption" color="secondary">
            {planned === 0 ? 'Nada planeado' : `${planned} de ${days.length * MEAL_SLOTS.length} comidas planeadas`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(`/(app)/house/${houseId}/recetas`)}
          accessibilityRole="button"
          accessibilityLabel="Abrir el recetario"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: theme.radii.pill,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.surface,
            ...(pressed ? theme.shadows.none : theme.shadows.small),
            ...(pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : null),
          })}
        >
          <BookOpen size={16} color={theme.colors.textPrimary} />
          <Text variant="label">Recetas</Text>
        </Pressable>
      </View>

      {/* cambiar de semana */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: gutter, paddingVertical: theme.spacing.md }}>
        <WeekArrow direction="prev" onPress={() => setWeekOffset((w) => w - 1)} />
        <Pressable
          style={{ flex: 1, alignItems: 'center' }}
          onPress={() => setWeekOffset(0)}
          disabled={weekOffset === 0}
          accessibilityRole="button"
          accessibilityLabel={weekOffset === 0 ? weekTitle(0, monday) : 'Volver a esta semana'}
        >
          <Text variant="bodyBold">{weekTitle(weekOffset, monday)}</Text>
          <Text variant="caption" color="secondary">
            {weekOffset === 0 || Math.abs(weekOffset) === 1 ? weekRangeLabel(monday) : 'Toca para volver a hoy'}
          </Text>
        </Pressable>
        <WeekArrow direction="next" onPress={() => setWeekOffset((w) => w + 1)} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 10, paddingHorizontal: gutter, paddingTop: 4, paddingBottom: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        {days.map((day) => {
          const key = dateKey(day);
          const isToday = key === todayKey;
          const isPast = key < todayKey;
          return (
            <Card
              key={key}
              padded={false}
              style={[
                { paddingVertical: 8, paddingHorizontal: 6 },
                isToday ? { borderColor: theme.colors.primary } : null,
                isPast ? { ...theme.shadows.none, borderColor: theme.colors.border, opacity: 0.7 } : null,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 2 }}>
                <Text variant="label" style={{ textTransform: 'capitalize' }}>
                  {`${DAY_NAMES[weekDayOf(day)]} ${day.getDate()}`}
                </Text>
                {isToday ? (
                  <View style={{ backgroundColor: theme.colors.peach, borderWidth: theme.borderWidth, borderColor: theme.colors.outline, borderRadius: theme.radii.pill, paddingHorizontal: 8 }}>
                    <Text variant="caption" color="onFill">Hoy</Text>
                  </View>
                ) : null}
              </View>
              {MEAL_SLOTS.map(({ key: slot, label }) => renderSlot(day, slot, label))}
            </Card>
          );
        })}

        {/* pasar a la compra */}
        {weekIsOver ? null : (
          <View style={{ gap: 6, marginTop: theme.spacing.sm }}>
            <Button
              title="Pasar ingredientes a la compra"
              onPress={confirmAddToShopping}
              loading={sendingToShopping}
              disabled={dishesWithIngredients === 0}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: theme.spacing.md }}>
              <ShoppingCart size={14} color={theme.colors.textSecondary} />
              <Text variant="caption" color="secondary" align="center" style={{ flexShrink: 1 }}>
                {dishesWithIngredients === 0
                  ? 'Elige platos del recetario para pasar sus ingredientes a la lista.'
                  : `${dishesWithIngredients} ${dishesWithIngredients === 1 ? 'plato' : 'platos'} con receta del ${shortDate(shoppingFromKey)} al ${shortDate(sundayKey)}`}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {houseId && user && openSlot ? (
        <MealFormModal
          visible={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={() => void loadData()}
          houseId={houseId}
          userId={user.id}
          members={members}
          recipes={recipes}
          date={openSlot.date}
          slot={openSlot.slot}
          entry={openSlot.entry}
        />
      ) : null}
    </Screen>
  );
}

/** Flecha redonda "pegatina" para pasar de semana. */
function WeekArrow({ direction, onPress }: { direction: 'prev' | 'next'; onPress: () => void }) {
  const theme = useTheme();
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={direction === 'prev' ? 'Semana anterior' : 'Semana siguiente'}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.outline,
        backgroundColor: theme.colors.surface,
        ...(pressed ? theme.shadows.none : theme.shadows.small),
        ...(pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : null),
      })}
    >
      <Icon size={22} color={theme.colors.textPrimary} strokeWidth={2.4} />
    </Pressable>
  );
}
