import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as groupsService from '../services/groups-service';
import type { users } from '../db/schema';

type Variables = { user: typeof users.$inferSelect };
const groupsRoutes = new Hono<{ Variables: Variables }>();

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
});

const joinGroupSchema = z.object({
  inviteCode: z.string().min(1),
});

const createGroupExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().datetime(),
  description: z.string().optional(),
});

const listExpensesQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

const summaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validationHook(result: any, c: any) {
  if (!result.success) {
    const message = result.error?.issues?.[0]?.message ?? 'Datos inválidos';
    return c.json({ error: message }, 400);
  }
}

groupsRoutes.use('*', authMiddleware);

// List user's groups
groupsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const data = await groupsService.list(user.id);
  return c.json(data);
});

// Create group
groupsRoutes.post('/', zValidator('json', createGroupSchema, validationHook), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');
  const group = await groupsService.create(user.id, input);
  return c.json(group, 201);
});

// Join group by invite code
groupsRoutes.post('/join', zValidator('json', joinGroupSchema, validationHook), async (c) => {
  const user = c.get('user');
  const { inviteCode } = c.req.valid('json');
  const group = await groupsService.joinByCode(user.id, inviteCode);
  return c.json(group);
});

// Get group detail
groupsRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const detail = await groupsService.getDetail(user.id, groupId);
  return c.json(detail);
});

// Update group
groupsRoutes.put('/:id', zValidator('json', updateGroupSchema, validationHook), async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const input = c.req.valid('json');
  const group = await groupsService.update(user.id, groupId, input);
  return c.json(group);
});

// Delete group
groupsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  await groupsService.remove(user.id, groupId);
  return c.json({ message: 'Group deleted' });
});

// Add member by email
groupsRoutes.post('/:id/members', zValidator('json', addMemberSchema, validationHook), async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const input = c.req.valid('json');
  const result = await groupsService.addMember(user.id, groupId, input);
  return c.json(result, 201);
});

// Remove member
groupsRoutes.delete('/:id/members/:userId', async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const targetUserId = c.req.param('userId');
  await groupsService.removeMember(user.id, groupId, targetUserId);
  return c.json({ message: 'Member removed' });
});

// Leave group
groupsRoutes.post('/:id/leave', async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  await groupsService.leaveGroup(user.id, groupId);
  return c.json({ message: 'Left group' });
});

// List group expenses
groupsRoutes.get('/:id/expenses', zValidator('query', listExpensesQuerySchema, validationHook), async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const query = c.req.valid('query');
  const data = await groupsService.listGroupExpenses(user.id, groupId, query);
  return c.json(data);
});

// Create group expense
groupsRoutes.post('/:id/expenses', zValidator('json', createGroupExpenseSchema, validationHook), async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const input = c.req.valid('json');
  const expense = await groupsService.createGroupExpense(user.id, groupId, input);
  return c.json(expense, 201);
});

// Group expense summary
groupsRoutes.get('/:id/summary', zValidator('query', summaryQuerySchema, validationHook), async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const { month } = c.req.valid('query');
  const summary = await groupsService.getGroupSummary(user.id, groupId, month);
  return c.json(summary);
});

export { groupsRoutes };
