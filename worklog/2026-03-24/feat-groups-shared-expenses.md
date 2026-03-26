# Fase 6: Grupos y Gastos Compartidos (2026-03-24)

## Objetivo
Permitir que usuarios compartan gastos en grupos (familias, parejas, equipos). Scope v1: CRUD de grupos, invitación por código, gastos compartidos, resumen por miembro. Sin balance de deudas ni splitting (queda para v2).

## Archivos creados
### `apps/api/src/services/groups-service.ts`
Servicio completo con 12 funciones: list, create, getDetail, update, remove, addMember, removeMember, joinByCode, leaveGroup, listGroupExpenses, createGroupExpense, getGroupSummary. Incluye helpers para generar invite code (8 chars alfanuméricos con retry), assertMembership y assertOwner para validación de permisos.

### `apps/api/src/routes/groups.ts`
12 endpoints REST montados en `/groups`. Schemas Zod locales (no importados de shared) con validationHook personalizado. Rutas protegidas por authMiddleware, permisos de owner/member controlados desde el service.

### `apps/api/tests/groups.test.ts`
24 tests en 4 bloques: CRUD grupo (6), membresía (8), autorización (5), gastos de grupo (5). Cubren el happy path y edge cases (409 duplicados, 403 permisos, 400 validación).

### `apps/web/src/lib/api/groups-api.ts`
Cliente API siguiendo el patrón de `expenses-api.ts`. Funciones para todos los endpoints del backend.

### `apps/web/src/lib/hooks/use-groups.ts`
Hooks de TanStack Query: 4 queries (list, detail, expenses, summary) y 8 mutations con invalidación cruzada (crear gasto invalida expenses + summary, agregar miembro invalida detail, etc.).

### `apps/web/src/pages/groups.tsx`
Página lista de grupos. Grid de Cards con nombre, descripción truncada, badge memberCount. Dialogs para crear grupo y unirse por código. Empty state con icono.

### `apps/web/src/pages/group-detail.tsx`
Página detalle con 3 tabs (Shadcn Tabs):
- **Gastos**: tabla con fecha/pagó/categoría/descripción/monto, MonthPicker, paginación, dialog para crear gasto.
- **Miembros**: lista con avatar/inicial, nombre, email, badge rol. Código de invitación con botón copiar. Agregar/remover miembros (owner). Botón salir.
- **Resumen**: KPI cards (total mes, cantidad gastos). Desglose por miembro con barra de progreso y porcentaje.

## Archivos modificados
### `apps/api/src/db/schema.ts`
Agregadas tablas `groups` (id, name, description, inviteCode unique, createdBy FK, timestamps) y `userGroups` (id, userId FK, groupId FK, role, joinedAt, unique constraint en userId+groupId). Actualizado `expenses.groupId` de uuid suelto a FK → groups.id con `onDelete: 'set null'`.

### `apps/api/src/server.ts`
Montaje de `groupsRoutes` en `/groups`.

### `apps/api/tests/setup.ts`
`cleanTestData()` reescrito: ahora solo borra usuarios con email `@test.com` y sus datos asociados. Antes hacía `db.delete(users)` sin filtro, lo cual destruía los datos del seed.

### `apps/api/tests/auth.test.ts`
Reemplazado `db.delete(users)` directo por `cleanTestData()` de setup. Era el único test file que hacía cleanup propio sin filtrar por dominio.

### `packages/shared/src/types/group.ts`
Expandido: agregados `createdBy` y `updatedAt` a `Group`, nuevos tipos `GroupMember`, `GroupDetail`, `GroupExpenseSummary`.

### `apps/web/src/App.tsx`
Rutas `/groups` y `/groups/:id` dentro del layout protegido.

### `apps/web/src/components/app-sidebar.tsx`
Nav item "Grupos" con `UsersIcon` entre Categorías e Importar.

### `apps/api/src/db/seed-test-data.ts`
Segundo usuario `pareja@cuentas-claras.dev` con 11 gastos personales y 3 ingresos propios. Grupo "Casa" con ambos usuarios y 9 gastos compartidos alternando quién pagó.

### `apps/api/src/db/seed-test-data-clean.ts`
Actualizado para borrar ambos usuarios de test (`test@` y `pareja@cuentas-claras.dev`).

## Decisiones técnicas
### Cleanup de tests scoped por dominio
Los tests usaban `db.delete(users)` sin filtro, borrando también los datos del seed. Se cambió a filtrar por `@test.com` (dominio que usan todos los tests). Los usuarios del seed usan `@cuentas-claras.dev` y sobreviven a las corridas de tests.

### FK en expenses.groupId con onDelete set null
Si se borra un grupo, los gastos quedan huérfanos (groupId → null) pero no se pierden. El usuario sigue viendo esos gastos en su lista personal.

### Invite code: 8 chars con retry
Generación de códigos alfanuméricos (sin caracteres ambiguos como 0/O, 1/l/I) con retry en caso de colisión (hasta 5 intentos). El código es unique en DB.

### Permisos owner vs member
owner puede: editar/borrar grupo, agregar/remover miembros. member puede: ver, crear gastos, salir. Ambos ven gastos y resumen. Un owner no puede salir si es el único owner.

## Resultado
```
127 pass, 0 fail, 258 expect() calls
Ran 127 tests across 8 files. [7.27s]
```
Web build limpio. Seed data sobrevive a los tests. Dos usuarios con datos personales + grupo compartido para demo visual.

## Próxima fase
Fase 7 — posibles: balance de deudas y splitting (groups v2), filtros avanzados, reportes, auto-generación de expenses desde recurrentes, importación inteligente con IA.
