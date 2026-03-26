import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import { makeRequest, seedDefaultCategories, cleanTestData, registerUser, getDefaultCategoryId } from './setup';

const USER_A = { email: 'exp_a@test.com', name: 'User A', password: '123456' };
const USER_B = { email: 'exp_b@test.com', name: 'User B', password: '123456' };

beforeAll(async () => {
  await seedDefaultCategories();
});

beforeEach(async () => {
  await cleanTestData();
});

describe('GET /expenses', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('GET', '/expenses');
    expect(res.status).toBe(401);
  });

  it('returns empty data when no expenses', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('GET', '/expenses', undefined, cookie);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[]; pagination: unknown };
    expect(body.data).toEqual([]);
    expect(body.pagination).toBeDefined();
  });

  it("does not return another user's expenses", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA);

    await makeRequest('POST', '/expenses', { categoryId: catId, amount: 50, date: '2026-03-01T00:00:00.000Z' }, cookieA);

    const res = await makeRequest('GET', '/expenses', undefined, cookieB);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data.length).toBe(0);
  });
});

describe('POST /expenses', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('POST', '/expenses', {});
    expect(res.status).toBe(401);
  });

  it('creates an expense with valid data', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const res = await makeRequest('POST', '/expenses', {
      categoryId: catId,
      amount: 100.50,
      date: '2026-03-01T00:00:00.000Z',
      description: 'Supermercado',
    }, cookie);

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.amount).toBe(100.5);
    expect(body.description).toBe('Supermercado');
    expect(body.categoryId).toBe(catId);
    expect(body.userId).toBeTruthy();
    expect(body.createdAt).toBeTruthy();
  });

  it('returns 400 for inaccessible category', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('POST', '/expenses', {
      categoryId: '00000000-0000-0000-0000-000000000000',
      amount: 50,
      date: '2026-03-01T00:00:00.000Z',
    }, cookie);

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing required fields', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('POST', '/expenses', { amount: 50 }, cookie);
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative amount', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const res = await makeRequest('POST', '/expenses', {
      categoryId: catId,
      amount: -10,
      date: '2026-03-01T00:00:00.000Z',
    }, cookie);
    expect(res.status).toBe(400);
  });
});

describe('GET /expenses?month=', () => {
  it('filters expenses by month', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    await makeRequest('POST', '/expenses', { categoryId: catId, amount: 10, date: '2026-03-15T00:00:00.000Z' }, cookie);
    await makeRequest('POST', '/expenses', { categoryId: catId, amount: 20, date: '2026-02-15T00:00:00.000Z' }, cookie);

    const res = await makeRequest('GET', '/expenses?month=2026-03', undefined, cookie);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    expect(body.data.length).toBe(1);
    expect(body.data[0].amount).toBe(10);
  });

  it('returns expenses ordered by date DESC', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    await makeRequest('POST', '/expenses', { categoryId: catId, amount: 10, date: '2026-03-01T00:00:00.000Z' }, cookie);
    await makeRequest('POST', '/expenses', { categoryId: catId, amount: 20, date: '2026-03-15T00:00:00.000Z' }, cookie);

    const res = await makeRequest('GET', '/expenses?month=2026-03', undefined, cookie);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    expect(body.data[0].amount).toBe(20); // more recent first
  });
});

describe('PUT /expenses/:id', () => {
  it('updates amount and description of own expense', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const createRes = await makeRequest('POST', '/expenses', {
      categoryId: catId, amount: 50, date: '2026-03-01T00:00:00.000Z',
    }, cookie);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('PUT', `/expenses/${created.id}`, { amount: 75, description: 'Updated' }, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.amount).toBe(75);
    expect(body.description).toBe('Updated');
  });

  it("returns 403 for another user's expense", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA);

    const createRes = await makeRequest('POST', '/expenses', {
      categoryId: catId, amount: 50, date: '2026-03-01T00:00:00.000Z',
    }, cookieA);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('PUT', `/expenses/${created.id}`, { amount: 75 }, cookieB);
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent expense', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('PUT', '/expenses/00000000-0000-0000-0000-000000000000', { amount: 75 }, cookie);
    expect(res.status).toBe(404);
  });

  it('returns 401 without cookie', async () => {
    const res = await makeRequest('PUT', '/expenses/00000000-0000-0000-0000-000000000000', { amount: 75 });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /expenses/:id', () => {
  it('deletes own expense', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const createRes = await makeRequest('POST', '/expenses', {
      categoryId: catId, amount: 50, date: '2026-03-01T00:00:00.000Z',
    }, cookie);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('DELETE', `/expenses/${created.id}`, undefined, cookie);
    expect(res.status).toBe(200);

    const listRes = await makeRequest('GET', '/expenses', undefined, cookie);
    const listBody = (await listRes.json()) as { data: unknown[] };
    expect(listBody.data.length).toBe(0);
  });

  it("returns 403 for another user's expense", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA);

    const createRes = await makeRequest('POST', '/expenses', {
      categoryId: catId, amount: 50, date: '2026-03-01T00:00:00.000Z',
    }, cookieA);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('DELETE', `/expenses/${created.id}`, undefined, cookieB);
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent expense', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('DELETE', '/expenses/00000000-0000-0000-0000-000000000000', undefined, cookie);
    expect(res.status).toBe(404);
  });

  it('returns 401 without cookie', async () => {
    const res = await makeRequest('DELETE', '/expenses/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });
});
