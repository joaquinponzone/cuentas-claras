import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import { makeRequest, seedDefaultCategories, cleanTestData, registerUser } from './setup';

const USER_A = { email: 'cat_a@test.com', name: 'User A', password: '123456' };
const USER_B = { email: 'cat_b@test.com', name: 'User B', password: '123456' };

beforeAll(async () => {
  await seedDefaultCategories();
});

beforeEach(async () => {
  await cleanTestData();
});

describe('GET /categories', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('GET', '/categories');
    expect(res.status).toBe(401);
  });

  it('returns 17 default categories when authenticated', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('GET', '/categories', undefined, cookie);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>[];
    expect(body.length).toBe(17);
    expect(body.every((c) => c.isDefault === true)).toBe(true);
  });

  it('includes user-created category alongside defaults', async () => {
    const cookie = await registerUser(USER_A);
    await makeRequest('POST', '/categories', { name: 'Custom', type: 'expense' }, cookie);

    const res = await makeRequest('GET', '/categories', undefined, cookie);
    const body = (await res.json()) as Record<string, unknown>[];
    expect(body.length).toBe(18);
    expect(body.find((c) => c.name === 'Custom')).toBeTruthy();
  });

  it("does not show another user's custom category", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);

    await makeRequest('POST', '/categories', { name: 'PrivateCat', type: 'expense' }, cookieA);

    const res = await makeRequest('GET', '/categories', undefined, cookieB);
    const body = (await res.json()) as Record<string, unknown>[];
    expect(body.find((c) => c.name === 'PrivateCat')).toBeUndefined();
  });
});

describe('POST /categories', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('POST', '/categories', { name: 'Test', type: 'expense' });
    expect(res.status).toBe(401);
  });

  it('creates a custom category', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('POST', '/categories', { name: 'Gym', type: 'expense', icon: '🏋️' }, cookie);

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe('Gym');
    expect(body.type).toBe('expense');
    expect(body.isDefault).toBe(false);
    expect(body.userId).toBeTruthy();
  });

  it('returns 400 for invalid type', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('POST', '/categories', { name: 'Test', type: 'invalid' }, cookie);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing name', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('POST', '/categories', { type: 'expense' }, cookie);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /categories/:id', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('DELETE', '/categories/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('deletes own custom category', async () => {
    const cookie = await registerUser(USER_A);
    const createRes = await makeRequest('POST', '/categories', { name: 'ToDelete', type: 'expense' }, cookie);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('DELETE', `/categories/${created.id}`, undefined, cookie);
    expect(res.status).toBe(200);

    const listRes = await makeRequest('GET', '/categories', undefined, cookie);
    const list = (await listRes.json()) as Record<string, unknown>[];
    expect(list.find((c) => c.id === created.id)).toBeUndefined();
  });

  it('returns 403 when deleting a default category', async () => {
    const cookie = await registerUser(USER_A);
    const listRes = await makeRequest('GET', '/categories', undefined, cookie);
    const list = (await listRes.json()) as Record<string, unknown>[];
    const defaultCat = list.find((c) => c.isDefault === true)!;

    const res = await makeRequest('DELETE', `/categories/${defaultCat.id}`, undefined, cookie);
    expect(res.status).toBe(403);
  });

  it("returns 403 when deleting another user's category", async () => {
    const cookieA = await registerUser(USER_A);
    const cookieB = await registerUser(USER_B);

    const createRes = await makeRequest('POST', '/categories', { name: 'OwnerCat', type: 'income' }, cookieA);
    const created = (await createRes.json()) as Record<string, unknown>;

    const res = await makeRequest('DELETE', `/categories/${created.id}`, undefined, cookieB);
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent category', async () => {
    const cookie = await registerUser(USER_A);
    const res = await makeRequest('DELETE', '/categories/00000000-0000-0000-0000-000000000000', undefined, cookie);
    expect(res.status).toBe(404);
  });
});
