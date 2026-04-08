# Chukipu — Documentación completa del proyecto

> Documento de referencia para entender el proyecto, su arquitectura, rutas, funcionalidades y decisiones de diseño.

---

## 1. ¿Qué es Chukipu?

**Chukipu** es una app de planificación social para grupos privados. Permite crear **espacios compartidos** ("Chukipus") donde un grupo de personas puede añadir, organizar y vivir planes juntos — desde una noche de cine hasta un viaje al extranjero.

El nombre hace referencia a algo cercano, íntimo, un espacio tuyo. La idea central es que los mejores planes se hacen **antes** de vivirlos, y Chukipu es el lugar donde eso ocurre.

### Qué puede hacer un usuario

- Crear un **Chukipu** (grupo privado o compartido) e invitar a amigos mediante código
- Añadir **planes** al grupo: películas, viajes, fiestas, escapadas, deportes, etc.
- Ver el **feed principal** con su próximo plan del día y planes de todos sus grupos
- Explorar **planes públicos recomendados** de otros usuarios que sigue
- **Dar like** y **fijar** planes en su perfil
- Subir **fotos y vídeos** a los planes, comentar, marcar como completado
- Seguir a otros usuarios (con soporte de perfiles privados y solicitudes de seguimiento)
- Recibir **notificaciones** en tiempo real dentro y fuera de la app (web push via FCM)
- Enviar **feedback** (sugerencias y errores) desde la app
- Instalar la app como **PWA** en iOS/Android
- Iniciar sesión con email/contraseña, Google o Apple
- Recuperar contraseña por email

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.1.6 (App Router) |
| UI | React 19 + TypeScript |
| Estilos | CSS Modules + CSS custom properties |
| Animaciones | Framer Motion 12 |
| Backend | Firebase Realtime Database |
| Autenticación | Firebase Auth (email + Google + Apple) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Almacenamiento | Firebase Cloud Storage |
| Iconos | Lucide React + SVGs inline |
| Testing | Vitest + React Testing Library |
| Package manager | pnpm 10 |
| Deploy | Firebase App Hosting |

---

## 3. Estructura de carpetas

```
chukipu/
├── public/                        # Archivos estáticos
│   ├── manifest.json              # Configuración PWA
│   ├── sw.js                      # Service Worker (offline + caché)
│   ├── firebase-messaging-sw.js   # Service Worker de FCM (push en background)
│   └── logos/                     # Logos en diferentes variantes
│
├── src/
│   ├── app/                       # Páginas (Next.js App Router)
│   │   ├── layout.tsx             # Layout raíz — monta los providers
│   │   ├── page.tsx               # Raíz "/" → redirige a /landing
│   │   ├── globals.css            # Estilos globales y design tokens
│   │   ├── landing/               # Página de marketing
│   │   └── application/           # Todas las rutas protegidas
│   │
│   ├── components/                # Componentes reutilizables
│   │   ├── BottomNav/             # Barra de navegación inferior
│   │   └── ThemeToggle/           # Selector de tema claro/oscuro
│   │
│   ├── contexts/                  # Estado global (React Context)
│   │   ├── AuthContext.tsx        # Sesión de usuario y perfil
│   │   └── ThemeContext.tsx       # Tema claro/oscuro
│   │
│   │   └── api/push/route.ts      # API route: envía push via FCM v1
│   │
│   ├── lib/                       # Lógica compartida
│   │   ├── firebase.ts            # Inicialización de Firebase
│   │   ├── firebaseMethods.ts     # CRUD sobre la base de datos
│   │   ├── auth.ts                # Funciones de autenticación (email, Google, Apple)
│   │   ├── notifications.ts       # Notificaciones in-app + dispara push
│   │   ├── fcm.ts                 # Registro del token FCM del dispositivo
│   │   ├── convertToWebP.ts       # Optimización de imágenes
│   │   └── __tests__/             # Tests unitarios de lib
│   │
│   ├── types/
│   │   └── firestore.ts           # Todos los tipos TypeScript del dominio
│   │
│   ├── errors/
│   │   └── AppError.ts            # Clase de error personalizada
│   │
│   └── data/
│       └── mockData.ts            # Datos de prueba
│
├── .env                           # Variables de entorno (Firebase config)
├── firebase.json                  # Configuración Firebase Hosting
├── apphosting.yaml                # Configuración Firebase App Hosting
├── next.config.ts                 # Configuración Next.js
├── vitest.config.ts               # Configuración de tests
└── PROJECT_CONTEXT.md             # Este archivo
```

