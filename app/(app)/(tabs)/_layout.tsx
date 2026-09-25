import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '../../../lib/theme';

/**
 * Barra de pestañas nativa: en iOS 26 es de Liquid Glass (con la burbuja que se
 * arrastra entre pestañas) y en Android la barra Material. Solo iconos: SF Symbols
 * en iOS y Material Symbols en Android. El nombre de cada pestaña va en
 * accessibilityLabel para el lector de pantalla.
 */
export default function TabsLayout() {
  const theme = useTheme();
  // Fondo de cada pestaña: el de la app, no el gris claro por defecto de React Navigation.
  const contentStyle = { backgroundColor: theme.colors.background };

  return (
    <NativeTabs
      tintColor={theme.colors.primary}
      labelVisibilityMode="unlabeled"
      // En iOS no se toca: el Liquid Glass pone su propio fondo y colores.
      {...(Platform.OS === 'android'
        ? {
            // Tarjeta clara para que la barra se separe del fondo (madera o crema).
            backgroundColor: theme.colors.surface,
            // Inactivos en marrón (legibles); el activo en tinta sobre la píldora melocotón.
            iconColor: { default: theme.colors.textSecondary, selected: theme.colors.textOnFill },
            indicatorColor: theme.colors.peach,
            rippleColor: theme.colors.surfaceAlt,
          }
        : {})}
    >
      <NativeTabs.Trigger name="index" accessibilityLabel="Inicio" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label hidden>Inicio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tareas" accessibilityLabel="Tareas" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.square', selected: 'checkmark.square.fill' }} md="check_box" />
        <NativeTabs.Trigger.Label hidden>Tareas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat" accessibilityLabel="Chat" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
          md="forum"
        />
        <NativeTabs.Trigger.Label hidden>Chat</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" accessibilityLabel="Ajustes" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
        <NativeTabs.Trigger.Label hidden>Ajustes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
