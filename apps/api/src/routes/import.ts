import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as importService from '../services/import-service';
import type { users } from '../db/schema';

type Variables = { user: typeof users.$inferSelect };
const importRoutes = new Hono<{ Variables: Variables }>();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

const confirmSchema = z.object({
  rows: z.array(
    z.object({
      date: z.string(),
      amount: z.number().positive(),
      type: z.enum(['expense', 'income']),
      categoryId: z.string().uuid(),
      description: z.string().optional(),
      source: z.string().optional(),
    }),
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validationHook(result: any, c: any) {
  if (!result.success) {
    const message = result.error?.issues?.[0]?.message ?? 'Datos inválidos';
    return c.json({ error: message }, 400);
  }
}

importRoutes.use('*', authMiddleware);

importRoutes.post('/parse', async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();
  const file = body.file;
  const defaultType = (body.defaultType as string) || 'expense';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Archivo requerido' }, 400);
  }

  const fileName = file.name.toLowerCase();
  const ext = fileName.substring(fileName.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return c.json({ error: 'Formato no soportado. Usar .csv, .xlsx o .xls' }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: 'El archivo excede el límite de 5MB' }, 400);
  }

  const validTypes = ['expense', 'income', 'mixed'];
  if (!validTypes.includes(defaultType)) {
    return c.json({ error: 'defaultType debe ser expense, income o mixed' }, 400);
  }

  const buffer = await file.arrayBuffer();

  try {
    const preview = await importService.parse(
      user.id,
      buffer,
      file.name,
      defaultType as 'expense' | 'income' | 'mixed',
    );
    return c.json(preview);
  } catch (err) {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});

importRoutes.post('/confirm', zValidator('json', confirmSchema, validationHook), async (c) => {
  const user = c.get('user');
  const { rows } = c.req.valid('json');

  if (rows.length === 0) {
    return c.json({ error: 'No hay filas para importar' }, 400);
  }

  const result = await importService.confirm(user.id, rows);
  return c.json(result);
});

export { importRoutes };
