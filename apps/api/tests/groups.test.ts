import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import { makeRequest, seedDefaultCategories, cleanTestData, registerUser, getDefaultCategoryId } from './setup';

const OWNER = { email: 'grp_owner@test.com', name: 'Owner', password: '123456' };
const MEMBER = { email: 'grp_member@test.com', name: 'Member', password: '123456' };
const OUTSIDER = { email: 'grp_outsider@test.com', name: 'Outsider', password: '123456' };

beforeAll(async () => {
  await seedDefaultCategories();
});

beforeEach(async () => {
  await cleanTestData();
});

// Helper: create a group and return the group object
async function createGroup(cookie: string, name = 'Test Group', description?: string) {
  const res = await makeRequest('POST', '/groups', { name, description }, cookie);
  return { res, body: (await res.json()) as Record<string, unknown> };
}

describe('CRUD grupo', () => {
  it('returns 401 without cookie', async () => {
    const res = await makeRequest('GET', '/groups');
    expect(res.status).toBe(401);
  });

  it('creates a group and returns it with inviteCode', async () => {
    const cookie = await registerUser(OWNER);
    const { res, body } = await createGroup(cookie, 'Mi familia', 'Gastos familiares');

    expect(res.status).toBe(201);
    expect(body.name).toBe('Mi familia');
    expect(body.description).toBe('Gastos familiares');
    expect(typeof body.inviteCode).toBe('string');
    expect((body.inviteCode as string).length).toBe(8);
    expect(body.id).toBeDefined();
  });

  it('returns 400 when name is missing', async () => {
    const cookie = await registerUser(OWNER);
    const res = await makeRequest('POST', '/groups', {}, cookie);
    expect(res.status).toBe(400);
  });

  it('gets group detail with members', async () => {
    const cookie = await registerUser(OWNER);
    const { body: group } = await createGroup(cookie, 'Detail Group');

    const res = await makeRequest('GET', `/groups/${group.id}`, undefined, cookie);
    expect(res.status).toBe(200);

    const detail = (await res.json()) as Record<string, unknown>;
    expect(detail.name).toBe('Detail Group');
    expect(detail.memberCount).toBe(1);
    const members = detail.members as Array<Record<string, unknown>>;
    expect(members.length).toBe(1);
    expect(members[0].role).toBe('owner');
    expect(members[0].email).toBe(OWNER.email);
  });

  it('owner can update group', async () => {
    const cookie = await registerUser(OWNER);
    const { body: group } = await createGroup(cookie);

    const res = await makeRequest('PUT', `/groups/${group.id}`, { name: 'Updated' }, cookie);
    expect(res.status).toBe(200);
    const updated = (await res.json()) as Record<string, unknown>;
    expect(updated.name).toBe('Updated');
  });

  it('owner can delete group', async () => {
    const cookie = await registerUser(OWNER);
    const { body: group } = await createGroup(cookie);

    const res = await makeRequest('DELETE', `/groups/${group.id}`, undefined, cookie);
    expect(res.status).toBe(200);

    // Verify it's gone
    const listRes = await makeRequest('GET', '/groups', undefined, cookie);
    const list = (await listRes.json()) as unknown[];
    expect(list.length).toBe(0);
  });
});

