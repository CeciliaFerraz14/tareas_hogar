import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';
import { Text } from './Text';
import { PlusBubble, PlusButton } from './PlusButton';
import { useTheme } from '../../lib/theme';
import type { AddMenuButtonProps } from './AddMenuButton.types';

const MENU_WIDTH = 280;
// Lo que tarda en cerrarse: el modal espera a que termine la animación de salida.
const CLOSE_MS = 180;

type Frame = { x: number; y: number; width: number; height: number };

// Sin rebote: la tarjeta crece un poco desde la burbuja con una deceleración suave.
const menuEntering: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.85 }] },
    animations: {
      opacity: withTiming(1, { duration: 160 }),
      transform: [{ scale: withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }) }],
    },
  };
};

const menuExiting: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: CLOSE_MS }),
      transform: [{ scale: withTiming(0.9, { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) }) }],
    },
  };
};

/**
 * Botón + con un menú que sale de la propia burbuja: al abrirse la burbuja
 * queda por encima, el + gira a ×, y el menú crece desde su esquina con el
 * estilo HOMI (tarjeta con borde de tinta y sombra dura).
 */
export function AddMenuButton({ actions, accessibilityLabel }: AddMenuButtonProps) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const buttonRef = useRef<View>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [menuShown, setMenuShown] = useState(false);

  function open() {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setFrame({ x, y, width, height });
      setMenuShown(true);
    });
  }

  function close() {
    setMenuShown(false);
    setTimeout(() => setFrame(null), CLOSE_MS);
  }

  return (
    <>
      {/* Mientras el menú está abierto, se ve la copia de encima del fondo. */}
      <View style={{ opacity: frame ? 0 : 1 }}>
        <PlusButton
          ref={buttonRef}
          onPress={open}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ expanded: menuShown }}
        />
      </View>

      <Modal visible={frame !== null} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        {frame && menuShown ? (
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(CLOSE_MS)}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26, 20, 16, 0.22)' }]}
          >
            <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Cerrar menú" />
          </Animated.View>
        ) : null}

        {frame ? (
          // La burbuja, en el mismo sitio y por encima del fondo: el + gira a ×.
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            style={{ position: 'absolute', left: frame.x, top: frame.y }}
          >
            {({ pressed }) => <PlusBubble open={menuShown} pressed={pressed} />}
          </Pressable>
        ) : null}

        {frame && menuShown ? (
          <Animated.View
            entering={menuEntering}
            exiting={menuExiting}
            accessibilityRole="menu"
            style={{
              position: 'absolute',
              top: frame.y + frame.height + 12,
              right: screenWidth - (frame.x + frame.width),
              width: MENU_WIDTH,
              // Crece desde la esquina de la burbuja y vuelve a ella al cerrarse.
              transformOrigin: 'top right',
              padding: theme.spacing.sm,
              gap: 4,
              backgroundColor: theme.colors.surface,
              borderWidth: theme.borderWidth,
              borderColor: theme.colors.outline,
              borderRadius: theme.radii.lg,
              ...theme.shadows.soft,
            }}
          >
            {actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => { close(); action.onPress(); }}
                accessibilityRole="menuitem"
                accessibilityLabel={action.title}
                accessibilityHint={action.subtitle}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: theme.spacing.md,
                  borderRadius: theme.radii.md,
                  backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
                })}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.peach,
                    borderWidth: theme.borderWidth,
                    borderColor: theme.colors.outline,
                  }}
                >
                  {action.icon}
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text variant="bodyBold">{action.title}</Text>
                  <Text variant="caption" color="secondary">{action.subtitle}</Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}
      </Modal>
    </>
  );
}

