import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as expensesService from '../services/expenses-service';
import type { users } from '../db/schema';

type Variables = { user: typeof users.$inferSelect };
const expensesRoutes = new Hono<{ Variables: Variables }>();

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

const createExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().datetime(),
  description: z.string().optional(),
  groupId: z.string().uuid().optional(),
});

const updateExpenseSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  date: z.string().datetime().optional(),
  description: z.string().optional(),
  groupId: z.string().uuid().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validationHook(result: any, c: any) {
  if (!result.success) {
    const message = result.error?.issues?.[0]?.message ?? 'Datos inválidos';
    return c.json({ error: message }, 400);
  }
}

expensesRoutes.use('*', authMiddleware);

expensesRoutes.get('/', zValidator('query', listQuerySchema, validationHook), async (c) => {
  const user = c.get('user');
  const query = c.req.valid('query');
  const data = await expensesService.list(user.id, query);
  return c.json(data);
});

expensesRoutes.post('/', zValidator('json', createExpenseSchema, validationHook), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');
  const expense = await expensesService.create(user.id, input);
  return c.json(expense, 201);
});

expensesRoutes.put('/:id', zValidator('json', updateExpenseSchema, validationHook), async (c) => {
  const user = c.get('user');
  const expenseId = c.req.param('id');
  const input = c.req.valid('json');
  const expense = await expensesService.update(user.id, expenseId, input);
  return c.json(expense);
});

expensesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const expenseId = c.req.param('id');
  await expensesService.remove(user.id, expenseId);
  return c.json({ message: 'Expense deleted' });
});

export { expensesRoutes };
