import { and, eq, ilike, isNull } from 'drizzle-orm';
import { db } from '../src/config/database';
import { categories, expenses, groups, incomes, recurringExpenses, userGroups, users } from '../src/db/schema';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@cuentas-claras/shared';
import app from '../src/server';

export function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string,
) {
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers['Cookie'] = cookie;

  return app.request(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Idempotent: inserts 17 default categories if not already present. */
export async function seedDefaultCategories() {
  const existing = await db.select().from(categories).where(
    and(eq(categories.isDefault, true), isNull(categories.userId)),
  );
  if (existing.length > 0) return;

  await db.insert(categories).values([
    ...EXPENSE_CATEGORIES.map((name) => ({ name, type: 'expense' as const, isDefault: true, userId: null })),
    ...INCOME_CATEGORIES.map((name) => ({ name, type: 'income' as const, isDefault: true, userId: null })),
  ]);
}

/**
 * Cleans transient test data in FK-safe order.
 * Only deletes users with @test.com emails (seed users use @cuentas-claras.dev).
 * Default categories (userId IS NULL) are preserved.
 */
export async function cleanTestData() {
  const testUsers = await db.select({ id: users.id }).from(users).where(ilike(users.email, '%@test.com'));
  if (testUsers.length === 0) return;

  for (const { id } of testUsers) {
    await db.delete(recurringExpenses).where(eq(recurringExpenses.userId, id));
    await db.delete(expenses).where(eq(expenses.userId, id));
    await db.delete(incomes).where(eq(incomes.userId, id));
    await db.delete(userGroups).where(eq(userGroups.userId, id));
  }

  // Delete groups created by test users that now have no members
  for (const { id } of testUsers) {
    const owned = await db.select({ id: groups.id }).from(groups).where(eq(groups.createdBy, id));
    for (const g of owned) {
      const remaining = await db.select({ id: userGroups.id }).from(userGroups).where(eq(userGroups.groupId, g.id));
      if (remaining.length === 0) {
        await db.delete(groups).where(eq(groups.id, g.id));
      }
    }
  }

  for (const { id } of testUsers) {
    await db.delete(users).where(eq(users.id, id));
  }
}

/** Registers a user and returns the cookie string. */
export async function registerUser(user: { email: string; name: string; password: string }) {
  const res = await makeRequest('POST', '/auth/register', user);
  const header = res.headers.get('Set-Cookie')!;
  const match = header.match(/token=([^;]+)/);
  return `token=${match![1]}`;
}

/** Makes a FormData request (for file uploads). */
export function makeFormDataRequest(
  path: string,
  formData: FormData,
  cookie?: string,
) {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;

  return app.request(path, {
    method: 'POST',
    headers,
    body: formData,
  });
}

/** Creates a File object from CSV string content. */
export function createCsvFile(content: string, name = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

/** Returns the id of the first default category matching type. */
export async function getDefaultCategoryId(cookie: string, type: 'expense' | 'income' = 'expense') {
  const res = await makeRequest('GET', '/categories', undefined, cookie);
  const list = (await res.json()) as Record<string, unknown>[];
  return list.find((c) => c.type === type && c.isDefault === true)!.id as string;
}
