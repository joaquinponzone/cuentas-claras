import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../config/database';
import { categories, users } from './schema';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@cuentas-claras/shared';
import { hashPassword } from '../utils/password';

const TEST_EMAIL = 'test@cuentas-claras.dev';

async function seed() {
  // --- Default categories ---
  console.log('Seeding default categories...');

  const existingDefaults = await db.select().from(categories).where(
    and(eq(categories.isDefault, true), isNull(categories.userId)),
  );

  if (existingDefaults.length > 0) {
    console.log(`Found ${existingDefaults.length} existing default categories. Skipping.`);
  } else {
    const rows = [
      ...EXPENSE_CATEGORIES.map((name) => ({ name, type: 'expense' as const, isDefault: true, userId: null })),
      ...INCOME_CATEGORIES.map((name) => ({ name, type: 'income' as const, isDefault: true, userId: null })),
    ];
    await db.insert(categories).values(rows);
    console.log(`Inserted ${rows.length} default categories.`);
  }

  // --- Test user ---
  const existing = await db.select().from(users).where(eq(users.email, TEST_EMAIL));
  if (existing.length > 0) {
    console.log(`Test user ${TEST_EMAIL} already exists. Skipping.`);
  } else {
    const passwordHash = await hashPassword('test1234');
    await db.insert(users).values({
      email: TEST_EMAIL,
      name: 'Usuario Test',
      passwordHash,
      currency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
    });
    console.log(`Created test user: ${TEST_EMAIL} / test1234`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
