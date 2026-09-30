import { useEffect, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Check, type LucideIcon } from 'lucide-react-native';
import { brand } from '../../lib/theme';
import { Text } from '../ui/Text';

/*
 * Cada diapositiva cuenta una "historia" en bucle con un único reloj (t, en ms)
 * que va de 0 a la duración del ciclo. Cada pieza dice, con fotogramas clave,
 * qué valor tiene en cada momento: [ms, valor] o [ms, valor, curva].
 * Así todo va sincronizado y es fácil de retocar: basta con mover los números.
 */

/** Cómo se llega a un fotograma: suave (por defecto), con rebote o lineal. */
type Ease = 'smooth' | 'pop' | 'linear';
export type Frame = readonly [ms: number, value: number, ease?: Ease];

/** Valor en el instante t según los fotogramas (como una animación CSS con keyframes). */
export function kf(t: number, frames: readonly Frame[]): number {
  'worklet';
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, ease] = frames[i];
    if (t <= t1) {
      const [t0, v0] = frames[i - 1];
      const p = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      let e: number;
      if (ease === 'linear') {
        e = p;
      } else if (ease === 'pop') {
        // easeOutBack: se pasa un poco y vuelve (efecto "pegatina").
        const c1 = 1.70158;
        const c3 = c1 + 1;
        e = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
      } else {
        e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      }
      return v0 + (v1 - v0) * e;
    }
  }
  return frames[frames.length - 1][1];
}

/** Aparece en `inAt` y desaparece en `outAt` (0 → 1 → 0). */
export function showBetween(inAt: number, outAt: number, ease: Ease = 'pop', ms = 320): Frame[] {
  return [
    [inAt, 0],
    [inAt + ms, 1, ease],
    [outAt, 1],
    [outAt + 240, 0],
  ];
}

/**
 * Reloj de la historia: corre en bucle solo mientras la diapositiva está en
 * pantalla y vuelve a 0 al salir. Con "Reducir movimiento" se queda quieto en
 * `still`, un instante en el que se ve todo.
 */
export function useStoryClock(active: boolean, reduced: boolean, cycle: number, still: number): SharedValue<number> {
  const t = useSharedValue(reduced ? still : 0);

  useEffect(() => {
    cancelAnimation(t);
    if (reduced) {
      t.value = still;
      return;
    }
    t.value = 0;
    if (!active) return;
    t.value = withRepeat(withTiming(cycle, { duration: cycle, easing: Easing.linear }), -1);
    return () => cancelAnimation(t);
  }, [active, reduced, cycle, still, t]);

  return t;
}

export type StoryProps = {
  /** La diapositiva está parada en pantalla: su historia se reproduce. */
  active: boolean;
  reduced: boolean;
};

