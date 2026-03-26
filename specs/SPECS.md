# Cuentas Claras — Especificación del Producto

> Sistema de gestión de finanzas personales, familiares y de equipos.

---

## 1. Visión General

Aplicación web que permite a usuarios individuales, familias y equipos registrar, categorizar y analizar sus gastos e ingresos. Diferenciador clave: soporte nativo para **cuentas compartidas** (grupos/equipos), **importación inteligente con IA** y **notificaciones vía Telegram**.

---

## 2. Arquitectura

Monorepo con **Turborepo** y dos aplicaciones independientes + paquete compartido.

```
cuentas-claras/
├── turbo.json
├── package.json                 # Workspaces: apps/*, packages/*
├── docker-compose.yml           # PostgreSQL + API + Web (dev)
├── apps/
│   ├── api/                     # Backend REST API
│   └── web/                     # Frontend SPA
└── packages/
    └── shared/                  # Tipos, schemas Zod, constantes
```

### 2.1 API (`apps/api`)

Backend REST dedicado. Dueño de toda la lógica de negocio, autenticación y acceso a datos.

| Aspecto | Tecnología |
|---|---|
| Runtime | Bun |
| Framework HTTP | Hono |
| ORM | Drizzle ORM |
| Base de datos | PostgreSQL |
| Validación | Zod |
| Auth | JWT en cookie HttpOnly (`jose`) |
| IA | Vercel AI SDK |
| Logs | Winston / Pino |
| Testing | Bun test |

Estructura interna:

```
apps/api/src/
├── routes/              # Rutas por dominio (auth, expenses, incomes, groups, import)
├── services/            # Lógica de negocio pura
├── middleware/           # Auth, error handling, validation, CORS
├── db/
│   ├── schema.ts        # Schema Drizzle
│   ├── migrations/      # SQL migrations
│   ├── seed.ts
│   └── index.ts         # Conexión y cliente DB
├── integrations/        # Telegram Bot, AI SDK
├── utils/               # Helpers (jwt, password, etc.)
├── types/               # Tipos internos de la API
├── server.ts            # Setup de Hono + middlewares + routes
└── index.ts             # Entry point
```

### 2.2 Web (`apps/web`)

SPA que consume la API exclusivamente vía HTTP. Sin lógica de negocio ni acceso directo a DB.

| Aspecto | Tecnología |
|---|---|
| Build tool | Vite |
| Framework | React 19 |
| Routing | React Router v7 |
| Data fetching / Cache | TanStack Query |
| Estilos | Tailwind CSS |
| Componentes UI | Shadcn UI + Radix UI |
| Estado URL | nuqs |
| TypeScript | Estricto |

Estructura interna:

```
apps/web/src/
├── app/                 # Layouts y páginas (por ruta)
├── components/          # Componentes reutilizables
│   └── ui/              # Shadcn UI components
├── lib/
│   ├── api.ts           # Cliente HTTP base (fetch wrapper)
│   ├── api/             # Funciones por dominio (expenses-api.ts, incomes-api.ts, etc.)
│   └── hooks/           # Custom hooks
├── contexts/            # Auth context, theme context
├── types/               # Tipos locales del frontend
└── main.tsx             # Entry point
```

### 2.3 Shared (`packages/shared`)

Paquete interno del monorepo. Elimina duplicación de tipos y validaciones entre API y Web.

```
packages/shared/src/
├── types/               # Interfaces compartidas (User, Expense, Income, Group, Category)
├── schemas/             # Zod schemas (create-expense, create-income, etc.)
└── constants/           # Categorías predefinidas, roles, frecuencias
```

---

## 3. Stack Tecnológico (resumen)

| Capa | Tecnología |
|---|---|
| Frontend | Vite, React 19, React Router v7, TanStack Query, Tailwind CSS, Shadcn UI |
| Backend | Bun, Hono, TypeScript |
| Base de datos | PostgreSQL, Drizzle ORM |
| Validación | Zod (compartido vía `packages/shared`) |
| IA | Vercel AI SDK |
| Notificaciones | Telegram Bot API |
| Monorepo | Turborepo |
| Containerización | Docker + Docker Compose |
| Testing | Bun test (backend), Vitest (frontend, nice to have) |
| Metodología | Spec Driven Development |

