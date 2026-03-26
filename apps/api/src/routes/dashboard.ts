import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as dashboardService from '../services/dashboard-service';
import type { users } from '../db/schema';

type Variables = { user: typeof users.$inferSelect };
const dashboardRoutes = new Hono<{ Variables: Variables }>();

const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validationHook(result: any, c: any) {
  if (!result.success) {
    const message = result.error?.issues?.[0]?.message ?? 'Datos inválidos';
    return c.json({ error: message }, 400);
  }
}

dashboardRoutes.use('*', authMiddleware);

dashboardRoutes.get('/summary', zValidator('query', monthQuerySchema, validationHook), async (c) => {
  const user = c.get('user');
  const { month } = c.req.valid('query');
  const data = await dashboardService.getSummary(user.id, month);
  return c.json(data);
});

dashboardRoutes.get('/by-category', zValidator('query', monthQuerySchema, validationHook), async (c) => {
  const user = c.get('user');
  const { month } = c.req.valid('query');
  const data = await dashboardService.getByCategory(user.id, month);
  return c.json(data);
});

dashboardRoutes.get('/recurring-upcoming', async (c) => {
  const user = c.get('user');
  const data = await dashboardService.getUpcoming(user.id);
  return c.json(data);
});

export { dashboardRoutes };