---

## 4. Mapa completo de rutas

### Rutas públicas (sin autenticación)

| Ruta | Descripción |
|------|-------------|
| `/` | Redirige a `/landing` |
| `/landing` | Página de marketing con animaciones y CTA de instalación |
| `/application/login` | Pantalla de login / registro / Google OAuth |

### Rutas protegidas (requieren sesión activa)

#### Dashboard y descubrimiento

| Ruta | Descripción |
|------|-------------|
| `/application` | **Home** — Feed del usuario: próximo plan + planes de todos sus grupos |
| `/application/explore` | **Explorar** — Planes públicos filtrados por categoría |
| `/application/notifications` | Lista de notificaciones del usuario |
| `/application/feedback` | Foro de sugerencias y errores |
| `/application/action` | Página de acciones rápidas |

#### Chukipus

| Ruta | Descripción |
|------|-------------|
| `/application/chukipus` | Lista de todos los Chukipus del usuario |
| `/application/chukipus/new` | Selector de tipo: Compartido o Solo para ti |
| `/application/chukipus/new/create` | Formulario de creación del Chukipu |
| `/application/chukipus/join` | Unirse a un Chukipu con código de invitación |
| `/application/chukipus/[id]` | **Detalle del Chukipu** — lista de planes, miembros, acciones |
| `/application/chukipus/[id]/edit` | Editar nombre, imagen y ajustes del Chukipu |
| `/application/chukipus/[id]/invite` | Compartir enlace o código de invitación |
| `/application/chukipus/[id]/plans/new` | Crear un nuevo plan en el Chukipu |
| `/application/chukipus/[id]/plans/[planId]` | **Detalle del plan** — info, fotos, comentarios, likes |
| `/application/chukipus/[id]/plans/[planId]/edit` | Editar plan existente |

#### Perfil propio

| Ruta | Descripción |
|------|-------------|
| `/application/profile` | Perfil del usuario — stats, planes fijados, bio |
| `/application/profile/edit` | Editar nombre, bio, avatar, username |
| `/application/profile/followers` | Lista de seguidores |
| `/application/profile/following` | Lista de seguidos |
| `/application/profile/privacy` | Cambiar visibilidad del perfil (público/privado) |
| `/application/profile/notifications` | Preferencias de notificaciones |
| `/application/profile/settings` | Ajustes de cuenta (contraseña, etc.) |
| `/application/profile/language` | Selección de idioma |
| `/application/profile/help` | Ayuda y preguntas frecuentes |

#### Perfiles de otros usuarios

| Ruta | Descripción |
|------|-------------|
| `/application/user/[id]` | Perfil público/privado de otro usuario |
| `/application/user/[id]/followers` | Seguidores de ese usuario |
| `/application/user/[id]/following` | Seguidos de ese usuario |

#### Compartir

| Ruta | Descripción |
|------|-------------|
| `/application/post/[chukipuId]/[planId]` | Vista de compartición de un plan |

---

## 5. Modelos de datos

La base de datos es **Firebase Realtime Database** (no Firestore). La estructura es un JSON anidado.

### `UserProfile`
```
users/{uid}/
  displayName     string
  username        string          (único, sin @)
  bio             string
  avatar          string          (URL de imagen)
  isPrivate       boolean?
  followers       string[]        (array de UIDs)
  following       string[]        (array de UIDs)
  followRequests  string[]?       (UIDs pendientes de aceptar)
  followersCount  number
  followingCount  number
  savedChukipus   string[]
  chukipusCount   number
  plansCreated    number
  plansCompleted  number
  createdAt       number          (timestamp ms)
  updatedAt       number

  notifications/{notificationId}/
    title         string
    body          string
    read          boolean
    type          'follow' | 'follow_request' | 'invite' | 'join' | 'plan' | 'system'
    relatedId     string?
    createdAt     number

  fcmTokens/{tokenSlice}/
    (string)      token FCM del dispositivo — se usa para push en background
```