---

## 4. Modelo de Dominio

### 4.1 Entidades Principales

- **User** — Usuario registrado. Campos: id, email, password (hash), name, currency, timezone, telegramChatId (nullable), createdAt, updatedAt.
- **Group** — Agrupación de usuarios (familia, equipo, pareja). Campos: id, name, description, inviteCode, createdAt.
- **UserGroup** — Tabla intermedia N:M entre User y Group. Campos: userId, groupId, role (`owner` | `member`), joinedAt.
- **Category** — Categoría de gasto/ingreso. Campos: id, name, type (`expense` | `income`), icon, isDefault, userId (null si es predefinida).
- **Expense** — Gasto. Campos: id, userId, groupId (nullable), categoryId, amount, date, description, createdAt.
- **Income** — Ingreso. Campos: id, userId, categoryId, amount, date, source, description, createdAt.
- **RecurringExpense** — Gasto recurrente. Campos: id, userId, categoryId, amount, description, frequency (`weekly` | `biweekly` | `monthly` | `annual`), nextDueDate, isActive, createdAt.

### 4.2 Relaciones

```
User 1──N Expense
User 1──N Income
User 1──N RecurringExpense
User 1──N Category (custom)
User N──M Group (vía UserGroup, con rol)

Group 1──N Expense (gastos compartidos)

Expense N──1 Category
Income  N──1 Category
RecurringExpense N──1 Category
```

### 4.3 Categorías Predefinidas

**Gastos:** Alquiler/Hipoteca, Servicios (luz, gas, agua, internet), Supermercado, Transporte, Salud, Educación, Entretenimiento, Restaurantes, Ropa, Seguros, Impuestos, Otros.

**Ingresos:** Salario, Freelance, Inversiones, Alquiler cobrado, Otros.

---

## 5. API — Endpoints

### 5.1 Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registro con email/password |
| POST | `/auth/login` | Login, setea cookie JWT |
| POST | `/auth/logout` | Limpia cookie |
| GET | `/auth/me` | Usuario actual (desde cookie) |

### 5.2 Expenses

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/expenses` | Listar gastos del usuario (query: month, categoryId, from, to, page, limit, sort) |
| GET | `/expenses/:id` | Detalle de un gasto |
| POST | `/expenses` | Crear gasto |
| PUT | `/expenses/:id` | Editar gasto |
| DELETE | `/expenses/:id` | Eliminar gasto |

### 5.3 Recurring Expenses

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/recurring-expenses` | Listar recurrentes activos |
| POST | `/recurring-expenses` | Crear recurrente |
| PUT | `/recurring-expenses/:id` | Editar recurrente |
| PATCH | `/recurring-expenses/:id/toggle` | Pausar/activar |
| DELETE | `/recurring-expenses/:id` | Eliminar |

### 5.4 Incomes

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/incomes` | Listar ingresos (mismos filtros que expenses) |
| POST | `/incomes` | Crear ingreso |
| PUT | `/incomes/:id` | Editar ingreso |
| DELETE | `/incomes/:id` | Eliminar ingreso |

### 5.5 Categories

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/categories` | Listar categorías (predefinidas + custom del usuario) |
| POST | `/categories` | Crear categoría custom |
| PUT | `/categories/:id` | Editar categoría custom |
| DELETE | `/categories/:id` | Eliminar categoría custom |

### 5.6 Groups

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/groups` | Listar grupos del usuario |
| POST | `/groups` | Crear grupo |
| GET | `/groups/:id` | Detalle del grupo + miembros |
| PUT | `/groups/:id` | Editar grupo (solo owner) |
| DELETE | `/groups/:id` | Eliminar grupo (solo owner) |
| POST | `/groups/:id/members` | Agregar miembro (por email o invite code) |
| DELETE | `/groups/:id/members/:userId` | Eliminar miembro (solo owner) |
| GET | `/groups/:id/expenses` | Listar gastos del grupo |
| POST | `/groups/:id/expenses` | Crear gasto en el grupo |

### 5.7 Import

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/import/parse` | Sube archivo CSV/XLSX, devuelve preview parseada con IA |
| POST | `/import/confirm` | Confirma e inserta los registros de la preview |

