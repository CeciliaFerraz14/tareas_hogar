import { forwardRef, useEffect } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';

export const PLUS_BUTTON_SIZE = 44;

/** La burbuja "pegatina" del +: melocotón, borde de tinta y sombra dura. Con `open`, el + gira a ×. */
export function PlusBubble({ open = false, pressed = false }: { open?: boolean; pressed?: boolean }) {
  const theme = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(open ? 45 : 0, { duration: 200, easing: Easing.out(Easing.cubic) });
  }, [open, rotation]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <View
      style={{
        width: PLUS_BUTTON_SIZE,
        height: PLUS_BUTTON_SIZE,
        borderRadius: PLUS_BUTTON_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.peach,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.outline,
        // Al pulsar, se "hunde" sobre su sombra como los demás botones.
        ...(pressed
          ? { transform: [{ translateX: 2 }, { translateY: 2 }], ...theme.shadows.none }
          : theme.shadows.small),
      }}
    >
      <Animated.View style={iconStyle}>
        <Plus size={24} color={theme.colors.textOnFill} strokeWidth={2.6} />
      </Animated.View>
    </View>
  );
}

type PlusButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  accessibilityLabel: string;
  /** El + girado a × (p. ej. con su menú abierto). */
  open?: boolean;
};

/** Botón + de la cabecera (crear hogar, nueva tarea…), con vibración suave. */
export const PlusButton = forwardRef<View, PlusButtonProps>(function PlusButton(
  { onPress, open, ...rest },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      hitSlop={8}
      onPress={(e) => {
        void Haptics.selectionAsync();
        onPress?.(e);
      }}
      {...rest}
    >
      {({ pressed }) => <PlusBubble open={open} pressed={pressed} />}
    </Pressable>
  );
});
