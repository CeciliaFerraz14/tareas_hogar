import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, ChevronRight, PartyPopper } from 'lucide-react-native';
import { Alert } from '../../lib/alert';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { SectionTitle } from '../ui/Labels';
import { subscribeToHouseTables } from '../../lib/realtime';
import { useTheme } from '../../lib/theme';
import { currentOccurrences, loadPetBoard, markDone, type Occurrence, type Pet, type PetLog, type PetRoutine } from '../../lib/pets';
import { PackAvatar, PetAvatar } from '../pets/PetAvatar';

type TodayPetsProps = {
  houseId: string;
  userId: string;
  onOpenPets: () => void;
};

/**
 * Mascotas en Hoy: lo que toca hoy y aún no está hecho (lo atrasado, primero),
 * marcable desde aquí. No sale nada si el hogar no tiene mascotas.
 */
export function TodayPets({ houseId, userId, onOpenPets }: TodayPetsProps) {
  const theme = useTheme();
  const [pets, setPets] = useState<Pet[]>([]);
  const [routines, setRoutines] = useState<PetRoutine[]>([]);
  const [logs, setLogs] = useState<PetLog[]>([]);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      const board = await loadPetBoard(houseId);
      setPets(board.pets);
      setRoutines(board.routines);
      setLogs(board.logs);
      setNow(new Date());
    } catch {
      // Sin conexión: se queda lo que había.
    }
  }, [houseId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(
    () => subscribeToHouseTables(houseId, ['pets', 'pet_routines', 'pet_logs'], () => { void load(); }),
    [houseId, load],
  );

  if (pets.length === 0) return null;

  const petById = new Map(pets.map((p) => [p.id, p]));
  const pending = routines
    .flatMap((r) => currentOccurrences(r, logs, now))
    .filter((o) => !o.log)
    // Lo atrasado primero; luego, por hora.
    .sort((a, b) => Number(b.late) - Number(a.late) || a.label.localeCompare(b.label));

  async function mark(occ: Occurrence) {
    setLogs((prev) => [...prev, { id: `tmp-${occ.routine.id}-${occ.slot}`, routine_id: occ.routine.id, for_date: occ.forDate, slot: occ.slot, done_by: userId, done_at: new Date().toISOString() }]);
    const { error } = await markDone(houseId, occ, userId);
    if (error) {
      Alert.alert(error.code === '23505' ? '¡Ya estaba hecho!' : 'No se pudo marcar', error.code === '23505' ? 'Otra persona lo acaba de marcar.' : error.message);
    }
    void load();
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionTitle>Mascotas</SectionTitle>
      <Card padded={false} style={{ ...theme.shadows.small, paddingVertical: 6 }}>
        {pending.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: theme.spacing.lg, paddingVertical: 10 }}>
            <PartyPopper size={20} color={theme.colors.accent} />
            <Text variant="bodyBold" style={{ flex: 1 }}>Todo hecho con {pets.length === 1 ? pets[0].name : 'las mascotas'} por ahora</Text>
          </View>
        ) : (
          pending.map((occ) => {
            // Sin pet_id: es de la manada.
            const pet = occ.routine.pet_id ? petById.get(occ.routine.pet_id) : undefined;
            const who = occ.routine.pet_id ? (pet?.name ?? '') : 'La manada';
            return (
              <Pressable
                key={`${occ.routine.id}-${occ.forDate}-${occ.slot}`}
                onPress={() => void mark(occ)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: false }}
                accessibilityLabel={`${who}: ${occ.routine.title}, ${occ.label}`}
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
                {occ.routine.pet_id ? <PetAvatar photoUrl={pet?.photo_url ?? null} type={pet?.type ?? null} size={30} /> : <PackAvatar pets={pets.filter((p) => p.in_pack)} size={30} />}
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold" numberOfLines={1}>{`${occ.routine.emoji} ${occ.routine.title}`}</Text>
                  <Text variant="caption" color="secondary">{who}</Text>
                </View>
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
              </Pressable>
            );
          })
        )}
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
