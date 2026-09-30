import { create } from 'zustand';

type TabBarState = {
  /** Lo que tapa la barra flotante por abajo (alto + margen). 0 si está oculta. */
  space: number;
  setSpace: (space: number) => void;
};

/** Lo rellena FloatingTabBar; lo lee useTabBarSpace. */
export const useTabBarStore = create<TabBarState>((set) => ({
  space: 0,
  setSpace: (space) => set((s) => (s.space === space ? s : { space })),
}));
