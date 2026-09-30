# Changelog

Todos los cambios importantes de HOMI. Formato basado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versiones con
[SemVer](https://semver.org/lang/es/): `MAYOR.MENOR.PARCHE`.

- **0.x** = en pruebas (beta). La **1.0.0** será la primera versión estable.
- **MENOR** sube con cada funcionalidad nueva; **PARCHE**, con cada arreglo.
- La versión se cambia en `app.json` (`expo.version` y `expo.extra.releaseStage`)
  y en `package.json`. Se ve al final de Ajustes.

## [0.10.0-beta] – 2026-09-30

### Añadido
- Guía para instalar HOMI en el móvil en `/instalar` (iPhone, Android y
  ordenador), con botón «Instalar» de un toque en Chrome/Android. Se abre desde
  la bienvenida, desde Ajustes y desde el aviso de notificaciones del iPhone.
- Pantalla de arranque con la casita mientras carga la web, y pantallas de
  arranque propias al abrir la app instalada en iPhone.
- Accesos directos a Tareas y Chat al mantener pulsado el icono (Android) y
  capturas en la ventana de instalación.

### Cambiado
- En el ordenador, HOMI se ve en una columna centrada con el estilo de la marca
  en vez de estirarse a todo el ancho.
- La barra del navegador y la de estado usan el melocotón de la app (y el color
  miel en modo oscuro) en vez del naranja fuerte.

## [0.9.0-beta] – 2026-09-28

### Añadido
- Aviso a los demás miembros cuando alguien marca una tarea como hecha (y
  «ha hecho tu tarea» si era la tuya).
- Compra: «¡X está haciendo la compra!» al tachar el primer producto (una vez
  por viaje) y «¡Compra hecha!» al tachar lo último de la lista.

## [0.8.0-beta] – 2026-09-26

### Añadido
- Notificaciones push en la versión web (PWA): mensajes del chat, tareas nuevas
  y asignadas, lista de la compra (agrupadas) y gastos de la hucha.
- Preferencias de notificaciones en Ajustes, guardadas en la base de datos.
- Globo de mensajes sin leer en la pestaña Chat y en cada hogar, aviso flotante
  de mensaje nuevo y número en el icono de la app.
- La web se actualiza sola al publicar una versión nueva.
- Versión de la app al final de Ajustes.

### Arreglado
- Las marcas de leído y entregado del chat no se guardaban: el contador de no
  leídos no bajaba y los checks nunca pasaban a ✓✓.
- Al leer un chat se quitan sus notificaciones del centro de notificaciones.

## Versiones anteriores (sin número en su momento)

- **0.7** – Versión web instalable (PWA) y despliegue en Vercel.
- **0.6** – Estética HOMI, tiempo real y seguridad de la base de datos.
- **0.5** – Hucha y mascotas.
- **0.4** – Lista de la compra y chat.
- **0.3** – Tareas y calendario.
- **0.2** – Hogares e invitaciones.
- **0.1** – Registro e inicio de sesión.
