import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  BookOpen,
  ChevronRight,
  PawPrint,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { Avatar } from '../../../components/ui/Avatar';
import { HouseGate } from '../../../components/house/HouseGate';
import { TabHeader } from '../../../components/house/HouseSwitcher';
import { useTabBarSpace } from '../../../hooks/useTabBarSpace';
import { useAuthStore } from '../../../store/authStore';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { useActiveHouse, type MyHouse } from '../../../store/houseStore';
import { supabase } from '../../../lib/supabase';
import { dateKey } from '../../../lib/tasks';
import { useTheme } from '../../../lib/theme';

type Board = {
  menuToday: string | null;
  recipes: number;
  pets: string[];
  /** Positivo: me deben. Negativo: debo. */
  balance: number;
  members: { id: string; name: string; avatar_url: string | null }[];
};

const EMPTY: Board = { menuToday: null, recipes: 0, pets: [], balance: 0, members: [] };

const euros = (n: number) =>
  `${Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function MasTab() {
  const active = useActiveHouse();
  if (active.status !== 'ready') return <HouseGate state={active} />;
  return <MasScreen key={active.house.id} house={active.house} />;
}

/** Más: el tablero del hogar (menú, recetas, hucha, mascotas, miembros) y la cuenta. */
function MasScreen({ house }: { house: MyHouse }) {
  const theme = useTheme();
  const router = useRouter();
  const bottomSpace = useTabBarSpace();
  const user = useAuthStore((s) => s.user);
  const openTutorial = useOnboardingStore((s) => s.open);
  const [board, setBoard] = useState<Board>(EMPTY);
  const [me, setMe] = useState<{ name: string; avatar_url: string | null } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [mealsRes, recipesRes, petsRes, splitsRes, membersRes] = await Promise.all([
      supabase.from('meal_plan_entries').select('slot, title').eq('house_id', house.id).eq('date', dateKey(new Date())),
      supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('house_id', house.id),
      supabase.from('pets').select('name').eq('house_id', house.id).order('name'),
      supabase
        .from('expense_splits')
        .select('user_id, amount_owed, expenses!inner (house_id, paid_by)')
        .eq('expenses.house_id', house.id)
        .eq('is_settled', false),
      supabase
        .from('house_members')
        .select('user_id, users:user_id (username, email, avatar_url)')
        .eq('house_id', house.id)
        .order('joined_at', { ascending: true }),
    ]);

    // Lo que se come hoy: la comida y, si no hay, la cena.
    const meals = mealsRes.data ?? [];
    const menuToday = meals.find((m) => m.slot === 'lunch')?.title ?? meals.find((m) => m.slot === 'dinner')?.title ?? null;

    // Igual que en la hucha: lo que cada uno debe a quien pagó, sin contar su propia parte.
    let balance = 0;
    for (const s of splitsRes.data ?? []) {
      const paidBy = s.expenses?.paid_by;
      if (!paidBy || paidBy === s.user_id) continue;
      const amount = Number(s.amount_owed);
      if (paidBy === user.id) balance += amount;
      if (s.user_id === user.id) balance -= amount;
    }

    const members = (membersRes.data ?? []).map((m) => ({
      id: m.user_id,
      name: m.users?.username?.trim() || m.users?.email.split('@')[0] || '—',
      avatar_url: m.users?.avatar_url ?? null,
    }));
    const mine = members.find((m) => m.id === user.id);
    if (mine) setMe({ name: mine.name, avatar_url: mine.avatar_url });

    setBoard({
      menuToday,
      recipes: recipesRes.count ?? 0,
      pets: (petsRes.data ?? []).map((p) => p.name),
      balance: Math.round(balance * 100) / 100,
      members,
    });
  }, [house.id, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const housePath = `/(app)/house/${house.id}`;
  const go = (href: string) => router.push(href as Href);

  const hucha =
    board.balance > 0 ? `Te deben ${euros(board.balance)}` : board.balance < 0 ? `Debes ${euros(board.balance)}` : 'Cuentas claras';
  const pets =
    board.pets.length === 0 ? 'Añade las mascotas del piso' : board.pets.length <= 2 ? board.pets.join(' y ') : `${board.pets.length} mascotas`;

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }} bottomEdge={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: bottomSpace + theme.spacing.lg, gap: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        <TabHeader house={house} title="Más" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
          <Tile Icon={UtensilsCrossed} color={theme.colors.peach} title="Menú" subtitle={board.menuToday ? `Hoy: ${board.menuToday}` : 'Planifica la semana'} onPress={() => go(`${housePath}/menu`)} />
          <Tile Icon={BookOpen} color={theme.colors.lime} title="Recetas" subtitle={board.recipes === 0 ? 'Vuestros platos de siempre' : `${board.recipes} ${board.recipes === 1 ? 'receta' : 'recetas'}`} onPress={() => go(`${housePath}/recetas`)} />
          <Tile Icon={Wallet} color={theme.colors.mustard} title="Hucha" subtitle={hucha} highlighted={board.balance < 0} onPress={() => go(`${housePath}/hucha`)} />
          <Tile Icon={PawPrint} color={theme.colors.peach} title="Mascotas" subtitle={pets} onPress={() => go(`${housePath}/mascotas`)} />
          <Tile
            Icon={Users}
            color={theme.colors.lime}
            title="Miembros y hogar"
            subtitle={`${board.members.length === 1 ? 'Solo tú: invita a tus compis' : `${board.members.length} en casa`} · nombre, foto e invitaciones`}
            extra={<Faces members={board.members} />}
            wide
            onPress={() => go(housePath)}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Row
            left={<Avatar uri={me?.avatar_url} name={me?.name} size={36} />}
            title="Tu cuenta y ajustes"
            subtitle="Perfil, notificaciones y más"
            onPress={() => go('/(app)/ajustes')}
          />
          <Row
            left={<Sparkles size={22} color={theme.colors.accent} />}
            title="Cómo funciona HOMI"
            subtitle="Vuelve a ver el tutorial"
            onPress={openTutorial}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

type TileProps = {
  Icon: LucideIcon;
  color: string;
  title: string;
  subtitle: string;
  extra?: ReactNode;
  /** Resalta la tarjeta (p. ej. cuando debes dinero). */
  highlighted?: boolean;
  /** Ocupa toda la fila. */
  wide?: boolean;
  onPress: () => void;
};

/** Tarjeta del tablero: media anchura, pegatina con icono, título y el dato del momento. */
function Tile({ Icon, color, title, subtitle, extra, highlighted = false, wide = false, onPress }: TileProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => ({
        flexBasis: wide ? '100%' : '46%',
        flexGrow: 1,
        minHeight: wide ? undefined : 128,
        gap: 8,
        padding: theme.spacing.md,
        borderRadius: theme.radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.outline,
        backgroundColor: highlighted ? theme.colors.peach : theme.colors.surface,
        ...(pressed ? theme.shadows.none : theme.shadows.soft),
        ...(pressed ? { transform: [{ translateX: 3 }, { translateY: 3 }] } : null),
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: theme.borderWidth,
          borderColor: theme.colors.outline,
          backgroundColor: color,
        }}
      >
        <Icon size={20} color={theme.colors.textOnFill} strokeWidth={2.3} />
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="heading" style={{ fontSize: 19, lineHeight: 24 }}>{title}</Text>
        <Text variant="caption" color="secondary" numberOfLines={2}>{subtitle}</Text>
      </View>
      {extra}
    </Pressable>
  );
}

function Faces({ members }: { members: Board['members'] }) {
  const theme = useTheme();
  if (members.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row' }}>
      {members.slice(0, 5).map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: 14, borderWidth: 2, borderColor: theme.colors.surface }}>
          <Avatar uri={m.avatar_url} name={m.name} size={24} />
        </View>
      ))}
    </View>
  );
}

function Row({ left, title, subtitle, onPress }: { left: ReactNode; title: string; subtitle: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: theme.spacing.md,
        borderRadius: theme.radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.outline,
        backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
        ...theme.shadows.small,
      })}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold">{title}</Text>
        <Text variant="caption" color="secondary">{subtitle}</Text>
      </View>
      <ChevronRight size={20} color={theme.colors.textSecondary} />
    </Pressable>
  );
}
