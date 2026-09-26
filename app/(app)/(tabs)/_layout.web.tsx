import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckSquare, Home, MessageCircle, Settings, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../../lib/theme';
import { useTotalUnread } from '../../../store/chatStore';
import { Text } from '../../../components/ui/Text';

/**
 * Pestañas de la versión web / PWA. En iPhone y Android se usa _layout.tsx (la
 * barra nativa: Liquid Glass y Material); en web esa barra solo mostraría texto,
 * así que aquí va una barra propia con el estilo HOMI y los mismos iconos.
 */
const ICONS: Record<string, LucideIcon> = {
  index: Home,
  tareas: CheckSquare,
  chat: MessageCircle,
  settings: Settings,
};

export default function TabsLayoutWeb() {
  return (
    <Tabs tabBar={(props) => <HomiTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="tareas" options={{ title: 'Tareas' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}

/** Barra fija abajo: solo iconos, la activa sobre una píldora melocotón. */
function HomiTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const unread = useTotalUnread();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderTopWidth: theme.borderWidth,
        borderTopColor: theme.colors.outline,
        paddingTop: 8,
        // En el iPhone con la PWA instalada, deja sitio a la barra de inicio.
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const Icon = ICONS[route.name] ?? Home;
        const title = descriptors[route.key].options.title ?? route.name;
        const badge = route.name === 'chat' && unread > 0 ? (unread > 99 ? '99+' : String(unread)) : null;
        const label = badge ? `${title}, ${unread} sin leer` : title;

        function onPress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <View
              style={{
                paddingHorizontal: 22,
                paddingVertical: 8,
                borderRadius: theme.radii.pill,
                backgroundColor: focused ? theme.colors.peach : 'transparent',
                borderWidth: theme.borderWidth,
                borderColor: focused ? theme.colors.outline : 'transparent',
              }}
            >
              <Icon
                size={24}
                strokeWidth={focused ? 2.4 : 2}
                color={focused ? theme.colors.textOnFill : theme.colors.textSecondary}
              />
              {badge ? (
                // Globo con los mensajes sin leer.
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 10,
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
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
