---
name: test
description: Ejecuta los tests del proyecto y reporta resultados. Trigger cuando el usuario dice "correr tests", "run tests", "verificar tests", "bun test", o después de implementar cambios que necesitan verificación.
argument-hint: "[archivo o patrón opcional, ej: import, auth]"
---

# Test Runner

Ejecuta los tests del backend y reporta resultados.

## Pasos

1. **Verificar que postgres esté corriendo**:
   ```
   Bash: docker ps --format '{{.Names}}' | grep cuentas-claras-db
   ```
   Si no aparece, avisar al usuario: "Postgres no está corriendo. Ejecutá `docker start cuentas-claras-db`."

2. **Ejecutar tests**:
   - Si se pasó un argumento (archivo o patrón): `cd apps/api && bun test tests/$ARGUMENTS.test.ts --env-file .env`
   - Si no hay argumento: `cd apps/api && bun test --env-file .env`

3. **Reportar resultados**:
   - Total de tests pass/fail
   - Si hay failures: mostrar los primeros 3 con nombre del test y error
   - Si todos pasan: confirmar con "✓ N tests passing"

## Reglas
- NUNCA usar `bun --env-file .env test` (causa loop infinito). Siempre flags DESPUÉS del subcomando.
- Si hay failures, no intentar fixearlos automáticamente — solo reportar.
- Timeout de 60 segundos para la ejecución.
