import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { HouseIllustration } from './HouseIllustration';
import { WatercolorTape } from './WatercolorTape';
import { brand } from '../../lib/theme';
import { Text } from '../ui/Text';

const LETTERS = ['H', 'O', 'M', 'I'] as const;

// Tiempos (ms)
const TAPE_MS = 450;
const HOUSE_AT = 250;
const BEAT_AT = 800;
const LETTERS_AT = 650;
const EXIT_AT = 1750;
// Salida: fundido a blanco y, ya en blanco, el blanco se desvanece dejando ver la app.
const TO_WHITE_MS = 320;
const FROM_WHITE_MS = 420;

type AnimatedSplashProps = {
  /** Se llama cuando la animación ha terminado y ya no tapa la app. */
  onFinish: () => void;
};

/**
 * Pantalla de inicio animada de HOMI, encima de la app al abrirla: la cinta se
 * pinta, la casita cae y late, aparecen las letras y se funde a blanco para
 * dar paso a la app. Se puede tocar para saltarla y respeta "Reducir movimiento".
 */
export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const reducedMotion = useReducedMotion();

  const tape = useSharedValue(0);
  const houseY = useSharedValue(-60);
  const houseScale = useSharedValue(0.6);
  const houseOpacity = useSharedValue(0);
  const contentScale = useSharedValue(1);
  const white = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  function exit(delay: number, speed = 1) {
    const toWhite = TO_WHITE_MS * speed;
    const fromWhite = FROM_WHITE_MS * speed;
    // 1) Mientras se funde a blanco, un zoom muy leve.
    contentScale.value = withDelay(delay, withTiming(1.05, { duration: toWhite, easing: Easing.in(Easing.quad) }));
    white.value = withDelay(delay, withTiming(1, { duration: toWhite, easing: Easing.in(Easing.quad) }));
    // 2) Ya todo blanco: el blanco se desvanece y aparece la app.
    overlayOpacity.value = withDelay(
      delay + toWhite,
      withTiming(0, { duration: fromWhite, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onFinish);
      }),
    );
  }

  useEffect(() => {
    if (reducedMotion) {
      // Sin movimiento: todo en su sitio y un fundido corto.
      tape.value = 1;
      houseY.value = 0;
      houseScale.value = 1;
      houseOpacity.value = 1;
      exit(900);
      return;
    }

    tape.value = withTiming(1, { duration: TAPE_MS, easing: Easing.out(Easing.cubic) });

    houseOpacity.value = withDelay(HOUSE_AT, withTiming(1, { duration: 200 }));
    houseY.value = withDelay(HOUSE_AT, withSpring(0, { damping: 9, stiffness: 140 }));
    houseScale.value = withDelay(
      HOUSE_AT,
      withSequence(
        withSpring(1, { damping: 9, stiffness: 140 }),
        // Dos latidos, como el corazón del logo.
        withDelay(BEAT_AT - HOUSE_AT - 300, withTiming(1.08, { duration: 130 })),
        withTiming(1, { duration: 130 }),
        withTiming(1.06, { duration: 120 }),
        withTiming(1, { duration: 160 }),
      ),
    );

    // En web el navegador no deja vibrar antes de que el usuario toque la pantalla.
    const landing = setTimeout(() => {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, HOUSE_AT + 220);
    exit(EXIT_AT);
    return () => clearTimeout(landing);
    // Solo al montarse.
  }, []);

  // Saltar: el mismo fundido a blanco, más rápido.
  function skip() {
    exit(0, 0.5);
  }

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ scale: contentScale.value }] }));
  const whiteStyle = useAnimatedStyle(() => ({ opacity: white.value }));
  // La cinta "se pinta" de arriba abajo.
  const tapeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: tape.value }] }));
  const houseStyle = useAnimatedStyle(() => ({
    opacity: houseOpacity.value,
    transform: [{ translateY: houseY.value }, { scale: houseScale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 1000 }, overlayStyle]}>
      <Pressable style={{ flex: 1 }} onPress={skip} accessibilityLabel="HOMI" accessibilityHint="Toca para entrar">
        <Animated.View style={[{ flex: 1 }, contentStyle]}>
          <LinearGradient colors={brand.gradient} locations={[0, 0.35, 0.7, 1]} style={{ flex: 1, alignItems: 'center' }}>
            <Animated.View
              style={[
                { position: 'absolute', top: '6%', bottom: '6%', width: '56%', transformOrigin: 'top' },
                tapeStyle,
              ]}
            >
              <WatercolorTape />
            </Animated.View>

            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <Animated.View style={houseStyle}>
                <HouseIllustration size={124} />
              </Animated.View>

              <View style={{ flexDirection: 'row' }}>
                {LETTERS.map((letter, i) => (
                  <Animated.View
                    key={letter}
                    entering={
                      reducedMotion
                        ? undefined
                        : FadeInDown.delay(LETTERS_AT + i * 90).springify().damping(12).stiffness(160)
                    }
                  >
                    <Text variant="display" style={{ color: brand.ink, letterSpacing: 2 }}>
                      {letter}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Fundido a blanco antes de entrar en la app. */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', pointerEvents: 'none' }, whiteStyle]} />
      </Pressable>
    </Animated.View>
  );
}
