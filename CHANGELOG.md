# Changelog

Todos los cambios importantes de HOMI. Formato basado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versiones con
[SemVer](https://semver.org/lang/es/): `MAYOR.MENOR.PARCHE`.

- **0.x** = en pruebas (beta). La **1.0.0** será la primera versión estable.
- **MENOR** sube con cada funcionalidad nueva; **PARCHE**, con cada arreglo.
- La versión se cambia en `app.json` (`expo.version` y `expo.extra.releaseStage`)
  y en `package.json`. Se ve al final de Ajustes.

## [0.16.0-beta] – 2026-09-30

### Añadido
- **Rutinas de las mascotas**: comida, paseos, arena, pastillas… a diario a
  unas horas, cada X días o una vez al mes. Al crear una mascota se proponen
  las de siempre según su tipo (perro, gato, conejo…).
- **¿Ha comido ya?**: cada toma se marca con un toque y todo el piso ve al
  momento quién lo hizo y cuándo («Última vez hace 2 h · Ana»). La misma toma
  no se puede marcar dos veces, así nadie repite comida. Lo atrasado sale en
  melocotón.
- **Mascotas en Hoy**: lo que toca hoy y aún está sin hacer, marcable desde ahí.
- Editar o borrar una mascota y sus rutinas.

### Cambiado
- Las tareas sueltas de antes pasan a ser **pendientes** de una sola vez
  (veterinario, comprar pienso…).

## [0.15.2-beta] – 2026-09-30

### Cambiado
- Los subtítulos van ahora en una **tira de papel kraft rasgado**, más
  rústica, en vez de la etiqueta crema con borde de tinta.

## [0.15.1-beta] – 2026-09-30

### Arreglado
- Los subtítulos sobre el fondo de acuarela (o de madera, en modo oscuro) se
  leían mal. Ahora van en una **pegatina** crema con borde de tinta, los
  títulos de sección («Para hoy», «En el carro», «Gastos»…) en un trozo de
  **cinta mostaza**, y el resto de textos sueltos sobre el fondo, en tinta.

## [0.15.0-beta] – 2026-09-30

### Cambiado
- **La app gira alrededor de tu hogar**: arriba se ve siempre el hogar activo
  y se toca para cambiar a otro, crear uno o unirse con un código. Si solo
  tienes uno, se elige solo; si tienes varios, se pregunta la primera vez.
- **Nuevas pestañas: Hoy · Tareas · Compra · Chat · Más**, todas del hogar
  activo. La compra y el chat quedan a un toque.
- **Barra de pestañas flotante** (web y Android): una píldora con el estilo
  HOMI en la que la pestaña activa se estira y enseña su nombre. Se aparta al
  escribir. En iPhone sigue la barra de cristal de iOS.
- **Hoy**: tus tareas del día, qué se come (y si comes en casa, que se contesta
  ahí mismo), lo que falta en la compra y los mensajes nuevos.
- **Más**: un tablero con Menú, Recetas, Hucha (lo que debes o te deben),
  Mascotas y Miembros, y el acceso a tu cuenta y al tutorial.
- Los ajustes de la cuenta están ahora en Más → Tu cuenta y ajustes.
- Accesos directos del icono de la app: Tareas, Compra y Chat.

### Quitado
- La lista de hogares ordenable de Inicio y el «hogar principal»: los
  sustituye el hogar activo.

## [0.14.0-beta] – 2026-09-30

### Añadido
- **¿Comes en casa?**: en cada comida y cena del menú, cada persona dice si
  come en casa. En el menú se ve «3 comen · 1 no» y, al abrir el hueco, quién.
- **Avisos a quien cocina**: cuando otra persona te apunta para cocinar, y un
  recordatorio a las 10:00 del día que te toca con los platos y cuántos comen
  («🍳 Hoy cocinas tú»). Se pueden apagar en Ajustes → Notificaciones → Menú.
- **Copiar la semana anterior**: rellena los huecos vacíos con los platos de
  la semana pasada, sin tocar lo que ya hay.

## [0.13.0-beta] – 2026-09-30

### Añadido
- **Recetario** de cada hogar (botón «Recetas» en el menú): nombre,
  ingredientes con su cantidad y notas. Se puede buscar por receta o por
  ingrediente.
- Al apuntar un plato en el menú se puede elegir del recetario. Si se escribe
  a mano el nombre de una receta, se enlaza solo.
- **Pasar ingredientes a la compra**: un botón en el menú añade a la lista los
  ingredientes de los platos de hoy al domingo. Junta los repetidos
  («Chorizo (1 + ½)») y no repite lo que ya está pendiente en la lista.

### Cambiado
- Si se renombra una receta, los platos del menú que la usan cambian con ella.
  Si se borra, los platos se quedan, pero sin receta.

## [0.12.1-beta] – 2026-09-30

### Seguridad
- Cerrado un agujero en la base de datos: cualquier persona con sesión podía
  vaciar las tablas de los checks del chat, de las suscripciones push y de las
  preferencias de avisos (o cambiar el dueño de unas preferencias). Ahora cada
  tabla solo permite lo que usa la app, y las tablas nuevas nacen sin permisos.

## [0.12.0-beta] – 2026-09-30

### Añadido
- **Menú semanal** en cada hogar: comida y cena de cada día, con quién cocina.
  Se pasa de semana con las flechas y los cambios se ven al momento en los
  móviles de todos. Opciones rápidas: «Sobras», «Pedimos fuera» y «Cada uno lo
  suyo».
- En Inicio, cada hogar enseña qué se come hoy; al tocarlo se abre el menú.
- Diapositiva nueva en el tutorial: «¿Qué comemos hoy?».

## [0.11.0-beta] – 2026-09-30

### Añadido
- Tutorial animado «Cómo funciona HOMI» (9 pasos: hogares, Inicio, tareas,
  compra, chat, hucha, mascotas y avisos). Sale la primera vez que entra cada
  usuario y se puede volver a ver en Ajustes → «Ver tutorial de HOMI».

### Cambiado
- En Ajustes, «Instalar HOMI» y «Ver tutorial» están juntos en una sección «Ayuda».

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
