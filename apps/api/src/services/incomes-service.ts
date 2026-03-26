import { and, asc, count, desc, eq, gte, ilike, isNull, lt, lte, or } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../config/database';
import { categories, incomes } from '../db/schema';
import type { Income, PaginatedResponse } from '@cuentas-claras/shared';

type DbIncome = typeof incomes.$inferSelect;

function toIncome(row: DbIncome): Income {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    amount: parseFloat(row.amount),
    date: row.date.toISOString(),
    source: row.source,
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

export async function list(userId: string, filters: ListFilters = {}): Promise<PaginatedResponse<Income>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const conditions = [eq(incomes.userId, userId)];

  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    conditions.push(gte(incomes.date, start));
    conditions.push(lt(incomes.date, end));
  }

  if (filters.categoryId) {
    conditions.push(eq(incomes.categoryId, filters.categoryId));
  }

  if (filters.description) {
    conditions.push(ilike(incomes.description, `%${filters.description}%`));
  }

  if (filters.amountMin !== undefined) {
    conditions.push(gte(incomes.amount, String(filters.amountMin)));
  }

  if (filters.amountMax !== undefined) {
    conditions.push(lte(incomes.amount, String(filters.amountMax)));
  }

  const whereClause = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(incomes).where(whereClause);
  const totalCount = Number(total);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const orderFn = filters.sortOrder === 'asc' ? asc : desc;
  const orderCol = filters.sortBy === 'amount' ? incomes.amount : incomes.date;

  const rows = await db
    .select()
    .from(incomes)
    .where(whereClause)
    .orderBy(orderFn(orderCol))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data: rows.map(toIncome),
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
  input: { categoryId: string; amount: number; date: string; source?: string; description?: string },
): Promise<Income> {
  await assertCategoryAccess(userId, input.categoryId);

  const [row] = await db
    .insert(incomes)
    .values({
      userId,
      categoryId: input.categoryId,
      amount: String(input.amount),
      date: new Date(input.date),
      source: input.source ?? null,
      description: input.description ?? null,
    })
    .returning();

  return toIncome(row);
}

export async function update(
  userId: string,
  incomeId: string,
  input: Partial<{ categoryId: string; amount: number; date: string; source: string; description: string }>,
): Promise<Income> {
  const existing = await db.query.incomes.findFirst({ where: eq(incomes.id, incomeId) });
  if (!existing) throw new HTTPException(404, { message: 'Income not found' });
  if (existing.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' });

  if (input.categoryId) await assertCategoryAccess(userId, input.categoryId);

  const updates: Partial<typeof incomes.$inferInsert> = {};
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
  if (input.amount !== undefined) updates.amount = String(input.amount);
  if (input.date !== undefined) updates.date = new Date(input.date);
  if (input.source !== undefined) updates.source = input.source;
  if (input.description !== undefined) updates.description = input.description;

  const [row] = await db.update(incomes).set(updates).where(eq(incomes.id, incomeId)).returning();
  return toIncome(row);
}

export async function remove(userId: string, incomeId: string): Promise<void> {
  const existing = await db.query.incomes.findFirst({ where: eq(incomes.id, incomeId) });
  if (!existing) throw new HTTPException(404, { message: 'Income not found' });
  if (existing.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' });

  await db.delete(incomes).where(eq(incomes.id, incomeId));
}
