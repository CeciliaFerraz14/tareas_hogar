import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Bell, Check, ChevronDown, ChevronUp, Circle, CheckCircle2, MoreHorizontal, Plus } from 'lucide-react-native';
import { Alert } from '../../../../lib/alert';
import { Screen } from '../../../../components/ui/Screen';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PlusButton } from '../../../../components/ui/PlusButton';
import { PetFormModal } from '../../../../components/pets/PetFormModal';
import { RoutineFormModal } from '../../../../components/pets/RoutineFormModal';
import { PetItemFormModal } from '../../../../components/pets/PetItemFormModal';
import { PackAvatar, PetAvatar } from '../../../../components/pets/PetAvatar';
import { RoutineIcon } from '../../../../components/pets/PetIcons';
import { useAuthStore } from '../../../../store/authStore';
import { useSyncActiveHouse } from '../../../../store/houseStore';
import { supabase } from '../../../../lib/supabase';
import { subscribeToHouseTables } from '../../../../lib/realtime';
import { useTheme } from '../../../../lib/theme';
import { dateKey, shortDate } from '../../../../lib/tasks';
import {
  PET_ITEM_KINDS,
  agoLabel,
  currentOccurrences,
  lastLog,
  loadPetBoard,
  markDone,
  nextDate,
  reminderLabel,
  scheduleLabel,
  type Occurrence,
  type Pet,
  type PetItem,
  type PetItemKind,
  type PetLog,
  type PetMember,
  type PetRoutine,
  type PetTarget,
} from '../../../../lib/pets';

/** Orden de los apuntes dentro de cada tarjeta. */
const ITEM_ORDER: PetItemKind[] = ['buy', 'todo', 'note'];