### 5.8 Dashboard

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard/summary` | Balance, totales, variación vs mes anterior |
| GET | `/dashboard/by-category` | Gastos agrupados por categoría |
| GET | `/dashboard/recurring-upcoming` | Próximos vencimientos de recurrentes |

### 5.9 Telegram

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/telegram/link` | Vincular cuenta de Telegram (genera código) |
| POST | `/telegram/webhook` | Webhook para recibir mensajes del bot |
| DELETE | `/telegram/link` | Desvincular Telegram |

---

## 6. Páginas del Frontend

| Ruta | Descripción | Auth |
|---|---|---|
| `/login` | Inicio de sesión | No |
| `/register` | Registro | No |
| `/` | Dashboard principal con KPIs y overview | Sí |
| `/expenses` | Listado de gastos personales con filtros | Sí |
| `/expenses/new` | Crear nuevo gasto | Sí |
| `/expenses/recurring` | Gestión de gastos recurrentes | Sí |
| `/incomes` | Listado de ingresos con filtros | Sí |
| `/incomes/new` | Crear nuevo ingreso | Sí |
| `/import` | Importación masiva con IA | Sí |
| `/groups` | Listado de grupos del usuario | Sí |
| `/groups/:id` | Dashboard y gastos de un grupo específico | Sí |
| `/profile` | Perfil, preferencias y config de Telegram | Sí |

---

## 7. Funcionalidades Detalladas

### 7.1 Autenticación

- Registro con email y password.
- Login que setea JWT en cookie HttpOnly (`Secure`, `SameSite=Strict`).
- El frontend valida sesión llamando a `GET /auth/me` al cargar la app.
- `AuthContext` en React expone `user`, `isAuthenticated`, `logout`.
- Rutas protegidas con componente `ProtectedRoute`.

### 7.2 Dashboard

Página de inicio con overview financiero del período seleccionado:

- **Balance general** — Ingresos vs. gastos.
- **Gastos del mes** — Total y variación porcentual vs. mes anterior.
- **Top 5 categorías** — Donde más se gasta.
- **Gastos fijos vs. variables** — Proporción.
- **Próximos recurrentes** — Vencimientos de los próximos 7 días.
- **Gasto promedio diario**.
- Filtro por período: mes, trimestre, año, rango custom.

### 7.3 Gastos Personales

- CRUD completo con formularios validados (Zod schemas compartidos).
- Listado paginado con filtros: mes, categoría, rango de fechas, rango de monto.
- Ordenamiento: fecha (desc por defecto), monto, categoría.
- Búsqueda por descripción.

### 7.4 Gastos Recurrentes

- Definir gastos fijos: monto, categoría, descripción, frecuencia (semanal, quincenal, mensual, anual).
- El backend calcula `nextDueDate` y genera el Expense automáticamente (vía cron o al consultar).
- Pausar/reactivar un recurrente sin eliminarlo.
- Vista dedicada con estado de cada recurrente.

### 7.5 Ingresos

- CRUD con los mismos patrones que gastos.
- Categorías de ingreso separadas de las de gasto.

### 7.6 Importación Masiva con IA

Flujo:
1. Usuario sube archivo CSV o Excel.
2. `POST /import/parse` envía el contenido al AI SDK (Vercel).
3. La IA interpreta columnas y mapea a: `{ amount, date, categoryName, description, type }`.
4. La API devuelve un array de registros parseados como preview.
5. El frontend muestra la preview en una tabla editable. El usuario corrige errores si los hay.
6. `POST /import/confirm` inserta los registros confirmados.

Características:
- No requiere template fijo: la IA resuelve mappings arbitrarios.
- Detección de duplicados por (amount + date + description).
- Soporte para mezcla de gastos e ingresos en un mismo archivo.

### 7.7 Grupos y Cuentas Compartidas

- Crear grupo con nombre y descripción.
- Invitar por email o compartir invite code / link.
- Roles: `owner` (CRUD grupo, gestión miembros) y `member` (registrar y ver gastos).
- Cada grupo tiene su listado de gastos y mini-dashboard.
- Los gastos de grupo viven en una sección separada de los personales.

### 7.8 Notificaciones (Telegram)

