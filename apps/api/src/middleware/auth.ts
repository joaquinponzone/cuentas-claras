import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { db } from '../config/database';
import { users } from '../db/schema';
import { verifyJWT } from '../utils/jwt';
import { eq } from 'drizzle-orm';

export const authMiddleware = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyJWT(token);
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub as string),
    });
    if (!user) return c.json({ error: 'User not found' }, 401);
    c.set('user', user);
    await next();
    return;
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
