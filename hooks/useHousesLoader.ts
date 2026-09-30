import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useHouseStore } from '../store/houseStore';

/**
 * Carga mis hogares al entrar y cada vez que la app vuelve a primer plano (por
 * si me han añadido a uno o me han sacado). Va en el layout de (app).
 */
export function useHousesLoader(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const { loadHouses } = useHouseStore.getState();
    void loadHouses();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadHouses();
    });
    return () => {
      sub.remove();
      // Al cerrar sesión (o cambiar de cuenta), fuera la lista: no son los hogares del siguiente.
      useHouseStore.setState({ houses: null });
    };
  }, [userId]);
}
