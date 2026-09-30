import { Platform } from 'react-native';

const FADE_MS = 250; // la misma transición que #homi-boot en public/index.html

/**
 * Web: retira la pantalla de arranque del HTML (#homi-boot, la casita que se ve
 * mientras se descarga el JavaScript) con un fundido. La llama AnimatedSplash al
 * empezar, que arranca con el mismo degradado: el paso no se nota.
 */
export function hideBootSplash(): void {
  if (Platform.OS !== 'web') return;
  const boot = document.getElementById('homi-boot');
  if (!boot) return;
  boot.classList.add('homi-boot--out');
  setTimeout(() => boot.remove(), FADE_MS);
}
