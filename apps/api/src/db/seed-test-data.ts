import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../config/database';
import { users, categories, expenses, incomes, groups, userGroups } from './schema';
import { hashPassword } from '../utils/password';

const TEST_EMAIL = 'test@cuentas-claras.dev';
const TEST_EMAIL_2 = 'pareja@cuentas-claras.dev';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function seedTestData() {
  // Fetch or create test user
  const existing = await db.select().from(users).where(eq(users.email, TEST_EMAIL));

  let user = existing[0];
  if (!user) {
    const passwordHash = await hashPassword('test1234');
    const [created] = await db.insert(users).values({
      email: TEST_EMAIL,
      name: 'Usuario Test',
      passwordHash,
      currency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
    }).returning();
    user = created;
  }

  // Idempotency: skip if already has expenses
  const existingExpenses = await db.select().from(expenses).where(eq(expenses.userId, user.id));
  if (existingExpenses.length > 0) {
    console.log('ℹ️  Test data already exists, skipping');
    process.exit(0);
  }

  // Fetch default categories
  const defaultCats = await db.select().from(categories).where(
    and(eq(categories.isDefault, true), isNull(categories.userId)),
  );

  const catByName = Object.fromEntries(defaultCats.map((c) => [c.name, c.id]));

  const required = [
    'Alquiler/Hipoteca', 'Servicios', 'Supermercado', 'Transporte', 'Salud',
    'Educación', 'Entretenimiento', 'Restaurantes', 'Ropa', 'Seguros',
    'Impuestos', 'Otros', 'Salario', 'Freelance', 'Inversiones', 'Alquiler cobrado',
  ];
  const missing = required.filter((name) => !catByName[name]);
  if (missing.length > 0) {
    console.error(`❌ Missing default categories: ${missing.join(', ')}`);
    console.error('Run: bun run db:seed');
    process.exit(1);
  }

  // Insert expenses
  const expenseData = [
    { category: 'Alquiler/Hipoteca', amount: '180000', daysBack: 60, description: 'Alquiler mes anterior' },
    { category: 'Supermercado',       amount: '45000',  daysBack: 55, description: 'Compra mensual' },
    { category: 'Servicios',          amount: '12000',  daysBack: 50, description: 'Luz y gas' },
    { category: 'Transporte',         amount: '8500',   daysBack: 45, description: 'SUBE y taxi' },
    { category: 'Entretenimiento',    amount: '9500',   daysBack: 60, description: 'Netflix, Spotify' },
    { category: 'Alquiler/Hipoteca',  amount: '185000', daysBack: 30, description: 'Alquiler mes actual' },
    { category: 'Restaurantes',       amount: '22000',  daysBack: 40, description: 'Salida a comer' },
    { category: 'Salud',              amount: '35000',  daysBack: 35, description: 'Médico y farmacia' },
    { category: 'Educación',          amount: '25000',  daysBack: 28, description: 'Curso online' },
    { category: 'Ropa',               amount: '48000',  daysBack: 32, description: 'Ropa de invierno' },
    { category: 'Seguros',            amount: '21000',  daysBack: 22, description: 'Seguro auto' },
    { category: 'Servicios',          amount: '14500',  daysBack: 20, description: 'Internet y telefonía' },
    { category: 'Transporte',         amount: '7200',   daysBack: 10, description: 'Nafta' },
    { category: 'Restaurantes',       amount: '18000',  daysBack: 8,  description: 'Almuerzo de trabajo' },
    { category: 'Entretenimiento',    amount: '12000',  daysBack: 15, description: 'Entradas cine' },
    { category: 'Impuestos',          amount: '55000',  daysBack: 5,  description: 'ABL y patente' },
    { category: 'Otros',              amount: '6500',   daysBack: 12, description: 'Varios' },
    { category: 'Supermercado',       amount: '38000',  daysBack: 25, description: 'Compra semanal' },
    { category: 'Supermercado',       amount: '41000',  daysBack: 3,  description: 'Compra semanal' },
    { category: 'Transporte',         amount: '9800',   daysBack: 2,  description: 'Uber' },
  ];

  await db.insert(expenses).values(
    expenseData.map(({ category, amount, daysBack, description }) => ({
      userId: user.id,
      categoryId: catByName[category],
      amount,
      date: daysAgo(daysBack),
      description,
    })),
  );

  // Insert incomes
  const incomeData = [
    { category: 'Alquiler cobrado', amount: '120000', daysBack: 58, source: 'Departamento Palermo', description: null },
    { category: 'Salario',          amount: '850000', daysBack: 60, source: 'Empresa S.A.',         description: 'Sueldo mes anterior' },
    { category: 'Inversiones',      amount: '45000',  daysBack: 50, source: 'Plazo fijo',           description: 'Intereses' },
    { category: 'Freelance',        amount: '150000', daysBack: 45, source: 'Cliente A',            description: 'Proyecto web' },
    { category: 'Salario',          amount: '850000', daysBack: 30, source: 'Empresa S.A.',         description: 'Sueldo mes actual' },
    { category: 'Alquiler cobrado', amount: '125000', daysBack: 28, source: 'Departamento Palermo', description: null },
    { category: 'Freelance',        amount: '200000', daysBack: 18, source: 'Cliente B',            description: 'Diseño UI' },
    { category: 'Salario',          amount: '900000', daysBack: 1,  source: 'Empresa S.A.',         description: 'Sueldo con aumento' },
  ];

  await db.insert(incomes).values(
    incomeData.map(({ category, amount, daysBack, source, description }) => ({
      userId: user.id,
      categoryId: catByName[category],
      amount,
      date: daysAgo(daysBack),
      source,
      description,
    })),
  );

  // --- Second test user (pareja) ---
  const existing2 = await db.select().from(users).where(eq(users.email, TEST_EMAIL_2));
  let user2 = existing2[0];
  if (!user2) {
    const passwordHash2 = await hashPassword('test1234');
    const [created2] = await db.insert(users).values({
      email: TEST_EMAIL_2,
      name: 'Pareja Test',
      passwordHash: passwordHash2,
      currency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
    }).returning();
    user2 = created2;
  }

  // --- Personal expenses for user2 ---
  const expense2Data = [
    { category: 'Transporte',      amount: '6500',   daysBack: 27, description: 'SUBE recarga' },
    { category: 'Ropa',            amount: '62000',  daysBack: 24, description: 'Zapatillas running' },
    { category: 'Salud',           amount: '18000',  daysBack: 20, description: 'Dentista' },
    { category: 'Entretenimiento', amount: '8500',   daysBack: 17, description: 'Libro Kindle' },
    { category: 'Restaurantes',    amount: '14000',  daysBack: 14, description: 'Café con amigas' },
    { category: 'Educación',       amount: '45000',  daysBack: 11, description: 'Curso de yoga' },
    { category: 'Supermercado',    amount: '22000',  daysBack: 9,  description: 'Compra personal' },
    { category: 'Transporte',      amount: '4800',   daysBack: 6,  description: 'Uber al trabajo' },
    { category: 'Salud',           amount: '12500',  daysBack: 4,  description: 'Farmacia' },
    { category: 'Otros',           amount: '7000',   daysBack: 2,  description: 'Regalo cumpleaños' },
    { category: 'Seguros',         amount: '15000',  daysBack: 1,  description: 'Prepaga' },
  ];

  await db.insert(expenses).values(
    expense2Data.map(({ category, amount, daysBack, description }) => ({
      userId: user2.id,
      categoryId: catByName[category],
      amount,
      date: daysAgo(daysBack),
      description,
    })),
  );

  // --- Personal incomes for user2 ---
  const income2Data = [
    { category: 'Salario',    amount: '720000', daysBack: 30, source: 'Estudio Contable', description: 'Sueldo mes actual' },
    { category: 'Freelance',  amount: '85000',  daysBack: 15, source: 'Cliente particular', description: 'Liquidación de sueldos' },
    { category: 'Salario',    amount: '720000', daysBack: 1,  source: 'Estudio Contable', description: 'Sueldo nuevo mes' },
  ];

  await db.insert(incomes).values(
    income2Data.map(({ category, amount, daysBack, source, description }) => ({
      userId: user2.id,
      categoryId: catByName[category],
      amount,
      date: daysAgo(daysBack),
      source,
      description,
    })),
  );

  // --- Group: "Casa" ---
  const existingGroups = await db.select().from(groups).where(eq(groups.createdBy, user.id));
  if (existingGroups.length === 0) {
    const [group] = await db.insert(groups).values({
      name: 'Casa',
      description: 'Gastos compartidos del hogar',
      inviteCode: 'CasaTest',
      createdBy: user.id,
    }).returning();

    // Memberships
    await db.insert(userGroups).values([
      { userId: user.id, groupId: group.id, role: 'owner' },
      { userId: user2.id, groupId: group.id, role: 'member' },
    ]);

    // Group expenses — alternating who paid
    const groupExpenseData = [
      { payer: user,  category: 'Supermercado',      amount: '52000',  daysBack: 28, description: 'Compra grande del mes' },
      { payer: user2, category: 'Servicios',          amount: '18500',  daysBack: 25, description: 'Luz, gas y agua' },
      { payer: user,  category: 'Restaurantes',       amount: '32000',  daysBack: 20, description: 'Cena de aniversario' },
      { payer: user2, category: 'Supermercado',       amount: '28000',  daysBack: 15, description: 'Compra semanal' },
      { payer: user,  category: 'Entretenimiento',    amount: '15000',  daysBack: 12, description: 'Streaming y juegos' },
      { payer: user2, category: 'Servicios',          amount: '9800',   daysBack: 10, description: 'Internet' },
      { payer: user,  category: 'Alquiler/Hipoteca',  amount: '185000', daysBack: 5,  description: 'Alquiler del depto' },
      { payer: user2, category: 'Supermercado',       amount: '35000',  daysBack: 3,  description: 'Compra semanal' },
      { payer: user,  category: 'Otros',              amount: '12000',  daysBack: 1,  description: 'Productos limpieza' },
    ];

    await db.insert(expenses).values(
      groupExpenseData.map(({ payer, category, amount, daysBack, description }) => ({
        userId: payer.id,
        categoryId: catByName[category],
        groupId: group.id,
        amount,
        date: daysAgo(daysBack),
        description,
      })),
    );

    console.log(`✅ Group "Casa" seeded: ${groupExpenseData.length} shared expenses, 2 members`);
  } else {
    console.log('ℹ️  Group data already exists, skipping');
  }

  console.log(`✅ ${TEST_EMAIL}: ${expenseData.length} gastos personales, ${incomeData.length} ingresos`);
  console.log(`✅ ${TEST_EMAIL_2}: ${expense2Data.length} gastos personales, ${income2Data.length} ingresos`);
  console.log(`   Ambos usuarios: test1234`);
  process.exit(0);
}

seedTestData().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
