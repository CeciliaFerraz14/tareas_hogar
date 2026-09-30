import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Instalar HOMI como app (PWA) desde el navegador.
 *
 *   'ios'     → iPhone/iPad en Safari: Compartir → «Añadir a pantalla de inicio»
 *   'ios-app' → iPhone/iPad en Chrome, Edge o Firefox: igual, desde su botón Compartir
 *   'android' → Android (Chrome, Samsung Internet…)
 *   'desktop' → ordenador
 */
export type InstallPlatform = 'ios' | 'ios-app' | 'android' | 'desktop';

/** El evento `beforeinstallprompt` de Chrome (no está en los tipos del DOM). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window {
    /** Lo guarda public/index.html en cuanto llega, antes de que arranque React. */
    __homiInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function isIos(): boolean {
  // Los iPad modernos se presentan como Mac con pantalla táctil.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** ¿Se está usando la app instalada (abierta desde su icono), no una pestaña? */
export function isInstalledPwa(): boolean {
  if (Platform.OS !== 'web') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

export function getInstallPlatform(): InstallPlatform {
  if (Platform.OS !== 'web') return Platform.OS === 'ios' ? 'ios' : 'android';
  if (isIos()) return /CriOS|FxiOS|EdgiOS/.test(navigator.userAgent) ? 'ios-app' : 'ios';
  if (/Android/i.test(navigator.userAgent)) return 'android';
  return 'desktop';
}

/**
 * Estado de la instalación para la pantalla /instalar:
 *   · installed:  ya se está usando la app instalada
 *   · canPrompt:  el navegador ofrece su ventana de "Instalar" (Chrome/Edge en
 *                 Android y ordenador); en iPhone nunca, hay que hacerlo a mano
 *   · promptInstall(): abre esa ventana (llamarla al tocar un botón)
 */
export function useInstallPrompt() {
  const web = Platform.OS === 'web';
  const [installed, setInstalled] = useState(() => web && isInstalledPwa());
  const [canPrompt, setCanPrompt] = useState(() => web && Boolean(window.__homiInstallPrompt));

  useEffect(() => {
    if (!web) return;
    const onInstallable = () => setCanPrompt(true);
    const onInstalled = () => {
      setCanPrompt(false);
      setInstalled(true);
    };
    window.addEventListener('homi:installable', onInstallable);
    window.addEventListener('homi:installed', onInstalled);
    return () => {
      window.removeEventListener('homi:installable', onInstallable);
      window.removeEventListener('homi:installed', onInstalled);
    };
  }, [web]);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const event = web ? window.__homiInstallPrompt : null;
    if (!event) return 'unavailable';
    await event.prompt();
    const { outcome } = await event.userChoice;
    // Cada evento solo sirve una vez: si lo rechaza, Chrome mandará otro más adelante.
    window.__homiInstallPrompt = null;
    setCanPrompt(false);
    return outcome;
  }, [web]);

  return { installed, canPrompt, promptInstall };
}
