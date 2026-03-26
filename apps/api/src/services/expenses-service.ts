import { and, asc, count, desc, eq, gte, ilike, isNull, lt, lte, or } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../config/database';
import { categories, expenses } from '../db/schema';
import type { Expense, PaginatedResponse } from '@cuentas-claras/shared';

type DbExpense = typeof expenses.$inferSelect;

function toExpense(row: DbExpense): Expense {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    groupId: row.groupId,
    amount: parseFloat(row.amount),
    date: row.date.toISOString(),
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

interface ListFilters {
  month?: string; // YYYY-MM
  categoryId?: string;
  description?: string;
  amountMin?: number;
  amountMax?: number;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function list(userId: string, filters: ListFilters = {}): Promise<PaginatedResponse<Expense>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const conditions = [eq(expenses.userId, userId)];

  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    conditions.push(gte(expenses.date, start));
    conditions.push(lt(expenses.date, end));
  }

  if (filters.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }

  if (filters.description) {
    conditions.push(ilike(expenses.description, `%${filters.description}%`));
  }

  if (filters.amountMin !== undefined) {
    conditions.push(gte(expenses.amount, String(filters.amountMin)));
  }

  if (filters.amountMax !== undefined) {
    conditions.push(lte(expenses.amount, String(filters.amountMax)));
  }

  const whereClause = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(expenses).where(whereClause);
  const totalCount = Number(total);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const orderFn = filters.sortOrder === 'asc' ? asc : desc;
  const orderCol = filters.sortBy === 'amount' ? expenses.amount : expenses.date;

  const rows = await db
    .select()
    .from(expenses)
    .where(whereClause)
    .orderBy(orderFn(orderCol))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data: rows.map(toExpense),
    pagination: { total: totalCount, page, pageSize, totalPages },
  };
}

async function assertCategoryAccess(userId: string, categoryId: string): Promise<void> {
  const category = await db.query.categories.findFirst({
    where: and(
      eq(categories.id, categoryId),
      or(isNull(categories.userId), eq(categories.userId, userId)),
    ),
  });
  if (!category) throw new HTTPException(400, { message: 'Invalid or inaccessible category' });
}

export async function create(
  userId: string,
  input: { categoryId: string; amount: number; date: string; description?: string; groupId?: string },
): Promise<Expense> {
  await assertCategoryAccess(userId, input.categoryId);

  const [row] = await db
    .insert(expenses)
    .values({
      userId,
      categoryId: input.categoryId,
      groupId: input.groupId ?? null,
      amount: String(input.amount),
      date: new Date(input.date),
      description: input.description ?? null,
    })
    .returning();

  return toExpense(row);
}

export async function update(
  userId: string,
  expenseId: string,
  input: Partial<{ categoryId: string; amount: number; date: string; description: string; groupId: string }>,
): Promise<Expense> {
  const existing = await db.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
  if (!existing) throw new HTTPException(404, { message: 'Expense not found' });
  if (existing.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' });

  if (input.categoryId) await assertCategoryAccess(userId, input.categoryId);

  const updates: Partial<typeof expenses.$inferInsert> = {};
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
  if (input.amount !== undefined) updates.amount = String(input.amount);
  if (input.date !== undefined) updates.date = new Date(input.date);
  if (input.description !== undefined) updates.description = input.description;
  if (input.groupId !== undefined) updates.groupId = input.groupId;

  const [row] = await db.update(expenses).set(updates).where(eq(expenses.id, expenseId)).returning();
  return toExpense(row);
}

export async function remove(userId: string, expenseId: string): Promise<void> {
  const existing = await db.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
  if (!existing) throw new HTTPException(404, { message: 'Expense not found' });
  if (existing.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' });

  await db.delete(expenses).where(eq(expenses.id, expenseId));
}
