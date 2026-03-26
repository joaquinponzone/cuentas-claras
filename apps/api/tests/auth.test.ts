import { describe, it, expect, beforeEach } from 'bun:test';
import { makeRequest, cleanTestData } from './setup';

const TEST_USER = {
  email: 'test@test.com',
  name: 'Test User',
  password: '123456',
};

beforeEach(async () => {
  await cleanTestData();
});

describe('POST /auth/register', () => {
  it('returns 201 with user and sets cookie', async () => {
    const res = await makeRequest('POST', '/auth/register', TEST_USER);

    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.email).toBe(TEST_USER.email);
    expect(body.name).toBe(TEST_USER.name);
    expect(body.passwordHash).toBeUndefined();
    expect(res.headers.get('Set-Cookie')).toContain('token=');
  });

  it('returns 409 for duplicate email', async () => {
    await makeRequest('POST', '/auth/register', TEST_USER);
    const res = await makeRequest('POST', '/auth/register', {
      ...TEST_USER,
      name: 'Other User',
    });

    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid data', async () => {
    const res = await makeRequest('POST', '/auth/register', {
      email: 'not-an-email',
      name: 'T',
      password: '123',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns 200 with user and sets cookie on valid credentials', async () => {
    await makeRequest('POST', '/auth/register', TEST_USER);

    const res = await makeRequest('POST', '/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.email).toBe(TEST_USER.email);
    expect(res.headers.get('Set-Cookie')).toContain('token=');
  });

  it('returns 401 for wrong password', async () => {
    await makeRequest('POST', '/auth/register', TEST_USER);

    const res = await makeRequest('POST', '/auth/login', {
      email: TEST_USER.email,
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await makeRequest('POST', '/auth/login', {
      email: 'noone@test.com',
      password: '123456',
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns 200 with user when cookie is valid', async () => {
    const registerRes = await makeRequest('POST', '/auth/register', TEST_USER);
    const setCookieHeader = registerRes.headers.get('Set-Cookie')!;
    const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
    const cookie = `token=${tokenMatch![1]}`;

    const res = await makeRequest('GET', '/auth/me', undefined, cookie);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.email).toBe(TEST_USER.email);
    expect(body.passwordHash).toBeUndefined();
  });

  it('returns 401 without cookie', async () => {
    const res = await makeRequest('GET', '/auth/me');

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('returns 200 and clears cookie', async () => {
    const res = await makeRequest('POST', '/auth/logout');

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.message).toBe('Logged out');
    expect(res.headers.get('Set-Cookie')).toBeTruthy();
  });
});
