import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from './Text';
import { brand } from '../../lib/theme';

// El fondo de acuarela (y la madera, en oscuro) no es liso: el texto fino
// suelto encima se lee mal. Lo que va directamente sobre el fondo se pone en
// una tira de papel kraft (subtítulos) o en blanco con sombra de tinta (títulos de sección).

// Papel kraft: bordes rasgados y fibras con un pseudoaleatorio fijo, para que la
// forma sea siempre la misma (no cambia entre renders ni entre pantallas).
const KRAFT_W = 250;
const KRAFT_H = 30;
const KRAFT = (() => {
  let seed = 3;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pts: [number, number][] = [];
  const amp = 4;
  const step = 9;
  for (let x = 0; x <= KRAFT_W; x += step) pts.push([x, rnd() * amp]);
  for (let y = 0; y <= KRAFT_H; y += step) pts.push([KRAFT_W - rnd() * amp, y]);
  for (let x = KRAFT_W; x >= 0; x -= step) pts.push([x, KRAFT_H - rnd() * amp]);
  for (let y = KRAFT_H; y >= 0; y -= step) pts.push([rnd() * amp, y]);
  const path = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
  seed = 5;
  const fibers = Array.from({ length: 14 }, () => {
    const x = rnd() * KRAFT_W;
    const y = 4 + rnd() * (KRAFT_H - 8);
    return { x1: x, y1: y, x2: x + 6 + rnd() * 10, y2: y + rnd() * 2 - 1 };
  });
  return { path, fibers };
})();

/** Subtítulo en una tira de papel kraft rasgado, un poco torcida. */
export function Sticker({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 4, transform: [{ rotate: '-1deg' }] },
        style,
      ]}
    >
      <Svg viewBox={`0 0 ${KRAFT_W} ${KRAFT_H}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Path d={KRAFT.path} fill={brand.kraft} />
        {KRAFT.fibers.map((f, i) => (
          <Line key={i} {...f} stroke={brand.kraftFiber} strokeWidth={0.8} opacity={0.6} />
        ))}
      </Svg>
      {/* El papel es igual en claro y en oscuro: el texto, siempre en tinta. */}
      <Text variant="label" numberOfLines={1} style={{ color: brand.ink }}>{children}</Text>
    </View>
  );
}

/**
 * Título de sección sobre el fondo ("Para hoy", "Hoy se come"…): letra blanca con
 * sombra dura de tinta, como los botones y tarjetas de HOMI. La sombra hace falta:
 * el blanco solo no se ve sobre el melocotón claro.
 */
export function SectionTitle({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityRole="header" style={[{ alignSelf: 'flex-start' }, style]}>
      <Text
        style={{
          color: brand.white,
          fontFamily: 'Fredoka_700Bold',
          fontSize: 17,
          lineHeight: 22,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          textShadowColor: brand.ink,
          textShadowOffset: { width: 2, height: 2 },
          // Sin desenfoque (sombra dura). En Android tiene que ser > 0 para que se pinte.
          textShadowRadius: 0.1,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