describe('Membresía', () => {
  it('owner can add member by email', async () => {
    const ownerCookie = await registerUser(OWNER);
    await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);

    const res = await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);
    expect(res.status).toBe(201);

    // Verify member appears in detail
    const detailRes = await makeRequest('GET', `/groups/${group.id}`, undefined, ownerCookie);
    const detail = (await detailRes.json()) as Record<string, unknown>;
    expect(detail.memberCount).toBe(2);
  });

  it('returns 400 when email not found', async () => {
    const ownerCookie = await registerUser(OWNER);
    const { body: group } = await createGroup(ownerCookie);

    const res = await makeRequest('POST', `/groups/${group.id}/members`, { email: 'nonexistent@test.com' }, ownerCookie);
    expect(res.status).toBe(400);
  });

  it('returns 409 when user is already a member', async () => {
    const ownerCookie = await registerUser(OWNER);
    await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);

    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);
    const res = await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);
    expect(res.status).toBe(409);
  });

  it('non-owner cannot add members', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    await registerUser(OUTSIDER);
    const { body: group } = await createGroup(ownerCookie);

    // Add member first
    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);

    // Member tries to add outsider
    const res = await makeRequest('POST', `/groups/${group.id}/members`, { email: OUTSIDER.email }, memberCookie);
    expect(res.status).toBe(403);
  });

  it('owner can remove member', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);

    // Get member's userId from detail after adding
    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);
    const detailRes = await makeRequest('GET', `/groups/${group.id}`, undefined, ownerCookie);
    const detail = (await detailRes.json()) as { members: Array<{ userId: string; role: string }> };
    const memberUserId = detail.members.find((m) => m.role === 'member')!.userId;

    const res = await makeRequest('DELETE', `/groups/${group.id}/members/${memberUserId}`, undefined, ownerCookie);
    expect(res.status).toBe(200);

    // Verify member is removed
    const afterRes = await makeRequest('GET', `/groups/${group.id}`, undefined, ownerCookie);
    const afterDetail = (await afterRes.json()) as Record<string, unknown>;
    expect(afterDetail.memberCount).toBe(1);
  });

  it('non-owner cannot remove members', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);

    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);
    const detailRes = await makeRequest('GET', `/groups/${group.id}`, undefined, ownerCookie);
    const detail = (await detailRes.json()) as { members: Array<{ userId: string; role: string }> };
    const ownerUserId = detail.members.find((m) => m.role === 'owner')!.userId;

    const res = await makeRequest('DELETE', `/groups/${group.id}/members/${ownerUserId}`, undefined, memberCookie);
    expect(res.status).toBe(403);
  });

  it('user can join by invite code', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);

    const res = await makeRequest('POST', '/groups/join', { inviteCode: group.inviteCode }, memberCookie);
    expect(res.status).toBe(200);
    const joined = (await res.json()) as Record<string, unknown>;
    expect(joined.id).toBe(group.id);

    // Verify in member's group list
    const listRes = await makeRequest('GET', '/groups', undefined, memberCookie);
    const list = (await listRes.json()) as unknown[];
    expect(list.length).toBe(1);
  });

  it('returns 400 for invalid invite code', async () => {
    const cookie = await registerUser(MEMBER);
    const res = await makeRequest('POST', '/groups/join', { inviteCode: 'INVALID1' }, cookie);
    expect(res.status).toBe(400);
  });
});

describe('Autorización', () => {
  it('non-owner cannot update group', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);

    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);

    const res = await makeRequest('PUT', `/groups/${group.id}`, { name: 'Hacked' }, memberCookie);
    expect(res.status).toBe(403);
  });

  it('non-owner cannot delete group', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);

    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);

    const res = await makeRequest('DELETE', `/groups/${group.id}`, undefined, memberCookie);
    expect(res.status).toBe(403);
  });

  it('non-member cannot get group detail', async () => {
    const ownerCookie = await registerUser(OWNER);
    const outsiderCookie = await registerUser(OUTSIDER);
    const { body: group } = await createGroup(ownerCookie);

    const res = await makeRequest('GET', `/groups/${group.id}`, undefined, outsiderCookie);
    expect(res.status).toBe(403);
  });

  it('non-member cannot see group expenses', async () => {
    const ownerCookie = await registerUser(OWNER);
    const outsiderCookie = await registerUser(OUTSIDER);
    const { body: group } = await createGroup(ownerCookie);

    const res = await makeRequest('GET', `/groups/${group.id}/expenses`, undefined, outsiderCookie);
    expect(res.status).toBe(403);
  });

  it('member can leave group', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);

    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);

    const res = await makeRequest('POST', `/groups/${group.id}/leave`, undefined, memberCookie);
    expect(res.status).toBe(200);

    // Verify member no longer in group
    const listRes = await makeRequest('GET', '/groups', undefined, memberCookie);
    const list = (await listRes.json()) as unknown[];
    expect(list.length).toBe(0);
  });
});

