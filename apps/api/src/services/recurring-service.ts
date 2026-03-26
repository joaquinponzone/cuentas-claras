import { and, eq, isNull, or } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../config/database';
import { categories, recurringExpenses } from '../db/schema';
import type { RecurringExpense } from '@cuentas-claras/shared';

type DbRecurring = typeof recurringExpenses.$inferSelect;

function toRecurringExpense(row: DbRecurring): RecurringExpense {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    amount: parseFloat(row.amount),
    description: row.description,
    frequency: row.frequency as RecurringExpense['frequency'],
    nextDueDate: row.nextDueDate.toISOString(),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
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

function advanceDueDate(current: Date, frequency: string): Date {
  const next = new Date(current);
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export async function list(
  userId: string,
  filters: { isActive?: boolean } = {},
): Promise<RecurringExpense[]> {
  const conditions = [eq(recurringExpenses.userId, userId)];

  if (filters.isActive !== undefined) {
    conditions.push(eq(recurringExpenses.isActive, filters.isActive));
  }

  const rows = await db
    .select()
    .from(recurringExpenses)
    .where(and(...conditions));

  return rows.map(toRecurringExpense);
}

export async function create(
  userId: string,
  input: { categoryId: string; amount: number; description?: string; frequency: string; nextDueDate: string },
): Promise<RecurringExpense> {
  await assertCategoryAccess(userId, input.categoryId);

  const [row] = await db
    .insert(recurringExpenses)
    .values({
      userId,
      categoryId: input.categoryId,
      amount: String(input.amount),
      description: input.description ?? null,
      frequency: input.frequency,
      nextDueDate: new Date(input.nextDueDate),
    })
    .returning();

  return toRecurringExpense(row);
}

export async function update(
  userId: string,
  id: string,
  input: Partial<{ categoryId: string; amount: number; description: string; frequency: string; nextDueDate: string }>,
): Promise<RecurringExpense> {
  const existing = await db.query.recurringExpenses.findFirst({ where: eq(recurringExpenses.id, id) });
  if (!existing) throw new HTTPException(404, { message: 'Recurring expense not found' });
  if (existing.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' });

  if (input.categoryId) await assertCategoryAccess(userId, input.categoryId);

  const updates: Partial<typeof recurringExpenses.$inferInsert> = {};
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
  if (input.amount !== undefined) updates.amount = String(input.amount);
  if (input.description !== undefined) updates.description = input.description;
  if (input.frequency !== undefined) updates.frequency = input.frequency;
  if (input.nextDueDate !== undefined) updates.nextDueDate = new Date(input.nextDueDate);

  const [row] = await db.update(recurringExpenses).set(updates).where(eq(recurringExpenses.id, id)).returning();
  return toRecurringExpense(row);
}

export async function toggle(userId: string, id: string): Promise<RecurringExpense> {
  const existing = await db.query.recurringExpenses.findFirst({ where: eq(recurringExpenses.id, id) });
  if (!existing) throw new HTTPException(404, { message: 'Recurring expense not found' });
  if (existing.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' });

  const newActive = !existing.isActive;
  let nextDueDate = existing.nextDueDate;

  // If reactivating and nextDueDate is in the past, advance to future
  if (newActive && existing.nextDueDate < new Date()) {
    while (nextDueDate < new Date()) {
      nextDueDate = advanceDueDate(nextDueDate, existing.frequency);
    }
  }

  const [row] = await db
    .update(recurringExpenses)
    .set({ isActive: newActive, nextDueDate })
    .where(eq(recurringExpenses.id, id))
    .returning();

  return toRecurringExpense(row);
}

export async function remove(userId: string, id: string): Promise<void> {
  const existing = await db.query.recurringExpenses.findFirst({ where: eq(recurringExpenses.id, id) });
  if (!existing) throw new HTTPException(404, { message: 'Recurring expense not found' });
  if (existing.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' });

  await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));
}
