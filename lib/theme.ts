import { useColorScheme } from 'react-native';

// Paleta HOMI: acuarela cálida naranja → melocotón, cinta mostaza y verde lima.
const palette = {
  // Naranjas / melocotón
  peach50:   '#FFF6EF',
  peach100:  '#FDE6D6',
  peach300:  '#F7C4A5',
  orange400: '#EF8A4F',
  orange500: '#E8703A',
  orange700: '#B8501F',

  // Mostaza (la "cinta")
  mustard300: '#F8D35E',
  mustard500: '#F2B233',

  // Lima
  lime300: '#D5DA7A',
  lime500: '#BCC34A',

  // Tinta y neutros cálidos
  ink:     '#1A1410',
  white:   '#FFFFFF',
  cream:   '#FFF9F3',
  sand200: '#F1DFD1',
  sand400: '#B89886',
  sand600: '#7A5F52',

  // Estado
  success: '#8DB84A',
  // Azul del check de "leído" (≥ 4.5:1 sobre el crema)
  readBlue: '#1F74D6',
  warning: '#F2B233',
  danger:  '#E0533D',
} as const;

export type ThemeColors = {
  background: string;
  backgroundGradient: readonly [string, string, ...string[]];
  surface: string;
  surfaceAlt: string;
  border: string;
  outline: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  /** Texto sobre rellenos de color (melocotón, lima, mostaza): siempre tinta. */
  textOnFill: string;
  primary: string;
  primaryMuted: string;
  accent: string;
  peach: string;
  lime: string;
  mustard: string;
  success: string;
  warning: string;
  danger: string;
  /** Check de mensaje leído. */
  read: string;
};

const light: ThemeColors = {
  background:         palette.cream,
  backgroundGradient: [palette.peach50, palette.peach100],
  surface:            palette.white,
  surfaceAlt:         palette.peach100,
  border:             palette.sand200,
  outline:            palette.ink,
  textPrimary:        palette.ink,
  textSecondary:      palette.sand600,
  textInverse:        palette.white,
  textOnFill:         palette.ink,
  primary:            palette.orange500,
  primaryMuted:       palette.peach300,
  accent:             palette.orange700,
  peach:              palette.peach300,
  lime:               palette.lime500,
  mustard:            palette.mustard500,
  success:            palette.success,
  warning:            palette.warning,
  danger:             palette.danger,
  read:               palette.readBlue,
};

const dark: ThemeColors = {
  // Tablones color miel (ver WoodPlanks) con cajas crema y texto en tinta.
  background:         '#EBD6BF',
  backgroundGradient: ['#C49664', '#B4875A'],
  surface:            '#F6E8D8',
  surfaceAlt:         '#EAD3BC',
  border:             '#C9A98E',
  outline:            palette.ink,
  textPrimary:        palette.ink,
  textSecondary:      '#3A271C',
  textInverse:        palette.ink,
  textOnFill:         palette.ink,
  primary:            palette.orange500,
  primaryMuted:       palette.peach300,
  accent:             palette.orange700,
  peach:              palette.peach300,
  lime:               palette.lime500,
  mustard:            palette.mustard500,
  success:            palette.success,
  warning:            palette.warning,
  danger:             palette.danger,
  read:               palette.readBlue,
};

// Colores de la pantalla de bienvenida (fijos, no dependen del modo).
export const brand = {
  gradient: ['#FCEFE6', '#F2B79A', '#EC8A5C', '#E46A36'] as const,
  tape: ['#F9D56A', '#F4B537', '#EFA42A'] as const,
  ...palette,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const borderWidth = 2;

export const shadows = {
  // Sombra "pegatina": desplazada, sin difuminar, en tinta (iOS y Android).
  soft: { boxShadow: `4px 4px 0px 0px ${palette.ink}` },
  small: { boxShadow: `2px 3px 0px 0px ${palette.ink}` },
  none: { boxShadow: 'none' },
} as const;

export const typography = {
  family: {
    regular: 'Quicksand_500Medium',
    medium: 'Quicksand_600SemiBold',
    bold: 'Quicksand_700Bold',
    extraBold: 'Fredoka_600SemiBold',
    display: 'Fredoka_700Bold',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    title: 34,
  },
} as const;

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  typography: typeof typography;
  borderWidth: typeof borderWidth;
  isDark: boolean;
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? dark : light,
    spacing,
    radii,
    shadows,
    typography,
    borderWidth,
    isDark,
  };
}
