import { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { Text } from './Text';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, containerStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.outline;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text variant="label" color="secondary">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.textSecondary}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            borderWidth: theme.borderWidth,
            borderRadius: theme.radii.md,
            ...(focused ? theme.shadows.small : null),
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 14,
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.family.regular,
            fontSize: 16,
          },
          rest.style,
        ]}
      />
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