export default function MascotasScreen() {
  const { id: houseId } = useLocalSearchParams<{ id: string }>();
  useSyncActiveHouse(houseId);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const theme = useTheme();

  const [pets, setPets] = useState<Pet[]>([]);
  const [routines, setRoutines] = useState<PetRoutine[]>([]);
  const [logs, setLogs] = useState<PetLog[]>([]);
  const [items, setItems] = useState<PetItem[]>([]);
  const [members, setMembers] = useState<PetMember[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Reloj para que "hace 5 min" y lo atrasado se actualicen solos.
  const [now, setNow] = useState(() => new Date());

  // Formularios (lo abierto se guarda aparte de `…Open` para que se cierren con su animación).
  const [petForm, setPetForm] = useState<{ open: boolean; pet: Pet | null }>({ open: false, pet: null });
  const [routineForm, setRoutineForm] = useState<{ open: boolean; target: PetTarget; routine: PetRoutine | null }>({ open: false, target: null, routine: null });
  const [itemForm, setItemForm] = useState<{ open: boolean; kind: PetItemKind; target: PetTarget; item: PetItem | null }>({ open: false, kind: 'todo', target: null, item: null });
  // Mascotas de la manada desplegadas.
  const [openPets, setOpenPets] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!houseId) return;
    try {
      const [board, membersRes] = await Promise.all([
        loadPetBoard(houseId),
        supabase.from('house_members').select('user_id, users:user_id (username, email, avatar_url)').eq('house_id', houseId).order('joined_at'),
      ]);
      setPets(board.pets);
      setRoutines(board.routines);
      setLogs(board.logs);
      setItems(board.items);
      setMembers((membersRes.data ?? []).map((m) => ({
        user_id: m.user_id,
        name: m.users?.username?.trim() || m.users?.email.split('@')[0] || '—',
        avatar_url: m.users?.avatar_url ?? null,
      })));
      setNow(new Date());
    } catch (e) {
      Alert.alert('Error al cargar las mascotas', e instanceof Error ? e.message : String(e));
    }
  }, [houseId]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Tiempo real: lo que marca uno lo ven los demás al momento.
  useEffect(() => {
    if (!houseId) return;
    return subscribeToHouseTables(houseId, ['pets', 'pet_routines', 'pet_logs', 'pet_items'], () => { void loadData(); });
  }, [houseId, loadData]);

  async function handleRefresh() { setRefreshing(true); await loadData(); setRefreshing(false); }

  const nameOf = (id: string | null) => (id === user?.id ? 'Tú' : (id && members.find((m) => m.user_id === id)?.name) || 'Alguien');

  async function toggleOccurrence(occ: Occurrence, who: string) {
    if (!houseId || !user) return;
    if (occ.log) {
      const log = occ.log;
      Alert.alert(
        'Desmarcar',
        `${nameOf(log.done_by)} ${log.done_by === user.id ? 'lo marcaste' : 'lo marcó'} ${agoLabel(log.done_at, now)}. ¿Quitar la marca de «${occ.routine.title}» de ${who}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Quitar',
            style: 'destructive',
            onPress: async () => {
              setLogs((prev) => prev.filter((l) => l.id !== log.id));
              const { error } = await supabase.from('pet_logs').delete().eq('id', log.id);
              if (error) { Alert.alert('No se pudo desmarcar', error.message); void loadData(); }
            },
          },
        ],
      );
      return;
    }
    // Se marca al momento; si falla, se deshace.
    const optimistic: PetLog = {
      id: `tmp-${occ.routine.id}-${occ.forDate}-${occ.slot}`,
      routine_id: occ.routine.id,
      for_date: occ.forDate,
      slot: occ.slot,
      done_by: user.id,
      done_at: new Date().toISOString(),
    };
    setLogs((prev) => [...prev, optimistic]);
    const { error } = await markDone(houseId, occ, user.id);
    if (error) {
      setLogs((prev) => prev.filter((l) => l.id !== optimistic.id));
      if (error.code === '23505') {
        Alert.alert('¡Ya estaba hecho!', 'Otra persona lo acaba de marcar. Así no se repite.');
      } else {
        Alert.alert('No se pudo marcar', error.message);
      }
    }
    void loadData();
  }

  /** Tachar o destachar un pendiente o algo de la compra. */
  async function toggleItem(item: PetItem) {
    if (!user) return;
    const done = !item.done;
    const fields = { done, done_by: done ? user.id : null, done_at: done ? new Date().toISOString() : null };
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...fields } : i)));
    const { error } = await supabase.from('pet_items').update(fields).eq('id', item.id);
    if (error) { Alert.alert('No se pudo actualizar', error.message); void loadData(); }
  }

  // La manada: las mascotas que forman parte de ella, si son dos o más (o si ya
  // tiene cosas suyas). Las demás van por su cuenta, con su propia tarjeta.
  const packPets = pets.filter((p) => p.in_pack);
  const packRoutines = routines.filter((r) => r.pet_id === null);
  const packItems = items.filter((i) => i.pet_id === null);
  const showPack = packPets.length >= 2 || packRoutines.length > 0 || packItems.length > 0;
  const loosePets = showPack ? pets.filter((p) => !p.in_pack) : pets;

  const ownerLabel = (pet: Pet) => (pet.owner_id ? (pet.owner_id === user?.id ? 'Tuya' : `De ${nameOf(pet.owner_id)}`) : 'Del piso');

  const bodyProps = (target: PetTarget, who: string) => ({
    routines: routines.filter((r) => r.pet_id === target),
    items: items.filter((i) => i.pet_id === target),
    logs,
    now,
    nameOf,
    onToggle: (occ: Occurrence) => void toggleOccurrence(occ, who),
    onAddRoutine: () => setRoutineForm({ open: true, target, routine: null }),
    onEditRoutine: (routine: PetRoutine) => setRoutineForm({ open: true, target, routine }),
    onAddItem: (kind: PetItemKind) => setItemForm({ open: true, kind, target, item: null }),
    onEditItem: (item: PetItem) => setItemForm({ open: true, kind: item.kind, target, item }),
    onToggleItem: (item: PetItem) => void toggleItem(item),
  });

  function toggleOpen(petId: string) {
    setOpenPets((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  }

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>Mascotas</Text>
        <PlusButton onPress={() => setPetForm({ open: true, pet: null })} accessibilityLabel="Nueva mascota" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.lg, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        {pets.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
            <Text style={{ fontSize: 56, lineHeight: 64 }}>🐾</Text>
            <Text variant="heading">Aún no hay mascotas</Text>
            <Text variant="body" align="center">
              Añade las mascotas del piso, quién se encarga de cada una y sus rutinas (comida, arena…) para saber siempre si ya están hechas.
            </Text>
            <Button title="Añadir mascota" fullWidth={false} onPress={() => setPetForm({ open: true, pet: null })} />
          </View>
        ) : (
          <>
            {showPack ? (
              <Card padded={false} style={{ paddingVertical: theme.spacing.md, gap: theme.spacing.sm }}>
                <GroupHeader
                  avatar={<PackAvatar pets={packPets} size={56} />}
                  title="La manada"
                  subtitle={packPets.length > 0 ? andNames(packPets.map((p) => p.name)) : undefined}
                  status={pendingLabel(packRoutines, logs, now)}
                />
                {packPets.map((pet) => (
                  <PetFold
                    key={pet.id}
                    pet={pet}
                    owner={ownerLabel(pet)}
                    open={openPets.has(pet.id)}
                    onToggleOpen={() => toggleOpen(pet.id)}
                    onEdit={() => setPetForm({ open: true, pet })}
                    {...bodyProps(pet.id, pet.name)}
                  />
                ))}
                <Text variant="label" color="secondary" style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.sm }}>
                  De toda la manada
                </Text>
                <GroupBody {...bodyProps(null, 'la manada')} />
              </Card>
            ) : null}
            {loosePets.map((pet) => (
              <Card key={pet.id} padded={false} style={{ paddingVertical: theme.spacing.md, gap: theme.spacing.sm }}>
                <GroupHeader
                  avatar={(
                    <Pressable onPress={() => setPetForm({ open: true, pet })} accessibilityRole="button" accessibilityLabel={pet.photo_url ? `Foto de ${pet.name}` : `Añadir foto a ${pet.name}`} style={{ borderRadius: 30, ...theme.shadows.small }}>
                      <PetAvatar photoUrl={pet.photo_url} type={pet.type} size={56} />
                    </Pressable>
                  )}
                  title={pet.name}
                  owner={ownerLabel(pet)}
                  status={pendingLabel(routines.filter((r) => r.pet_id === pet.id), logs, now)}
                  onEdit={() => setPetForm({ open: true, pet })}
                />
                <GroupBody {...bodyProps(pet.id, pet.name)} />
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {houseId && user ? (
        <>
          <PetFormModal
            visible={petForm.open}
            onClose={() => setPetForm((f) => ({ ...f, open: false }))}
            onSaved={() => void loadData()}
            houseId={houseId}
            userId={user.id}
            members={members}
            otherPets={pets.filter((p) => p.id !== petForm.pet?.id).length}
            pet={petForm.pet}
          />
          <RoutineFormModal
            visible={routineForm.open}
            onClose={() => setRoutineForm((f) => ({ ...f, open: false }))}
            onSaved={() => void loadData()}
            houseId={houseId}
            userId={user.id}
            pets={pets}
            members={members}
            target={routineForm.target}
            routine={routineForm.routine}
          />
          <PetItemFormModal
            visible={itemForm.open}
            onClose={() => setItemForm((f) => ({ ...f, open: false }))}
            onSaved={() => void loadData()}
            houseId={houseId}
            userId={user.id}
            pets={pets}
            kind={itemForm.kind}
            target={itemForm.target}
            item={itemForm.item}
          />
        </>
      ) : null}
    </Screen>
  );
}

const andNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

/** 'Todo al día' · '1 cosa por hacer' · '3 cosas por hacer' (lo que toca ya y no está hecho). */
function pendingLabel(routines: PetRoutine[], logs: PetLog[], now: Date): string {
  const pending = routines
    .flatMap((r) => currentOccurrences(r, logs, now))
    .filter((o) => !o.log && (o.late || o.routine.frequency !== 'daily')).length;
  return pending === 0 ? 'Todo al día' : pending === 1 ? '1 cosa por hacer' : `${pending} cosas por hacer`;
}

/** 'Tuya' · 'De Ana' · 'Del piso'. */
function OwnerBadge({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: theme.radii.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }}>
      <Text variant="caption" color="secondary">{label}</Text>
    </View>
  );
}

type GroupHeaderProps = {
  avatar: ReactNode;
  title: string;
  /** Solo las mascotas. */
  owner?: string;
  subtitle?: string;
  status: string;
  onEdit?: () => void;
};

function GroupHeader({ avatar, title, owner, subtitle, status, onEdit }: GroupHeaderProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: theme.spacing.md }}>
      {avatar}
      <View style={{ flex: 1 }}>
        <Text variant="heading">{title}</Text>
        {subtitle ? <Text variant="caption" color="secondary">{subtitle}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {owner ? <OwnerBadge label={owner} /> : null}
          <Text variant="caption" color="secondary">{status}</Text>
        </View>
      </View>
      {onEdit ? (
        <Pressable onPress={onEdit} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Editar ${title}`}>
          <MoreHorizontal size={22} color={theme.colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

type GroupBodyProps = {
  routines: PetRoutine[];
  items: PetItem[];
  logs: PetLog[];
  now: Date;
  nameOf: (id: string | null) => string;
  onToggle: (occ: Occurrence) => void;
  onAddRoutine: () => void;
  onEditRoutine: (routine: PetRoutine) => void;
  onAddItem: (kind: PetItemKind) => void;
  onEditItem: (item: PetItem) => void;
  onToggleItem: (item: PetItem) => void;
};

/** Rutinas, compra, pendientes y notas de una mascota o de la manada, y los botones de añadir. */
function GroupBody({ routines, items, logs, now, nameOf, onToggle, onAddRoutine, onEditRoutine, onAddItem, onEditItem, onToggleItem }: GroupBodyProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {routines.map((routine) => (
        <RoutineRow key={routine.id} routine={routine} logs={logs} now={now} nameOf={nameOf} onToggle={onToggle} onEdit={() => onEditRoutine(routine)} />
      ))}

      {ITEM_ORDER.map((kind) => {
        const list = items.filter((i) => i.kind === kind);
        if (list.length === 0) return null;
        return (
          <View key={kind} style={{ paddingHorizontal: theme.spacing.md, gap: 2, marginTop: 4 }}>
            <Text variant="label" color="secondary">{PET_ITEM_KINDS[kind].title}</Text>
            {list.map((item) =>
              kind === 'note' ? (
                <NoteRow key={item.id} item={item} nameOf={nameOf} onEdit={() => onEditItem(item)} />
              ) : (
                <ItemRow key={item.id} item={item} nameOf={nameOf} onToggle={() => onToggleItem(item)} onEdit={() => onEditItem(item)} />
              ),
            )}
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: theme.spacing.md, marginTop: 4 }}>
        <DashedButton label="Rutina" onPress={onAddRoutine} />
        {ITEM_ORDER.map((kind) => (
          <DashedButton key={kind} label={PET_ITEM_KINDS[kind].label} onPress={() => onAddItem(kind)} />
        ))}
      </View>
    </View>
  );
}

type PetFoldProps = GroupBodyProps & {
  pet: Pet;
  owner: string;
  open: boolean;
  onToggleOpen: () => void;
  onEdit: () => void;
};

/** Una mascota dentro de la manada: una fila que se despliega para ver sus cosas. */
function PetFold({ pet, owner, open, onToggleOpen, onEdit, ...body }: PetFoldProps) {
  const theme = useTheme();
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View
      style={{
        marginHorizontal: theme.spacing.sm,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        borderColor: open ? theme.colors.outline : theme.colors.border,
        backgroundColor: theme.colors.background,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onToggleOpen}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${pet.name}, ${open ? 'plegar' : 'desplegar'}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 10,
          backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
        })}
      >
        <PetAvatar photoUrl={pet.photo_url} type={pet.type} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyBold">{pet.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <OwnerBadge label={owner} />
            <Text variant="caption" color="secondary">{pendingLabel(body.routines, body.logs, body.now)}</Text>
          </View>
        </View>
        {open ? (
          <Pressable onPress={onEdit} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Editar ${pet.name}`}>
            <MoreHorizontal size={20} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
        <Chevron size={20} color={theme.colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={{ paddingBottom: theme.spacing.sm }}>
          <GroupBody {...body} />
        </View>
      ) : null}
    </View>
  );
}

type RoutineRowProps = {
  routine: PetRoutine;
  logs: PetLog[];
  now: Date;
  nameOf: (id: string | null) => string;
  onToggle: (occ: Occurrence) => void;
  onEdit: () => void;
};

function RoutineRow({ routine, logs, now, nameOf, onToggle, onEdit }: RoutineRowProps) {
  const theme = useTheme();
  const occurrences = currentOccurrences(routine, logs, now);
  const last = lastLog(routine.id, logs);
  const allDone = occurrences.length > 0 && occurrences.every((o) => o.log);
  const next = routine.frequency !== 'daily' ? nextDate(routine, now) : null;
  const reminder = reminderLabel(routine);

  let footer = last ? `Última vez ${agoLabel(last.done_at, now)} · ${nameOf(last.done_by)}` : 'Aún sin hacer';
  if (routine.frequency !== 'daily' && next && (allDone || occurrences.length === 0)) {
    footer += ` · Próxima: ${dateKey(next) === dateKey(now) ? 'hoy' : shortDate(dateKey(next))}`;
  }

  return (
    <View style={{ paddingHorizontal: theme.spacing.md, paddingVertical: 8, gap: 6, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityHint="Editar rutina" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <RoutineIcon emoji={routine.emoji} size={30} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyBold">{routine.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="caption" color="secondary">{scheduleLabel(routine)}</Text>
            {reminder ? (
              <>
                <Bell size={11} color={theme.colors.textSecondary} />
                {routine.frequency !== 'daily' ? <Text variant="caption" color="secondary">{routine.remind_at}</Text> : null}
              </>
            ) : null}
          </View>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {occurrences.map((occ) => (
          <OccurrenceChip key={`${occ.forDate}-${occ.slot}`} occ={occ} nameOf={nameOf} onPress={() => onToggle(occ)} />
        ))}
      </View>
      <Text variant="caption" color="secondary">{footer}</Text>
    </View>
  );
}

/** Una toma: melocotón si va con retraso, lima con quién la hizo si está hecha. */
function OccurrenceChip({ occ, nameOf, onPress }: { occ: Occurrence; nameOf: (id: string | null) => string; onPress: () => void }) {
  const theme = useTheme();
  const done = Boolean(occ.log);
  const who = occ.log ? nameOf(occ.log.done_by) : null;
  const label = done ? `${occ.label} · ${who}` : occ.late ? `${occ.label} · toca` : occ.label;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${occ.routine.title}, ${label}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.radii.pill,
        borderWidth: theme.borderWidth,
        borderColor: done || occ.late ? theme.colors.outline : theme.colors.border,
        backgroundColor: done ? theme.colors.lime : occ.late ? theme.colors.peach : theme.colors.surface,
        ...(done || occ.late ? (pressed ? theme.shadows.none : theme.shadows.small) : null),
        ...(pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null),
      })}
    >
      {done ? <Check size={15} color={theme.colors.textOnFill} strokeWidth={3} /> : <CheckCircle2 size={15} color={occ.late ? theme.colors.textOnFill : theme.colors.textSecondary} />}
      <Text variant="label" color={done || occ.late ? 'onFill' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}

/** Pendiente o compra: el círculo lo tacha; el texto lo abre para editar. */
function ItemRow({ item, nameOf, onToggle, onEdit }: { item: PetItem; nameOf: (id: string | null) => string; onToggle: () => void; onEdit: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }} accessibilityLabel={item.title} style={{ paddingVertical: 6 }}>
        {item.done ? <CheckCircle2 size={22} color={theme.colors.success} /> : <Circle size={22} color={theme.colors.border} />}
      </Pressable>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityHint="Editar" style={{ flex: 1, paddingVertical: 6 }}>
        <Text variant="body" color={item.done ? 'secondary' : undefined} style={item.done ? { textDecorationLine: 'line-through' } : undefined}>{item.title}</Text>
        {item.done ? <Text variant="caption" color="secondary">{`${nameOf(item.done_by)}${item.kind === 'buy' ? ' lo compró' : ' lo hizo'}`}</Text> : null}
      </Pressable>
    </View>
  );
}

function NoteRow({ item, nameOf, onEdit }: { item: PetItem; nameOf: (id: string | null) => string; onEdit: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityHint="Editar nota"
      style={({ pressed }) => ({
        padding: 10,
        marginVertical: 3,
        gap: 2,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.background,
      })}
    >
      <Text variant="body">{item.title}</Text>
      <Text variant="caption" color="secondary">{`${item.created_by ? nameOf(item.created_by) : 'Apuntada'} · ${shortDate(dateKey(new Date(item.created_at)))}`}</Text>
    </Pressable>
  );
}

function DashedButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Añadir ${label.toLowerCase()}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.radii.pill,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
      })}
    >
      <Plus size={14} color={theme.colors.textSecondary} />
      <Text variant="label" color="secondary">{label}</Text>
    </Pressable>
  );
}
