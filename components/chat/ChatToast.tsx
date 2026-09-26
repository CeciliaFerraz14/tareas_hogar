import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { useTheme } from '../../lib/theme';
import { useHouseStore } from '../../store/houseStore';
import { useChatStore } from '../../store/chatStore';

const VISIBLE_MS = 4000;

/**
 * Aviso de "mensaje nuevo" dentro de la app: baja desde arriba cuando llega un
 * mensaje de un chat que no estoy mirando. Tocándolo se abre ese chat.
 */
export function ChatToast() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useChatStore((s) => s.toast);
  const dismiss = useChatStore((s) => s.dismissToast);
  const setCurrentHouse = useHouseStore((s) => s.setCurrentHouse);

  // Se cierra solo; si llega otro mensaje, el temporizador vuelve a empezar.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  function open() {
    if (!toast) return;
    dismiss();
    setCurrentHouse(toast.houseId);
    router.push(`/(app)/house/${toast.houseId}/chat`);
  }

  return (
    <Animated.View
      key={toast.id}
      entering={SlideInUp.duration(260).easing(Easing.out(Easing.cubic))}
      exiting={SlideOutUp.duration(200)}
      style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, zIndex: 900 }}
    >
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Mensaje nuevo de ${toast.senderName} en ${toast.houseName}: ${toast.text}`}
        accessibilityHint="Abre el chat"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          backgroundColor: theme.colors.surface,
          borderWidth: theme.borderWidth,
          borderColor: theme.colors.outline,
          borderRadius: theme.radii.lg,
          ...(pressed ? theme.shadows.small : theme.shadows.soft),
        })}
      >
        <Avatar uri={toast.senderAvatar} name={toast.senderName} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyBold" numberOfLines={1}>
            {toast.senderName}
            {toast.houseName ? <Text variant="caption" color="secondary"> · {toast.houseName}</Text> : null}
          </Text>
          <Text variant="body" color="secondary" numberOfLines={2}>{toast.text}</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar aviso">
          <X size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
