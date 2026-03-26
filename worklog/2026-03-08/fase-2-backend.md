# Fase 2 Backend — Categorías, Gastos e Ingresos (2026-03-08)

## Qué se hizo

### Schema Drizzle (`apps/api/src/db/schema.ts`)
Se agregaron tres tablas nuevas:
- `categories` — categorías de gasto/ingreso (defaults globales + propias por usuario)
- `expenses` — gastos con FK a users y categories; campo `amount` como `numeric(12,2)`
- `incomes` — ingresos, misma estructura que expenses pero con `source` y sin `groupId`

FK constraints relevantes:
- `categories.userId` → `users.id` ON DELETE CASCADE (nullable, NULL = default global)
- `expenses.userId` / `incomes.userId` → `users.id` ON DELETE CASCADE
- `expenses.categoryId` / `incomes.categoryId` → `categories.id` (NO ACTION — borrar expenses antes de categories)

**Nota**: `numeric` retorna `string` en Drizzle → servicios hacen `parseFloat()` en los DTOs.

### Seed (`apps/api/src/db/seed.ts`)
Script idempotente que inserta 17 categorías por defecto (12 gastos + 5 ingresos)
usando `EXPENSE_CATEGORIES` e `INCOME_CATEGORIES` de `@cuentas-claras/shared`.
Check previo: si ya existen defaults, no duplica.

Script: `bun run db:seed` (corregido: agrega `--env-file .env` que faltaba).

### Servicios
Tres servicios siguiendo el patrón de `auth-service.ts`:
- `categories-service.ts` — `list`, `create`, `remove` (con 403 para defaults y categorías ajenas)
- `expenses-service.ts` — `list` (filtros month/categoryId), `create`, `update`, `remove`
- `incomes-service.ts` — igual a expenses, sin `groupId`, con `source`

`assertCategoryAccess()` helper compartido: valida que el `categoryId` sea default (userId IS NULL)
o pertenezca al usuario antes de crear/actualizar un gasto o ingreso.

### Rutas
- `GET/POST /categories`, `DELETE /categories/:id`
- `GET/POST /expenses`, `PUT/DELETE /expenses/:id` (query params: `month`, `categoryId`)
- `GET/POST /incomes`, `PUT/DELETE /incomes/:id` (query params: `month`, `categoryId`)

Todas protegidas con `authMiddleware`. Schemas Zod locales (no desde shared).

### `server.ts`
Montadas las tres nuevas rutas en `/categories`, `/expenses`, `/incomes`.

---

## Tests

### `tests/setup.ts` — helpers agregados
- `seedDefaultCategories()` — idempotente, llama al seed de categorías defaults
- `cleanTestData()` — limpia en orden FK-safe: expenses → incomes → users (cascade a cat. propias)
- `registerUser(user)` — registra y devuelve cookie string
- `getDefaultCategoryId(cookie, type)` — obtiene el id de la primera categoría default del tipo

### Nuevos test files
| Archivo | Tests |
|---|---|
| `tests/categories.test.ts` | 11 tests |
| `tests/expenses.test.ts` | 15 tests |
| `tests/incomes.test.ts` | 15 tests |

**Casos cubiertos por los 3 files**: 401 sin cookie, CRUD completo, filtro por mes, orden DESC,
ownership (403 al tocar recursos ajenos), 404 para IDs inexistentes, validaciones de input (400),
protección de categorías default, aislamiento entre usuarios.

### Resultado final
```
bun test --env-file .env
58 pass / 0 fail — 98 expect() calls — 4 archivos
```

---

## Decisiones técnicas

- **`beforeAll` + `beforeEach`**: `beforeAll` siembra defaults (idempotente);
  `beforeEach` limpia solo datos transientes (no afecta defaults con `userId IS NULL`).
- **Orden de limpieza**: expenses e incomes deben borrarse antes de users para evitar FK
  violation en `expenses.categoryId` → `categories.id` (NO ACTION).
- **`db:seed` con `--env-file .env`**: script corregido para leer `DATABASE_URL` correctamente.
