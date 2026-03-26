import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as recurringService from '../services/recurring-service';
import type { users } from '../db/schema';

type Variables = { user: typeof users.$inferSelect };
const recurringRoutes = new Hono<{ Variables: Variables }>();

const createSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'annual']),
  nextDueDate: z.string().datetime(),
});

const updateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'annual']).optional(),
  nextDueDate: z.string().datetime().optional(),
});

const listQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validationHook(result: any, c: any) {
  if (!result.success) {
    const message = result.error?.issues?.[0]?.message ?? 'Datos inválidos';
    return c.json({ error: message }, 400);
  }
}

recurringRoutes.use('*', authMiddleware);

recurringRoutes.get('/', zValidator('query', listQuerySchema, validationHook), async (c) => {
  const user = c.get('user');
  const query = c.req.valid('query');
  const filters = query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {};
  const data = await recurringService.list(user.id, filters);
  return c.json(data);
});

recurringRoutes.post('/', zValidator('json', createSchema, validationHook), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');
  const recurring = await recurringService.create(user.id, input);
  return c.json(recurring, 201);
});

recurringRoutes.put('/:id', zValidator('json', updateSchema, validationHook), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const recurring = await recurringService.update(user.id, id, input);
  return c.json(recurring);
});

recurringRoutes.patch('/:id/toggle', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const recurring = await recurringService.toggle(user.id, id);
  return c.json(recurring);
});

recurringRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await recurringService.remove(user.id, id);
  return c.json({ message: 'Recurring expense deleted' });
});

export { recurringRoutes };
