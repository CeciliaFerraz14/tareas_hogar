import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Text } from './Text';
import { brand, useTheme } from '../../lib/theme';

// El fondo de acuarela (y la madera, en oscuro) no es liso: el texto fino
// suelto encima se lee mal. Lo que va directamente sobre el fondo se pone en
// una pegatina (subtítulos) o en un trozo de cinta (títulos de sección).

/** Subtítulo en una etiqueta crema con borde de tinta, como una pegatina. */
export function Sticker({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          maxWidth: '100%',
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: theme.radii.sm,
          borderWidth: theme.borderWidth,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
          ...theme.shadows.small,
        },
        style,
      ]}
    >
      <Text variant="label" numberOfLines={1}>{children}</Text>
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
