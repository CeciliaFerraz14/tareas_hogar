import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardState } from 'react-native-keyboard-controller';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';

type ComposerBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  /** Mientras se envía: muestra un indicador en el botón. */
  busy: boolean;
  placeholder: string;
  icon: LucideIcon;
  accessibilityLabel: string;
  /** Varias líneas (chat). En una línea, Intro envía y el teclado sigue abierto. */
  multiline?: boolean;
  maxLength: number;
  /**
   * En una pestaña: lo que ocupa la barra de pestañas (useTabBarSpace). La caja
   * se queda encima de la barra y, con el teclado abierto, pegada a él.
   */
  bottomSpace?: number;
};

/**
 * Barra fija abajo para escribir y enviar: caja "pegatina" con borde de tinta y
 * botón redondo. Va dentro de un KeyboardAvoidingView para subir con el teclado.
 */
export function ComposerBar({
  value,
  onChangeText,
  onSubmit,
  busy,
  placeholder,
  icon: Icon,
  accessibilityLabel,
  multiline = false,
  maxLength,
  bottomSpace,
}: ComposerBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const [focused, setFocused] = useState(false);

  const canSubmit = value.trim().length > 0 && !busy;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
        // Con el teclado cerrado, deja sitio a la barra de inicio del iPhone. En Android
        // ese hueco ya lo deja <Screen>.
        paddingBottom:
          bottomSpace !== undefined
            ? (keyboardVisible ? theme.spacing.sm : Math.max(bottomSpace, theme.spacing.sm))
            : keyboardVisible || Platform.OS === 'android'
              ? theme.spacing.sm
              : Math.max(insets.bottom, theme.spacing.md),
      }}
    >
      <View
        style={{
          flex: 1,
          minHeight: 48,
          justifyContent: 'center',
          backgroundColor: theme.colors.surface,
          borderWidth: theme.borderWidth,
          borderColor: focused ? theme.colors.primary : theme.colors.outline,
          borderRadius: theme.radii.lg,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: Platform.OS === 'ios' ? 12 : 6,
          ...theme.shadows.small,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          multiline={multiline}
          maxLength={maxLength}
          returnKeyType={multiline ? 'default' : 'done'}
          submitBehavior={multiline ? 'newline' : 'submit'}
          onSubmitEditing={multiline ? undefined : () => { if (canSubmit) onSubmit(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            maxHeight: 120,
            padding: 0,
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.family.regular,
            fontSize: theme.typography.size.md,
          }}
        />
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: theme.borderWidth,
          borderColor: canSubmit ? theme.colors.outline : theme.colors.border,
          backgroundColor: canSubmit ? theme.colors.primary : theme.colors.surfaceAlt,
          ...(canSubmit ? theme.shadows.small : theme.shadows.none),
          // Al pulsar, el botón "se hunde" sobre su sombra, como Button.
          ...(pressed && canSubmit
            ? { transform: [{ translateX: 2 }, { translateY: 3 }], ...theme.shadows.none }
            : null),
        })}
      >
        {busy ? (
          <ActivityIndicator color={theme.colors.textOnFill} />
        ) : (
          <Icon
            size={22}
            color={canSubmit ? theme.colors.textOnFill : theme.colors.textSecondary}
            strokeWidth={2.4}
          />
        )}
      </Pressable>
    </View>
  );
}