type AppearProps = {
  t: SharedValue<number>;
  frames: readonly Frame[];
  /** Desde dónde entra: sube, baja, desde un lado o creciendo. */
  from?: 'below' | 'above' | 'left' | 'right' | 'grow' | 'fade';
  distance?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** Envoltorio que aparece y desaparece según los fotogramas (valor 0 = oculto, 1 = en su sitio). */
export function Appear({ t, frames, from = 'below', distance = 18, style, children }: AppearProps) {
  const animated = useAnimatedStyle(() => {
    const v = kf(t.value, frames);
    const off = (1 - v) * distance;
    return {
      opacity: Math.min(1, Math.max(0, v)),
      transform: [
        { translateX: from === 'left' ? -off : from === 'right' ? off : 0 },
        { translateY: from === 'below' ? off : from === 'above' ? -off : 0 },
        { scale: from === 'grow' ? 0.3 + 0.7 * v : 1 },
      ],
    };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// ── Piezas de dibujo ────────────────────────────────────────────────────────

const ink = brand.ink;

/** La "pantalla" de cada diapositiva: tarjeta crema con borde de tinta y sombra dura. */
export function Stage({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          height: 268,
          backgroundColor: brand.cream,
          borderRadius: 22,
          borderWidth: 2,
          borderColor: ink,
          boxShadow: `4px 4px 0px 0px ${ink}`,
          padding: 14,
          gap: 8,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Fila tipo tarjeta pequeña (tarea, producto, gasto…). */
export function MiniRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: brand.white,
          borderWidth: 2,
          borderColor: ink,
          borderRadius: 14,
          paddingHorizontal: 10,
          paddingVertical: 7,
          boxShadow: `2px 3px 0px 0px ${ink}`,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Carita de un compañero de piso de ejemplo. */
export function Face({ letter, color, size = 28 }: { letter: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 1.5,
        borderColor: ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="label" style={{ fontSize: size * 0.42, lineHeight: size * 0.55, color: ink }}>
        {letter}
      </Text>
    </View>
  );
}

/** Icono dentro de un círculo de color (burbujas de la portada, aviso…). */
export function IconBubble({ Icon, color, size = 44 }: { Icon: LucideIcon; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: ink,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `2px 2px 0px 0px ${ink}`,
      }}
    >
      <Icon size={size * 0.48} color={ink} strokeWidth={2.2} />
    </View>
  );
}

/** Nunca cambia: para casillas que se quedan sin marcar. */
const NEVER: Frame[] = [[0, 0]];

/** Casilla que se marca en `at` (y se desmarca en `outAt` para repetir el bucle). `null`: no se marca. */
export function Tick({ t, at, outAt, round = false }: { t: SharedValue<number>; at: number | null; outAt: number; round?: boolean }) {
  const frames = at === null ? NEVER : showBetween(at, outAt);
  const fill = useAnimatedStyle(() => {
    const v = kf(t.value, frames);
    return { opacity: Math.min(1, Math.max(0, v)), transform: [{ scale: v }] };
  });
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: round ? 11 : 6,
        borderWidth: 2,
        borderColor: ink,
        backgroundColor: brand.white,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          { flex: 1, backgroundColor: brand.lime500, alignItems: 'center', justifyContent: 'center' },
          fill,
        ]}
      >
        <Check size={14} color={ink} strokeWidth={3.5} />
      </Animated.View>
    </View>
  );
}

/** Texto que se tacha (línea que crece de izquierda a derecha) y se apaga al completarse. */
export function StrikeText({ t, at, outAt, children }: { t: SharedValue<number>; at: number | null; outAt: number; children: string }) {
  const frames: Frame[] = at === null ? NEVER : [
    [at, 0],
    [at + 300, 1],
    [outAt, 1],
    [outAt + 240, 0],
  ];
  const line = useAnimatedStyle(() => ({ transform: [{ scaleX: kf(t.value, frames) }] }));
  const dim = useAnimatedStyle(() => ({ opacity: 1 - 0.45 * kf(t.value, frames) }));
  return (
    <Animated.View style={[{ alignSelf: 'flex-start' }, dim]}>
      <Text variant="label" style={{ color: ink }} numberOfLines={1}>
        {children}
      </Text>
      <Animated.View
        style={[
          { position: 'absolute', left: 0, right: 0, top: '50%', height: 2, backgroundColor: ink, transformOrigin: 'left' },
          line,
        ]}
      />
    </Animated.View>
  );
}

/** Aviso que baja desde arriba, como las notificaciones de la app. */
export function StoryToast({
  t,
  frames,
  Icon,
  text,
  color = brand.mustard300,
}: {
  t: SharedValue<number>;
  frames: readonly Frame[];
  Icon: LucideIcon;
  text: string;
  color?: string;
}) {
  return (
    <Appear
      t={t}
      frames={frames}
      from="above"
      distance={40}
      style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10 }}
    >
      <MiniRow style={{ backgroundColor: color, paddingVertical: 9 }}>
        <Icon size={18} color={ink} strokeWidth={2.4} />
        <Text variant="label" style={{ flex: 1, color: ink }} numberOfLines={2}>
          {text}
        </Text>
      </MiniRow>
    </Appear>
  );
}
