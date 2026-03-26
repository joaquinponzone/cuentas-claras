# Dashboard: filtro de mes navegable (2026-03-11)

## Objetivo
El dashboard mostraba siempre el mes actual hardcodeado. Se agregó un `MonthPicker` para que el usuario pueda navegar a cualquier mes y ver sus datos históricos, con la misma UX que ya tenía la página de Gastos.

## Archivos modificados
### `apps/web/src/pages/dashboard.tsx`
- Se convirtió `month` de constante a estado (`useState(currentMonth())`).
- Se reemplazó `prevMonth()` (que derivaba siempre desde `new Date()`) por `getPrevMonth(m: string)`, que deriva el mes anterior a partir del mes seleccionado en estado.
- Se importó `MonthPicker` desde `@/components/month-picker`.
- Se agregó un header row con el `MonthPicker` alineado a la derecha, antes de `<SectionCards>`.
- El botón "Limpiar" del picker retorna `''`; se usa fallback a `currentMonth()` (mismo patrón que Gastos).

## Decisiones técnicas
### Reutilización de MonthPicker sin cambios al componente
El componente `MonthPicker` ya existía y era genérico. No fue necesario modificarlo — solo importarlo y conectarlo al estado local del dashboard.

### getPrevMonth derivado del estado, no de Date()
La función original `prevMonth()` usaba `new Date()` directamente, lo que hacía que el "mes anterior" siempre fuera el mes previo al actual, independientemente del mes seleccionado. Al recibir el `month` como parámetro, el mes comparativo siempre es coherente con la selección del usuario.

## Resultado
Cards de resumen, gráfico de área y tablas de últimos gastos/ingresos responden al mes seleccionado. "Limpiar" vuelve al mes actual. Cambio mínimo, sin modificar componentes compartidos.

## Próxima fase
Fase 3 — por definir. Candidatos: filtros avanzados por categoría, reportes de resumen, grupos/cuentas compartidas, o transacciones recurrentes.
