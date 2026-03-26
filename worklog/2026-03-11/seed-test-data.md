# Seeds de datos de prueba (2026-03-11)

## Objetivo
La Fase 2 frontend estaba completa pero sin datos reales para visualizar. Se necesitaban scripts para poblar la BD con un usuario de prueba con gastos e ingresos realistas, y poder limpiarlos fácilmente.

## Archivos creados

### `apps/api/src/db/seed-test-data.ts`
Script idempotente que crea (o reutiliza) el usuario `test@cuentas-claras.dev` e inserta 20 gastos y 8 ingresos distribuidos en los últimos 3 meses. Cubre todas las categorías expense e income con montos realistas en ARS. Si el usuario ya tiene gastos, saltea silenciosamente.

### `apps/api/src/db/seed-test-data-clean.ts`
Script que elimina el usuario de prueba. Gracias al `onDelete: 'cascade'` definido en el schema de Drizzle, todos sus gastos e ingresos se eliminan automáticamente en cascada. No toca las categorías default.

## Archivos modificados

### `apps/api/src/db/seed.ts`
Se agregó la creación del usuario de prueba (`test@cuentas-claras.dev` / `test1234`) al seed principal, junto a las categorías default. Ambas partes son idempotentes por separado: si las categorías ya existen las saltea; si el usuario ya existe lo saltea. Esto permite correr `db:seed` como paso único de setup inicial.

### `apps/api/package.json`
Se agregaron los scripts:
- `db:seed:test` → `bun --env-file .env src/db/seed-test-data.ts`
- `db:seed:test:clean` → `bun --env-file .env src/db/seed-test-data-clean.ts`

### `package.json` (root)
Se expusieron los nuevos scripts desde el root via `--filter @cuentas-claras/api`, siguiendo el patrón existente de `db:seed`, `db:migrate`, etc. Esto permite correrlos desde cualquier lugar del monorepo.

## Decisiones técnicas

### Usuario de prueba en seed.ts principal vs script separado
Inicialmente el usuario de prueba se creaba solo en `seed-test-data.ts`. Se decidió moverlo a `seed.ts` para que `bun run db:seed` sea el único comando necesario para tener un entorno funcional (categorías + usuario). El script `seed-test-data.ts` quedó como paso opcional para agregar volumen de datos.

### Idempotencia del seed-test-data
En lugar de chequear si el usuario existe para abortar, se decidió reutilizarlo si ya existe y chequear idempotencia por presencia de gastos. Esto permite correr `db:seed` (que crea el usuario) y luego `db:seed:test` sin conflictos.

### Limpieza via CASCADE
El script clean no hace DELETE en cascada manual — simplemente elimina el usuario y confía en las FK con `onDelete: 'cascade'` ya definidas en el schema. Más simple y menos propenso a errores de orden.

## Resultado

```bash
bun run db:seed
# → Found 17 existing default categories. Skipping.
# → Created test user: test@cuentas-claras.dev / test1234

bun run db:seed:test
# → ✅ Test data seeded: 20 expenses, 8 incomes for test@cuentas-claras.dev

bun run db:seed:test:clean
# → ✅ Test data cleaned: user test@cuentas-claras.dev and all their records deleted
```

## Próxima fase
Con datos de prueba disponibles, el siguiente paso es definir Fase 3: posibles candidatos son filtros avanzados por fecha/categoría, reportes/gráficos, grupos de gastos compartidos, o gastos recurrentes.
