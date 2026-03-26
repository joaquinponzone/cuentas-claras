import { eq, inArray } from 'drizzle-orm';
import { db } from '../config/database';
import { users } from './schema';

const TEST_EMAILS = ['test@cuentas-claras.dev', 'pareja@cuentas-claras.dev'];

async function cleanTestData() {
  const testUsers = await db.select().from(users).where(inArray(users.email, TEST_EMAILS));

  if (testUsers.length === 0) {
    console.log('ℹ️  Test users not found, nothing to clean');
    process.exit(0);
  }

  for (const user of testUsers) {
    await db.delete(users).where(eq(users.id, user.id));
  }

  console.log(`✅ Test data cleaned: ${testUsers.map((u) => u.email).join(', ')} and all their records deleted`);
  process.exit(0);
}

cleanTestData().catch((err) => {
  console.error('Clean error:', err);
  process.exit(1);
});
