import { create } from 'zustand';

export type ChatToast = {
  id: string;
  houseId: string;
  houseName: string;
  senderName: string;
  senderAvatar: string | null;
  text: string;
};

type ChatState = {
  /** Mensajes sin leer por hogar (de los demás). */
  unreadByHouse: Record<string, number>;
  /** Chat que está en pantalla ahora mismo: de ese no se avisa. */
  openChatHouseId: string | null;
  /** Aviso flotante de "mensaje nuevo" dentro de la app. */
  toast: ChatToast | null;
  setUnreadByHouse: (unread: Record<string, number>) => void;
  setOpenChatHouseId: (houseId: string | null) => void;
  showToast: (toast: ChatToast) => void;
  dismissToast: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  unreadByHouse: {},
  openChatHouseId: null,
  toast: null,
  setUnreadByHouse: (unreadByHouse) => set({ unreadByHouse }),
  setOpenChatHouseId: (openChatHouseId) => set({ openChatHouseId }),
  showToast: (toast) => set({ toast }),
  dismissToast: () => set({ toast: null }),
}));

/** Total de mensajes sin leer (para el globo de la pestaña Chat y el icono de la app). */
export function useTotalUnread(): number {
  return useChatStore((s) => Object.values(s.unreadByHouse).reduce((sum, n) => sum + n, 0));
}
