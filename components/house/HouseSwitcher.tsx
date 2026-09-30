import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronDown, Home, KeyRound } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { HouseAvatar } from '../ui/HouseAvatar';
import { Sticker } from '../ui/Labels';
import { CreateHouseModal, JoinHouseModal } from './HouseModals';
import { useTheme } from '../../lib/theme';
import { useChatStore } from '../../store/chatStore';
import { useHouseStore, type MyHouse } from '../../store/houseStore';

type TabHeaderProps = {
  house: MyHouse;
  title: string;
  subtitle?: string;
  /** A la derecha del título (p. ej. el botón +). */
  right?: ReactNode;
};

/**
 * Cabecera de las pestañas: arriba el hogar activo (se toca para cambiarlo) y
 * debajo el título de la pestaña.
 */
export function TabHeader({ house, title, subtitle, right }: TabHeaderProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm, marginTop: 12 }}>
      <HouseSwitcher house={house} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
          {subtitle ? <Sticker style={{ marginTop: 2 }}>{subtitle}</Sticker> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Píldora con el hogar activo. Un puntito avisa de mensajes nuevos en los otros. */
export function HouseSwitcher({ house }: { house: MyHouse }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const unreadElsewhere = useChatStore((s) =>
    Object.entries(s.unreadByHouse).some(([id, n]) => id !== house.id && n > 0),
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Hogar: ${house.name}. Cambiar de hogar`}
        hitSlop={6}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          maxWidth: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 4,
          paddingRight: 12,
          paddingVertical: 4,
          borderRadius: theme.radii.pill,
          borderWidth: theme.borderWidth,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
          ...(pressed ? theme.shadows.none : theme.shadows.small),
          ...(pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : null),
        })}
      >
        <HouseAvatar uri={house.avatar_url} size={28} />
        <Text variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>{house.name}</Text>
        <ChevronDown size={18} color={theme.colors.textPrimary} strokeWidth={2.4} />
        {unreadElsewhere ? (
          <View
            accessibilityLabel="Hay mensajes nuevos en otro hogar"
            style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: theme.colors.surface }}
          />
        ) : null}
      </Pressable>
      <HousePickerSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Hoja para cambiar de hogar, crear uno o unirse con un código. */
export function HousePickerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const houses = useHouseStore((s) => s.houses) ?? [];
  const currentHouseId = useHouseStore((s) => s.currentHouseId);
  const setCurrentHouse = useHouseStore((s) => s.setCurrentHouse);
  const unreadByHouse = useChatStore((s) => s.unreadByHouse);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  function choose(id: string) {
    setCurrentHouse(id);
    onClose();
  }

  // En iOS un modal que se abre mientras otro se cierra puede no llegar a mostrarse.
  function openAfterClose(open: () => void) {
    onClose();
    setTimeout(open, 350);
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
        <View
          style={{
            maxHeight: '80%',
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            padding: theme.spacing.lg,
            paddingBottom: 36,
            gap: theme.spacing.md,
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />
          <Text variant="heading">Tus hogares</Text>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
            {houses.map((h) => {
              const active = h.id === currentHouseId;
              const unread = unreadByHouse[h.id] ?? 0;
              return (
                <Pressable
                  key={h.id}
                  onPress={() => choose(h.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={unread > 0 ? `${h.name}, ${unread} mensajes sin leer` : h.name}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 10,
                    borderRadius: theme.radii.lg,
                    borderWidth: theme.borderWidth,
                    borderColor: active ? theme.colors.outline : 'transparent',
                    backgroundColor: active ? theme.colors.peach : pressed ? theme.colors.surfaceAlt : theme.colors.surface,
                  })}
                >
                  <HouseAvatar uri={h.avatar_url} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold" numberOfLines={1} color={active ? 'onFill' : 'primary'}>{h.name}</Text>
                    {unread > 0 ? (
                      <Text variant="caption" color={active ? 'onFill' : 'secondary'}>
                        {unread === 1 ? '1 mensaje nuevo' : `${unread} mensajes nuevos`}
                      </Text>
                    ) : null}
                  </View>
                  {active ? <Check size={20} color={theme.colors.textOnFill} strokeWidth={2.6} /> : null}
                  {!active && unread > 0 ? (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SheetAction icon={<Home size={18} color={theme.colors.textPrimary} />} label="Crear un hogar" onPress={() => openAfterClose(() => setCreateOpen(true))} />
            <SheetAction icon={<KeyRound size={18} color={theme.colors.textPrimary} />} label="Unirme con código" onPress={() => openAfterClose(() => setJoinOpen(true))} />
          </View>
        </View>
      </Modal>
      <CreateHouseModal visible={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinHouseModal visible={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  );
}

function SheetAction({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: theme.radii.pill,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
      })}
    >
      {icon}
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}
