import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MessageCircle, ShoppingCart } from 'lucide-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { SectionTitle } from '../../../components/ui/Labels';
import { HouseGate } from '../../../components/house/HouseGate';
import { TabHeader } from '../../../components/house/HouseSwitcher';
import { TodayTasks } from '../../../components/home/TodayTasks';
import { TodayMeals } from '../../../components/home/TodayMeals';
import { TodayPets } from '../../../components/home/TodayPets';
import { NotificationsPrompt } from '../../../components/home/NotificationsPrompt';
import { useHomeSummary } from '../../../hooks/useHomeSummary';
import { useTabBarSpace } from '../../../hooks/useTabBarSpace';
import { useAuthStore } from '../../../store/authStore';
import { useActiveHouse, type MyHouse } from '../../../store/houseStore';
import { useTheme } from '../../../lib/theme';

/** "Jueves, 25 de septiembre" */
function longToday(): string {
  const s = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function HoyTab() {
  const active = useActiveHouse();
  if (active.status !== 'ready') return <HouseGate state={active} />;
  return <HoyScreen key={active.house.id} house={active.house} />;
}

/** Hoy: el día en el hogar activo. Tareas, qué se come, la compra y el chat. */
function HoyScreen({ house }: { house: MyHouse }) {
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();
  const router = useRouter();
  const bottomSpace = useTabBarSpace();
  const houseIds = useMemo(() => [house.id], [house.id]);
  const { firstName, summaryByHouse, todayTasks, toggleTodayTask, reload } = useHomeSummary(user?.id, houseIds);
  const [refreshing, setRefreshing] = useState(false);

  // Al volver a Hoy: contadores y tareas al día.
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  async function handleRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const summary = summaryByHouse[house.id];
  const shopping = summary?.shoppingPending ?? 0;
  const unread = summary?.unreadMessages ?? 0;
  const myTasks = todayTasks.filter((t) => t.house_id === house.id);

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }} bottomEdge={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: bottomSpace + theme.spacing.lg, gap: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        <TabHeader house={house} title={firstName ? `Hola, ${firstName}` : 'Hola'} subtitle={longToday()} />

        <NotificationsPrompt />

        <Section title="Para hoy">
          <TodayTasks tasks={myTasks} houseNameById={{}} onToggle={toggleTodayTask} />
        </Section>

        {user ? (
          <Section title="Hoy se come">
            <TodayMeals houseId={house.id} onOpenMenu={() => router.push(`/(app)/house/${house.id}/menu`)} />
          </Section>
        ) : null}

        {user ? (
          <TodayPets houseId={house.id} userId={user.id} onOpenPets={() => router.push(`/(app)/house/${house.id}/mascotas`)} />
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <CounterTile
            icon={<ShoppingCart size={20} color={theme.colors.textOnFill} />}
            count={shopping}
            label={shopping === 1 ? 'cosa en la compra' : 'cosas en la compra'}
            emptyLabel="Compra al día"
            onPress={() => router.navigate('/(app)/(tabs)/compra')}
          />
          <CounterTile
            icon={<MessageCircle size={20} color={theme.colors.textOnFill} />}
            count={unread}
            label={unread === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}
            emptyLabel="Chat al día"
            onPress={() => router.navigate('/(app)/(tabs)/chat')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </View>
  );
}

type CounterTileProps = { icon: ReactNode; count: number; label: string; emptyLabel: string; onPress: () => void };

/** Contador que lleva a su pestaña. Resaltado si hay algo pendiente. */
function CounterTile({ icon, count, label, emptyLabel, onPress }: CounterTileProps) {
  const theme = useTheme();
  const highlighted = count > 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={highlighted ? `${count} ${label}` : emptyLabel}
      style={({ pressed }) => ({
        flex: 1,
        gap: 8,
        padding: theme.spacing.md,
        borderRadius: theme.radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.outline,
        backgroundColor: highlighted ? theme.colors.peach : theme.colors.surface,
        ...(pressed ? theme.shadows.none : theme.shadows.small),
        ...(pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : null),
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: theme.borderWidth,
          borderColor: theme.colors.outline,
          backgroundColor: highlighted ? theme.colors.surface : theme.colors.surfaceAlt,
        }}
      >
        {icon}
      </View>
      {highlighted ? (
        <View>
          <Text variant="title" color="onFill">{count}</Text>
          <Text variant="label" color="onFill">{label}</Text>
        </View>
      ) : (
        <Text variant="bodyBold" color="secondary">{emptyLabel}</Text>
      )}
    </Pressable>
  );
}
