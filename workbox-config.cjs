// Workbox genera dist/sw.js después de `expo export -p web` (ver `npm run build:web`).
// https://developer.chrome.com/docs/workbox/modules/workbox-build#generatesw
module.exports = {
  globDirectory: 'dist/',
  // Todo lo que hace falta para abrir la app: HTML, JS, CSS, fuentes e iconos.
  globPatterns: ['**/*.{html,js,css,json,png,jpg,jpeg,svg,webp,ico,ttf,otf,woff,woff2}'],
  // Por defecto Workbox ignora cualquier ruta con "node_modules", y Expo deja ahí
  // las fuentes (Quicksand, Fredoka) e imágenes: sin esto, sin conexión la app
  // abriría con la fuente del sistema.
  // Tampoco las pantallas de arranque de iOS ni las capturas del manifest: solo
  // se usan al instalar, y no tiene sentido que cada móvil se descargue todas.
  globIgnores: ['sw.js', 'workbox-*.js', '**/*.map', 'icons/splash/**', 'screenshots/**'],
  swDest: 'dist/sw.js',
  // El bundle de JS pesa varios MB: por defecto Workbox solo guarda hasta 2 MB por fichero.
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

  // Es una SPA: cualquier ruta (/house/123, /reset-password…) se sirve con index.html,
  // también sin conexión.
  navigateFallback: '/index.html',

  // Una versión nueva se activa en cuanto se descarga y borra las cachés viejas.
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,

  // Código de las notificaciones push (mostrar y abrir al tocar): public/push-handler.js
  importScripts: ['push-handler.js'],

  runtimeCaching: [
    {
      // Fotos de Supabase Storage (avatares y fotos de hogar): se muestran al momento
      // desde la caché y se actualizan por detrás.
      urlPattern: ({ url }) =>
        url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/'),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'homi-fotos',
        expiration: { maxEntries: 150, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    // La API de Supabase (datos, sesión, tiempo real) NO se guarda en caché: los
    // datos tienen que ser los reales. Workbox deja pasar lo que no está aquí.
  ],
};
