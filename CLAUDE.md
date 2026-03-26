# Cuentas Claras — Agent Instructions

Sistema de gestión de finanzas personales/familiares. Turborepo monorepo con Bun workspaces.

## Stack

| Layer | Tech |
|---|---|
| Runtime | Bun |
| Monorepo | Turborepo |
| API | Hono + Drizzle ORM + postgres-js |
| Web | Vite + React 19 + TanStack Query v5 |
| Styles | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Auth | JWT en HttpOnly cookie (`jose`) |
| DB | PostgreSQL 16 (Docker) |
| Validation | Zod (v3 en shared, cuidado con zValidator) |
| Tests | `bun test` (API) |

## Monorepo Structure

```
apps/api/          # Hono backend — port 4000
apps/web/          # Vite + React SPA — port 3000
packages/shared/   # @cuentas-claras/shared — types, schemas, constants
refe/              # Proyectos de referencia (NO modificar)
```

## Key Commands

```bash
bun run dev                        # Levanta todo (API + Web)
cd apps/api && bun test --env-file .env   # Tests (flags DESPUÉS del subcomando)
cd apps/api && bun run db:push     # Sync schema → DB
cd apps/web && bun run build       # Build web
```

## Critical Gotchas

### Zod v3/v4 conflict
`zValidator` en Hono routes usa schemas **locales** — no importar desde `@cuentas-claras/shared`.

### Tailwind v4
- `postcss.config.js` usa `@tailwindcss/postcss` (no `tailwindcss`)
- `index.css` usa `@import "tailwindcss"` + `@theme {}` — NO hay `tailwind.config.ts`

### bun test flags
```bash
bun test --env-file .env   # CORRECTO
bun --env-file .env test   # ROMPE (loop infinito)
```

### zValidator error format
Usar hook personalizado que devuelva `{ error: string }` — no el ZodError object raw.

### SSL en DB
```ts
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
```

### FormData en rutas Hono
HTTPException devuelve text/plain. En rutas con `parseBody()` (sin zValidator), usar try-catch y `c.json({ error }, 400)`.

### BOM UTF-8 en archivos CSV
Stripear bytes `EF BB BF` del buffer antes de pasar a xlsx. Sin esto, el primer header se corrompe.

## Conventions

- **Naming**: kebab-case para archivos, camelCase para variables, PascalCase para componentes/types
- **Imports**: `@/` alias → `./src/` en ambas apps
- **Shared types**: definir en `packages/shared/src/types/`, exportar desde `index.ts`
- **No copiar** código de `refe/` — extraer patrones y adaptar
- **Worklog**: documentar decisiones técnicas en `worklog/YYYY-MM-DD/`
- **Tests**: cada feature nueva debe incluir tests. Patrón: `apps/api/tests/<feature>.test.ts`
- **Estado del proyecto**: consultar MEMORY.md para fases completadas y decisiones previas
