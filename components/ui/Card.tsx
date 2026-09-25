import { View, type ViewProps } from 'react-native';
import { useTheme } from '../../lib/theme';

type CardProps = ViewProps & {
  padded?: boolean;
};

export function Card({ padded = true, style, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          borderWidth: theme.borderWidth,
          borderColor: theme.colors.outline,
          padding: padded ? theme.spacing.lg : 0,
          ...theme.shadows.soft,
        },
        style,
      ]}
    />
  );
}
