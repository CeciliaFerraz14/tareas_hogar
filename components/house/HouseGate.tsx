import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { HouseAvatar } from '../ui/HouseAvatar';
import { HouseIllustration } from '../brand/HouseIllustration';
import { CreateHouseModal, JoinHouseModal } from './HouseModals';
import { useTheme } from '../../lib/theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';
import { useChatStore } from '../../store/chatStore';
import { useHouseStore, type ActiveHouse, type MyHouse } from '../../store/houseStore';

type NotReady = Exclude<ActiveHouse, { status: 'ready' }>;

/**
 * Lo que enseñan las pestañas mientras no hay hogar activo: cargando, sin
 * hogares (crear o unirse) o con varios y sin elegir (se pregunta una vez).
 */
export function HouseGate({ state }: { state: NotReady }) {
  const theme = useTheme();
  const bottom = useTabBarSpace();

  if (state.status === 'loading') {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen bottomEdge={false} contentStyle={{ paddingBottom: bottom }}>
      {state.status === 'none' ? <NoHouses /> : <ChooseHouse houses={state.houses} />}
    </Screen>
  );
}

function NoHouses() {
  const theme = useTheme();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
      <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
        <HouseIllustration size={96} />
        <Text variant="title" align="center">Tu primer hogar</Text>
        <Text variant="body" color="secondary" align="center">
          Crea un hogar para tu piso o únete al de tus compis con el código que te hayan pasado.
        </Text>
      </View>
      <Button title="Crear un hogar" onPress={() => setCreateOpen(true)} />
      <Button title="Unirme con un código" variant="secondary" onPress={() => setJoinOpen(true)} />
      <CreateHouseModal visible={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinHouseModal visible={joinOpen} onClose={() => setJoinOpen(false)} />
    </View>
  );
}

function ChooseHouse({ houses }: { houses: MyHouse[] }) {
  const theme = useTheme();
  const setCurrentHouse = useHouseStore((s) => s.setCurrentHouse);
  const unreadByHouse = useChatStore((s) => s.unreadByHouse);
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.lg }} showsVerticalScrollIndicator={false}>
      <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
        <HouseIllustration size={72} />
        <Text variant="title" align="center">¿En qué hogar estás?</Text>
        <Text variant="body" color="secondary" align="center">
          Luego puedes cambiar cuando quieras tocando su nombre arriba.
        </Text>
      </View>
      {houses.map((h) => {
        const unread = unreadByHouse[h.id] ?? 0;
        return (
          <Pressable
            key={h.id}
            onPress={() => setCurrentHouse(h.id)}
            accessibilityRole="button"
            accessibilityLabel={h.name}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: theme.spacing.md,
              borderRadius: theme.radii.lg,
              borderWidth: theme.borderWidth,
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surface,
              ...(pressed ? theme.shadows.none : theme.shadows.soft),
              ...(pressed ? { transform: [{ translateX: 3 }, { translateY: 3 }] } : null),
            })}
          >
            <HouseAvatar uri={h.avatar_url} size={48} />
            <View style={{ flex: 1 }}>
              <Text variant="heading" numberOfLines={1}>{h.name}</Text>
              {unread > 0 ? (
                <Text variant="caption" color="secondary">{unread === 1 ? '1 mensaje nuevo' : `${unread} mensajes nuevos`}</Text>
              ) : null}
            </View>
            <ChevronRight size={22} color={theme.colors.textSecondary} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
