import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as authService from '../services/auth-service';
import type { users } from '../db/schema';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type Variables = { user: typeof users.$inferSelect };
const authRoutes = new Hono<{ Variables: Variables }>();

const COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'Lax' as const,
  maxAge: 60 * 60 * 24,
  secure: process.env.NODE_ENV === 'production',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validationHook(result: any, c: any) {
  if (!result.success) {
    const message = result.error?.issues?.[0]?.message ?? 'Datos inválidos';
    return c.json({ error: message }, 400);
  }
}

authRoutes.post('/register', zValidator('json', registerSchema, validationHook), async (c) => {
  const input = c.req.valid('json');
  const { user, token } = await authService.register(input);
  setCookie(c, 'token', token, COOKIE_OPTIONS);
  return c.json(user, 201);
});

authRoutes.post('/login', zValidator('json', loginSchema, validationHook), async (c) => {
  const input = c.req.valid('json');
  const { user, token } = await authService.login(input);
  setCookie(c, 'token', token, COOKIE_OPTIONS);
  return c.json(user);
});

authRoutes.post('/logout', async (c) => {
  deleteCookie(c, 'token', { path: '/' });
  return c.json({ message: 'Logged out' });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const dbUser = c.get('user') as typeof users.$inferSelect;
  return c.json({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    currency: dbUser.currency,
    timezone: dbUser.timezone,
    telegramChatId: dbUser.telegramChatId,
    createdAt: dbUser.createdAt.toISOString(),
    updatedAt: dbUser.updatedAt.toISOString(),
  });
});

export { authRoutes };
