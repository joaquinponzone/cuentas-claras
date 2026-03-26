import { and, count, eq, gte, lt, sql, sum } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../config/database';
import { categories, expenses, groups, userGroups, users } from '../db/schema';
import type { Group, GroupDetail, GroupExpenseSummary, PaginatedResponse, Expense } from '@cuentas-claras/shared';

type DbGroup = typeof groups.$inferSelect;
type DbExpense = typeof expenses.$inferSelect;

function toGroup(row: DbGroup): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    inviteCode: row.inviteCode,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toExpense(row: DbExpense): Expense {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    groupId: row.groupId,
    amount: parseFloat(row.amount),
    date: row.date.toISOString(),
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function assertMembership(userId: string, groupId: string) {
  const membership = await db.query.userGroups.findFirst({
    where: and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)),
  });
  if (!membership) throw new HTTPException(403, { message: 'Not a member of this group' });
  return membership;
}

async function assertOwner(userId: string, groupId: string) {
  const membership = await assertMembership(userId, groupId);
  if (membership.role !== 'owner') throw new HTTPException(403, { message: 'Only the group owner can do this' });
  return membership;
}

export async function list(userId: string): Promise<(Group & { memberCount: number })[]> {
  const memberships = await db
    .select({ groupId: userGroups.groupId })
    .from(userGroups)
    .where(eq(userGroups.userId, userId));

  if (memberships.length === 0) return [];

  const groupIds = memberships.map((m) => m.groupId);
  const result: (Group & { memberCount: number })[] = [];

  for (const gId of groupIds) {
    const group = await db.query.groups.findFirst({ where: eq(groups.id, gId) });
    if (!group) continue;
    const [{ total }] = await db.select({ total: count() }).from(userGroups).where(eq(userGroups.groupId, gId));
    result.push({ ...toGroup(group), memberCount: Number(total) });
  }

  return result;
}

export async function create(
  userId: string,
  input: { name: string; description?: string },
): Promise<Group> {
  let inviteCode = generateInviteCode();
  // Retry on collision (unlikely but safe)
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.query.groups.findFirst({ where: eq(groups.inviteCode, inviteCode) });
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const [group] = await db.transaction(async (tx) => {
    const [newGroup] = await tx
      .insert(groups)
      .values({
        name: input.name,
        description: input.description ?? null,
        inviteCode,
        createdBy: userId,
      })
      .returning();

    await tx.insert(userGroups).values({
      userId,
      groupId: newGroup.id,
      role: 'owner',
    });

    return [newGroup];
  });

  return toGroup(group);
}

export async function getDetail(userId: string, groupId: string): Promise<GroupDetail> {
  await assertMembership(userId, groupId);

  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!group) throw new HTTPException(404, { message: 'Group not found' });

  const memberships = await db
    .select({
      userId: userGroups.userId,
      role: userGroups.role,
      joinedAt: userGroups.joinedAt,
      name: users.name,
      email: users.email,
    })
    .from(userGroups)
    .innerJoin(users, eq(userGroups.userId, users.id))
    .where(eq(userGroups.groupId, groupId));

  return {
    ...toGroup(group),
    members: memberships.map((m) => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      role: m.role as 'owner' | 'member',
      joinedAt: m.joinedAt.toISOString(),
    })),
    memberCount: memberships.length,
  };
}

export async function update(
  userId: string,
  groupId: string,
  input: { name?: string; description?: string },
): Promise<Group> {
  await assertOwner(userId, groupId);

  const updates: Partial<typeof groups.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;

  const [row] = await db.update(groups).set(updates).where(eq(groups.id, groupId)).returning();
  return toGroup(row);
}

export async function remove(userId: string, groupId: string): Promise<void> {
  await assertOwner(userId, groupId);
  await db.delete(groups).where(eq(groups.id, groupId));
}

export async function addMember(
  ownerId: string,
  groupId: string,
  input: { email: string },
): Promise<{ userId: string; role: string }> {
  await assertOwner(ownerId, groupId);

  const user = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (!user) throw new HTTPException(400, { message: 'User not found with that email' });

  const existing = await db.query.userGroups.findFirst({
    where: and(eq(userGroups.userId, user.id), eq(userGroups.groupId, groupId)),
  });
  if (existing) throw new HTTPException(409, { message: 'User is already a member' });

  await db.insert(userGroups).values({
    userId: user.id,
    groupId,
    role: 'member',
  });

  return { userId: user.id, role: 'member' };
}

