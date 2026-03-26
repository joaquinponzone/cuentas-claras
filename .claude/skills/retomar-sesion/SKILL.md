---
name: retomar-sesion
description: Use this skill when the user wants to resume work from a previous session. Trigger when user says "retomar sesión", "donde quedamos", "¿en qué quedamos?", "continuemos", "resume the session", "retomemos", "what did we do last", "qué hicimos", "poneme al día", "catch me up", or similar phrases at the start of a session.
version: 1.1.0
---

# Retomar Sesión

Cuando se activa esta skill, tu objetivo es dar al usuario un resumen rápido y accionable del estado del proyecto para que pueda retomar el trabajo sin fricción.

## Pasos

### 1. Leer worklog reciente

Usa Glob para listar directorios en `worklog/`:

```
Glob pattern="worklog/*/"
```

Toma las 2 entradas más recientes (por fecha de nombre de carpeta). Para cada una, lee todos los archivos `.md` dentro del directorio.

### 2. Leer MEMORY.md

Lee el archivo de memoria persistente del proyecto para tener el estado actualizado:

```
Read /Users/m4pro/.claude/projects/-Users-m4pro-Documents-joaquinponzone-projects-cuentas-claras/memory/MEMORY.md
```

### 3. Buscar próximos pasos en specs

Usa Grep para encontrar la sección de priorización en `specs/SPECS.md`:

```
Grep pattern="Must Have|MoSCoW|Priorización|pendiente|TODO" path="specs/SPECS.md" output_mode="content"
```

### 4. Sintetizar y presentar

Presenta el resumen en este formato exacto:

```
## Sesión anterior (YYYY-MM-DD)
[Qué se hizo, decisiones técnicas clave tomadas en esa sesión]

## Estado actual
[Fases completadas, estado del build/tests, qué está funcionando]

## Próximos pasos
[Lista priorizada: items de "Próxima fase" del worklog + must-haves de specs pendientes]
```

## Notas

- Si no hay worklog, indica que no hay sesiones previas registradas y muestra el estado desde MEMORY.md
- Sé conciso — el resumen no debe tomar más de 30 segundos de lectura
- Termina siempre con una pregunta directa: "¿Por dónde arrancamos?" o sugiere el próximo paso más obvio
