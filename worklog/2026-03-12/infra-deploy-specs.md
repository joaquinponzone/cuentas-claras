# Infraestructura & Deploy — Specs y Docker Compose (2026-03-12)

## Objetivo
Definir la estrategia de deploy y base de datos para producción, reflejarla en los SPECS y preparar los archivos Docker Compose correspondientes.

## Archivos modificados

### `specs/SPECS.md`
- Se eliminaron dos bullets verbosos del Must Have que mezclaban decisiones de implementación con features de usuario.
- Se reemplazaron por una sola línea: *"Deploy en Digital Ocean VPS (api + web) con NeonDB como DB en producción"*.
- Se agregó la sección `## 11. Infraestructura & Deploy` al final del documento con la estrategia clara de Docker Compose y la elección de NeonDB.

### `docker-compose.yml`
- Reescrito para producción únicamente: contiene solo los servicios `api` y `web`.
- Usa `env_file` de cada app para inyectar variables de entorno (incluyendo `DATABASE_URL` apuntando a NeonDB en prod).
- Se agrega `restart: unless-stopped` para resiliencia en el VPS.
- Se elimina el servicio `postgres` y la dependencia `depends_on: postgres` de la API.

## Archivos creados

### `docker-compose.db.yml`
- Contiene únicamente el servicio `postgres:16-alpine` extraído del docker-compose original.
- Se usa exclusivamente en desarrollo local para levantar la DB.
- Mantiene el volumen `pg_data` y el healthcheck originales.

## Decisiones técnicas

### NeonDB sobre Supabase para producción
El stack ya tiene auth propia (JWT + cookie HttpOnly), ORM propio (Drizzle) y API propia (Hono). Supabase agrega auth, storage y edge functions que no se necesitan. NeonDB es Postgres puro con branching, free tier generoso y mejor fit para este setup minimalista.

### Dos docker-compose en lugar de uno con flags/profiles
Se optó por `docker-compose.yml` (prod: api + web) y `docker-compose.db.yml` (dev: solo postgres) en lugar de un único archivo con profiles o múltiples `-f` flags. Motivación: en desarrollo local no se corre api ni web en Docker (se usa `bun run dev` para hot reload), por lo que no tiene sentido tenerlos en el mismo archivo que la DB local.

Flujo resultante:
- **Dev local**: `docker compose -f docker-compose.db.yml up -d` + `bun run dev`
- **Producción (DO VPS)**: `docker compose up -d`

## Próxima fase
Crear los `Dockerfile` para `apps/api` y `apps/web` necesarios para que `docker compose up -d` funcione en producción.
