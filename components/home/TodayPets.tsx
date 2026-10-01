import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Check, ChevronRight, ListTodo, PartyPopper, ShoppingCart } from 'lucide-react-native';
import { Alert } from '../../lib/alert';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { SectionTitle } from '../ui/Labels';
import { subscribeToHouseTables } from '../../lib/realtime';
import { useTheme } from '../../lib/theme';
import {
  currentOccurrences,
  loadPetBoard,
  markDone,
  type Occurrence,
  type Pet,
  type PetItem,
  type PetLog,
  type PetRoutine,
  type PetTarget,
} from '../../lib/pets';
import { PackAvatar, PetAvatar } from '../pets/PetAvatar';
import { RoutineIcon } from '../pets/PetIcons';

type TodayPetsProps = {
  houseId: string;
  userId: string;
  onOpenPets: () => void;
};

/**
 * Mascotas en Hoy: lo que toca hoy y aún no está hecho (lo atrasado, primero),
 * y los pendientes y las cosas por comprar de las mascotas, todo marcable desde
 * aquí. No sale nada si el hogar no tiene mascotas.
 */
export function TodayPets({ houseId, userId, onOpenPets }: TodayPetsProps) {
  const theme = useTheme();
  const [pets, setPets] = useState<Pet[]>([]);
  const [routines, setRoutines] = useState<PetRoutine[]>([]);
  const [logs, setLogs] = useState<PetLog[]>([]);
  const [items, setItems] = useState<PetItem[]>([]);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      const board = await loadPetBoard(houseId);
      setPets(board.pets);
      setRoutines(board.routines);
      setLogs(board.logs);
      setItems(board.items);
      setNow(new Date());
    } catch {
      // Sin conexión: se queda lo que había.
    }
  }, [houseId]);

  // Al volver a Hoy (p. ej. desde Mascotas), al día.
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(
    () => subscribeToHouseTables(houseId, ['pets', 'pet_routines', 'pet_logs', 'pet_items'], () => { void load(); }),
    [houseId, load],
  );

  if (pets.length === 0) return null;

  const petById = new Map(pets.map((p) => [p.id, p]));
  const pending = routines
    .flatMap((r) => currentOccurrences(r, logs, now))
    .filter((o) => !o.log)
    // Lo atrasado primero; luego, por hora.
    .sort((a, b) => Number(b.late) - Number(a.late) || a.label.localeCompare(b.label));
  // Pendientes primero y luego la compra (las notas no se tachan: no salen aquí).
  const openItems = items
    .filter((i) => !i.done && i.kind !== 'note')
    .sort((a, b) => Number(a.kind === 'buy') - Number(b.kind === 'buy'));

  const whoOf = (target: PetTarget) => (target ? (petById.get(target)?.name ?? '') : 'La manada');
  const avatarOf = (target: PetTarget) => {
    if (!target) return <PackAvatar pets={pets.filter((p) => p.in_pack)} size={30} />;
    const pet = petById.get(target);
    return <PetAvatar photoUrl={pet?.photo_url ?? null} type={pet?.type ?? null} size={30} />;
  };

  async function mark(occ: Occurrence) {
    setLogs((prev) => [...prev, { id: `tmp-${occ.routine.id}-${occ.slot}`, routine_id: occ.routine.id, for_date: occ.forDate, slot: occ.slot, done_by: userId, done_at: new Date().toISOString() }]);
    const { error } = await markDone(houseId, occ, userId);
    if (error) {
      Alert.alert(error.code === '23505' ? '¡Ya estaba hecho!' : 'No se pudo marcar', error.code === '23505' ? 'Otra persona lo acaba de marcar.' : error.message);
    }
    void load();
  }

  async function markItem(item: PetItem) {
    const fields = { done: true, done_by: userId, done_at: new Date().toISOString() };
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...fields } : i)));
    const { error } = await supabase.from('pet_items').update(fields).eq('id', item.id);
    if (error) Alert.alert('No se pudo marcar', error.message);
    void load();
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionTitle>Mascotas</SectionTitle>
      <Card padded={false} style={{ ...theme.shadows.small, paddingVertical: 6 }}>
        {pending.length === 0 && openItems.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: theme.spacing.lg, paddingVertical: 10 }}>
            <PartyPopper size={20} color={theme.colors.accent} />
            <Text variant="bodyBold" style={{ flex: 1 }}>Todo hecho con {pets.length === 1 ? pets[0].name : 'las mascotas'} por ahora</Text>
          </View>
        ) : null}

        {pending.map((occ) => (
          <TodayRow
            key={`${occ.routine.id}-${occ.forDate}-${occ.slot}`}
            onPress={() => void mark(occ)}
            avatar={avatarOf(occ.routine.pet_id)}
            icon={<RoutineIcon emoji={occ.routine.emoji} size={20} />}
            title={occ.routine.title}
            caption={whoOf(occ.routine.pet_id)}
            a11y={`${whoOf(occ.routine.pet_id)}: ${occ.routine.title}, ${occ.label}`}
            right={(
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: theme.radii.pill,
                  borderWidth: theme.borderWidth,
                  borderColor: occ.late ? theme.colors.outline : theme.colors.border,
                  backgroundColor: occ.late ? theme.colors.peach : 'transparent',
                }}
              >
                <Text variant="label" color={occ.late ? 'onFill' : 'secondary'}>{occ.late ? `${occ.label} · toca` : occ.label}</Text>
              </View>
            )}
          />
        ))}

        {openItems.map((item) => {
          const Icon = item.kind === 'buy' ? ShoppingCart : ListTodo;
          const kindLabel = item.kind === 'buy' ? 'Para comprar' : 'Pendiente';
          return (
            <TodayRow
              key={item.id}
              onPress={() => void markItem(item)}
              avatar={avatarOf(item.pet_id)}
              icon={<Icon size={16} color={theme.colors.textSecondary} />}
              title={item.title}
              caption={`${whoOf(item.pet_id)} · ${kindLabel}`}
              a11y={`${whoOf(item.pet_id)}: ${kindLabel.toLowerCase()}, ${item.title}`}
            />
          );
        })}

        <Pressable
          onPress={onOpenPets}
          accessibilityRole="link"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingHorizontal: theme.spacing.lg, paddingTop: 2, paddingBottom: 6 }}
        >
          <Text variant="label" color="accent">Ver las mascotas</Text>
          <ChevronRight size={16} color={theme.colors.accent} />
        </Pressable>
      </Card>
    </View>
  );
}

type TodayRowProps = {
  onPress: () => void;
  avatar: ReactNode;
  icon: ReactNode;
  title: string;
  caption: string;
  a11y: string;
  right?: ReactNode;
};

/** Una fila marcable: círculo, mascota (o manada), qué es y, a la derecha, cuándo. */
function TodayRow({ onPress, avatar, icon, title, caption, a11y, right }: TodayRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: false }}
      accessibilityLabel={a11y}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: 10,
        backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
      })}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: theme.borderWidth,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Check size={14} color={theme.colors.border} strokeWidth={3} />
      </View>
      {avatar}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon}
          <Text variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>{title}</Text>
        </View>
        <Text variant="caption" color="secondary">{caption}</Text>
      </View>
      {right}
    </Pressable>
  );
}
