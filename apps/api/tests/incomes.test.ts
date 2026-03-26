import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import { makeRequest, seedDefaultCategories, cleanTestData, registerUser, getDefaultCategoryId } from './setup';

const USER_A = { email: 'inc_a@test.com', name: 'User A', password: '123456' };
const USER_B = { email: 'inc_b@test.com', name: 'User B', password: '123456' };

beforeAll(async () => {
  await seedDefaultCategories();
});

beforeEach(async () => {
  await cleanTestData();
});

describe('GET /incomes', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('GET', '/incomes');
    expect(res.status).toBe(401);
  });

  it('returns empty data when no incomes', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('GET', '/incomes', undefined, cookie);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[]; pagination: unknown };
    expect(body.data).toEqual([]);
    expect(body.pagination).toBeDefined();
  });

  it("does not return another user's incomes", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA, 'income');

    await makeRequest('POST', '/incomes', { categoryId: catId, amount: 1000, date: '2026-03-01T00:00:00.000Z' }, cookieA);

    const res = await makeRequest('GET', '/incomes', undefined, cookieB);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data.length).toBe(0);
  });
});

describe('POST /incomes', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('POST', '/incomes', {});
    expect(res.status).toBe(401);
  });

  it('creates an income with valid data', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'income');

    const res = await makeRequest('POST', '/incomes', {
      categoryId: catId,
      amount: 150000,
      date: '2026-03-01T00:00:00.000Z',
      source: 'Empresa SRL',
      description: 'Sueldo marzo',
    }, cookie);

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.amount).toBe(150000);
    expect(body.source).toBe('Empresa SRL');
    expect(body.description).toBe('Sueldo marzo');
    expect(body.categoryId).toBe(catId);
    expect(body.userId).toBeTruthy();
  });

  it('creates income without optional fields', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'income');

    const res = await makeRequest('POST', '/incomes', {
      categoryId: catId,
      amount: 5000,
      date: '2026-03-01T00:00:00.000Z',
    }, cookie);

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.source).toBeNull();
    expect(body.description).toBeNull();
  });

  it('returns 400 for inaccessible category', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('POST', '/incomes', {
      categoryId: '00000000-0000-0000-0000-000000000000',
      amount: 1000,
      date: '2026-03-01T00:00:00.000Z',
    }, cookie);

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing required fields', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('POST', '/incomes', { amount: 1000 }, cookie);
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative amount', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'income');

    const res = await makeRequest('POST', '/incomes', {
      categoryId: catId,
      amount: -500,
      date: '2026-03-01T00:00:00.000Z',
    }, cookie);
    expect(res.status).toBe(400);
  });
});

describe('GET /incomes?month=', () => {
  it('filters incomes by month', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'income');

    await makeRequest('POST', '/incomes', { categoryId: catId, amount: 1000, date: '2026-03-15T00:00:00.000Z' }, cookie);
    await makeRequest('POST', '/incomes', { categoryId: catId, amount: 2000, date: '2026-02-15T00:00:00.000Z' }, cookie);

    const res = await makeRequest('GET', '/incomes?month=2026-03', undefined, cookie);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    expect(body.data.length).toBe(1);
    expect(body.data[0].amount).toBe(1000);
  });
});

describe('PUT /incomes/:id', () => {
  it('updates amount and source of own income', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'income');

    const createRes = await makeRequest('POST', '/incomes', {
      categoryId: catId, amount: 1000, date: '2026-03-01T00:00:00.000Z',
    }, cookie);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('PUT', `/incomes/${created.id}`, { amount: 1500, source: 'Nuevo cliente' }, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.amount).toBe(1500);
    expect(body.source).toBe('Nuevo cliente');
  });

  it("returns 403 for another user's income", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA, 'income');

    const createRes = await makeRequest('POST', '/incomes', {
      categoryId: catId, amount: 1000, date: '2026-03-01T00:00:00.000Z',
    }, cookieA);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('PUT', `/incomes/${created.id}`, { amount: 1500 }, cookieB);
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent income', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('PUT', '/incomes/00000000-0000-0000-0000-000000000000', { amount: 999 }, cookie);
    expect(res.status).toBe(404);
  });

  it('returns 401 without cookie', async () => {
    const res = await makeRequest('PUT', '/incomes/00000000-0000-0000-0000-000000000000', { amount: 999 });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /incomes/:id', () => {
  it('deletes own income', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie, 'income');

    const createRes = await makeRequest('POST', '/incomes', {
      categoryId: catId, amount: 1000, date: '2026-03-01T00:00:00.000Z',
    }, cookie);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('DELETE', `/incomes/${created.id}`, undefined, cookie);
    expect(res.status).toBe(200);

    const listRes = await makeRequest('GET', '/incomes', undefined, cookie);
    const listBody = (await listRes.json()) as { data: unknown[] };
    expect(listBody.data.length).toBe(0);
  });

  it("returns 403 for another user's income", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA, 'income');

    const createRes = await makeRequest('POST', '/incomes', {
      categoryId: catId, amount: 1000, date: '2026-03-01T00:00:00.000Z',
    }, cookieA);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('DELETE', `/incomes/${created.id}`, undefined, cookieB);
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent income', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('DELETE', '/incomes/00000000-0000-0000-0000-000000000000', undefined, cookie);
    expect(res.status).toBe(404);
  });

  it('returns 401 without cookie', async () => {
    const res = await makeRequest('DELETE', '/incomes/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });
});
