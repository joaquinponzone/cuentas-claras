# Importación CSV/Excel (2026-03-24)

## Objetivo
Permitir al usuario subir un archivo CSV o Excel, ver un preview editable de los datos, y confirmar la inserción masiva de gastos e ingresos. Último Must Have antes del deploy.

## Archivos creados

### `packages/shared/src/types/import.ts`
Tipos compartidos: `ParsedRow`, `ImportPreview`, `ConfirmRow`, `ConfirmResult`. Definen el contrato entre backend y frontend para el flujo de importación en dos pasos (parse → confirm).

### `apps/api/src/services/import-service.ts`
Servicio principal de importación. Contiene:
- **`normalizeHeaders`**: mapea aliases de columnas (español/inglés) a nombres canónicos.
- **`parseDate`**: intenta DD/MM/YYYY (convención AR), luego ISO, luego MM/DD/YYYY.
- **`parseAmount`**: maneja decimales con coma, símbolos de moneda, negativos con paréntesis.
- **`matchCategory`**: match case-insensitive exacto, luego partial/contains contra categorías del usuario.
- **`parse`**: orquesta lectura xlsx, normalización, matching y detección de duplicados.
- **`confirm`**: valida categoryIds, split expense/income, batch insert en transacción Drizzle.

### `apps/api/src/routes/import.ts`
Dos rutas protegidas:
- `POST /import/parse` — recibe FormData (file + defaultType), valida extensión/tamaño, retorna `ImportPreview`.
- `POST /import/confirm` — recibe JSON con `ConfirmRow[]`, inserta en batch atómico.

### `apps/api/tests/import.test.ts`
15 tests cubriendo: auth, validación de archivo, parsing CSV con todas las columnas, aliases en español, columnas opcionales faltantes, errores por fecha/monto inválido, detección de duplicados contra DB, matching de categorías case-insensitive, inserción de expenses/incomes, validación de categoryId, array vacío, y verificación de registros en DB.

### `apps/web/src/lib/api/import-api.ts`
Módulo API frontend. `parse()` usa `fetch` directo con FormData (sin Content-Type: application/json). `confirm()` usa `apiRequest` estándar.

### `apps/web/src/lib/hooks/use-import.ts`
Dos mutations TanStack Query: `useParseImport` y `useConfirmImport`. El confirm invalida queries de expenses, incomes y dashboard.

### `apps/web/src/pages/import.tsx`
Página wizard de 3 pasos:
1. **Upload**: input file (.csv/.xlsx/.xls), select tipo default, botón descargar ejemplo.
2. **Preview**: cards con summary, tabla con checkbox/fecha/monto/tipo/categoría (Select editable)/descripción/estado, acciones bulk.
3. **Done**: confirmación con conteo y links a /expenses, /incomes, o "Importar otro".

## Archivos modificados

### `apps/api/src/server.ts`
Montaje de `importRoutes` en `/import`.

### `apps/api/package.json`
Agregada dependencia `xlsx` (SheetJS CE) para parsing server-side de CSV y Excel.

### `apps/api/tests/setup.ts`
Agregados helpers `makeFormDataRequest` y `createCsvFile` para tests de file upload.

### `packages/shared/src/types/index.ts`
Re-exporta `./import`.

### `apps/web/src/lib/api.ts`
Exportados `handleResponse` y `API_BASE_URL` (antes privados) para uso en import-api con FormData.

### `apps/web/src/App.tsx`
Agregada ruta `/import` dentro del layout protegido.

### `apps/web/src/components/app-sidebar.tsx`
Agregado item "Importar" con `UploadIcon` en la navegación.

## Decisiones técnicas

### Parsing server-side con xlsx (SheetJS)
Se usa `xlsx` en el backend para parsear tanto CSV como XLSX con una sola librería. El frontend no necesita libs de parsing — solo envía el archivo crudo. Esto simplifica el flujo y permite validar/normalizar datos en un solo lugar.

### BOM UTF-8 en archivo de ejemplo
El CSV de ejemplo se genera con BOM (`\uFEFF`) para que Excel lo abra correctamente con caracteres acentuados. Pero xlsx (SheetJS) con `codepage: 65001` malinterpreta el offset del BOM, cortando los primeros 3 caracteres del primer header. La solución fue stripear manualmente los 3 bytes del BOM (`EF BB BF`) del buffer antes de pasarlo a `XLSX.read()`.

### raw: true + codepage: 65001 en XLSX.read
Sin `raw: true`, xlsx convierte fechas como `01/03/2026` a números seriales de Excel (46024.99...). Sin `codepage: 65001`, caracteres UTF-8 como `ó` se corrompen a `Ã³`. Ambas opciones son necesarias en conjunto.

### HTTPException → JSON en ruta parse
Las `HTTPException` de Hono devuelven text/plain por defecto vía `err.getResponse()`. Se agregó try-catch en la ruta `/import/parse` para capturar estas excepciones y devolver `{ error: message }` como JSON, permitiendo que el frontend muestre el mensaje real.

### Flujo parse → confirm en dos pasos
El diseño en dos pasos permite al usuario revisar y editar datos antes de insertar. El parse retorna un preview con errores/warnings/duplicados por fila, y el confirm solo recibe las filas validadas. Esto evita insertar datos incorrectos y da control al usuario sobre qué importar.

## Resultado

```
103 pass, 0 fail (88 existentes + 15 nuevos)
Web build: clean
Typecheck API + Web: clean
```

Test manual: archivo de ejemplo con BOM se parsea correctamente, preview muestra 4 filas con categorías matcheadas, confirmación inserta gastos e ingresos.

## Próxima fase

- Fase 5 por definir. Posibles: filtros avanzados, reportes, grupos, auto-generación de expenses desde recurrentes (cron/scheduler).
- Importación inteligente con IA (mapping automático de columnas arbitrarias) queda para v1.x.
