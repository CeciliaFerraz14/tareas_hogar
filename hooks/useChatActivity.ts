import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { subscribeToHouseTables, type HouseChange } from '../lib/realtime';
import { dateKey } from '../lib/tasks';
import { useChatStore } from '../store/chatStore';
import { closeChatNotifications } from '../lib/webPush';

const DEBOUNCE_MS = 400;

type Person = { name: string; avatar: string | null };

/**
 * Actividad del chat en toda la app (va en el layout de (app)):
 *   · marca como "llegados" los mensajes de mis hogares (checks ✓✓)
 *   · lleva la cuenta de mensajes sin leer por hogar (globo de la pestaña Chat)
 *   · si entra un mensaje y no estoy en ese chat, muestra el aviso flotante
 *   · en la PWA, pone el número en el icono de la app
 */
export function useChatActivity(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let unsubscribes: (() => void)[] = [];
    let deliverTimer: ReturnType<typeof setTimeout> | null = null;
    let unreadTimer: ReturnType<typeof setTimeout> | null = null;
    const houseNames = new Map<string, string>();
    const people = new Map<string, Person>();

    // Varios mensajes seguidos → una sola llamada.
    function markDelivered() {
      if (deliverTimer) clearTimeout(deliverTimer);
      // Ojo: supabase-js no envía la petición hasta que se espera (then/await).
      deliverTimer = setTimeout(() => {
        void supabase.rpc('mark_my_chats_delivered').then(({ error }) => {
          if (error) console.warn('No se pudieron marcar los mensajes como llegados', error.message);
        });
      }, DEBOUNCE_MS);
    }

    function reloadUnread() {
      if (unreadTimer) clearTimeout(unreadTimer);
      unreadTimer = setTimeout(async () => {
        const { data } = await supabase.rpc('my_house_summaries', { p_today: dateKey(new Date()) });
        if (cancelled || !data) return;
        useChatStore.getState().setUnreadByHouse(
          Object.fromEntries(data.map((s) => [s.house_id, s.unread_messages])),
        );
        // Chats ya leídos: sus notificaciones del sistema sobran.
        for (const s of data) {
          if (s.unread_messages === 0) void closeChatNotifications(s.house_id);
        }
      }, DEBOUNCE_MS);
    }

    function onMessage(change: HouseChange | null) {
      markDelivered();
      reloadUnread();
      const message = change?.operation === 'INSERT' ? change.record : null;
      if (!message || message.user_id === userId) return;

      // Aviso flotante, salvo que ya esté mirando ese chat.
      const houseId = String(message.house_id);
      const { openChatHouseId, showToast } = useChatStore.getState();
      if (houseId === openChatHouseId || AppState.currentState !== 'active') return;
      const sender = people.get(String(message.user_id));
      showToast({
        id: String(message.id),
        houseId,
        houseName: houseNames.get(houseId) ?? '',
        senderName: sender?.name ?? 'Alguien',
        senderAvatar: sender?.avatar ?? null,
        text: String(message.content ?? ''),
      });
    }

    // Se vuelve a pedir todo al volver a la app, por si me he unido a un hogar.
    async function listen() {
      const [housesRes, peopleRes] = await Promise.all([
        supabase.from('house_members').select('house_id, houses:house_id (name)').eq('user_id', userId!),
        supabase.from('house_members').select('user_id, users:user_id (username, email, avatar_url)'),
      ]);
      if (cancelled) return;
      for (const h of housesRes.data ?? []) houseNames.set(h.house_id, h.houses?.name ?? '');
      for (const p of peopleRes.data ?? []) {
        const name = p.users?.username?.trim() || p.users?.email.split('@')[0] || 'Alguien';
        people.set(p.user_id, { name, avatar: p.users?.avatar_url ?? null });
      }

      for (const unsubscribe of unsubscribes) unsubscribe();
      unsubscribes = (housesRes.data ?? []).flatMap((h) => [
        subscribeToHouseTables(h.house_id, ['house_messages'], onMessage),
        // Cuando leo un chat (aquí o en otro dispositivo), baja el contador.
        subscribeToHouseTables(h.house_id, ['house_chat_reads'], reloadUnread),
      ]);
      markDelivered();
      reloadUnread();
    }

    void listen();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void listen();
    });

    return () => {
      cancelled = true;
      appState.remove();
      for (const unsubscribe of unsubscribes) unsubscribe();
      if (deliverTimer) clearTimeout(deliverTimer);
      if (unreadTimer) clearTimeout(unreadTimer);
    };
  }, [userId]);

  // PWA instalada: número de mensajes sin leer en el icono (Badging API).
  useEffect(() => {
    if (Platform.OS !== 'web' || !('setAppBadge' in navigator)) return;
    return useChatStore.subscribe((state) => {
      const total = Object.values(state.unreadByHouse).reduce((sum, n) => sum + n, 0);
      if (total > 0) void navigator.setAppBadge(total).catch(() => undefined);
      else void navigator.clearAppBadge().catch(() => undefined);
    });
  }, []);
}
