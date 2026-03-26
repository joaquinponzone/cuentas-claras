import { and, eq, isNull, or } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../config/database';
import { categories } from '../db/schema';
import type { Category } from '@cuentas-claras/shared';

type DbCategory = typeof categories.$inferSelect;

function toCategory(row: DbCategory): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type as 'expense' | 'income',
    icon: row.icon,
    isDefault: row.isDefault,
    userId: row.userId,
  };
}

export async function list(userId: string): Promise<Category[]> {
  const rows = await db.select().from(categories).where(
    or(isNull(categories.userId), eq(categories.userId, userId)),
  );
  return rows.map(toCategory);
}

export async function create(
  userId: string,
  input: { name: string; type: string; icon?: string },
): Promise<Category> {
  const [row] = await db
    .insert(categories)
    .values({ name: input.name, type: input.type, icon: input.icon ?? null, isDefault: false, userId })
    .returning();
  return toCategory(row);
}

export async function remove(userId: string, categoryId: string): Promise<void> {
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });

  if (!category) throw new HTTPException(404, { message: 'Category not found' });
  if (category.isDefault) throw new HTTPException(403, { message: 'Cannot delete default categories' });
  if (category.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' });

  await db.delete(categories).where(
    and(eq(categories.id, categoryId), eq(categories.userId, userId)),
  );
}
