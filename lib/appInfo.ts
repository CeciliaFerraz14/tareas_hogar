import { Platform } from 'react-native';
import appJson from '../app.json';

/**
 * Versión de la app (SemVer). Se cambia SOLO en app.json:
 *   · expo.version            → "0.8.0"  (iPhone solo admite números)
 *   · expo.extra.releaseStage → "beta"   (se quita al publicar la 1.0.0)
 * Y a la vez package.json → "0.8.0-beta".
 */
export const APP_VERSION: string = appJson.expo.version;
export const RELEASE_STAGE: string | null = appJson.expo.extra?.releaseStage ?? null;

/** Commit publicado (lo pone `npm run build:web`; en desarrollo no existe). */
export const COMMIT: string | null = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) || null;

const PLATFORM_LABEL: Record<string, string> = { ios: 'iOS', android: 'Android', web: 'web' };

/** "HOMI 0.8.0 beta · web · 1b982c4" (para Ajustes y para reportar fallos). */
export function versionLabel(): string {
  const version = `HOMI ${APP_VERSION}${RELEASE_STAGE ? ` ${RELEASE_STAGE}` : ''}`;
  return [version, PLATFORM_LABEL[Platform.OS] ?? Platform.OS, COMMIT].filter(Boolean).join(' · ');
}
