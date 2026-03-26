import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as categoriesService from '../services/categories-service';
import type { users } from '../db/schema';

type Variables = { user: typeof users.$inferSelect };
const categoriesRoutes = new Hono<{ Variables: Variables }>();

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['expense', 'income']),
  icon: z.string().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validationHook(result: any, c: any) {
  if (!result.success) {
    const message = result.error?.issues?.[0]?.message ?? 'Datos inválidos';
    return c.json({ error: message }, 400);
  }
}

categoriesRoutes.use('*', authMiddleware);

categoriesRoutes.get('/', async (c) => {
  const user = c.get('user');
  const data = await categoriesService.list(user.id);
  return c.json(data);
});

categoriesRoutes.post('/', zValidator('json', createCategorySchema, validationHook), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');
  const category = await categoriesService.create(user.id, input);
  return c.json(category, 201);
});

categoriesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const categoryId = c.req.param('id');
  await categoriesService.remove(user.id, categoryId);
  return c.json({ message: 'Category deleted' });
});

export { categoriesRoutes };
