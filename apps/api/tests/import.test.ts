import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import {
  makeRequest,
  makeFormDataRequest,
  createCsvFile,
  seedDefaultCategories,
  cleanTestData,
  registerUser,
  getDefaultCategoryId,
} from './setup';

const USER = { email: 'import_user@test.com', name: 'Import User', password: '123456' };

beforeAll(async () => {
  await seedDefaultCategories();
});

beforeEach(async () => {
  await cleanTestData();
});

// --- Parse tests ---

describe('POST /import/parse', () => {
  it('returns 401 without auth', async () => {
    const fd = new FormData();
    fd.append('file', createCsvFile('fecha,monto\n01/01/2026,100'));
    const res = await makeFormDataRequest('/import/parse', fd);
    expect(res.status).toBe(401);
  });

  it('returns 400 without file', async () => {
    const cookie = await registerUser(USER);
    const fd = new FormData();
    fd.append('defaultType', 'expense');
    const res = await makeFormDataRequest('/import/parse', fd, cookie);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('requerido');
  });

  it('returns 400 for unsupported format', async () => {
    const cookie = await registerUser(USER);
    const fd = new FormData();
    fd.append('file', new File(['data'], 'test.txt', { type: 'text/plain' }));
    const res = await makeFormDataRequest('/import/parse', fd, cookie);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('no soportado');
  });

  it('parses valid CSV with all columns', async () => {
    const cookie = await registerUser(USER);
    const csv = `fecha,monto,categoria,descripcion,tipo
01/03/2026,1500.50,Supermercado,Compras del mes,gasto
15/03/2026,50000,Salario,Sueldo marzo,ingreso`;

    const fd = new FormData();
    fd.append('file', createCsvFile(csv));
    fd.append('defaultType', 'mixed');
    const res = await makeFormDataRequest('/import/parse', fd, cookie);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rows).toHaveLength(2);
    expect(body.summary.totalRows).toBe(2);
    expect(body.rows[0].amount).toBe(1500.50);
    expect(body.rows[0].type).toBe('expense');
    expect(body.rows[1].type).toBe('income');
    expect(body.detectedColumns).toContain('fecha');
    expect(body.detectedColumns).toContain('monto');
  });

  it('parses CSV with Spanish aliases', async () => {
    const cookie = await registerUser(USER);
    const csv = `dia,importe,categoría,detalle
15/03/2026,2500,Transporte,Taxi`;

    const fd = new FormData();
    fd.append('file', createCsvFile(csv));
    fd.append('defaultType', 'expense');
    const res = await makeFormDataRequest('/import/parse', fd, cookie);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].amount).toBe(2500);
    expect(body.rows[0].description).toBe('Taxi');
  });

  it('handles missing optional columns', async () => {
    const cookie = await registerUser(USER);
    const csv = `fecha,monto
01/03/2026,500
02/03/2026,750`;

    const fd = new FormData();
    fd.append('file', createCsvFile(csv));
    fd.append('defaultType', 'expense');
    const res = await makeFormDataRequest('/import/parse', fd, cookie);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rows).toHaveLength(2);
    expect(body.rows[0].category).toBeNull();
    expect(body.rows[0].description).toBeNull();
    expect(body.rows[0].errors).toHaveLength(0);
  });

  it('reports errors for invalid dates', async () => {
    const cookie = await registerUser(USER);
    const csv = `fecha,monto
invalid-date,500
01/03/2026,750`;

    const fd = new FormData();
    fd.append('file', createCsvFile(csv));
    fd.append('defaultType', 'expense');
    const res = await makeFormDataRequest('/import/parse', fd, cookie);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rows[0].errors).toContain('Fecha inválida');
    expect(body.rows[1].errors).toHaveLength(0);
    expect(body.summary.errorRows).toBe(1);
    expect(body.summary.validRows).toBe(1);
  });

  it('reports errors for invalid amounts', async () => {
    const cookie = await registerUser(USER);
    const csv = `fecha,monto
01/03/2026,abc
02/03/2026,1000`;

    const fd = new FormData();
    fd.append('file', createCsvFile(csv));
    fd.append('defaultType', 'expense');
    const res = await makeFormDataRequest('/import/parse', fd, cookie);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rows[0].errors).toContain('Monto inválido');
    expect(body.rows[1].errors).toHaveLength(0);
  });

  it('detects duplicates against DB', async () => {
    const cookie = await registerUser(USER);
    const catId = await getDefaultCategoryId(cookie, 'expense');

    // Create existing expense
    await makeRequest('POST', '/expenses', {
      categoryId: catId,
      amount: 1500,
      date: '2026-03-01T00:00:00.000Z',
      description: 'Supermercado',
    }, cookie);

    const csv = `fecha,monto,descripcion
01/03/2026,1500,Supermercado
02/03/2026,2000,Farmacia`;

    const fd = new FormData();
    fd.append('file', createCsvFile(csv));
    fd.append('defaultType', 'expense');
    const res = await makeFormDataRequest('/import/parse', fd, cookie);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rows[0].isDuplicate).toBe(true);
    expect(body.rows[1].isDuplicate).toBe(false);
    expect(body.summary.duplicateRows).toBe(1);
  });

  it('matches categories case-insensitive', async () => {
    const cookie = await registerUser(USER);

    const csv = `fecha,monto,categoria
01/03/2026,500,supermercado
02/03/2026,300,TRANSPORTE`;

    const fd = new FormData();
    fd.append('file', createCsvFile(csv));
    fd.append('defaultType', 'expense');
    const res = await makeFormDataRequest('/import/parse', fd, cookie);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rows[0].matchedCategoryId).not.toBeNull();
    expect(body.rows[0].matchedCategoryName).toBe('Supermercado');
    expect(body.rows[1].matchedCategoryId).not.toBeNull();
    expect(body.rows[1].matchedCategoryName).toBe('Transporte');
  });
});

