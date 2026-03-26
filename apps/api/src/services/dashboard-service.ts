import { and, desc, eq, gte, isNull, lt, lte, or, sql, sum } from 'drizzle-orm';
import { db } from '../config/database';
import { categories, expenses, incomes, recurringExpenses } from '../db/schema';
import type { CategoryBreakdown, DashboardSummary, RecurringUpcoming } from '@cuentas-claras/shared';

function parseMonth(month: string): { start: Date; end: Date; daysInMonth: number } {
  const [year, mo] = month.split('-').map(Number);
  const start = new Date(year, mo - 1, 1);
  const end = new Date(year, mo, 1);
  const daysInMonth = new Date(year, mo, 0).getDate();
  return { start, end, daysInMonth };
}

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonthStr(month: string): string {
  const [y, mo] = month.split('-').map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function sumExpenses(userId: string, start: Date, end: Date): Promise<number> {
  const [row] = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.date, start), lt(expenses.date, end)));
  return parseFloat(row?.total ?? '0');
}

async function sumIncomes(userId: string, start: Date, end: Date): Promise<number> {
  const [row] = await db
    .select({ total: sum(incomes.amount) })
    .from(incomes)
    .where(and(eq(incomes.userId, userId), gte(incomes.date, start), lt(incomes.date, end)));
  return parseFloat(row?.total ?? '0');
}

function calcVariation(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

export async function getSummary(userId: string, month?: string): Promise<DashboardSummary> {
  const m = month ?? currentMonthStr();
  const prev = prevMonthStr(m);

  const { start, end, daysInMonth } = parseMonth(m);
  const { start: prevStart, end: prevEnd } = parseMonth(prev);

  const [totalExpenses, totalIncomes, prevExpenses, prevIncomes] = await Promise.all([
    sumExpenses(userId, start, end),
    sumIncomes(userId, start, end),
    sumExpenses(userId, prevStart, prevEnd),
    sumIncomes(userId, prevStart, prevEnd),
  ]);

  return {
    totalExpenses,
    totalIncomes,
    balance: totalIncomes - totalExpenses,
    expenseVariation: calcVariation(totalExpenses, prevExpenses),
    incomeVariation: calcVariation(totalIncomes, prevIncomes),
    avgDailyExpense: totalExpenses / daysInMonth,
    month: m,
  };
}

export async function getByCategory(
  userId: string,
  month?: string,
  limit = 5,
): Promise<CategoryBreakdown[]> {
  const m = month ?? currentMonthStr();
  const { start, end } = parseMonth(m);

  const rows = await db
    .select({
      categoryId: expenses.categoryId,
      total: sum(expenses.amount),
    })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.date, start), lt(expenses.date, end)))
    .groupBy(expenses.categoryId)
    .orderBy(desc(sql`sum(${expenses.amount})`))
    .limit(limit);

  if (rows.length === 0) return [];

  const totalAll = rows.reduce((s, r) => s + parseFloat(r.total ?? '0'), 0);

  const categoryIds = rows.map((r) => r.categoryId);
  const catRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      and(
        sql`${categories.id} = ANY(${sql.raw(`ARRAY[${categoryIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})`,
        or(isNull(categories.userId), eq(categories.userId, userId)),
      ),
    );

  const catMap = Object.fromEntries(catRows.map((c) => [c.id, c.name]));

  return rows.map((r) => {
    const total = parseFloat(r.total ?? '0');
    return {
      categoryId: r.categoryId,
      categoryName: catMap[r.categoryId] ?? 'Desconocida',
      total,
      percentage: totalAll > 0 ? (total / totalAll) * 100 : 0,
    };
  });
}

export async function getUpcoming(userId: string, days = 7): Promise<RecurringUpcoming[]> {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86400_000);

  const rows = await db
    .select({
      id: recurringExpenses.id,
      description: recurringExpenses.description,
      amount: recurringExpenses.amount,
      frequency: recurringExpenses.frequency,
      nextDueDate: recurringExpenses.nextDueDate,
      categoryId: recurringExpenses.categoryId,
    })
    .from(recurringExpenses)
    .where(
      and(
        eq(recurringExpenses.userId, userId),
        eq(recurringExpenses.isActive, true),
        lte(recurringExpenses.nextDueDate, until),
      ),
    )
    .orderBy(recurringExpenses.nextDueDate);

  if (rows.length === 0) return [];

  const categoryIds = rows.map((r) => r.categoryId);
  const catRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      and(
        sql`${categories.id} = ANY(${sql.raw(`ARRAY[${categoryIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})`,
        or(isNull(categories.userId), eq(categories.userId, userId)),
      ),
    );

  const catMap = Object.fromEntries(catRows.map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    categoryName: catMap[r.categoryId] ?? 'Desconocida',
    amount: parseFloat(r.amount),
    frequency: r.frequency,
    nextDueDate: r.nextDueDate.toISOString(),
    daysUntilDue: Math.max(0, Math.floor((r.nextDueDate.getTime() - now.getTime()) / 86400_000)),
  }));
}
