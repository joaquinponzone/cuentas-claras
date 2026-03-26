# Integración Shadcn UI — Setup y Refactor de Páginas (2026-03-11)

## Objetivo
Reemplazar todos los componentes UI custom (botones, inputs, modales, tablas, cards) con componentes de Shadcn UI para mejorar consistencia, accesibilidad y velocidad de desarrollo futuro. El proyecto usa Tailwind v4, que no es compatible con el wizard interactivo de `shadcn init`, por lo que se hizo setup manual.

## Archivos creados

### `apps/web/components.json`
Configuración de Shadcn creada manualmente (Tailwind v4 no soporta el wizard interactivo). Campo `tailwind.config` vacío porque v4 no usa `tailwind.config.ts`.

### `apps/web/src/lib/utils.ts`
Helper `cn()` con `clsx` + `tailwind-merge`, usado en todos los componentes Shadcn.

### `apps/web/src/components/month-picker.tsx`
Reemplaza `<input type="month">` nativo (que muestra el picker del browser, no estilizable). Implementado con Popover de Shadcn + grid de meses 3×4 + navegación de año con chevrons + botones "Este mes" / "Limpiar". Acepta `value: string | null` y `onChange` callback.

### `apps/web/src/components/ui/` (múltiples archivos)
Componentes instalados vía `npx shadcn@latest add --yes`:
`button`, `input`, `label`, `select`, `badge`, `alert`, `card`, `table`, `dialog`, `pagination`, `separator`, `popover`, `sonner`.

## Archivos modificados

### `apps/web/src/index.css`
Agregadas CSS variables semánticas de Shadcn en `@layer base :root {}` (background, foreground, card, primary, secondary, muted, destructive, border, radius, etc.) y variables de chart (`--chart-1` a `--chart-5`). El bloque `@theme {}` existente mapea las vars vía `hsl(var(--))`  para que Tailwind v4 las exponga como utilidades.

### `apps/web/src/components/ui/pagination.tsx`
Fix de TypeScript: `verbatimModuleSyntax` requiere `import type { ButtonProps }` (el archivo generado por shadcn usaba `import { ButtonProps }`).

### `apps/web/src/pages/login.tsx` y `register.tsx`
`<input>` → `<Input>`, `<label>` → `<Label>`, `<button>` → `<Button>`, div de error → `<Alert variant="destructive"><AlertDescription>`.

### `apps/web/src/pages/expenses.tsx` e `incomes.tsx`
- Inputs de filtro → `<Input>`
- Select nativo → `<Select>` Shadcn (valor `__all` como placeholder en lugar de string vacío, para evitar conflicto con el componente controlado)
- Botón "Nuevo" → `<Button>`
- `<table>` manual → `<Table><TableHeader><TableRow><TableHead><TableBody><TableCell>`
- Modal custom → `<Dialog><DialogContent><DialogHeader><DialogTitle><DialogFooter>`
- `<input type="month">` → `<MonthPicker>`

### `apps/web/src/pages/categories.tsx`
Badge "Default" → `<Badge variant="secondary">`, badge tipo → `<Badge>`, botones → `<Button>`, modal → `<Dialog>`.

### `apps/web/src/pages/dashboard.tsx`
`StatCard` interno → `<Card><CardHeader><CardTitle><CardContent>`, listas de transacciones recientes en cards.

### `apps/web/src/components/pagination.tsx`
Reescrito usando primitivos de Shadcn (`Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`).

### `apps/web/src/components/layout/sidebar.tsx`
Links → `<Button variant="ghost">` con clases condicionales, logout → `<Button variant="ghost">`, separador → `<Separator>`.

### `apps/web/src/main.tsx`
Agregado `<Toaster />` de sonner para notificaciones futuras.

## Decisiones técnicas

### Setup manual de Shadcn (sin wizard interactivo)
`npx shadcn@latest init` requiere prompts interactivos que no funcionan bien en el entorno. Se resolvió creando `components.json` manualmente y ejecutando `npx shadcn@latest add --yes` para cada componente. Tailwind v4 no usa `tailwind.config.ts` así que ese campo se deja vacío en `components.json`.

### Select con valor `__all` en lugar de string vacío
Shadcn `<Select>` controlado no acepta `value=""` como estado válido (renderiza el placeholder incorrectamente). Se usó `"__all"` como valor canónico para "sin filtro", mapeándolo a `undefined` antes de hacer la query a la API.

### MonthPicker custom en lugar de `<input type="month">`
El input nativo no es estilizable con Tailwind y su apariencia varía por browser/OS. El componente custom con Popover da control total sobre el diseño y mantiene la consistencia visual de Shadcn.

## Resultado
Build y typecheck limpios. Todas las páginas funcionales con componentes Shadcn. MonthPicker operativo en expenses e incomes.

## Próxima fase
Adopción del bloque `dashboard-01` de Shadcn UI como layout principal de la aplicación.
