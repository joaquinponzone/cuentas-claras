# Dashboard-01 Block + Fixes de Layout (2026-03-11)

## Objetivo
Adoptar el bloque `dashboard-01` de Shadcn UI como layout principal de la aplicación, reemplazando el sidebar custom con el sistema de sidebar colapsable de Shadcn. Incluye corrección de dos bugs de layout descubiertos durante la integración.

## Archivos creados

### `apps/web/src/components/app-sidebar.tsx`
Sidebar principal de la app con branding "Cuentas Claras" + `WalletIcon`, navegación (Dashboard/Gastos/Ingresos/Categorías) y conexión al contexto de auth vía `useAuth()`.

### `apps/web/src/components/nav-main.tsx`
Navegación principal del sidebar usando `NavLink` de react-router-dom para detectar el estado activo con `isActive` y aplicar el variant correcto en `SidebarMenuButton`.

### `apps/web/src/components/nav-user.tsx`
Avatar del usuario con iniciales generadas desde el nombre, dropdown con opción de logout. Recibe `user` + `onLogout` props desde `AppSidebar` (que los obtiene de `useAuth()`).

### `apps/web/src/components/site-header.tsx`
Header superior del layout con trigger del sidebar y título dinámico. Acepta prop `title: string`.

### `apps/web/src/components/section-cards.tsx`
KPIs financieros del dashboard: Gastos del mes, Ingresos del mes, Balance neto, Tasa de ahorro. Cada card muestra el % de cambio vs el mes anterior con badge de color (verde/rojo según dirección).

### `apps/web/src/components/chart-area-interactive.tsx`
Gráfico de área (Recharts `AreaChart`) con dos series: Gastos vs Ingresos por día del mes. Recibe props `expenses`, `incomes`, `month` desde el dashboard y agrega los valores por día para construir el dataset. Incluye selector de serie activa.

### `apps/web/src/components/ui/sidebar.tsx`
Instalado por `npx shadcn@latest add dashboard-01`. Sistema completo de sidebar colapsable con `SidebarProvider`, `SidebarInset`, `SidebarRail`, cookies para persistir estado, etc.

### `apps/web/src/components/ui/chart.tsx`
Wrapper de Recharts instalado por dashboard-01. Provee `ChartContainer`, `ChartTooltip`, `ChartLegend`, etc.

### `apps/web/src/components/data-table.tsx`
Data table con sorting, filtering y column visibility instalada por dashboard-01. No se usa directamente en la app actual pero forma parte del bloque.

## Archivos modificados

### `apps/web/src/components/layout/app-layout.tsx`
Reescrito con `SidebarProvider + AppSidebar + SidebarInset + SiteHeader`. Usa `useLocation` para derivar el título de página dinámicamente desde un mapa `PAGE_TITLES`. El contenido de cada página se renderiza via `<Outlet />`.

Fix de spacing aplicado al final de la sesión: `p-4 pt-0` → `p-4` para dar 16px de padding superior al contenido de todas las páginas.

### `apps/web/src/pages/dashboard.tsx`
Reescrito usando `SectionCards` + `ChartAreaInteractive` + tablas de transacciones recientes. Hace dos sets de queries: mes actual y mes anterior (para calcular % de cambio en `SectionCards`). Pasa los datos crudos a `ChartAreaInteractive` para la agregación diaria.

### `apps/web/src/components/ui/sidebar.tsx`
**Fix crítico de Tailwind v4**: Reemplazadas 6 ocurrencias de `w-[--sidebar-width]` y `w-[--sidebar-width-icon]` por `w-(--sidebar-width)` y `w-(--sidebar-width-icon)`.

### `apps/web/src/components/data-table.tsx`
Fix de `verbatimModuleSyntax`: `import type { ColumnDef, ColumnFiltersState, Row, SortingState, VisibilityState }` + `import type { ChartConfig }`.

### `apps/web/src/components/nav-secondary.tsx`
Fix de `verbatimModuleSyntax`: `import type { LucideIcon }`.

### `apps/web/src/components/chart-area-interactive.tsx`
Fix de `verbatimModuleSyntax`: `import type { ChartConfig }`. Reescrito completamente para mostrar datos reales de gastos vs ingresos.

## Decisiones técnicas

### Bug crítico: sidebar solapaba el contenido (Tailwind v4 + CSS variables)
**Problema**: El sidebar se renderizaba encima del contenido principal en lugar de desplazarlo.

**Causa raíz**: Tailwind v4 genera CSS inválido para la sintaxis `w-[--sidebar-width]`. En lugar de `width: var(--sidebar-width)` genera `width: --sidebar-width` (sin `var()`), lo que resulta en `width: 0` efectivo. El div "gap" dentro del layout flex (que crea el espacio para el sidebar fijo) tenía ancho cero, por lo que el contenido empezaba desde el borde izquierdo — exactamente donde el sidebar estaba posicionado.

**Fix**: En Tailwind v4, las CSS custom properties en valores arbitrarios requieren la sintaxis con paréntesis: `w-(--var-name)` genera `width: var(--var-name)`. Se reemplazaron las 6 ocurrencias en `ui/sidebar.tsx`. Verificado en el build output.

**Alternativa descartada**: Usar valores hardcodeados (`w-64`, `w-12`) en lugar de las variables. Se descartó para mantener la flexibilidad del sistema de sidebar de Shadcn.

### Títulos de página dinámicos en el layout
El `SiteHeader` necesita mostrar el título de la página actual. Se eligió un mapa estático `PAGE_TITLES` en `app-layout.tsx` usando `useLocation().pathname` como key. Alternativa descartada: pasar el título como prop desde cada página vía context — más complejo sin beneficio real dado que las rutas son fijas.

### Carga de datos del mes anterior para % de cambio
`SectionCards` muestra el delta vs el mes anterior. En lugar de calcular esto en el backend, se optó por hacer dos queries desde `dashboard.tsx` (mes actual + mes anterior) y calcular el % en el componente. Más simple de implementar y el volumen de datos es pequeño.

## Resultado
Layout colapsable funcional. Sidebar se colapsa y expande sin solapar el contenido. Dashboard muestra KPIs reales con % de cambio y gráfico de área Gastos vs Ingresos. Build y typecheck limpios.

## Próxima fase
Fase 3 por definir — posibles: filtros avanzados, reportes por período, grupos familiares, transacciones recurrentes.
