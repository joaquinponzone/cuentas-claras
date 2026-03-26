# Scripts de desarrollo en package.json root (2026-03-11)

## Objetivo
Centralizar los comandos más frecuentes de desarrollo (tests, base de datos, kill de puertos) en el `package.json` raíz para no tener que navegar a subdirectorios ni recordar flags específicos de cada herramienta.

## Archivos modificados

### `package.json` (root)
Se agregaron los siguientes scripts:

- **`test:api`** — `bun run --filter @cuentas-claras/api test`: corre solo los tests de la API (equivalente a `cd apps/api && bun test --env-file .env`). El script `test` existente con Turbo corre todos los workspaces; este alias permite correr solo la API sin ruido.

- **`kill:api`** — `lsof -ti :4000 | xargs kill -9 2>/dev/null || true`: mata cualquier proceso que esté usando el puerto 4000. Útil cuando `bun dev` falla con `EADDRINUSE` por un proceso zombie de una sesión anterior.

- **`db:up`** — `docker compose up postgres -d`: levanta el contenedor de postgres en background.

- **`db:down`** — `docker compose stop postgres`: para el contenedor sin eliminarlo (preserva el volumen).

- **`db:logs`** — `docker compose logs postgres -f`: tail de los logs de postgres, útil para diagnosticar problemas de conexión.

## Decisiones técnicas

### `|| true` en `kill:api`
Si no hay ningún proceso en el puerto, `lsof` retorna exit code 1 y el `xargs kill` falla. El `|| true` evita que el script rompa con error cuando el puerto ya está libre.

### `db:down` usa `stop` en lugar de `down`
`docker compose down` eliminaría los volúmenes si se usa con `-v`, o podría afectar otros servicios. `stop` solo pausa el contenedor preservando datos.

## Resultado
Flujo de trabajo desde root:
```bash
bun run db:up        # levanta postgres
bun run test:api     # corre tests de la API
bun run db:down      # para postgres
bun run kill:api     # libera puerto 4000 si quedó ocupado
```
