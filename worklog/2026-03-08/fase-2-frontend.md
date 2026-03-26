# Fase 2 Frontend — Categorías, Gastos e Ingresos (2026-03-08)

## Objetivo
Construir la capa de presentación para el backend de Fase 2 (ya completo). El frontend solo contaba con auth (login/register/dashboard placeholder). Se implementó un layout de sidebar con navegación y las vistas CRUD completas para gastos, ingresos y categorías.

## Archivos creados

### `apps/web/src/lib/api/categories-api.ts`
Cliente API para categorías: `getAll()`, `create(data)`, `remove(id)`. Usa `apiRequest` del cliente base.

### `apps/web/src/lib/api/expenses-api.ts`
Cliente API para gastos: `getAll(params?)`, `create(data)`, `update(id, data)`, `remove(id)`. Exporta también los tipos `CreateExpenseData` y `UpdateExpenseData` para reuso en hooks y páginas.

### `apps/web/src/lib/api/incomes-api.ts`
Mismo patrón que `expenses-api.ts`, agrega el campo `source` en create/update.

### `apps/web/src/lib/hooks/use-categories.ts`
Hooks TanStack Query: `useCategories()`, `useCreateCategory()`, `useDeleteCategory()`. Query key constant `CATEGORY_KEYS` para invalidación consistente.

### `apps/web/src/lib/hooks/use-expenses.ts`
Hooks: `useExpenses(params?)`, `useCreateExpense()`, `useUpdateExpense()`, `useDeleteExpense()`. `EXPENSE_KEYS.list(params)` incluye los filtros en la key para que distintos meses/categorías cacheen por separado.

### `apps/web/src/lib/hooks/use-incomes.ts`
Mismo patrón que `use-expenses.ts`.

### `apps/web/src/components/layout/sidebar.tsx`
Sidebar fijo de 256px con `NavLink` de React Router (clase activa automática), íconos de `lucide-react`, y bloque inferior con nombre de usuario + email + botón logout (movido desde dashboard).

### `apps/web/src/components/layout/app-layout.tsx`
Layout raíz para rutas protegidas: `<Sidebar /> + <Outlet />`. Diseño `flex h-screen` con área de contenido scrolleable.

### `apps/web/src/pages/expenses.tsx`
Página de gastos: filtro `<input type="month">` (default = mes actual), tabla con fecha/categoría/descripción/monto/acciones. Dialog unificado para crear y editar (con estado `editing: Expense | null`). Borrado con `window.confirm`. Formateo de fechas como UTC para evitar desfase de zona horaria.

### `apps/web/src/pages/incomes.tsx`
Igual que `expenses.tsx` más campo `source` en el formulario y tabla.

### `apps/web/src/pages/categories.tsx`
Dos listas (`CategoryList`) side-by-side: gastos e ingresos. Badge "Default" para categorías con `isDefault: true` (sin botón borrar). Dialog de creación con nombre + select de tipo.

## Archivos modificados

### `apps/web/src/pages/dashboard.tsx`
Reemplazado el placeholder por un dashboard funcional: 3 tarjetas de resumen (total gastos, total ingresos, balance del mes) usando `useExpenses` y `useIncomes` con filtro del mes actual. Dos listas con los últimos 5 gastos y últimos 5 ingresos. Header con logout eliminado — esa responsabilidad pasó al sidebar.

### `apps/web/src/App.tsx`
Migrado a rutas anidadas de React Router v7. `AppLayout` actúa como elemento padre de las rutas protegidas, lo que permite que `<Outlet />` inyecte el contenido de cada página dentro del layout compartido.

```tsx
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/expenses"   element={<ExpensesPage />} />
  <Route path="/incomes"    element={<IncomesPage />} />
  <Route path="/categories" element={<CategoriesPage />} />
</Route>
```

## Decisiones técnicas

### No usar Shadcn UI
El plan original proponía inicializar Shadcn (`npx shadcn@latest init`). Se descartó porque el comando es interactivo y porque Tailwind v4 CSS-first no tiene configuración compatible documentada con Shadcn. Se optó por construir todos los componentes UI directamente con clases Tailwind v4 y los CSS variables ya definidos en `src/index.css`. El resultado es visualmente consistente sin añadir dependencias.

### Fechas en UTC para evitar desfase
El backend acepta `z.string().datetime()` (ISO 8601 completo) y devuelve fechas como strings ISO. Al convertir un `<input type="date">` (`YYYY-MM-DD`) a ISO se usa `Date.UTC(y, m-1, d)` para evitar que el timezone local desplace el día. Para mostrar fechas en tabla se pasa `{ timeZone: 'UTC' }` a `toLocaleDateString`.

### Query keys con params para caché por período
`EXPENSE_KEYS.list(params)` incluye `{ month, categoryId }` en el array de key. Esto permite que cada combinación de filtros tenga su propia entrada en caché, evitando que cambiar el mes invalide datos de otros meses ya cargados.

### Dialog único para crear y editar
En lugar de dos componentes separados, un estado `editing: T | null` controla el modo del dialog. `null` = crear, objeto = editar. Reduce duplicación y mantiene el formulario en un solo lugar.

## Resultado

```
$ bun run typecheck   → sin errores
$ bun run build       → ✓ 302.81 kB │ gzip: 90.89 kB, built in 943ms
```

## Próxima fase
Por definir. Candidatos:
- Filtros avanzados (por categoría, rango de fechas)
- Página de reportes / gráficos por categoría
- Grupos (gastos compartidos)
- Gastos/ingresos recurrentes
