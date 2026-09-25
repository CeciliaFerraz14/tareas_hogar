import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { subscribeToHouseTables } from '../lib/realtime';

const DEBOUNCE_MS = 500;

/**
 * Check de "llegado": mientras la app está abierta (en cualquier pantalla), marca
 * como llegados los mensajes de todos mis hogares. Se marca al abrir la app, al
 * volver del segundo plano y cada vez que entra un mensaje nuevo.
 */
export function useChatDelivery(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let unsubscribes: (() => void)[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Varios mensajes seguidos → una sola llamada.
    function markDelivered() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void supabase.rpc('mark_my_chats_delivered'); }, DEBOUNCE_MS);
    }

    // Se vuelve a pedir la lista de hogares por si me he unido a uno nuevo.
    async function listen() {
      const { data } = await supabase.from('house_members').select('house_id').eq('user_id', userId!);
      if (cancelled) return;
      for (const unsubscribe of unsubscribes) unsubscribe();
      unsubscribes = (data ?? []).map((m) => subscribeToHouseTables(m.house_id, ['house_messages'], markDelivered));
      markDelivered();
    }

    void listen();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void listen();
    });

    return () => {
      cancelled = true;
      appState.remove();
      for (const unsubscribe of unsubscribes) unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [userId]);
}
