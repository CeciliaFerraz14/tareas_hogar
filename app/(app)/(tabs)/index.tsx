import { useCallback, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, View } from 'react-native';
import { Alert } from '../../../lib/alert';
import { useFocusEffect, useRouter } from 'expo-router';
import { Gesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import ReorderableList, { reorderItems, type ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { Home, KeyRound, Star } from 'lucide-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { AddMenuButton } from '../../../components/ui/AddMenuButton';
import { HouseIllustration } from '../../../components/brand/HouseIllustration';
import { HouseCard, type HouseSection } from '../../../components/home/HouseCard';
import { TodayTasks } from '../../../components/home/TodayTasks';
import { useHomeSummary } from '../../../hooks/useHomeSummary';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuthStore } from '../../../store/authStore';
import { useHouseStore } from '../../../store/houseStore';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../lib/theme';

type House = { id: string; name: string; avatar_url: string | null };

/** "Jueves, 25 de septiembre" */
function longToday(): string {
  const s = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function InicioScreen() {
  const user = useAuthStore((s) => s.user);
  const { setCurrentHouse, primaryHouseId, setPrimaryHouse, forgetHouse } = useHouseStore();
  const theme = useTheme();
  const router = useRouter();

  function openHouse(id: string) {
    setCurrentHouse(id);
    router.push(`/(app)/house/${id}`);
  }

  function openSection(id: string, section: HouseSection) {
    setCurrentHouse(id);
    router.push(`/(app)/house/${id}/${section}`);
  }

  const [houses, setHouses] = useState<House[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [markAsPrimary, setMarkAsPrimary] = useState(false);
  const [creating, setCreating] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshEnabled, setRefreshEnabled] = useState(true);

  // Mi orden personal (house_members.sort_order). Sin posición = recién llegado: arriba.
  const loadHouses = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('house_members')
      .select('houses:house_id (id, name, avatar_url)')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true, nullsFirst: true })
      .order('joined_at', { ascending: false });
    if (error) {
      Alert.alert('Error al cargar hogares', error.message);
      return;
    }
    const list = (data ?? []).flatMap((m) => (m.houses ? [m.houses] : []));
    setHouses(list);
    // Olvida los hogares guardados en el móvil que ya no están en mi lista.
    const { currentHouseId, primaryHouseId: primaryId } = useHouseStore.getState();
    for (const stored of [currentHouseId, primaryId]) {
      if (stored && !list.some((h) => h.id === stored)) forgetHouse(stored);
    }
  }, [forgetHouse, user]);

  const houseIds = useMemo(() => (houses ?? []).map((h) => h.id), [houses]);
  const houseNameById = useMemo(
    () => Object.fromEntries((houses ?? []).map((h) => [h.id, h.name])),
    [houses],
  );
  const { firstName, membersByHouse, summaryByHouse, todayTasks, toggleTodayTask, reload } =
    useHomeSummary(user?.id, houseIds);

  // Al volver a Inicio: hogares, contadores y tareas de hoy al día.
  useFocusEffect(
    useCallback(() => {
      void loadHouses();
      void reload();
    }, [loadHouses, reload]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadHouses(), reload()]);
    setRefreshing(false);
  }

  async function createHouse() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para el hogar.');
      return;
    }
    if (!user) return;

    setCreating(true);
    const { data: houseId, error } = await supabase.rpc('create_house', { p_name: trimmed });
    setCreating(false);

    if (error || !houseId) {
      Alert.alert('No se pudo crear el hogar', error?.message ?? 'Error desconocido');
      return;
    }

    if (markAsPrimary) setPrimaryHouse(houseId as string);

    setName('');
    setMarkAsPrimary(false);
    setModalOpen(false);
    await loadHouses();
    openHouse(houseId as string);
  }

  async function joinHouse() {
    const token = code.trim();
    if (!token) {
      Alert.alert('Código requerido', 'Pega el código que te han compartido.');
      return;
    }

    setJoining(true);
    const { data: houseId, error } = await supabase.rpc('accept_invitation', { p_token: token });
    setJoining(false);

    if (error || !houseId) {
      Alert.alert('No se pudo unir al hogar', error?.message ?? 'Código no válido.');
      return;
    }

    setCode('');
    setJoinOpen(false);
    await loadHouses();
    openHouse(houseId as string);
  }

  function moveHouse(from: number, to: number) {
    if (!houses || to < 0 || to >= houses.length || from === to) return;
    const next = reorderItems(houses, from, to);
    setHouses(next);
    void supabase
      .rpc('reorder_my_houses', { p_house_ids: next.map((h) => h.id) })
      .then(({ error }) => {
        if (error) {
          Alert.alert('No se pudo guardar el orden', error.message);
          void loadHouses();
        }
      });
  }

  function handleReorder({ from, to }: ReorderableListReorderEvent) {
    moveHouse(from, to);
  }

  // El arrastre empieza tras la pulsación larga, así el scroll y "deslizar para
  // recargar" siguen funcionando (recomendación de react-native-reorderable-list).
  const panGesture = useMemo(() => Gesture.Pan().activateAfterLongPress(520), []);

  // En Android el RefreshControl se anima al arrastrar: se apaga mientras dura.
  const handleDragStart = useCallback(() => {
    'worklet';
    if (Platform.OS === 'android' && !refreshing) scheduleOnRN(setRefreshEnabled, false);
  }, [refreshing]);

  const handleDragEnd = useCallback(() => {
    'worklet';
    if (Platform.OS === 'android') scheduleOnRN(setRefreshEnabled, true);
  }, []);

  // Espera a que el menú del + termine de cerrarse: en iOS un modal que se abre
  // mientras otro se está cerrando puede no llegar a mostrarse.
  function openAfterMenu(open: () => void) {
    setTimeout(open, 350);
  }

  function togglePrimary(id: string) {
    if (primaryHouseId === id) {
      Alert.alert(
        'Quitar hogar principal',
        '¿Quieres dejar de tener un hogar principal fijado?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Quitar', onPress: () => setPrimaryHouse(null) },
        ],
      );
    } else {
      setPrimaryHouse(id);
    }
  }

  const hasHouses = (houses?.length ?? 0) > 0;

  const header = (
    <View style={{ gap: theme.spacing.lg, marginTop: 16, marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text variant="title" numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>
              {firstName ? `Hola, ${firstName}` : 'Hola'}
            </Text>
            {/* La casita del logo, la misma de la animación de inicio. */}
            <HouseIllustration size={38} />
          </View>
          <Text variant="body" color="secondary">{longToday()}</Text>
        </View>
        <AddMenuButton
          accessibilityLabel="Crear o unirse a un hogar"
          actions={[
            {
              key: 'create',
              title: 'Crear un hogar',
              subtitle: 'Empieza uno nuevo e invita a los demás',
              icon: <Home size={20} color={theme.colors.textOnFill} />,
              onPress: () => openAfterMenu(() => setModalOpen(true)),
            },
            {
              key: 'join',
              title: 'Unirse con un código',
              subtitle: 'Usa el código que te han compartido',
              icon: <KeyRound size={20} color={theme.colors.textOnFill} />,
              onPress: () => openAfterMenu(() => setJoinOpen(true)),
            },
          ]}
        />
      </View>

      {hasHouses ? (
        <View style={{ gap: theme.spacing.sm }}>
          <SectionTitle>Para hoy</SectionTitle>
          <TodayTasks tasks={todayTasks} houseNameById={houseNameById} onToggle={toggleTodayTask} />
        </View>
      ) : null}

      <View style={{ gap: 2 }}>
        <SectionTitle>Mis hogares</SectionTitle>
        {houses && houses.length > 1 ? (
          <Text variant="caption" color="secondary">
            Mantén pulsado un hogar para moverlo.
          </Text>
        ) : null}
      </View>
    </View>
  );

  const empty = houses ? (
    <View style={{ paddingBottom: theme.spacing.lg }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Home size={22} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyBold">Aún no tienes hogares</Text>
            <Text variant="caption" color="secondary">
              Crea tu primer hogar o acepta una invitación.
            </Text>
          </View>
        </View>
      </Card>
    </View>
  ) : null;

  const footer = houses && houses.length === 0 ? (
    <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.xs }}>
      <Button title="Crear un hogar" onPress={() => setModalOpen(true)} />
      <Button
        title="Unirse con un código"
        variant="secondary"
        onPress={() => setJoinOpen(true)}
      />
    </View>
  ) : null;

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }}>
      <ReorderableList
        data={houses ?? []}
        keyExtractor={(h) => h.id}
        onReorder={handleReorder}
        renderItem={({ item, index }) => (
          <HouseCard
            house={item}
            members={membersByHouse[item.id] ?? []}
            summary={summaryByHouse[item.id]}
            isPrimary={primaryHouseId === item.id}
            isFirst={index === 0}
            isLast={index === (houses?.length ?? 0) - 1}
            onOpen={() => openHouse(item.id)}
            onOpenSection={(section) => openSection(item.id, section)}
            onTogglePrimary={() => togglePrimary(item.id)}
            onMove={(delta) => moveHouse(index, index + delta)}
          />
        )}
        panGesture={panGesture}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        shouldUpdateActiveItem
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            enabled={refreshEnabled}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      />

      {/* ── join modal ── */}
      <Modal
        visible={joinOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setJoinOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.radii.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.lg,
            }}
          >
            <Text variant="title">Unirse a un hogar</Text>
            <Text variant="body" color="secondary">
              Pega el código de acceso que te han compartido.
            </Text>
            <Input
              label="Código"
              placeholder="abc123..."
              autoCapitalize="none"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
              autoFocus
            />
            <Button title="Unirse" loading={joining} onPress={joinHouse} />
            <Button
              title="Cancelar"
              variant="ghost"
              onPress={() => {
                setJoinOpen(false);
                setCode('');
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── create modal ── */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.radii.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.lg,
            }}
          >
            <Text variant="title">Nuevo hogar</Text>
            <Input
              label="Nombre"
              placeholder="Mi piso"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            {/* toggle hogar principal */}
            <Pressable
              onPress={() => setMarkAsPrimary((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: theme.spacing.md,
                borderRadius: theme.radii.md,
                backgroundColor: markAsPrimary ? theme.colors.primaryMuted : theme.colors.surface,
                borderWidth: 1.5,
                borderColor: markAsPrimary ? theme.colors.primary : theme.colors.border,
              }}
            >
              <Star
                size={20}
                color={markAsPrimary ? theme.colors.primary : theme.colors.textSecondary}
                fill={markAsPrimary ? theme.colors.primary : 'transparent'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  variant="bodyBold"
                  style={{ color: markAsPrimary ? theme.colors.primary : theme.colors.textPrimary }}
                >
                  Marcar como hogar principal
                </Text>
                <Text variant="caption" color="secondary">
                  Se mostrará siempre fijado en el inicio
                </Text>
              </View>
            </Pressable>

            <Button title="Crear" loading={creating} onPress={createHouse} />
            <Button
              title="Cancelar"
              variant="ghost"
              onPress={() => {
                setModalOpen(false);
                setName('');
                setMarkAsPrimary(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="label" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </Text>
  );
}