### `Chukipu` (grupo compartido)
```
chukipus/{chukipuId}/
  name            string
  image           string          (URL)
  createdBy       string          (UID del creador)
  members         string[] | { uid: boolean }
  inviteCode      string?         (código de 6 caracteres)
  isPrivate       boolean?        (solo para mí)
  membersCount    number
  planCount       number
  ratingAverage   number
  ratingCount     number
  createdAt       number
  updatedAt       number
```

### `Plan` (actividad dentro de un Chukipu)
```
plans/{planId}/
  chukipuId       string
  title           string
  description     string
  image           string          (URL)
  category        string          (ver categorías más abajo)
  genre           string          (para Cartelera)
  duration        string          (para Cartelera)
  location        string
  date            string          (ISO: "2025-06-15T20:00")
  dateEnd         string?
  details         Record<string, string>?
  completed       boolean
  createdBy       string          (UID)
  pinnedBy        { uid: boolean }?   (fijar en perfil por usuario)
  likes           string[]?       (array de UIDs)
  likesCount      number
  createdAt       number
  updatedAt       number
```

### `PlanMedia` (fotos/vídeos de un plan)
```
planMedia/{mediaId}/
  planId          string
  url             string
  type            'photo' | 'video'
  uploadedBy      string          (UID)
  uploaderName    string
  uploaderAvatar  string
  createdAt       number
```

### `PlanComment`
```
planComments/{commentId}/
  planId          string
  userId          string
  userName        string
  userAvatar      string
  text            string
  createdAt       number
```

### `FeedbackEntry`
```
feedback/{feedbackId}/
  text            string
  authorId        string          (UID)
  authorName      string
  authorAvatar    string
  type            'sugerencia' | 'bug' | 'feedback'
  createdAt       number
```

---

## 6. Categorías de planes

Cada plan pertenece a una categoría con su icono y color asociado:

| Categoría | Color | Descripción |
|-----------|-------|-------------|
| Cartelera | `#e8749a` | Películas y series — hasta 2 géneros seleccionables |
| Viaje | `#5b86e5` | Viajes y destinos |
| Fiesta | `#e8749a` | Celebraciones y fiestas |
| Escapada | `#52c788` | Escapadas de fin de semana |
| Deporte | `#5b86e5` | Actividades deportivas |
| Salida | `#a78bfa` | Salir a cenar, tomar algo |
| Actividad | `#f5a623` | Actividades en general |
| En casa | `#5b86e5` | Planes en casa |
| Cultura | `#f5a623` | Museos, teatro, exposiciones |
| Otro | `#94a3b8` | Plan genérico sin categoría específica |

Cada categoría tiene un formulario de creación adaptado con campos relevantes (p.ej. Cartelera pide género y duración; Viaje pide destino y fechas; Otro tiene campos básicos).

---

## 7. Sistema de estilos

### Diseño

- **Mobile-first**: la app está diseñada para un frame de **430px** de ancho (iPhone estándar)
- En escritorio, el frame de 430px se centra con un fondo lateral diferente
- Soporte de **safe area** (notch) mediante `env(safe-area-inset-*)`
- La barra de navegación inferior mide `--nav-height: 80px` y tiene padding de safe area

### Temas

La app tiene dos temas gestionados por `ThemeContext`:

- **Light** (`data-theme="light"`): tono marrón/café cálido
- **Dark** (`data-theme="dark"`): tono rosa/vino oscuro

El tema se guarda en `localStorage` bajo la clave `chukipu-theme`. **El tema por defecto para nuevos usuarios es Dark**; si ya tienen un valor guardado se respeta.

### CSS custom properties (design tokens)

Definidos en `src/app/globals.css` y disponibles en toda la app:

```css
/* Colores de marca */
--brand-primary          /* color principal (marrón en light, rosa en dark) */
--brand-secondary
--brand-accent
--brand-gradient         /* gradiente del header y botones primarios */
--brand-soft             /* gradiente suave para fondos */

/* Fondos */
--bg-primary             /* fondo base de la app */
--bg-secondary
--bg-tertiary
--surface                /* fondo de cards y modales */
--surface-hover
--surface-strong
--surface-overlay

/* Texto */
--text-primary
--text-secondary
--text-tertiary
--text-on-brand          /* texto sobre fondo de marca */

/* Glassmorphism */
--glass-bg
--glass-border
--glass-shadow
--glass-blur

/* Navegación */
--nav-bg
--nav-height: 80px
--nav-bottom-safe

/* Cards */
--card-bg
--card-border
--card-shadow
--card-shadow-hover

/* Espaciado */
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px
--space-2xl: 48px

/* Radios */
--radius-sm: 10px
--radius-md: 16px
--radius-lg: 24px
--radius-xl: 32px
--radius-full: 999px

/* Transiciones */
--transition-fast: 0.15s cubic-bezier(...)
--transition-med:  0.25s cubic-bezier(...)
--transition-slow: 0.40s cubic-bezier(...)
--transition-spring: 0.35s cubic-bezier(...)

/* Acciones destructivas */
--color-danger           /* marrón en light (#8c4a3e), rosa en dark (#d4788a) */
--color-danger-rgb       /* versión RGB para rgba() */
```

> Usar siempre `var(--color-danger)` y `rgba(var(--color-danger-rgb), opacity)` para botones destructivos (eliminar, cerrar sesión, quitar, dejar de seguir). Nunca hardcodear rojo.

### Clases globales útiles

```css
.glass              /* efecto glassmorphism */
.app-shell          /* contenedor principal de la app */
.page               /* página scrolleable con padding para la nav */
.page-no-nav        /* página sin padding de nav */
.btn                /* botón base */
.btn-primary        /* botón con gradiente de marca */
.btn-glass          /* botón glass */
.btn-ghost          /* botón transparente */
.hide-scrollbar     /* oculta el scrollbar visible */
.skeleton           /* animación de carga tipo skeleton */
.text-xs/sm/base/lg/xl/2xl/3xl  /* tamaños de fuente */
.font-light/normal/medium/semi/bold/black  /* pesos de fuente */
.animate-fade-in    /* fade + slide up */
.animate-slide-up   /* slide desde abajo */
.animate-scale-in   /* escala desde 0 */
```

---

## 8. Contexts y estado global

### `AuthContext`

Gestiona la sesión del usuario. Lo consumes con `useAuth()`.

```typescript
const { user, profile, loading, refreshProfile } = useAuth();
```

- `user`: el objeto Firebase Auth (`null` si no autenticado)
- `profile`: el `UserProfile` cargado desde la base de datos
- `loading`: `true` mientras Firebase comprueba la sesión
- `refreshProfile()`: recarga el perfil desde la base de datos

**Protección de rutas**: el context redirige automáticamente a `/application/login` si el usuario no está autenticado y está en una ruta protegida. Las rutas públicas (`/landing`, `/`, `/application/login`) no requieren sesión.

### `ThemeContext`

```typescript
const { theme, toggleTheme } = useTheme();
// theme: 'light' | 'dark'
```

Se aplica automáticamente como `data-theme` en `<html>`.

---

## 9. Librería de Firebase (`src/lib/firebaseMethods.ts`)

Abstracción sobre el SDK de Firebase Realtime Database. Todas las operaciones añaden `createdAt`/`updatedAt` automáticamente.

```typescript
// Crear un nodo con ID auto-generado
firebaseCreate<T>(collection, data) → Promise<T & { id: string }>

// Sobrescribir en una ruta exacta
firebaseSet<T>(path, data) → Promise<T>

// Leer un nodo único
firebaseGet<T>(path) → Promise<(T & { id: string }) | null>

// Leer todos los nodos de una colección
firebaseGetList<T>(
  collection,
  filter?,        // función de filtro aplicada en cliente
  sortBy?,        // campo por el que ordenar
  sortOrder?      // 'asc' | 'desc'
) → Promise<(T & { id: string })[]>

// Actualización parcial (merge)
firebaseUpdate(path, data) → Promise<void>

// Actualización atómica multi-ruta
firebaseBatchUpdate(updates: Record<string, unknown>) → Promise<void>

// Eliminar
firebaseRemove(path) → Promise<void>

// Comprobar existencia
firebaseExists(path) → Promise<boolean>

// Subir archivo (convierte a WebP antes de subir)
uploadFile(file, folder?, fileName?) → Promise<string>   // devuelve URL

// Eliminar archivo de Storage
deleteFile(url) → Promise<void>
```