- Bot de Telegram que el usuario vincula desde `/profile`.
- Flujo de vinculación: la app genera un código, el usuario lo envía al bot, se asocia el `chatId`.
- Notificaciones configurables:
  - Recordatorio de recurrentes próximos a vencer (1 día antes).
  - Resumen semanal de gastos.
  - Alerta al superar umbral de gasto mensual (configurable por el usuario).

### 7.9 Perfil

- Editar nombre, email.
- Configurar moneda y zona horaria.
- Vincular/desvincular Telegram.
- Configurar preferencias de notificación.

---

## 8. Priorización (MoSCoW)

### Must Have (v1)
- Autenticación (registro/login/logout)
- CRUD de gastos personales con categorías
- CRUD de ingresos
- Categorías predefinidas + custom
- Dashboard con KPIs principales
- Listado paginado con filtros y ordenamiento
- Gastos recurrentes (CRUD + generación automática)
- Importación desde CSV/Excel con preview
- Monorepo Turborepo con shared package
- Deploy en Digital Ocean VPS (api + web) con NeonDB como DB en producción

### Should Have (v1.x)
- Grupos y gastos compartidos
- Importación inteligente con IA (mapping automático)
- Notificaciones por Telegram
- Página de perfil completa (moneda, timezone)
- Búsqueda por descripción

### Could Have (v2)
- Balance de deudas dentro de un grupo (quién debe a quién)
- Integraciones con APIs bancarias
- Reportes exportables (PDF)
- Modo oscuro / tema custom
- Gráficos de evolución temporal (line charts)

### Won't Have (por ahora)
- App móvil nativa
- Multi-moneda con conversión automática
- Presupuestos por categoría con alertas
- OAuth (Google, GitHub)

---

## 9. Estrategia de Testing

| Tipo | Alcance | Herramienta | Prioridad |
|---|---|---|---|
| Unit tests | Lógica de negocio: services, utils, validaciones | Bun test | Obligatorio |
| Integration tests | Endpoints de la API (request → response → DB) | Bun test + supertest | Obligatorio |
| Frontend tests | Componentes y hooks críticos | Vitest + Testing Library | Nice to have |
| E2E tests | Flujos completos: login, crear gasto, importar | Playwright | Nice to have |

---

## 11. Infraestructura & Deploy

- **VPS**: Digital Ocean — api y web containerizados con Docker Compose
- **DB en producción**: NeonDB (Postgres managed) — Drizzle conecta vía `DATABASE_URL` con SSL
- **Docker Compose**:
  - `docker-compose.yml` — api + web (producción en DO VPS, apunta a NeonDB via env var)
  - `docker-compose.db.yml` — solo postgres (dev local)
  - Dev local: `docker compose -f docker-compose.db.yml up -d` + `bun run dev` para api/web con hot reload
  - Prod: `docker compose up -d`

---

## 12. Integración con Talo Pay

