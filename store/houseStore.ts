import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type HouseState = {
  currentHouseId: string | null;
  primaryHouseId: string | null;
  setCurrentHouse: (id: string | null) => void;
  setPrimaryHouse: (id: string | null) => void;
  /** Olvida un hogar guardado que ya no existe o del que ya no soy miembro. */
  forgetHouse: (id: string) => void;
};

export const useHouseStore = create<HouseState>()(
  persist(
    (set) => ({
      currentHouseId: null,
      primaryHouseId: null,
      setCurrentHouse: (id) => set({ currentHouseId: id }),
      setPrimaryHouse: (id) => set({ primaryHouseId: id }),
      forgetHouse: (id) =>
        set((s) => ({
          currentHouseId: s.currentHouseId === id ? null : s.currentHouseId,
          primaryHouseId: s.primaryHouseId === id ? null : s.primaryHouseId,
        })),
    }),
    {
      name: 'hogar-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
