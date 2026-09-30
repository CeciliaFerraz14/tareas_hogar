import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { FloatingTabs } from '../../../components/navigation/FloatingTabs';
import { useTheme } from '../../../lib/theme';
import { useChatStore } from '../../../store/chatStore';
import { useHouseStore } from '../../../store/houseStore';

/**
 * Pestañas: Hoy · Tareas · Compra · Chat · Más, todas del hogar activo.
 *   · iPhone: la barra nativa de iOS 26, de Liquid Glass (ya flota, con la burbuja
 *     que se arrastra). Solo iconos (SF Symbols); el nombre va en accessibilityLabel.
 *   · Android (y web, en _layout.web.tsx): la barra flotante HOMI.
 */
export default function TabsLayout() {
  if (Platform.OS !== 'ios') return <FloatingTabs />;
  return <GlassTabs />;
}

function GlassTabs() {
  const theme = useTheme();
  const houseId = useHouseStore((s) => s.currentHouseId);
  const unread = useChatStore((s) => (houseId ? (s.unreadByHouse[houseId] ?? 0) : 0));
  // Fondo de cada pestaña: el de la app, no el gris claro por defecto de React Navigation.
  const contentStyle = { backgroundColor: theme.colors.background };

  return (
    // En iOS no se toca el fondo: el Liquid Glass pone su propio fondo y colores.
    <NativeTabs tintColor={theme.colors.primary} labelVisibilityMode="unlabeled">
      <NativeTabs.Trigger name="index" accessibilityLabel="Hoy" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label hidden>Hoy</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tareas" accessibilityLabel="Tareas" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.square', selected: 'checkmark.square.fill' }} />
        <NativeTabs.Trigger.Label hidden>Tareas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="compra" accessibilityLabel="Compra" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} />
        <NativeTabs.Trigger.Label hidden>Compra</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="chat"
        accessibilityLabel={unread > 0 ? `Chat, ${unread} sin leer` : 'Chat'}
        contentStyle={contentStyle}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
        />
        <NativeTabs.Trigger.Label hidden>Chat</NativeTabs.Trigger.Label>
        {/* Globo con los mensajes sin leer del hogar activo. */}
        <NativeTabs.Trigger.Badge hidden={unread === 0} selectedBackgroundColor={theme.colors.primary}>
          {unread > 99 ? '99+' : String(unread)}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mas" accessibilityLabel="Más" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
        <NativeTabs.Trigger.Label hidden>Más</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
