import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/** Se guarda por usuario y en el dispositivo: si otra persona entra en este móvil, también lo ve. */
function seenKey(userId: string) {
  return `onboarding_seen_${userId}`;
}

type OnboardingState = {
  /** El tutorial está en pantalla. */
  visible: boolean;
  /** Usuario para el que ya se ha mirado si lo había visto (para no leerlo dos veces). */
  checkedFor: string | null;
  /** Al entrar: lo abre si este usuario todavía no lo ha visto. */
  checkFirstTime: (userId: string) => Promise<void>;
  /** Desde Ajustes → «Ver tutorial». */
  open: () => void;
  /** Al terminarlo o saltarlo: no vuelve a salir solo. */
  finish: (userId: string) => void;
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  visible: false,
  checkedFor: null,
  checkFirstTime: async (userId) => {
    if (get().checkedFor === userId) return;
    set({ checkedFor: userId });
    try {
      const seen = await AsyncStorage.getItem(seenKey(userId));
      if (!seen) set({ visible: true });
    } catch {
      // Sin almacenamiento (p. ej. navegación privada): mejor no enseñarlo en cada visita.
    }
  },
  open: () => set({ visible: true }),
  finish: (userId) => {
    set({ visible: false });
    AsyncStorage.setItem(seenKey(userId), '1').catch(() => undefined);
  },
}));
