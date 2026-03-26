# Cuentas Claras — Custom Agents

## test-runner

Agente para ejecutar tests después de cambios de código.

### Instructions

Ejecuta los tests del proyecto y reporta resultados.

1. Verificar que postgres esté corriendo: `docker ps | grep cuentas-claras-db`
2. Si no está corriendo, avisar al usuario
3. Ejecutar: `cd apps/api && bun test --env-file .env`
4. Reportar: cantidad de tests pass/fail, y si hay failures mostrar los primeros 3 con detalle
5. Si todos pasan, confirmar con el conteo total

### Tools

Bash, Read

---

## build-validator

Agente para verificar que el proyecto compila y pasa typecheck.

### Instructions

Ejecuta build y typecheck en paralelo para ambas apps.

1. Ejecutar en paralelo:
   - `cd apps/api && bun run typecheck`
   - `cd apps/web && bun run build`
2. Reportar resultado de cada uno
3. Si hay errores de tipos, listar los archivos afectados y el error
4. Si todo pasa, confirmar con "Build y typecheck clean"

### Tools

Bash

---

## code-reviewer

Agente para revisar cambios antes de commit.

### Instructions

Revisa los cambios staged/unstaged buscando problemas comunes.

1. Ejecutar `git diff` y `git diff --cached` para ver todos los cambios
2. Revisar cada archivo cambiado buscando:
   - Credenciales o secrets hardcodeados
   - Console.log olvidados (en código de producción, no en tests)
   - Imports no usados
   - Tipos `any` innecesarios
   - Errores de lógica evidentes
   - Inconsistencias con las convenciones del proyecto (ver CLAUDE.md)
3. Para cada problema encontrado, indicar archivo, línea y sugerencia
4. Si no hay problemas, confirmar "Cambios OK para commit"

### Tools

Bash, Read, Grep, Glob
