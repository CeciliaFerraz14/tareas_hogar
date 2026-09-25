import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useIsActive, useReorderableDrag } from 'react-native-reorderable-list';
import { CheckSquare, GripVertical, MessageCircle, ShoppingCart, Star } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { HouseAvatar } from '../ui/HouseAvatar';
import { Text } from '../ui/Text';
import { useTheme } from '../../lib/theme';
import type { HomeMember, HouseSummary } from '../../hooks/useHomeSummary';

export type HouseSection = 'tareas' | 'compra' | 'chat';

const MAX_FACES = 4;

type HouseCardProps = {
  house: { id: string; name: string; avatar_url: string | null };
  members: HomeMember[];
  summary: HouseSummary | undefined;
  isPrimary: boolean;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  onOpenSection: (section: HouseSection) => void;
  onTogglePrimary: () => void;
  /** -1 sube, +1 baja (para el lector de pantalla). */
  onMove: (delta: -1 | 1) => void;
};

/**
 * Tarjeta de un hogar en Inicio: foto, nombre, caras de los miembros y
 * contadores (tareas de hoy, compra, mensajes nuevos) que llevan a su sección.
 * Va dentro de la lista reordenable: mantener pulsado la coge para moverla.
 */
export function HouseCard({
  house,
  members,
  summary,
  isPrimary,
  isFirst,
  isLast,
  onOpen,
  onOpenSection,
  onTogglePrimary,
  onMove,
}: HouseCardProps) {
  const theme = useTheme();
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  function startDrag() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    drag();
  }

  const moveActions = [
    ...(isFirst ? [] : [{ name: 'moveUp', label: 'Subir' }]),
    ...(isLast ? [] : [{ name: 'moveDown', label: 'Bajar' }]),
  ];

  const tasks = summary?.tasksTodayPending ?? 0;
  const shopping = summary?.shoppingPending ?? 0;
  const unread = summary?.unreadMessages ?? 0;

  return (
    <View style={{ paddingBottom: theme.spacing.md }}>
      <Pressable
        onPress={onOpen}
        onLongPress={startDrag}
        accessibilityRole="button"
        accessibilityLabel={house.name}
        accessibilityHint="Mantén pulsado para moverlo en la lista"
        accessibilityActions={moveActions}
        onAccessibilityAction={(e) => onMove(e.nativeEvent.actionName === 'moveUp' ? -1 : 1)}
      >
        {/* Al cogerlo, se "despega" como una pegatina. */}
        <Card
          style={[
            { gap: 14 },
            isActive
              ? { borderColor: theme.colors.primary, transform: [{ rotate: '-1.5deg' }], boxShadow: `6px 8px 0px 0px ${theme.colors.outline}` }
              : null,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <HouseAvatar uri={house.avatar_url} size={52} highlighted={isPrimary} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="heading" numberOfLines={1}>{house.name}</Text>
              <MemberFaces members={members} />
            </View>
            <Pressable
              hitSlop={10}
              onPress={onTogglePrimary}
              accessibilityLabel={isPrimary ? 'Quitar hogar principal' : 'Marcar como hogar principal'}
            >
              <Star
                size={20}
                color={isPrimary ? theme.colors.primary : theme.colors.border}
                fill={isPrimary ? theme.colors.primary : 'transparent'}
              />
            </Pressable>
            <GripVertical size={20} color={theme.colors.textSecondary} />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <SectionChip
              icon={<CheckSquare size={15} color={theme.colors.textOnFill} />}
              label={tasks > 0 ? `${tasks} ${tasks === 1 ? 'tarea' : 'tareas'} hoy` : 'Nada hoy'}
              highlighted={tasks > 0}
              onPress={() => onOpenSection('tareas')}
            />
            <SectionChip
              icon={<ShoppingCart size={15} color={theme.colors.textOnFill} />}
              label={shopping > 0 ? `${shopping} en la compra` : 'Compra al día'}
              highlighted={shopping > 0}
              onPress={() => onOpenSection('compra')}
            />
            <SectionChip
              icon={<MessageCircle size={15} color={theme.colors.textOnFill} />}
              label={unread > 0 ? `${unread} ${unread === 1 ? 'mensaje' : 'mensajes'}` : 'Chat'}
              highlighted={unread > 0}
              onPress={() => onOpenSection('chat')}
            />
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

/** Caras de los miembros superpuestas, con "+N" si hay muchos. */
function MemberFaces({ members }: { members: HomeMember[] }) {
  const theme = useTheme();
  if (members.length === 0) return null;
  const shown = members.slice(0, MAX_FACES);
  const extra = members.length - shown.length;
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center' }}
      accessible
      accessibilityLabel={`${members.length} ${members.length === 1 ? 'miembro' : 'miembros'}`}
    >
      {shown.map((m, i) => (
        <View
          key={m.user_id}
          style={{
            marginLeft: i === 0 ? 0 : -8,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: theme.colors.surface,
          }}
        >
          <Avatar uri={m.avatar_url} name={m.name} size={24} />
        </View>
      ))}
      <Text variant="caption" color="secondary" style={{ marginLeft: 6 }}>
        {extra > 0 ? `+${extra} · ` : ''}
        {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
      </Text>
    </View>
  );
}

type SectionChipProps = { icon: ReactNode; label: string; highlighted: boolean; onPress: () => void };

/** Contador que lleva a una sección del hogar. Resaltado si hay algo pendiente. */
function SectionChip({ icon, label, highlighted, onPress }: SectionChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.radii.pill,
        borderWidth: theme.borderWidth,
        borderColor: highlighted ? theme.colors.outline : 'transparent',
        backgroundColor: highlighted ? theme.colors.peach : theme.colors.surfaceAlt,
        ...(highlighted && !pressed ? theme.shadows.small : theme.shadows.none),
        ...(pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null),
      })}
    >
      {icon}
      <Text variant="label" color={highlighted ? 'onFill' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}
