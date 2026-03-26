# Filtros + Paginación — Expenses & Incomes (2026-03-11)

## Objetivo
Los endpoints de gastos e ingresos devolvían todos los registros sin paginación. El frontend solo filtraba por mes. Se agrega paginación offset-based con páginas numeradas y filtros adicionales (categoría, descripción, rango de monto, ordenamiento) tanto en backend como en frontend.

## Archivos creados

### `packages/shared/src/types/pagination.ts`
Interface TypeScript pura `PaginatedResponse<T>` con `data: T[]` y `pagination: { total, page, pageSize, totalPages }`. Se creó en shared para reusar el tipo en el frontend sin introducir Zod (evita el conflicto v3/v4).

### `apps/web/src/lib/hooks/use-debounce.ts`
Hook genérico `useDebounce<T>(value, delay)` para evitar llamadas a la API en cada keystroke del campo de búsqueda por descripción.

### `apps/web/src/components/pagination.tsx`
Componente `<Pagination page totalPages onPageChange />` con ellipsis logic (siempre muestra primera, actual ±1, última). Retorna `null` si `totalPages <= 1` para no renderizar nada innecesario.

## Archivos modificados

### `packages/shared/src/types/index.ts`
Agregado `export * from './pagination'` para exponer el nuevo tipo.

### `apps/api/src/services/expenses-service.ts` y `incomes-service.ts`
`ListFilters` expandido con `description`, `amountMin`, `amountMax`, `sortBy`, `sortOrder`, `page`, `pageSize`. `list()` ahora retorna `Promise<PaginatedResponse<T>>` en lugar de array directo. Internamente construye el `whereClause` una sola vez y lo reutiliza en dos queries: COUNT para el total y SELECT paginado con `.limit().offset()`.

### `apps/api/src/routes/expenses.ts` y `incomes.ts`
Agregado `listQuerySchema` local con `z.coerce.number()` para los campos numéricos (los query params llegan como string desde la URL). El GET handler ahora usa `zValidator('query', listQuerySchema, validationHook)`.

### `apps/api/tests/expenses.test.ts` y `incomes.test.ts`
Actualizados para consumir la nueva forma de respuesta: `body.data` en lugar de tratar el JSON como array directo. Los tests que verificaban `.toEqual([])` ahora verifican `body.data` y también que `body.pagination` esté definido.

### `apps/web/src/lib/api/expenses-api.ts` y `incomes-api.ts`
`ExpenseFilters` / `IncomeFilters` expandidos. `getAll()` cambia su return type a `Promise<PaginatedResponse<T>>`.

### `apps/web/src/lib/hooks/use-expenses.ts` y `use-incomes.ts`
Agregado `placeholderData: (prev) => prev` para que TanStack Query mantenga los datos anteriores visibles mientras carga la nueva página (evita flicker).

### `apps/web/src/pages/expenses.tsx` y `incomes.tsx`
Reescritos para incluir: estado `FilterState` + `page`, función `applyFilter()` que siempre resetea a página 1, descripción con debounce de 400ms, filter bar con dropdown de categoría / input descripción / inputs monto mín-máx / selects de ordenamiento / botón Limpiar, línea de resumen "N resultados — página X de Y", y componente `<Pagination>` debajo de la tabla.

### `apps/web/src/pages/dashboard.tsx`
Fix necesario: el dashboard usaba `useExpenses`/`useIncomes` esperando arrays directos. Adaptado para leer `result?.data ?? []`.

## Decisiones técnicas

### `PaginatedResponse` como interface pura en shared (sin Zod)
El shared package usa Zod v3 mientras las routes de la API usan Zod v4. Poner schemas Zod en shared causa incompatibilidades de tipos con `hono/validator`. La solución es poner solo interfaces TypeScript en shared y definir los schemas de validación localmente en cada route.

### `z.coerce.number()` en el query schema
Los query params de HTTP siempre llegan como strings (`"10"`, `"200"`). `z.coerce.number()` convierte automáticamente sin necesidad de parsear manualmente en el handler.

### `ilike` para búsqueda por descripción
Se usa `ilike(column, '%texto%')` de drizzle-orm para búsqueda case-insensitive nativa en PostgreSQL, en lugar de hacer lower() en código.

### `applyFilter()` siempre resetea `page` a 1
Cualquier cambio de filtro debe resetear la paginación para evitar que el usuario quede en una página que ya no existe con los nuevos filtros activos.

## Resultado
- `bun run typecheck` en `apps/web`: ✅ sin errores TS
- `bun run build` en `apps/web`: ✅ build limpio (311.99 kB JS + 17.07 kB CSS)
- Tests API: no ejecutados (Docker no disponible durante la sesión); la lógica de los tests fue actualizada correctamente

## Próxima fase
Verificar tests con Docker corriendo (`bun run db:up && bun run test:api`). Posibles features siguientes: reportes/gráficos por categoría, filtros guardados, exportar a CSV.
