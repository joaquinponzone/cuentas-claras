import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import { makeRequest, seedDefaultCategories, cleanTestData, registerUser, getDefaultCategoryId } from './setup';

const USER_A = { email: 'rec_a@test.com', name: 'User A', password: '123456' };
const USER_B = { email: 'rec_b@test.com', name: 'User B', password: '123456' };

beforeAll(async () => {
  await seedDefaultCategories();
});

beforeEach(async () => {
  await cleanTestData();
});

describe('GET /recurring-expenses', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('GET', '/recurring-expenses');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no recurring expenses', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('GET', '/recurring-expenses', undefined, cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("does not return another user's recurring expenses", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA);

    await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: 100, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookieA);

    const res = await makeRequest('GET', '/recurring-expenses', undefined, cookieB);
    const body = await res.json();
    expect(body.length).toBe(0);
  });
});

describe('POST /recurring-expenses', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('POST', '/recurring-expenses', {});
    expect(res.status).toBe(401);
  });

  it('creates a recurring expense with valid data', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const res = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId,
      amount: 5000,
      description: 'Alquiler',
      frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookie);

    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.amount).toBe(5000);
    expect(body.description).toBe('Alquiler');
    expect(body.frequency).toBe('monthly');
    expect(body.isActive).toBe(true);
  });

  it('returns 400 for invalid frequency', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const res = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: 100, frequency: 'daily',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookie);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing required fields', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('POST', '/recurring-expenses', { amount: 50 }, cookie);
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative amount', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const res = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: -10, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookie);
    expect(res.status).toBe(400);
  });

  it('returns 400 for inaccessible category', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('POST', '/recurring-expenses', {
      categoryId: '00000000-0000-0000-0000-000000000000',
      amount: 100, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookie);
    expect(res.status).toBe(400);
  });
});

describe('PUT /recurring-expenses/:id', () => {
  it('updates a recurring expense', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const createRes = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: 100, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookie);
    const created = await createRes.json() as Record<string, unknown>;

    const res = await makeRequest('PUT', `/recurring-expenses/${created.id}`, {
      amount: 200, description: 'Updated',
    }, cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.amount).toBe(200);
    expect(body.description).toBe('Updated');
  });

  it("returns 403 for another user's recurring expense", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA);

    const createRes = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: 100, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookieA);
    const created = await createRes.json() as Record<string, unknown>;

    const res = await makeRequest('PUT', `/recurring-expenses/${created.id}`, { amount: 200 }, cookieB);
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent recurring expense', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('PUT', '/recurring-expenses/00000000-0000-0000-0000-000000000000', { amount: 200 }, cookie);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /recurring-expenses/:id/toggle', () => {
  it('toggles active to paused', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const createRes = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: 100, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookie);
    const created = await createRes.json() as Record<string, unknown>;
    expect(created.isActive).toBe(true);

    const res = await makeRequest('PATCH', `/recurring-expenses/${created.id}/toggle`, undefined, cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.isActive).toBe(false);
  });

  it('toggles paused back to active', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const createRes = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: 100, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookie);
    const created = await createRes.json() as Record<string, unknown>;

    // Pause
    await makeRequest('PATCH', `/recurring-expenses/${created.id}/toggle`, undefined, cookie);
    // Reactivate
    const res = await makeRequest('PATCH', `/recurring-expenses/${created.id}/toggle`, undefined, cookie);
    const body = await res.json() as Record<string, unknown>;
    expect(body.isActive).toBe(true);
  });

  it("returns 403 for another user's recurring expense", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA);

    const createRes = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: 100, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookieA);
    const created = await createRes.json() as Record<string, unknown>;

    const res = await makeRequest('PATCH', `/recurring-expenses/${created.id}/toggle`, undefined, cookieB);
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent recurring expense', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('PATCH', '/recurring-expenses/00000000-0000-0000-0000-000000000000/toggle', undefined, cookie);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /recurring-expenses/:id', () => {
  it('deletes own recurring expense', async () => {
    const cookie = await registerUser(USER_A);
    const catId = await getDefaultCategoryId(cookie);

    const createRes = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: 100, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookie);
    const created = await createRes.json() as Record<string, unknown>;

    const res = await makeRequest('DELETE', `/recurring-expenses/${created.id}`, undefined, cookie);
    expect(res.status).toBe(200);

    const listRes = await makeRequest('GET', '/recurring-expenses', undefined, cookie);
    const listBody = await listRes.json();
    expect(listBody.length).toBe(0);
  });

  it("returns 403 for another user's recurring expense", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);
    const catId = await getDefaultCategoryId(cookieA);

    const createRes = await makeRequest('POST', '/recurring-expenses', {
      categoryId: catId, amount: 100, frequency: 'monthly',
      nextDueDate: '2026-04-01T00:00:00.000Z',
    }, cookieA);
    const created = await createRes.json() as Record<string, unknown>;

    const res = await makeRequest('DELETE', `/recurring-expenses/${created.id}`, undefined, cookieB);
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent recurring expense', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('DELETE', '/recurring-expenses/00000000-0000-0000-0000-000000000000', undefined, cookie);
    expect(res.status).toBe(404);
  });

  it('returns 401 without cookie', async () => {
    const res = await makeRequest('DELETE', '/recurring-expenses/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });
});
