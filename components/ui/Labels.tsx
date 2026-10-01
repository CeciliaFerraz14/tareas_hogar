import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { brand } from '../../lib/theme';

// El fondo de acuarela (y la madera, en oscuro) no es liso: el texto fino
// suelto encima se lee mal. Lo que va directamente sobre el fondo va en tinta
// (subtítulos) o en blanco con sombra de tinta (títulos de sección).

/** Subtítulo sobre el fondo, bajo el título de una pantalla: en tinta, sin papel. */
export function Subtitle({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'flex-start', maxWidth: '100%' }, style]}>
      {/* Igual en claro y en oscuro: siempre en tinta. */}
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
