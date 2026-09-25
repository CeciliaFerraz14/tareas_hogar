# HogarApp

App móvil (iOS/Android) para la gestión colaborativa de pisos compartidos: tareas por estancias, lista de la compra en tiempo real, chat por tarea, hucha con split de gastos y mascotas.

## Stack

- **Expo ~54** + **React Native 0.81** + TypeScript estricto
- **Expo Router** (file-based) con grupos `(auth)` / `(app)`
- **Supabase** — Postgres, Auth, Realtime, Storage, RLS en todas las tablas
- **Zustand** (estado global) + **React Query** (server state)
- **React Hook Form** + **Zod** (formularios y validación)
- **lucide-react-native** (iconos), **Nunito** (tipografía), **Reanimated** (animaciones)

## Puesta en marcha

### 1. Instalar dependencias

```bash
cd HogarApp
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica las migraciones de `supabase/migrations/` en orden (`supabase db push` con la CLI, o pegándolas una a una en el SQL Editor). Crean las tablas, la sincronización `auth.users` → `public.users`, los privilegios, la RLS, las RPC, el bucket de avatares y Realtime.
   Cualquier cambio de esquema se hace con una migración nueva; nunca editando a mano en el dashboard.
3. En *Project Settings → API*, copia la `Project URL` y la `anon public` key.
4. Copia `.env.example` a `.env` y rellena:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   ⚠️ **Nunca** pongas aquí la `service_role` key — sólo la `anon` key.

### 3. (Opcional) Regenerar los tipos de la DB

Los tipos actuales en `types/database.types.ts` son mínimos. Para tipos exactos:

```bash
npx supabase login
npx supabase gen types typescript --project-id <TU_PROJECT_ID> > types/database.types.ts
```

### 4. Arrancar

```bash
npm run ios       # simulador iOS
npm run android   # emulador Android
npm run start     # Expo Go / dev client
```

## Versión web (PWA)

La misma app funciona en el navegador y se puede **instalar** en el móvil sin pasar por las tiendas.

```bash
npm run web           # desarrollo en el navegador (sin service worker)
npm run build:web     # build de producción → dist/ (expo export -p web + Workbox)
npm run preview:web   # sirve dist/ en http://localhost:3000 para probarla
npm run icons:pwa     # regenera los iconos de public/icons (solo si cambia el logo)
```

- `public/index.html`: plantilla de la web (manifest, etiquetas de iOS, registro del service worker).
- `public/manifest.json` y `public/icons/`: nombre, colores e iconos (192, 512 y 512 *maskable*).
- `workbox-config.cjs`: qué guarda en caché el service worker (la app completa y las fotos; los datos de Supabase no).
- Código solo web: `app/(app)/(tabs)/_layout.web.tsx` (barra de pestañas) y los `Platform.OS === 'web'` de `lib/`.
- `lib/alert.ts`: usar siempre este `Alert` (en web el de react-native no muestra nada).

### Desplegar en Vercel

1. Variables de entorno en Vercel (Project → Settings → Environment Variables):
   `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
2. `npx vercel` (primera vez, enlaza el proyecto) y `npx vercel --prod`.
   `vercel.json` ya indica el build (`npm run build:web`), la carpeta `dist` y las rutas de la SPA.
3. En Supabase → Authentication → URL Configuration, añade `https://<tu-dominio>/reset-password`
   a *Redirect URLs* (para el correo de recuperar contraseña).

## Estructura

```
app/
  _layout.tsx              Providers (Query, fuentes, auth bootstrap)
  index.tsx                Redirect a (auth) o (app) según sesión
  (auth)/
    login.tsx
    register.tsx
    forgot-password.tsx
  (app)/
    index.tsx              Dashboard (casas del usuario)
    house/[id]/            Resumen, tareas, compra, chat, hucha, mascotas
    profile.tsx
components/
  ui/                      Button, Card, Input, Avatar, Screen, Text
  tasks/  chat/  shopping/  expenses/
lib/
  supabase.ts              Cliente con AsyncStorage + autorefresh
  theme.ts                 Tokens (colores, spacing, radii, tipografía)
  env.ts                   Lectura validada de EXPO_PUBLIC_*
hooks/                     useHouse, useTasks, useRealtime, useNotifications
store/
  authStore.ts             Sesión + bootstrap
  houseStore.ts            Casa activa
types/
  database.types.ts        Tipos de la DB (regenerables)
supabase/
  migrations/              Esquema versionado (tablas, seguridad, RPC, storage, realtime)
```

## Estado actual

✅ Scaffolding, auth completa (login/registro/recuperación), layouts con guards de sesión, esquema versionado en migraciones con RLS.

⏳ Próximos pasos:
- Pantallas de perfil y creación/invitación de hogares
- Módulo de tareas (vista semanal, estancias)
- Lista de compra en tiempo real (Realtime)
- Chat por tarea con fotos
- Hucha / split de gastos
- Mascotas
- Push notifications (expo-notifications + FCM/APNs)
- i18n (es / en)

## Notas de desarrollo

- TypeScript estricto — no usar `any`.
- Cada módulo tendrá su hook propio en `hooks/`.
- RLS: todas las queries se restringen por pertenencia a la casa vía `is_house_member()`.
- Realtime activado en `shopping_items`, `chat_messages` y `tasks`.
