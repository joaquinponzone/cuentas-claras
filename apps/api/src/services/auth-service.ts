import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../config/database';
import { users } from '../db/schema';
import { hashPassword, comparePasswords } from '../utils/password';
import { signJWT } from '../utils/jwt';
import type { RegisterInput, LoginInput, User } from '@cuentas-claras/shared';

type DbUser = typeof users.$inferSelect;

function toUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    currency: dbUser.currency,
    timezone: dbUser.timezone,
    telegramChatId: dbUser.telegramChatId,
    createdAt: dbUser.createdAt.toISOString(),
    updatedAt: dbUser.updatedAt.toISOString(),
  };
}

export async function register(input: RegisterInput): Promise<{ user: User; token: string }> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });
  if (existing) {
    throw new HTTPException(409, { message: 'Email already registered' });
  }

  const passwordHash = await hashPassword(input.password);
  const [dbUser] = await db.insert(users).values({
    email: input.email,
    name: input.name,
    passwordHash,
  }).returning();

  const user = toUser(dbUser);
  const token = await signJWT({ sub: user.id });
  return { user, token };
}

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!dbUser) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }

  const valid = await comparePasswords(input.password, dbUser.passwordHash);
  if (!valid) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }

  const user = toUser(dbUser);
  const token = await signJWT({ sub: user.id });
  return { user, token };
}

export async function getCurrentUser(userId: string): Promise<User> {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!dbUser) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  return toUser(dbUser);
}