describe('Gastos del grupo', () => {
  it('member can create expense in group', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);
    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);

    const catId = await getDefaultCategoryId(memberCookie);
    const res = await makeRequest('POST', `/groups/${group.id}/expenses`, {
      categoryId: catId,
      amount: 150.50,
      date: '2026-03-15T00:00:00.000Z',
      description: 'Cena grupal',
    }, memberCookie);

    expect(res.status).toBe(201);
    const expense = (await res.json()) as Record<string, unknown>;
    expect(expense.amount).toBe(150.50);
    expect(expense.groupId).toBe(group.id);
  });

  it('all members see group expenses', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);
    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);

    const catId = await getDefaultCategoryId(ownerCookie);
    await makeRequest('POST', `/groups/${group.id}/expenses`, {
      categoryId: catId, amount: 100, date: '2026-03-01T00:00:00.000Z',
    }, ownerCookie);
    await makeRequest('POST', `/groups/${group.id}/expenses`, {
      categoryId: catId, amount: 200, date: '2026-03-02T00:00:00.000Z',
    }, memberCookie);

    // Owner sees both
    const res1 = await makeRequest('GET', `/groups/${group.id}/expenses`, undefined, ownerCookie);
    const body1 = (await res1.json()) as { data: unknown[] };
    expect(body1.data.length).toBe(2);

    // Member sees both
    const res2 = await makeRequest('GET', `/groups/${group.id}/expenses`, undefined, memberCookie);
    const body2 = (await res2.json()) as { data: unknown[] };
    expect(body2.data.length).toBe(2);
  });

  it('non-member cannot create expense in group', async () => {
    const ownerCookie = await registerUser(OWNER);
    const outsiderCookie = await registerUser(OUTSIDER);
    const { body: group } = await createGroup(ownerCookie);

    const catId = await getDefaultCategoryId(outsiderCookie);
    const res = await makeRequest('POST', `/groups/${group.id}/expenses`, {
      categoryId: catId, amount: 50, date: '2026-03-01T00:00:00.000Z',
    }, outsiderCookie);
    expect(res.status).toBe(403);
  });

  it('summary returns totals and breakdown by member', async () => {
    const ownerCookie = await registerUser(OWNER);
    const memberCookie = await registerUser(MEMBER);
    const { body: group } = await createGroup(ownerCookie);
    await makeRequest('POST', `/groups/${group.id}/members`, { email: MEMBER.email }, ownerCookie);

    const catId = await getDefaultCategoryId(ownerCookie);
    await makeRequest('POST', `/groups/${group.id}/expenses`, {
      categoryId: catId, amount: 100, date: '2026-03-01T00:00:00.000Z',
    }, ownerCookie);
    await makeRequest('POST', `/groups/${group.id}/expenses`, {
      categoryId: catId, amount: 200, date: '2026-03-02T00:00:00.000Z',
    }, memberCookie);

    const res = await makeRequest('GET', `/groups/${group.id}/summary?month=2026-03`, undefined, ownerCookie);
    expect(res.status).toBe(200);
    const summary = (await res.json()) as { totalExpenses: number; expenseCount: number; byMember: unknown[] };
    expect(summary.totalExpenses).toBe(300);
    expect(summary.expenseCount).toBe(2);
    expect(summary.byMember.length).toBe(2);
  });

  it('group expense also appears in personal /expenses', async () => {
    const ownerCookie = await registerUser(OWNER);
    const { body: group } = await createGroup(ownerCookie);

    const catId = await getDefaultCategoryId(ownerCookie);
    await makeRequest('POST', `/groups/${group.id}/expenses`, {
      categoryId: catId, amount: 75, date: '2026-03-10T00:00:00.000Z',
    }, ownerCookie);

    const res = await makeRequest('GET', '/expenses?month=2026-03', undefined, ownerCookie);
    const body = (await res.json()) as { data: Array<{ groupId: string | null }> };
    expect(body.data.length).toBe(1);
    expect(body.data[0].groupId).toBe(group.id);
  });
});
