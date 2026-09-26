import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { syncWebPushSubscription } from '../lib/webPush';

/**
 * Enlace entre el service worker (notificaciones push) y la app, solo en web:
 *   · al tocar una notificación con la app abierta, el SW manda un mensaje
 *     { type: 'homi:navigate', path } y aquí se navega sin recargar la página
 *   · con sesión iniciada, la suscripción de este navegador se guarda a mi nombre
 */
export function useWebPushBridge(userId: string | undefined) {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return;
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; path?: string } | null;
      if (data?.type === 'homi:navigate' && data.path) router.push(data.path as Href);
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !userId) return;
    void syncWebPushSubscription().catch(() => undefined);
  }, [userId]);
}
