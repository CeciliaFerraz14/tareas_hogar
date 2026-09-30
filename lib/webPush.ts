import { Platform } from 'react-native';
import { supabase } from './supabase';
import { isInstalledPwa, isIos } from './pwaInstall';

/**
 * Notificaciones push de la versión web (PWA), con Web Push + claves VAPID.
 *
 *   'on'            → este navegador recibe notificaciones
 *   'off'           → se pueden activar (pidiendo permiso al tocar un botón)
 *   'denied'        → la persona las bloqueó: hay que cambiarlo en el navegador
 *   'needs-install' → iPhone/iPad: solo funcionan con la PWA instalada
 *   'unsupported'   → este navegador (o la app nativa) no tiene Web Push
 */
export type WebPushState = 'on' | 'off' | 'denied' | 'needs-install' | 'unsupported';

const SW_READY_TIMEOUT_MS = 8000;

function hasWebPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getWebPushState(): Promise<WebPushState> {
  if (Platform.OS !== 'web') return 'unsupported';
  // En iPhone, Safari solo ofrece Web Push a la PWA instalada en la pantalla de inicio.
  if (isIos() && !isInstalledPwa()) return 'needs-install';
  if (!hasWebPush()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && Notification.permission === 'granted' ? 'on' : 'off';
}

/** La clave pública VAPID viene en base64 "url-safe"; pushManager la quiere en bytes. */
function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function serviceWorkerReady(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('No hay service worker. Prueba con la web publicada (no funciona con "expo start").')),
      SW_READY_TIMEOUT_MS,
    ),
  );
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const { keys } = subscription.toJSON();
  if (!keys?.p256dh || !keys.auth) throw new Error('El navegador no ha devuelto las claves de la suscripción.');
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: navigator.userAgent.slice(0, 300),
  });
  if (error) throw new Error(error.message);
}

/**
 * Pide permiso y suscribe este navegador. Llamarla SIEMPRE desde un toque del
 * usuario (un botón o un interruptor): si no, el navegador bloquea el permiso.
 */
export async function enableWebPush(): Promise<WebPushState> {
  const state = await getWebPushState();
  if (state === 'needs-install' || state === 'unsupported' || state === 'denied') return state;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const registration = await serviceWorkerReady();
  const { data: publicKey, error } = await supabase.rpc('get_vapid_public_key');
  if (error || !publicKey) throw new Error(error?.message ?? 'Falta la clave pública de notificaciones.');

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true, // obligatorio: cada push muestra una notificación
      applicationServerKey: base64UrlToBytes(publicKey),
    }));
  await saveSubscription(subscription);
  return 'on';
}

/** Da de baja este navegador (al apagarlas en Ajustes o al cerrar sesión). */
export async function disableWebPush(): Promise<void> {
  if (Platform.OS !== 'web' || !hasWebPush()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

/**
 * Al abrir la app con sesión: si este navegador ya estaba suscrito, vuelve a
 * guardar la suscripción a nombre de quien ha iniciado sesión (puede haber
 * cambiado de cuenta, o el navegador puede haber renovado el endpoint).
 */
export async function syncWebPushSubscription(): Promise<void> {
  if ((await getWebPushState()) !== 'on') return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await saveSubscription(subscription);
}

/**
 * Cierra las notificaciones del chat de un hogar (o de todos, sin houseId) que
 * siguen en el centro de notificaciones: al leer el chat ya no tienen sentido.
 * Todas las de un chat llevan el tag `chat-<houseId>` (ver send-push).
 */
export async function closeChatNotifications(houseId?: string): Promise<void> {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  const notifications = await registration.getNotifications();
  for (const notification of notifications) {
    const isChat = notification.tag.startsWith('chat-');
    if (isChat && (!houseId || notification.tag === `chat-${houseId}`)) notification.close();
  }
}
