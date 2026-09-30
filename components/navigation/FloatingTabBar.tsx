import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { CheckSquare, Home, LayoutGrid, MessageCircle, ShoppingCart, type LucideIcon } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../lib/theme';
import { useChatStore } from '../../store/chatStore';
import { useHouseStore } from '../../store/houseStore';
import { useTabBarStore } from '../../store/tabBarStore';

export const TAB_ICONS: Record<string, LucideIcon> = {
  index: Home,
  tareas: CheckSquare,
  compra: ShoppingCart,
  chat: MessageCircle,
  mas: LayoutGrid,
};

/** Separación entre la barra y el borde de abajo (más el área segura). */
const BOTTOM_GAP = 10;
/** Aire entre el contenido y la barra. */
const CONTENT_GAP = 8;

const layoutTransition = LinearTransition.springify().damping(18).stiffness(180);

/**
 * Barra de pestañas flotante (web y Android): una píldora "pegatina" con borde de
 * tinta y sombra dura. La pestaña activa se estira y enseña su nombre. Flota por
 * encima del contenido, así que cada pestaña deja su hueco con useTabBarSpace.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  const setSpace = useTabBarStore((s) => s.setSpace);
  const houseId = useHouseStore((s) => s.currentHouseId);
  const unread = useChatStore((s) => (houseId ? (s.unreadByHouse[houseId] ?? 0) : 0));

  // Con el teclado abierto la barra se aparta: el hueco que deja pasa a ser 0.
  useEffect(() => {
    if (keyboardOpen) setSpace(0);
  }, [keyboardOpen, setSpace]);

  if (keyboardOpen) return null;

  return (
    <View
      pointerEvents="box-none"
      onLayout={(e) => setSpace(Math.round(e.nativeEvent.layout.height) + CONTENT_GAP)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingBottom: insets.bottom + BOTTOM_GAP,
      }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          width: '100%',
          maxWidth: 420,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          padding: 6,
          borderRadius: theme.radii.pill,
          borderWidth: theme.borderWidth,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
          ...theme.shadows.soft,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = TAB_ICONS[route.name] ?? Home;
          const title = descriptors[route.key].options.title ?? route.name;
          const badge = route.name === 'chat' && unread > 0 ? (unread > 99 ? '99+' : String(unread)) : null;

          function onPress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          }

          return (
            <Animated.View key={route.key} layout={layoutTransition} style={{ flexGrow: focused ? 2 : 1, flexBasis: 0 }}>
              <Pressable
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={badge ? `${title}, ${unread} sin leer` : title}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  height: 46,
                  paddingHorizontal: focused ? 12 : 0,
                  borderRadius: theme.radii.pill,
                  borderWidth: theme.borderWidth,
                  borderColor: focused ? theme.colors.outline : 'transparent',
                  backgroundColor: focused ? theme.colors.peach : pressed ? theme.colors.surfaceAlt : 'transparent',
                })}
              >
                <Icon
                  size={22}
                  strokeWidth={focused ? 2.5 : 2}
                  color={focused ? theme.colors.textOnFill : theme.colors.textSecondary}
                />
                {focused ? (
                  <Text variant="label" color="onFill" numberOfLines={1}>{title}</Text>
                ) : null}
                {badge ? (
                  // Globo con los mensajes sin leer del hogar activo.
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: focused ? 2 : '18%',
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 5,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.primary,
                      borderWidth: 2,
                      borderColor: theme.colors.surface,
                    }}
                  >
                    <Text variant="caption" style={{ color: '#fff', fontSize: 11, lineHeight: 13, fontFamily: theme.typography.family.bold }}>
                      {badge}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * ¿Está el teclado abierto? En la app, react-native-keyboard-controller. En la
 * web no hay evento de teclado: se nota porque la parte visible de la página
 * (visualViewport) se queda mucho más baja que la ventana.
 */
function useKeyboardOpen(): boolean {
  const native = useKeyboardState((s) => s.isVisible);
  const [web, setWeb] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const check = () => setWeb(viewport.height < window.innerHeight * 0.75);
    viewport.addEventListener('resize', check);
    check();
    return () => viewport.removeEventListener('resize', check);
  }, []);

  return Platform.OS === 'web' ? web : native;
}
