import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as incomesService from '../services/incomes-service';
import type { users } from '../db/schema';

type Variables = { user: typeof users.$inferSelect };
const incomesRoutes = new Hono<{ Variables: Variables }>();

const listQuerySchema = z.object({
  month:       z.string().regex(/^\d{4}-\d{2}$/).optional(),
  categoryId:  z.string().uuid().optional(),
  description: z.string().max(200).optional(),
  amountMin:   z.coerce.number().positive().optional(),
  amountMax:   z.coerce.number().positive().optional(),
  sortBy:      z.enum(['date', 'amount']).optional(),
  sortOrder:   z.enum(['asc', 'desc']).optional(),
  page:        z.coerce.number().int().min(1).optional(),
});

const createIncomeSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().datetime(),
  source: z.string().optional(),
  description: z.string().optional(),
});

const updateIncomeSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  date: z.string().datetime().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validationHook(result: any, c: any) {
  if (!result.success) {
    const message = result.error?.issues?.[0]?.message ?? 'Datos inválidos';
    return c.json({ error: message }, 400);
  }
}

incomesRoutes.use('*', authMiddleware);

incomesRoutes.get('/', zValidator('query', listQuerySchema, validationHook), async (c) => {
  const user = c.get('user');
  const query = c.req.valid('query');
  const data = await incomesService.list(user.id, query);
  return c.json(data);
});

incomesRoutes.post('/', zValidator('json', createIncomeSchema, validationHook), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');
  const income = await incomesService.create(user.id, input);
  return c.json(income, 201);
});

incomesRoutes.put('/:id', zValidator('json', updateIncomeSchema, validationHook), async (c) => {
  const user = c.get('user');
  const incomeId = c.req.param('id');
  const input = c.req.valid('json');
  const income = await incomesService.update(user.id, incomeId, input);
  return c.json(income);
});

incomesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const incomeId = c.req.param('id');
  await incomesService.remove(user.id, incomeId);
  return c.json({ message: 'Income deleted' });
});

export { incomesRoutes };