**Nota importante**: `firebaseGetList` lee **todos** los nodos y aplica el filtro en cliente. No usa índices de servidor. Para colecciones grandes esto puede ser lento, pero es suficiente para el volumen actual.

---

## 10. Lógica de privacidad

Esta es una de las partes más delicadas del sistema:

### Perfiles privados
- Un usuario con `isPrivate: true` requiere que otro usuario le siga para ver su contenido
- Si A sigue a B (privado), A puede ver los planes de los Chukipus donde B es creador
- Si A NO sigue a B (privado), los planes de B NO aparecen en explorar ni en recomendados

### Chukipus privados ("Solo para ti")
- Un Chukipu con `isPrivate: true` solo es visible para su creador
- No aparece en explorar ni en recomendados para nadie más
- El botón de invitar está oculto

### Planes de grupos propios
- Los planes de Chukipus donde el usuario es **miembro** (como creador o invitado) aparecen en su **feed principal**
- Estos planes **NO aparecen en la sección de recomendados** (ya los tiene en su feed)

### Implementación en `page.tsx` (Home)
```typescript
// Usuarios privados que el usuario actual NO sigue
const privateUserIds = new Set(
  allUsers.filter(u => u.isPrivate && !followingSet.has(u.id)).map(u => u.id)
);

// Chukipus del usuario (para excluir de recomendados)
const myChukipuIds = new Set(
  allChukipus.filter(c => c.members?.includes(user.uid)).map(c => c.id)
);

// Chukipus públicos accesibles
const publicChukipusMap = new Map(
  allChukipus
    .filter(c => !privateUserIds.has(c.createdBy) && !c.isPrivate)
    .map(c => [c.id, c.name])
);

// Planes recomendados: públicos Y no pertenecientes al usuario
const recommended = await firebaseGetList<Plan>(
  'plans',
  p => publicChukipusMap.has(p.chukipuId) && !myChukipuIds.has(p.chukipuId)
);
```

---

## 11. Funcionalidades destacadas

### Feed principal (Home)
- Muestra el **próximo plan** del usuario (el más cercano en fecha, o aleatorio si no hay fechas)
- Sección de **planes recomendados** agrupados por categoría
- Botón de feedback en el header
- Botón de notificaciones con badge de no leídas (tiempo real via `onValue`)
- Header que se oculta al hacer scroll hacia abajo y reaparece al subir

### Explorar
- Carrusel horizontal por categorías
- Vista de cuadrícula 2 columnas al filtrar por categoría específica
- Filtros por categoría en chips horizontales
- Excluye planes de grupos propios
- Respeta la lógica de privacidad

### Detalle de Chukipu (`/application/chukipus/[id]`)
- Lista de planes del grupo
- **Likes**: optimistic update (el like se muestra inmediatamente antes de que Firebase responda)
- **Pin**: fijar un plan en el perfil mediante `pinnedBy[uid]: true` (por usuario, no global)
- Los planes privados de Chukipus privados solo los ve el creador
- Botón de invitar oculto en Chukipus privados

### Feedback
- Foro de sugerencias y errores
- Modal de bienvenida en la primera visita (guardado en localStorage: `chukipu_feedback_intro_seen`)
- Tipos: Sugerencia / Error
- Textarea auto-expandible al escribir
- Si se pulsa atrás con texto escrito, aparece modal de descarte
- Manejo de errores de permisos Firebase (muestra lista vacía en vez de cargando infinito)

### Autenticación
- Email + contraseña, Google OAuth, Apple Sign-In (`OAuthProvider('apple.com')`)
- Recuperar contraseña via `sendPasswordResetEmail`
- Apple Sign-In requiere configuración en Apple Developer + Firebase Console

### Notificaciones en tiempo real
- Usa `onValue` de Firebase Realtime Database
- Badge en el botón de notificaciones del header
- Al entrar a la pantalla de notificaciones, se marcan como leídas

### Push notifications (background)
- Al hacer login, `registerPushToken(uid)` pide permiso y guarda el token FCM en `users/{uid}/fcmTokens/`
- `sendNotification()` escribe en RTDB Y llama a `POST /api/push` (fire-and-forget)
- `/api/push` usa el service account para obtener un token OAuth2 y llama a la FCM v1 API
- `public/firebase-messaging-sw.js` recibe el push cuando la app está cerrada y muestra la notificación del sistema
- Compatible con iOS 16.4+ si la PWA está instalada en la pantalla de inicio

