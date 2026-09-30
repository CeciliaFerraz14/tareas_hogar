import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/theme';
import { WoodPlanks } from '../brand/WoodPlanks';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** false si la pantalla gestiona el teclado por su cuenta (p. ej. el chat). */
  avoidKeyboard?: boolean;
  /**
   * false en las pestañas con barra flotante: el hueco de abajo lo deja cada
   * pantalla con useTabBarSpace (la barra ya cuenta el área segura).
   */
  bottomEdge?: boolean;
};

export function Screen({ children, scroll = false, style, contentStyle, onRefresh, refreshing, avoidKeyboard = true, bottomEdge = true }: ScreenProps) {
  const theme = useTheme();
  const content = (
    <View
      style={[
        {
          flex: 1,
          padding: theme.spacing.lg,
          gap: theme.spacing.lg,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <LinearGradient colors={theme.colors.backgroundGradient} style={{ flex: 1 }}>
    {theme.isDark && <WoodPlanks />}
    {/* Abajo: en iOS lo gestionan la barra de cristal y cada lista; en Android, la
        barra de navegación del sistema (en las pestañas este margen queda en 0). */}
    <SafeAreaView style={[{ flex: 1 }, style]} edges={Platform.OS === 'android' && bottomEdge ? ['top', 'bottom'] : ['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={avoidKeyboard}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh != null ? (
                <RefreshControl
                  refreshing={refreshing ?? false}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              ) : undefined
            }
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </LinearGradient>
  );
}