// --- Confirm tests ---

describe('POST /import/confirm', () => {
  it('returns 401 without auth', async () => {
    const res = await makeRequest('POST', '/import/confirm', { rows: [] });
    expect(res.status).toBe(401);
  });

  it('inserts expenses and incomes correctly', async () => {
    const cookie = await registerUser(USER);
    const expCatId = await getDefaultCategoryId(cookie, 'expense');
    const incCatId = await getDefaultCategoryId(cookie, 'income');

    const res = await makeRequest('POST', '/import/confirm', {
      rows: [
        { date: '2026-03-01T00:00:00.000Z', amount: 1500, type: 'expense', categoryId: expCatId, description: 'Test 1' },
        { date: '2026-03-02T00:00:00.000Z', amount: 2000, type: 'expense', categoryId: expCatId, description: 'Test 2' },
        { date: '2026-03-03T00:00:00.000Z', amount: 50000, type: 'income', categoryId: incCatId, source: 'Empleo' },
      ],
    }, cookie);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inserted.expenses).toBe(2);
    expect(body.inserted.incomes).toBe(1);
  });

  it('returns 400 with invalid categoryId', async () => {
    const cookie = await registerUser(USER);

    const res = await makeRequest('POST', '/import/confirm', {
      rows: [
        { date: '2026-03-01T00:00:00.000Z', amount: 100, type: 'expense', categoryId: '00000000-0000-0000-0000-000000000000' },
      ],
    }, cookie);

    expect(res.status).toBe(400);
  });

  it('returns 400 with empty rows', async () => {
    const cookie = await registerUser(USER);

    const res = await makeRequest('POST', '/import/confirm', { rows: [] }, cookie);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('No hay filas');
  });

  it('verifies inserted records exist in DB', async () => {
    const cookie = await registerUser(USER);
    const catId = await getDefaultCategoryId(cookie, 'expense');

    await makeRequest('POST', '/import/confirm', {
      rows: [
        { date: '2026-03-15T00:00:00.000Z', amount: 999, type: 'expense', categoryId: catId, description: 'Imported' },
      ],
    }, cookie);

    const listRes = await makeRequest('GET', '/expenses?month=2026-03', undefined, cookie);
    const list = await listRes.json() as { data: { amount: number; description: string }[] };
    const imported = list.data.find((e) => e.description === 'Imported');
    expect(imported).toBeDefined();
    expect(imported!.amount).toBe(999);
  });
});
