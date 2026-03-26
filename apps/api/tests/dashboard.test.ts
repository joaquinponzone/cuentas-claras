import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import { makeRequest, seedDefaultCategories, cleanTestData, registerUser, getDefaultCategoryId } from './setup';

const USER_A = { email: 'dash_a@test.com', name: 'Dash A', password: '123456' };

beforeAll(async () => {
  await seedDefaultCategories();
});

beforeEach(async () => {
  await cleanTestData();
});

describe('GET /dashboard/summary', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('GET', '/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('returns zeros for month with no data', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('GET', '/dashboard/summary?month=2026-03', undefined, cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.totalExpenses).toBe(0);
    expect(body.totalIncomes).toBe(0);
    expect(body.balance).toBe(0);
    expect(body.avgDailyExpense).toBe(0);
    expect(body.month).toBe('2026-03');
  });

  it('returns correct totals with data', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'expense');

    await makeRequest('POST', '/expenses', {
      categoryId: catId,
      amount: 1000,
      date: '2026-03-10T00:00:00.000Z',
    }, cookie);

    await makeRequest('POST', '/expenses', {
      categoryId: catId,
      amount: 500,
      date: '2026-03-15T00:00:00.000Z',
    }, cookie);

    const incomeCatId = await getDefaultCategoryId(cookie, 'income');
    await makeRequest('POST', '/incomes', {
      categoryId: incomeCatId,
      amount: 3000,
      date: '2026-03-01T00:00:00.000Z',
    }, cookie);

    const res = await makeRequest('GET', '/dashboard/summary?month=2026-03', undefined, cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.totalExpenses).toBe(1500);
    expect(body.totalIncomes).toBe(3000);
    expect(body.balance).toBe(1500);
    // March has 31 days: 1500/31 ≈ 48.39
    expect(typeof body.avgDailyExpense).toBe('number');
    expect((body.avgDailyExpense as number)).toBeGreaterThan(0);
  });

  it('returns null variation when no prev month data', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'expense');
    await makeRequest('POST', '/expenses', {
      categoryId: catId,
      amount: 100,
      date: '2026-03-10T00:00:00.000Z',
    }, cookie);

    const res = await makeRequest('GET', '/dashboard/summary?month=2026-03', undefined, cookie);
    const body = await res.json() as Record<string, unknown>;
    expect(body.expenseVariation).toBeNull();
    expect(body.incomeVariation).toBeNull();
  });
});

describe('GET /dashboard/by-category', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('GET', '/dashboard/by-category');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no expenses', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('GET', '/dashboard/by-category?month=2026-03', undefined, cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it('returns categories sorted by total descending', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'expense');

    await makeRequest('POST', '/expenses', { categoryId: catId, amount: 200, date: '2026-03-05T00:00:00.000Z' }, cookie);
    await makeRequest('POST', '/expenses', { categoryId: catId, amount: 300, date: '2026-03-10T00:00:00.000Z' }, cookie);

    const res = await makeRequest('GET', '/dashboard/by-category?month=2026-03', undefined, cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>[];
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].total).toBe(500);
    expect(body[0].percentage).toBe(100);
    expect(typeof body[0].categoryName).toBe('string');
  });
});

describe('GET /dashboard/recurring-upcoming', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('GET', '/dashboard/recurring-upcoming');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no upcoming recurring expenses', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('GET', '/dashboard/recurring-upcoming', undefined, cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('returns upcoming recurring expenses within 7 days', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'expense');

    // Due tomorrow
    const tomorrow = new Date(Date.now() + 86400_000).toISOString();
    await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId,
      amount: 500,
      description: 'Netflix',
      frequency: 'monthly',
      nextDueDate: tomorrow,
    }, cookie);

    const res = await makeRequest('GET', '/dashboard/recurring-upcoming', undefined, cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>[];
    expect(body.length).toBe(1);
    expect(body[0].description).toBe('Netflix');
    expect(body[0].amount).toBe(500);
    expect(typeof body[0].daysUntilDue).toBe('number');
  });
});