### Perfil de usuario
- Planes fijados (`pinnedBy[uid]: true`)
- Stats: seguidores, seguidos, planes creados
- Botón de editar con el mismo ancho que la fila de estadísticas (usando `inline-flex` wrapper)
- Icono de perfil en la BottomNav: cabeza rellena con color de marca cuando está activo

### Formularios de planes (crear y editar)
- **Solo el título es obligatorio** en todas las categorías; el resto de campos son opcionales
- Todos los campos opcionales muestran `(opcional)` en su label
- Al editar, se puede cambiar la categoría: se conserva el título y se resetean los campos específicos de categoría
- Los campos extra se guardan en `plan.details` como `Record<string, string>`

### Imágenes de usuario
- Avatar de perfil: siempre se sube como `avatars/{uid}.webp` → sobrescribe el anterior en Storage (sin archivos huérfanos)
- Portada de Chukipu: siempre se sube como `chukipus/{id}.webp` → misma lógica
- Ambos se convierten a WebP antes de subir via `convertToWebP()`

### Likes
- Cualquier usuario autenticado puede dar like, no solo miembros del Chukipu

### PWA
- Instalable en iOS y Android
- `sw.js`: Service Worker de caché (assets estáticos)
- `firebase-messaging-sw.js`: Service Worker de FCM para push en background
- `manifest.json` con iconos y configuración de pantalla completa
- La app se detecta como standalone: `window.matchMedia('(display-mode: standalone)')`

---

## 12. Testing

Se usan **Vitest** + **React Testing Library**. Los tests están colocados junto a cada página (`page.test.tsx`).

### Archivos de test

| Test | Cobertura |
|------|-----------|
| `application/page.test.tsx` | Home feed, recomendados, privacidad, likes badge |
| `application/feedback/page.test.tsx` | Foro de feedback completo |
| `application/chukipus/new/page.test.tsx` | Selector de tipo de Chukipu |
| `application/chukipus/[id]/page.test.tsx` | Detalle, likes, pins, privacidad |
| `application/user/[id]/page.test.tsx` | Perfil de otros usuarios |
| `application/user/[id]/followers/page.test.tsx` | Lista de seguidores |
| `application/user/[id]/following/page.test.tsx` | Lista de seguidos |
| `application/chukipus/[id]/plans/[planId]/page.test.tsx` | Detalle de plan |
| `lib/__tests__/convertToWebP.test.ts` | Conversión de imágenes |
| `lib/__tests__/uploadFile.test.ts` | Subida de archivos |

### Mocks estándar en los tests

```typescript
// next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

// Contexts
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));

// Firebase
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  onValue: vi.fn((_ref, cb) => { cb({ val: () => null }); return vi.fn(); }),
}));

// firebaseMethods
vi.mock('@/lib/firebaseMethods', () => ({
  firebaseGet: vi.fn(),
  firebaseGetList: vi.fn(),
  firebaseUpdate: vi.fn(),
  firebaseBatchUpdate: vi.fn(),
}));
```

### Patrón de mock filter-aware

Para tests de filtrado (recomendados, privacidad), el mock de `firebaseGetList` aplica el filtro recibido:

```typescript
vi.mocked(firebaseGetList).mockImplementation(
  async (collection: string, filter?: (item: unknown) => boolean) => {
    let results: unknown[] = [];
    if (collection === 'chukipus') results = chukipusData;
    if (collection === 'plans') results = plansData;
    if (collection === 'users') results = usersData;
    return filter ? results.filter(filter) : results;
  }
);
```

### Comandos

```bash
pnpm test            # Ejecutar todos los tests
pnpm test:watch      # Modo watch
pnpm test:coverage   # Con informe de cobertura
```

**Regla**: siempre pasar `pnpm test` antes de hacer commit.

---

## 13. Variables de entorno

