# Zod v4 unificado + deps pineadas (2026-03-08)

## Objetivo
Eliminar el conflicto de versiones de Zod entre `packages/shared` (v3) y `apps/api` (v4),
unificando todo en v4. De paso, pinear todas las dependencias `"latest"` del monorepo
con las versiones exactas resueltas en bun.lock, y corregir un error de tipos preexistente
en `apps/web/tsconfig.json`.

## Archivos modificados

### `packages/shared/package.json`
`zod: "^3.25.0"` → `"^4.0.0"`. Los schemas existentes (`z.object`, `z.string`, `z.enum`,
`.optional()`, `z.infer<>`, `z.string().datetime()`) son 100% compatibles con v4 sin cambios de código.

### `apps/api/package.json`
Todos los `"latest"` reemplazados por versiones exactas resueltas en bun.lock:
`hono@4.12.5`, `@hono/zod-validator@0.7.6`, `drizzle-orm@0.45.1`, `postgres@3.4.8`,
`jose@6.2.0`, `zod@^4.0.0`, `winston@3.19.0`, `@types/bun@1.3.10`, `drizzle-kit@0.31.9`.

### `apps/web/package.json`
Todos los `"latest"` reemplazados: `@tanstack/react-query@5.90.21`,
`@tanstack/react-query-devtools@5.91.3`, `react-router-dom@7.13.1`,
`lucide-react@0.577.0`, `nuqs@2.8.9`, `@types/react@19.2.14`,
`@types/react-dom@19.2.3`, `@vitejs/plugin-react@5.1.4`,
`@tailwindcss/postcss@4.2.1`, `autoprefixer@10.4.27`, `postcss@8.5.8`,
`tailwindcss@4.2.1`, `vite@7.3.1`.

### `package.json` (raíz)
`turbo: "latest"` → `"2.8.14"`.

### `apps/api/src/routes/auth.ts`
Comentario actualizado: `// Local schemas using the API's own Zod instance (avoids
cross-package Zod version conflicts)` → `// Validation schemas` (el conflicto ya no existe).

### `apps/web/tsconfig.json`
Agregado `"types": ["vite/client"]` en `compilerOptions` para exponer `import.meta.env`
a TypeScript. Error preexistente que bloqueaba `typecheck` en web.

## Resultado
```
bun install   → Saved lockfile, 155 installs OK
bun run typecheck → Tasks: 3 successful, 3 total (api ✓, shared ✓, web ✓)
```

## Próxima fase
Fase 2 — a definir (categorías, gastos/ingresos, o dashboard con datos reales).
