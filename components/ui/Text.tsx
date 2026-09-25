import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../../lib/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyBold' | 'caption' | 'label';

type TextProps = RNTextProps & {
  variant?: Variant;
  color?: 'primary' | 'secondary' | 'inverse' | 'onFill' | 'danger' | 'accent';
  align?: TextStyle['textAlign'];
};

const variantStyles: Record<Variant, Pick<TextStyle, 'fontSize' | 'fontFamily' | 'lineHeight'>> = {
  display: { fontSize: 56, lineHeight: 62, fontFamily: 'Fredoka_700Bold' },
  title: { fontSize: 34, lineHeight: 40, fontFamily: 'Fredoka_700Bold' },
  heading: { fontSize: 22, lineHeight: 28, fontFamily: 'Fredoka_600SemiBold' },
  body: { fontSize: 16, lineHeight: 22, fontFamily: 'Quicksand_500Medium' },
  bodyBold: { fontSize: 16, lineHeight: 22, fontFamily: 'Quicksand_700Bold' },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: 'Quicksand_500Medium' },
  label: { fontSize: 14, lineHeight: 18, fontFamily: 'Quicksand_700Bold' },
};

export function Text({
  variant = 'body',
  color = 'primary',
  align,
  style,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const colorValue = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    inverse: colors.textInverse,
    onFill: colors.textOnFill,
    danger: colors.danger,
    accent: colors.accent,
  }[color];

  return (
    <RNText
      {...rest}
      style={[variantStyles[variant], { color: colorValue, textAlign: align }, style]}
    />
  );
}