El archivo `.env` (ignorado en git) contiene la configuración de Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FCM_VAPID_KEY=       # Firebase Console → Configuración → Cloud Messaging → Certificados push web
FIREBASE_SERVICE_ACCOUNT=        # JSON en una línea — Firebase Console → Configuración → Cuentas de servicio → Generar clave privada
```

Las variables `NEXT_PUBLIC_` se usan en el cliente. `FIREBASE_SERVICE_ACCOUNT` es solo server-side (API route `/api/push`) y **nunca** debe exponerse al cliente ni subirse a git.

---

## 14. Configuración de Next.js

`next.config.ts` permite imágenes remotas de estos dominios:

- `images.unsplash.com` — imágenes de placeholder/mockup
- `firebasestorage.googleapis.com` — imágenes subidas por usuarios
- `api.dicebear.com` — avatares generados automáticamente
- `lh3.googleusercontent.com` — fotos de perfil de Google

---

## 15. Reglas de Firebase Realtime Database

Las reglas de seguridad se definen en el panel de Firebase. En resumen:

- **Feedback**: cualquier usuario autenticado puede leer y crear; solo el autor puede modificar/eliminar
- **Chukipus**: solo los miembros pueden leer; solo el creador puede modificar
- **Plans**: solo los miembros del Chukipu pueden leer y crear; el creador del plan puede editar
- **Users**: cualquier usuario autenticado puede leer perfiles públicos; solo el propio usuario puede escribir en su nodo
- **Notifications**: solo el propio usuario puede leer y modificar sus notificaciones

---

## 16. Scripts disponibles

```bash
pnpm dev             # Servidor de desarrollo en localhost:3000
pnpm build           # Build de producción
pnpm start           # Servidor de producción
pnpm lint            # ESLint
pnpm test            # Vitest (una vez)
pnpm test:watch      # Vitest en modo watch
pnpm test:coverage   # Vitest con coverage
```

---

## 17. Decisiones de diseño importantes

### Por qué Realtime Database y no Firestore
Se eligió Realtime Database por su simplicidad de setup y su soporte nativo de listeners en tiempo real (`onValue`). El volumen de datos actual no justifica las ventajas de Firestore.

### Por qué los filtros de `firebaseGetList` son en cliente
Firebase Realtime Database no tiene capacidades de query avanzadas. Todos los filtros se aplican después de leer los datos. Para el volumen actual de la app es aceptable.

### Por qué `pinnedBy` es un mapa `{ uid: boolean }` y no un array
Permite que cada usuario fije/desfije su propio plan de forma independiente sin afectar a otros miembros. Se actualiza con `firebaseBatchUpdate` en una operación atómica.

### Por qué `likes` es un array y `pinnedBy` un objeto
`likes` se lee frecuentemente para mostrar conteo total; un array es más simple de contar. `pinnedBy` necesita lookups por UID individual, por lo que un mapa es más eficiente.

### Optimistic updates en likes
Al dar like, el estado local se actualiza inmediatamente antes de que Firebase responda. Si Firebase falla, el estado local se revierte. Esto hace la UI más fluida.

### Auto-expanding textarea
El textarea de feedback usa `el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'` en el evento `onChange` para crecer dinámicamente con el contenido.

### Modal de descarte en formularios
Cuando hay texto no enviado y se pulsa "volver", aparece un modal de confirmación (`¿Descartar?`) en lugar de navegar directamente. Esto evita pérdida accidental de datos.

---

### Por qué no se usa firebase-admin
npm tiene un bug con Node.js 24 que impide instalar paquetes con dependencias complejas (`@google-cloud/firestore`). La API route `/api/push` usa `crypto` (built-in de Node.js) para firmar un JWT con el service account y obtener un token OAuth2, luego llama directamente a la FCM v1 REST API y la RTDB REST API. No requiere paquetes adicionales.

### Por qué router.back() en lugar de router.push() en botones de volver
Usar `router.push(rutaAnterior)` añade una nueva entrada al historial de navegación, creando un bucle infinito entre pantallas. `router.back()` navega al ítem anterior del historial real, evitando este problema.

### Por qué los carruseles usan scroll-padding-left + spacer en lugar de padding-left
`padding-left` en un contenedor `overflow-x: scroll` no genera espacio visible al final del scroll. El patrón correcto es `scroll-padding-left` en el contenedor + un elemento `.scrollSpacer` vacío como primer y último hijo, con `flex: 0 0 calc(var(--space-md) - gap)`.

---

*Última actualización: 2026-04-08*
