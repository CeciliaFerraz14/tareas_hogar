import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export type NotificationPermission = 'granted' | 'denied' | 'unavailable';

/**
 * Expo Go en Android no incluye expo-notifications desde el SDK 53: importarlo
 * lanza un error nada más cargar el módulo. En una development build o en la
 * app publicada sí funciona.
 */
export const notificationsAvailable =
  // En web harían falta notificaciones push con claves VAPID: por ahora, no.
  Platform.OS !== 'web' &&
  !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

/** Pide permiso de notificaciones. El módulo se carga solo aquí, nunca al arrancar. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsAvailable) return 'unavailable';
  const Notifications = await import('expo-notifications');
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}
