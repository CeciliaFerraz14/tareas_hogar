import { Platform } from 'react-native';

/**
 * A dónde vuelve el enlace del correo de "recuperar contraseña":
 *   · app instalada → hogarapp://reset-password (lo abre la app, ver app/_layout.tsx)
 *   · web / PWA     → https://<tu-dominio>/reset-password
 * El dominio de la web tiene que estar en Supabase → Authentication → URL Configuration.
 */
export function passwordResetRedirectUrl(): string {
  return Platform.OS === 'web' ? `${window.location.origin}/reset-password` : 'hogarapp://reset-password';
}
