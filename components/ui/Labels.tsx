import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { Text } from './Text';
import { brand } from '../../lib/theme';

// El fondo de acuarela (y la madera, en oscuro) no es liso: el texto fino
// suelto encima se lee mal. Lo que va directamente sobre el fondo se pone en
// una tira de papel kraft (subtítulos) o en un trozo de cinta (títulos de sección).

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

// Tira horizontal con los extremos rasgados (fijos, para que no cambie entre renders).
const LEFT_EDGE = [0, 5, 1, 6, 2, 5, 0];
const RIGHT_EDGE = [2, 7, 1, 6, 3, 7, 1];
const TAPE_PATH = (() => {
  const h = 40;
  const step = h / (LEFT_EDGE.length - 1);
  const right = RIGHT_EDGE.map((d, i) => `L${200 - d} ${(i * step).toFixed(1)}`).join(' ');
  const left = [...LEFT_EDGE]
    .reverse()
    .map((d, i) => `L${d} ${(h - i * step).toFixed(1)}`)
    .join(' ');
  return `M${LEFT_EDGE[0]} 0 ${right} ${left} Z`;
})();

/** Título de sección en un trozo de cinta mostaza, como la cinta del logo. */
export function TapeLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessibilityRole="header"
      style={[{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 4, transform: [{ rotate: '-1.5deg' }] }, style]}
    >
      <Svg viewBox="0 0 200 40" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="homiTapeLabel" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={brand.tape[0]} />
            <Stop offset="0.6" stopColor={brand.tape[1]} />
            <Stop offset="1" stopColor={brand.tape[2]} />
          </LinearGradient>
        </Defs>
        <Path d={TAPE_PATH} fill="url(#homiTapeLabel)" />
      </Svg>
      {/* La cinta es mostaza en claro y en oscuro: el texto, siempre en tinta. */}
      <Text variant="label" style={{ color: brand.ink, textTransform: 'uppercase', letterSpacing: 1 }}>
        {children}
      </Text>
    </View>
  );
}