export async function removeMember(
  ownerId: string,
  groupId: string,
  targetUserId: string,
): Promise<void> {
  await assertOwner(ownerId, groupId);

  const target = await db.query.userGroups.findFirst({
    where: and(eq(userGroups.userId, targetUserId), eq(userGroups.groupId, groupId)),
  });
  if (!target) throw new HTTPException(404, { message: 'Member not found' });

  if (target.role === 'owner') {
    const owners = await db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.groupId, groupId), eq(userGroups.role, 'owner')));
    if (owners.length <= 1) {
      throw new HTTPException(400, { message: 'Cannot remove the only owner' });
    }
  }

  await db.delete(userGroups).where(
    and(eq(userGroups.userId, targetUserId), eq(userGroups.groupId, groupId)),
  );
}

export async function joinByCode(
  userId: string,
  inviteCode: string,
): Promise<Group> {
  const group = await db.query.groups.findFirst({ where: eq(groups.inviteCode, inviteCode) });
  if (!group) throw new HTTPException(400, { message: 'Invalid invite code' });

  const existing = await db.query.userGroups.findFirst({
    where: and(eq(userGroups.userId, userId), eq(userGroups.groupId, group.id)),
  });
  if (existing) throw new HTTPException(409, { message: 'Already a member of this group' });

  await db.insert(userGroups).values({
    userId,
    groupId: group.id,
    role: 'member',
  });

  return toGroup(group);
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  const membership = await assertMembership(userId, groupId);

  if (membership.role === 'owner') {
    const owners = await db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.groupId, groupId), eq(userGroups.role, 'owner')));
    if (owners.length <= 1) {
      throw new HTTPException(400, { message: 'Cannot leave as the only owner. Transfer ownership or delete the group' });
    }
  }

  await db.delete(userGroups).where(
    and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)),
  );
}

interface ListExpensesFilters {
  month?: string;
  page?: number;
}

export async function listGroupExpenses(
  userId: string,
  groupId: string,
  filters: ListExpensesFilters = {},
): Promise<PaginatedResponse<Expense & { userName: string }>> {
  await assertMembership(userId, groupId);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 20;

  const conditions = [eq(expenses.groupId, groupId)];

  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    conditions.push(gte(expenses.date, start));
    conditions.push(lt(expenses.date, end));
  }

  const whereClause = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(expenses).where(whereClause);
  const totalCount = Number(total);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const rows = await db
    .select({
      expense: expenses,
      userName: users.name,
    })
    .from(expenses)
    .innerJoin(users, eq(expenses.userId, users.id))
    .where(whereClause)
    .orderBy(sql`${expenses.date} desc`)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data: rows.map((r) => ({ ...toExpense(r.expense), userName: r.userName })),
    pagination: { total: totalCount, page, pageSize, totalPages },
  };
}

export async function createGroupExpense(
  userId: string,
  groupId: string,
  input: { categoryId: string; amount: number; date: string; description?: string },
): Promise<Expense> {
  await assertMembership(userId, groupId);

  // Verify category access (default or user's own)
  const category = await db.query.categories.findFirst({
    where: and(
      eq(categories.id, input.categoryId),
      sql`(${categories.userId} IS NULL OR ${categories.userId} = ${userId})`,
    ),
  });
  if (!category) throw new HTTPException(400, { message: 'Invalid or inaccessible category' });

  const [row] = await db
    .insert(expenses)
    .values({
      userId,
      categoryId: input.categoryId,
      groupId,
      amount: String(input.amount),
      date: new Date(input.date),
      description: input.description ?? null,
    })
    .returning();

  return toExpense(row);
}

export async function getGroupSummary(
  userId: string,
  groupId: string,
  month?: string,
): Promise<GroupExpenseSummary> {
  await assertMembership(userId, groupId);

  const conditions = [eq(expenses.groupId, groupId)];

  if (month) {
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);
    conditions.push(gte(expenses.date, start));
    conditions.push(lt(expenses.date, end));
  }

  const whereClause = and(...conditions);

  const [totals] = await db
    .select({ total: sum(expenses.amount), cnt: count() })
    .from(expenses)
    .where(whereClause);

  const byMemberRows = await db
    .select({
      userId: expenses.userId,
      name: users.name,
      total: sum(expenses.amount),
    })
    .from(expenses)
    .innerJoin(users, eq(expenses.userId, users.id))
    .where(whereClause)
    .groupBy(expenses.userId, users.name);

  return {
    totalExpenses: parseFloat(totals.total ?? '0'),
    expenseCount: Number(totals.cnt),
    byMember: byMemberRows.map((r) => ({
      userId: r.userId,
      name: r.name,
      total: parseFloat(r.total ?? '0'),
    })),
  };
}
