# Fase 1 — Auth (2026-03-07)

## Objetivo
Implementar el stack completo de autenticación (backend + tests). El frontend ya estaba completo.

## Archivos creados

### `apps/api/src/services/auth-service.ts`
Lógica de negocio pura desacoplada de Hono. Expone:
- `register(input)` → verifica email único (409 si duplicado), hashea password, inserta user, devuelve `{ user, token }`
- `login(input)` → busca por email (401 si no existe), compara password (401 si falla), devuelve `{ user, token }`
- `getCurrentUser(userId)` → busca por id (404 si no existe)

Helper interno `toUser(dbUser)` convierte el row de Drizzle al tipo `User` de `@cuentas-claras/shared`, excluyendo `passwordHash` e `isActive` y convirtiendo los `Date` a ISO string.

### `apps/api/tests/setup.ts`
Helper `makeRequest(method, path, body?, cookie?)` que usa `app.request()` de Hono para testear sin levantar servidor HTTP.

### `apps/api/tests/auth.test.ts`
9 casos cubriendo todos los endpoints. Usa `beforeEach` para limpiar la tabla `users` antes de cada test.

## Archivos modificados

### `apps/api/src/routes/auth.ts`
- Reemplazó los 4 stubs (501) con implementación real
- Schemas Zod definidos localmente (ver decisión técnica abajo)
- Cookie con `httpOnly: true`, `sameSite: 'Lax'`, `maxAge: 24h`, `secure` solo en producción
- `validationHook` personalizado para devolver `{ error: message }` con el primer issue de Zod como string legible
- Tipo `Variables` en la instancia Hono para tipar `c.get('user')`

### `apps/api/src/server.ts`
- Agregado handler de `HTTPException` en `onError` para que los 401/409 del service se propaguen correctamente

### `apps/api/src/config/database.ts`
- SSL condicional: `ssl: false` en desarrollo, `{ rejectUnauthorized: false }` en producción
- Fix necesario porque Docker postgres local no tiene SSL habilitado (causaba ECONNRESET)

### `apps/api/src/middleware/auth.ts`
- Fix menor: `return` explícito después de `await next()` para satisfacer TS7030

### `apps/api/package.json`
- Scripts `test` y `test:watch` actualizados a `bun test --env-file .env` (flags DESPUÉS del subcomando para evitar loop infinito)

### `packages/shared/src/types/expense.ts` y `income.ts`
- Eliminados `CreateExpenseInput`, `UpdateExpenseInput`, `CreateIncomeInput`, `UpdateIncomeInput` que estaban duplicados — ya existen como tipos inferidos de Zod en `schemas/`

### `apps/web/src/lib/api.ts`
- Fix en `handleResponse`: `errorData.error` puede ser objeto (Zod) o string (API error). Ahora maneja ambos casos.

## Decisiones técnicas

### Zod v3 vs v4 — schemas locales en routes
`@hono/zod-validator` y `@cuentas-claras/shared` resolvían instancias diferentes de Zod (v3 y v4 coexisten en node_modules), causando incompatibilidad de tipos en `zValidator`. Solución: los schemas de validación de rutas se definen localmente en `routes/auth.ts` usando el Zod de `apps/api`. Los tipos (`RegisterInput`, `LoginInput`) siguen importándose desde shared cuando se necesitan.

### SSL condicional en postgres
El `DATABASE_URL` local apunta a Docker que no tiene SSL. Forzar SSL causaba ECONNRESET. Patrón adoptado: `ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false`. Cuando migremos a Neon en prod, esto funciona automáticamente.

### DB elegida
- **Dev**: Docker (postgres:16-alpine, ya configurado en docker-compose.yml)
- **Prod (futuro)**: Neon — free tier sin pausa por inactividad, branching, compatible con Drizzle + postgres-js sin cambiar código

## Resultado
```
bun test --env-file .env

tests/auth.test.ts:
✓ POST /auth/register > returns 201 with user and sets cookie
✓ POST /auth/register > returns 409 for duplicate email
✓ POST /auth/register > returns 400 for invalid data
✓ POST /auth/login > returns 200 with user and sets cookie on valid credentials
✓ POST /auth/login > returns 401 for wrong password
✓ POST /auth/login > returns 401 for non-existent email
✓ GET /auth/me > returns 200 with user when cookie is valid
✓ GET /auth/me > returns 401 without cookie
✓ POST /auth/logout > returns 200 and clears cookie

9 pass, 0 fail
```

Smoke test manual: register → dashboard funcionando con nombre de usuario en navbar y logout operativo.

## Próxima fase
Fase 2 — a definir (categorías, gastos, o dashboard data).
