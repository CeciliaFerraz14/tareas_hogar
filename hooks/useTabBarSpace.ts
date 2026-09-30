import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarStore } from '../store/tabBarStore';

/**
 * Hueco que hay que dejar abajo en las pestañas para que la barra no tape nada
 * (el final de las listas, la caja para escribir…).
 *   · iPhone (barra nativa de cristal): el área segura ya incluye la barra.
 *   · Web y Android: la barra flotante propia dice cuánto ocupa.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  const floating = useTabBarStore((s) => s.space);
  return Platform.OS === 'ios' ? insets.bottom + 8 : floating;
}
