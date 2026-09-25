import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  loading,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();

  const styles = useMemo(() => {
    const base: ViewStyle = {
      paddingVertical: 13,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.radii.pill,
      borderWidth: theme.borderWidth,
      borderColor: theme.colors.outline,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
      ...theme.shadows.soft,
    };
    switch (variant) {
      case 'primary':
        return { ...base, backgroundColor: theme.colors.peach };
      case 'secondary':
        return { ...base, backgroundColor: theme.colors.lime };
      case 'accent':
        return { ...base, backgroundColor: theme.colors.mustard };
      case 'danger':
        return { ...base, backgroundColor: theme.colors.danger };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 0,
          ...theme.shadows.none,
        };
    }
  }, [theme, variant, fullWidth]);

  const textColor = variant === 'ghost' ? 'accent' : 'onFill';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles,
        (disabled || loading) && { opacity: 0.6 },
        // Al pulsar, el botón "se hunde" sobre su sombra.
        pressed && variant !== 'ghost' && {
          transform: [{ translateX: 3 }, { translateY: 3 }],
          ...theme.shadows.none,
        },
        style as ViewStyle,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? theme.colors.primary : theme.colors.textOnFill} />
      ) : (
        <Text variant="bodyBold" color={textColor} style={{ fontSize: 17 }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
