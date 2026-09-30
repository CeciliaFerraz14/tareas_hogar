import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

export type MyHouse = { id: string; name: string; avatar_url: string | null };

// Toda la app trabaja con un hogar activo, que se ve siempre arriba (HouseSwitcher).
//   · con un solo hogar, se elige solo
//   · con varios, se pregunta la primera vez y luego se recuerda (AsyncStorage)
//   · abrir algo de otro hogar (un aviso, un enlace) lo cambia (useSyncActiveHouse)
type HouseState = {
  /** El hogar activo. null = sin elegir (o sin hogares). */
  currentHouseId: string | null;
  /** Mis hogares, en mi orden. null = aún sin cargar. No se guarda en el móvil. */
  houses: MyHouse[] | null;
  setCurrentHouse: (id: string | null) => void;
  /** Olvida un hogar que ya no existe o del que ya no soy miembro. */
  forgetHouse: (id: string) => void;
  /** Recarga mis hogares y deja el hogar activo en uno válido. */
  loadHouses: () => Promise<void>;
};

export const useHouseStore = create<HouseState>()(
  persist(
    (set, get) => ({
      currentHouseId: null,
      houses: null,
      setCurrentHouse: (id) => set({ currentHouseId: id }),
      forgetHouse: (id) =>
        set((s) => ({
          currentHouseId: s.currentHouseId === id ? null : s.currentHouseId,
          houses: s.houses?.filter((h) => h.id !== id) ?? null,
        })),
      loadHouses: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        // El hogar guardado se lee del móvil de forma asíncrona: hay que esperarlo
        // para no darlo por perdido y volver a preguntar.
        await persistedStateLoaded();
        // Mi orden personal (house_members.sort_order). Sin posición = recién llegado: arriba.
        const { data, error } = await supabase
          .from('house_members')
          .select('houses:house_id (id, name, avatar_url)')
          .eq('user_id', userId)
          .order('sort_order', { ascending: true, nullsFirst: true })
          .order('joined_at', { ascending: false });
        if (error) return; // sin conexión: se queda la lista que había
        const houses = (data ?? []).flatMap((m) => (m.houses ? [m.houses] : []));
        const current = get().currentHouseId;
        const stillMine = current !== null && houses.some((h) => h.id === current);
        set({
          houses,
          // Si el guardado ya no vale: con un solo hogar se elige ese; con varios, se pregunta.
          currentHouseId: stillMine ? current : houses.length === 1 ? houses[0].id : null,
        });
      },
    }),
    {
      name: 'hogar-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ currentHouseId: s.currentHouseId }),
    },
  ),
);

function persistedStateLoaded(): Promise<void> {
  if (useHouseStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useHouseStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

export type ActiveHouse =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'choose'; houses: MyHouse[] }
  | { status: 'ready'; house: MyHouse; houses: MyHouse[] };

/** El hogar activo, o por qué no lo hay todavía (cargando, sin hogares, sin elegir). */
export function useActiveHouse(): ActiveHouse {
  const houses = useHouseStore((s) => s.houses);
  const currentHouseId = useHouseStore((s) => s.currentHouseId);
  if (houses === null) return { status: 'loading' };
  if (houses.length === 0) return { status: 'none' };
  const house = houses.find((h) => h.id === currentHouseId);
  return house ? { status: 'ready', house, houses } : { status: 'choose', houses };
}

/**
 * Para las pantallas de un hogar concreto (/house/[id]/…): al abrirlas, ese pasa
 * a ser el hogar activo, así al volver a las pestañas se sigue en el mismo.
 */
export function useSyncActiveHouse(houseId: string | undefined) {
  const setCurrentHouse = useHouseStore((s) => s.setCurrentHouse);
  useEffect(() => {
    if (houseId) setCurrentHouse(houseId);
  }, [houseId, setCurrentHouse]);
}
