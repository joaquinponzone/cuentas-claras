# Cuentas Claras

Sistema de gestión de finanzas personales y grupales. Registrá gastos e ingresos, organizalos por categorías, importá desde CSV/Excel y compartí gastos con grupos.

## Features

- **Dashboard** — KPIs del mes: total gastos/ingresos, balance, variación vs mes anterior, top categorías y próximos vencimientos
- **Gastos e Ingresos** — CRUD completo con filtros por mes y paginación
- **Categorías** — 17 categorías por defecto + categorías personalizadas
- **Gastos recurrentes** — Seguimiento de suscripciones y pagos fijos con estados activo/pausado
- **Importación CSV/Excel** — Wizard de 3 pasos con detección de duplicados y mapeo de columnas en español/inglés
- **Grupos** — Gastos compartidos con invitación por código, resumen por miembro y control de roles

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Bun |
| Monorepo | Turborepo |
| API | Hono + Drizzle ORM |
| Web | Vite + React 19 + TanStack Query v5 |
| UI | Shadcn/ui + Tailwind CSS v4 |
| Auth | JWT en HttpOnly cookie |
| DB | PostgreSQL (Neon en producción) |
| Validación | Zod |
| Tests | bun test |

## Estructura

```
apps/api/          # Backend Hono — puerto 4000
apps/web/          # SPA React — puerto 3000
packages/shared/   # Tipos, schemas y constantes compartidas
```

## Setup local

**Requisitos:** Bun, Docker

```bash
# Instalar dependencias
bun install

# Iniciar base de datos
docker compose up postgres -d

# Variables de entorno
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env con los valores locales

cp apps/web/.env.example apps/web/.env
# VITE_API_URL=http://localhost:4000

# Sincronizar schema y seedear categorías
cd apps/api && bun run db:migrate && bun run db:seed

# Levantar todo
bun run dev
```

## Variables de entorno

### `apps/api/.env`

```env
DATABASE_URL=postgresql://cuentas_user:cuentas_password@localhost:5432/cuentas_claras
JWT_SECRET=your-secret-key
PORT=4000
NODE_ENV=development
CORS_ORIGINS=                # En producción: URL del frontend
```

### `apps/web/.env`

```env
VITE_API_URL=http://localhost:4000
```

## Comandos

```bash
bun run dev                              # Levanta API + Web
bun run build                            # Build de producción

cd apps/api && bun test --env-file .env  # Tests (requiere DB local)
cd apps/api && bun run db:migrate        # Sync schema → DB
cd apps/api && bun run db:seed           # Seedear categorías por defecto
cd apps/api && bun run db:studio         # Drizzle Studio (explorador de DB)
```

## Deploy

El proyecto está configurado para deployar en Vercel como dos proyectos separados:

- **API** — Root directory: `apps/api`, Preset: Hono
- **Web** — Root directory: `apps/web`, Preset: Vite

Variables de entorno requeridas en Vercel:

| Proyecto | Variable | Descripción |
|---|---|---|
| API | `DATABASE_URL` | Connection string de Neon con `sslmode=require` |
| API | `JWT_SECRET` | Secret para firmar tokens JWT |
| API | `CORS_ORIGINS` | URL del frontend (ej: `https://tu-web.vercel.app`) |
| Web | `VITE_API_URL` | URL de la API (ej: `https://tu-api.vercel.app`) |