> Investigación de oportunidades para integrar [Talo Pay](https://talo.com.ar/) — plataforma de pagos argentina regulada por el BCRA, especializada en transferencias bancarias automatizadas, pagos con cripto y Pix.

### 12.1 ¿Qué es Talo Pay?

Talo Pay es una plataforma de procesamiento de pagos para LATAM que permite aceptar transferencias bancarias automáticas, criptomonedas y Pix (Brasil). Opera bajo regulación del BCRA. Sus diferenciales:

- Comisiones bajas: 0.8–1% en transferencias vs. 3% débito / 6% crédito
- Acreditación instantánea de fondos
- Sin riesgo de chargebacks (transferencias no son reversibles)
- API REST + Webhooks + ambiente Sandbox para desarrollo
- Clientes no necesitan cuenta Talo para pagar

### 12.2 Oportunidades de Integración

#### A) Registro Automático de Ingresos via Webhooks (Alta Prioridad)

Cuando el usuario recibe un pago en su cuenta Talo, el webhook de Talo notifica en tiempo real. La API de Cuentas Claras puede escuchar ese webhook y crear automáticamente un registro de **Income**.

**Flujo:**
```
Talo Webhook → POST /integrations/talo/webhook
→ Validar firma / token secreto
→ Crear Income { amount, date, source: "Talo Pay", description: referencia }
→ (Opcional) Notificar al usuario por Telegram
```

**Valor:** Elimina carga manual para freelancers o negocios que cobran via transferencia.

#### B) Payment Links para Gastos Grupales (Alta Prioridad)

Cuando se registra un gasto compartido en un grupo, el owner puede generar un **Payment Link de Talo** para que los miembros paguen su parte.

**Flujo:**
```
Usuario crea gasto de grupo ($10.000, 3 miembros)
→ POST /groups/:id/expenses/:expenseId/payment-link
→ API llama Talo Payments API → genera link por $3.333 por miembro
→ Miembro paga via link
→ Webhook Talo confirma el pago
→ Cuentas Claras marca la deuda como saldada
```

**Valor:** Resuelve el problema de cobrar deudas dentro del grupo sin salir de la app.

#### C) Conciliación Bancaria Automática (Media Prioridad)

Conectar la cuenta Talo del usuario para importar automáticamente sus movimientos como gastos o ingresos, similar a la importación por CSV pero en tiempo real.

**Flujo:**
```
Usuario vincula cuenta Talo en /profile
→ Autorización OAuth / API Key guardada encriptada
→ Talo Webhook o polling periódico
→ Cada movimiento → preview para clasificar (gasto/ingreso, categoría)
→ Usuario confirma o se aplica con IA auto-clasificación
```

#### D) Pagos de Suscripciones / Recurrentes (Baja Prioridad)

Para usuarios que ofrecen servicios y cobran suscripciones, integrar los pagos recurrentes de Talo con los `RecurringExpense` / ingresos recurrentes de Cuentas Claras.

### 12.3 Arquitectura Propuesta

```
apps/api/src/
└── integrations/
    └── talo/
        ├── talo-client.ts       # Cliente HTTP para Talo API
        ├── talo-webhook.ts      # Handler del webhook (validación firma + dispatch)
        └── talo-service.ts      # Lógica: crear income, generar payment link, etc.

routes/
└── integrations.ts              # POST /integrations/talo/webhook
                                 # POST /groups/:id/expenses/:id/payment-link
```

**Tabla adicional en DB:**
```ts
// talo_connections
{
  id, userId, taloAccountId, apiKey (encrypted),
  webhookSecret (encrypted), isActive, createdAt
}
```

### 12.4 Nuevos Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/integrations/talo/connect` | Vincular cuenta Talo (API key) |
| DELETE | `/integrations/talo/connect` | Desvincular cuenta Talo |
| POST | `/integrations/talo/webhook` | Recibir eventos de Talo (público, validado por firma) |
| POST | `/groups/:id/expenses/:expenseId/payment-link` | Generar link de cobro para deuda grupal |
| GET | `/integrations/talo/status` | Estado de la conexión Talo del usuario |

### 12.5 Consideraciones de Seguridad

- El webhook endpoint es público pero debe validar la firma HMAC del header que envía Talo.
- Las API Keys de Talo deben almacenarse **encriptadas** en DB (AES-256 o similar), nunca en plain text.
- Usar variables de entorno para la clave de encriptación: `TALO_ENCRYPTION_KEY`.
- Sandbox de Talo disponible para desarrollo sin dinero real.

### 12.6 Priorización Sugerida

| Feature | Valor | Esfuerzo | Prioridad |
|---|---|---|---|
| Webhook → Auto-Income | Alto | Bajo | **Must Have v2** |
| Payment Links grupales | Alto | Medio | **Should Have v2** |
| Conciliación bancaria | Alto | Alto | **Could Have v2** |
| Recurrentes con Talo | Medio | Alto | **Won't Have por ahora** |

---

## 10. Principios de Desarrollo

- **Spec Driven Development**: toda feature se especifica antes de implementarse. Este documento es la fuente de verdad.
- **Mobile-first**: diseño responsivo desde el inicio con Tailwind.
- **Iterativo**: lanzar v1 con lo esencial e iterar con feedback real.
- **Type-safe**: TypeScript estricto en todo el stack. Schemas Zod compartidos para validación en API y frontend.
- **API-first**: el backend expone REST API completa. El frontend es un consumidor más; mañana puede haber un bot, una app mobile u otro cliente.
- **Separation of concerns**: lógica de negocio en services, no en handlers ni en componentes.
