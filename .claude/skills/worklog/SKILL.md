---
name: worklog
description: Actualiza el worklog del proyecto con lo que se hizo en esta sesión. Trigger cuando el usuario dice "worklog", "documentar sesión", "registrar lo que hicimos", "log de sesión", "anotar cambios", o al final de una sesión productiva donde se hicieron cambios significativos.
---

# Worklog — Documentar sesión

Actualiza el worklog del proyecto con lo que se hizo en esta sesión.

## Pasos

1. **Determinar la fecha**: usa el campo `currentDate` del system prompt, o si no está disponible, ejecuta `date +%Y-%m-%d`.

2. **Crear el directorio si no existe**: `worklog/YYYY-MM-DD/`

3. **Elegir el nombre del archivo**: kebab-case describiendo el tema principal (ej: `feat-expenses.md`, `fix-auth-cookie.md`, `refactor-schema.md`).

4. **Escribir la entrada** siguiendo este formato:

```
# [Título descriptivo] (YYYY-MM-DD)

## Objetivo
Una o dos frases que expliquen por qué se hizo este trabajo.

## Archivos creados
### `ruta/al/archivo.ts`
Descripción de qué hace y por qué se creó.

## Archivos modificados
### `ruta/al/archivo.ts`
Descripción del cambio y su motivación.

## Decisiones técnicas
### [Título de la decisión]
Explicación del problema, alternativas consideradas y por qué se eligió esta solución.

## Resultado
Salida de tests, typecheck, o descripción del comportamiento verificado.

## Próxima fase
Qué queda pendiente o cuál es el siguiente paso lógico.
```

5. **Actualizar MEMORY.md** si se completó una fase o se tomaron decisiones técnicas relevantes para futuras sesiones.

## Reglas
- Omitir secciones vacías (si no hay archivos creados, no incluir esa sección).
- El tono es técnico y en español.
- Enfocarse en el "por qué", no solo en el "qué".
- Si la sesión tocó múltiples temas distintos, crear un archivo por tema.
- No inventar información — basarse solo en lo que realmente se hizo en la sesión.
