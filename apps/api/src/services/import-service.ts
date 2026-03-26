import * as XLSX from 'xlsx';
import { and, eq, gte, isNull, lt, or } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../config/database';
import { categories, expenses, incomes } from '../db/schema';
import type { ParsedRow, ImportPreview, ConfirmRow, ConfirmResult } from '@cuentas-claras/shared';

// --- Column aliases ---

const COLUMN_ALIASES: Record<string, string[]> = {
  fecha: ['fecha', 'date', 'dia', 'day'],
  monto: ['monto', 'amount', 'importe', 'valor'],
  categoria: ['categoria', 'categoría', 'category'],
  descripcion: ['descripcion', 'descripción', 'description', 'detalle', 'concepto'],
  tipo: ['tipo', 'type'],
  fuente: ['fuente', 'source', 'origen'],
};

export function normalizeHeaders(rawHeaders: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < rawHeaders.length; i++) {
    const h = rawHeaders[i].trim().toLowerCase();
    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(h) && !(canonical in map)) {
        map[canonical] = i;
      }
    }
  }
  return map;
}

// --- Date parsing ---

export function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // DD/MM/YYYY or DD-MM-YYYY (Argentina convention first)
  const ddmmyyyy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const date = new Date(Date.UTC(+y, +m - 1, +d));
    if (!isNaN(date.getTime()) && date.getUTCMonth() === +m - 1) {
      return date.toISOString();
    }
  }

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Date.UTC(+y, +m - 1, +d));
    if (!isNaN(date.getTime()) && date.getUTCMonth() === +m - 1) {
      return date.toISOString();
    }
  }

  // MM/DD/YYYY
  const mmddyyyy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mmddyyyy) {
    const [, m, d, y] = mmddyyyy;
    const date = new Date(Date.UTC(+y, +m - 1, +d));
    if (!isNaN(date.getTime()) && date.getUTCMonth() === +m - 1) {
      return date.toISOString();
    }
  }

  return null;
}

// --- Amount parsing ---

export function parseAmount(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  let s = raw.trim();

  // Remove currency symbols and whitespace
  s = s.replace(/[$€£\s]/g, '');

  // Handle negative with parentheses: (1234.56)
  const isNeg = s.startsWith('(') && s.endsWith(')');
  if (isNeg) s = s.slice(1, -1);

  // Detect decimal separator: if last separator is comma and has ≤2 digits after → comma decimal
  // E.g. "1.234,56" → 1234.56; "1,234.56" → 1234.56
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Comma is the decimal separator (e.g. 1.234,56 or 1234,56)
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && lastComma !== -1) {
    // Dot is the decimal separator (e.g. 1,234.56)
    s = s.replace(/,/g, '');
  } else if (lastComma !== -1 && lastDot === -1) {
    // Only comma present, treat as decimal if ≤2 digits after
    const afterComma = s.slice(lastComma + 1);
    if (afterComma.length <= 2) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(',', '');
    }
  }

  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return Math.abs(isNeg ? -n : n);
}

// --- Type detection ---

function detectType(raw: string | undefined, defaultType: 'expense' | 'income' | 'mixed'): 'expense' | 'income' {
  if (raw) {
    const t = raw.trim().toLowerCase();
    if (['gasto', 'expense', 'egreso'].includes(t)) return 'expense';
    if (['ingreso', 'income'].includes(t)) return 'income';
  }
  return defaultType === 'income' ? 'income' : 'expense';
}

// --- Category matching ---

export function matchCategory(
  name: string | null,
  userCategories: { id: string; name: string; type: string }[],
  type: 'expense' | 'income',
): { id: string; name: string } | null {
  if (!name) return null;
  const lower = name.trim().toLowerCase();

  // Filter categories by type
  const typed = userCategories.filter((c) => c.type === type);

  // Exact match (case-insensitive)
  const exact = typed.find((c) => c.name.toLowerCase() === lower);
  if (exact) return { id: exact.id, name: exact.name };

  // Contains match
  const partial = typed.find(
    (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()),
  );
  if (partial) return { id: partial.id, name: partial.name };

  return null;
}

// --- Duplicate detection ---

async function findExistingRecords(
  userId: string,
  minDate: Date,
  maxDate: Date,
): Promise<{ expenses: { amount: string; date: Date; description: string | null }[]; incomes: { amount: string; date: Date; description: string | null }[] }> {
  const nextDay = new Date(maxDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const existingExpenses = await db
    .select({ amount: expenses.amount, date: expenses.date, description: expenses.description })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.date, minDate), lt(expenses.date, nextDay)));

  const existingIncomes = await db
    .select({ amount: incomes.amount, date: incomes.date, description: incomes.description })
    .from(incomes)
    .where(and(eq(incomes.userId, userId), gte(incomes.date, minDate), lt(incomes.date, nextDay)));

  return { expenses: existingExpenses, incomes: existingIncomes };
}

function isDuplicate(
  row: { amount: number; date: string; description: string | null; type: 'expense' | 'income' },
  existing: ReturnType<typeof findExistingRecords> extends Promise<infer R> ? R : never,
): boolean {
  const records = row.type === 'expense' ? existing.expenses : existing.incomes;
  const rowDate = new Date(row.date);
  const rowDay = rowDate.getUTCDate();
  const rowMonth = rowDate.getUTCMonth();
  const rowYear = rowDate.getUTCFullYear();

  return records.some((r) => {
    const d = r.date;
    return (
      parseFloat(r.amount) === row.amount &&
      d.getUTCDate() === rowDay &&
      d.getUTCMonth() === rowMonth &&
      d.getUTCFullYear() === rowYear &&
      (r.description ?? '') === (row.description ?? '')
    );
  });
}

// --- Main parse ---

export async function parse(
  userId: string,
  buffer: ArrayBuffer,
  fileName: string,
  defaultType: 'expense' | 'income' | 'mixed',
): Promise<ImportPreview> {
  // Strip UTF-8 BOM if present (EF BB BF)
  let buf = Buffer.from(buffer);
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    buf = buf.subarray(3);
  }
  const workbook = XLSX.read(buf, { type: 'buffer', raw: true, codepage: 65001 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new HTTPException(400, { message: 'El archivo está vacío' });

  const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  if (rawData.length < 2) throw new HTTPException(400, { message: 'El archivo debe tener al menos una fila de datos' });

  const headerRow = rawData[0].map((h) => String(h).replace(/^\uFEFF/, ''));
  const colMap = normalizeHeaders(headerRow);

  if (!('fecha' in colMap) || !('monto' in colMap)) {
    throw new HTTPException(400, { message: 'Columnas requeridas no encontradas: fecha, monto' });
  }

  const detectedColumns = Object.keys(colMap);

  // Fetch user categories
  const userCategories = await db
    .select({ id: categories.id, name: categories.name, type: categories.type })
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)));

  const rows: ParsedRow[] = [];

  for (let i = 1; i < rawData.length; i++) {
    const raw = rawData[i];
    // Skip completely empty rows
    if (raw.every((cell) => !String(cell).trim())) continue;

    const errors: string[] = [];
    const warnings: string[] = [];

    const rawDate = String(raw[colMap.fecha] ?? '');
    const rawAmount = String(raw[colMap.monto] ?? '');
    const rawCategory = colMap.categoria !== undefined ? String(raw[colMap.categoria] ?? '').trim() || null : null;
    const rawDescription = colMap.descripcion !== undefined ? String(raw[colMap.descripcion] ?? '').trim() || null : null;
    const rawType = colMap.tipo !== undefined ? String(raw[colMap.tipo] ?? '') : undefined;
    const rawSource = colMap.fuente !== undefined ? String(raw[colMap.fuente] ?? '').trim() || null : null;

    const date = parseDate(rawDate);
    if (!date) errors.push('Fecha inválida');

    const amount = parseAmount(rawAmount);
    if (amount === null) errors.push('Monto inválido');

    const type = detectType(rawType, defaultType);

    const matched = matchCategory(rawCategory, userCategories, type);
    if (rawCategory && !matched) {
      warnings.push(`Categoría "${rawCategory}" no encontrada`);
    }

    rows.push({
      rowIndex: i,
      date,
      amount,
      type,
      category: rawCategory,
      matchedCategoryId: matched?.id ?? null,
      matchedCategoryName: matched?.name ?? null,
      description: rawDescription,
      source: rawSource,
      errors,
      warnings,
      isDuplicate: false,
    });
  }

  // Check duplicates for valid rows
  const validDates = rows
    .filter((r) => r.date && r.amount !== null)
    .map((r) => new Date(r.date!));

  if (validDates.length > 0) {
    const minDate = new Date(Math.min(...validDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())));
    const existing = await findExistingRecords(userId, minDate, maxDate);

    for (const row of rows) {
      if (row.date && row.amount !== null) {
        if (isDuplicate({ amount: row.amount, date: row.date, description: row.description, type: row.type }, existing)) {
          row.isDuplicate = true;
          row.warnings.push('Posible duplicado');
        }
      }
    }
  }

  const errorRows = rows.filter((r) => r.errors.length > 0).length;
  const validRows = rows.filter((r) => r.errors.length === 0).length;
  const duplicateRows = rows.filter((r) => r.isDuplicate).length;

  return {
    rows,
    summary: {
      totalRows: rows.length,
      validRows,
      errorRows,
      duplicateRows,
      expenseCount: rows.filter((r) => r.type === 'expense' && r.errors.length === 0).length,
      incomeCount: rows.filter((r) => r.type === 'income' && r.errors.length === 0).length,
    },
    detectedColumns,
  };
}

// --- Confirm ---

async function assertCategoryAccess(userId: string, categoryId: string): Promise<void> {
  const category = await db.query.categories.findFirst({
    where: and(
      eq(categories.id, categoryId),
      or(isNull(categories.userId), eq(categories.userId, userId)),
    ),
  });
  if (!category) throw new HTTPException(400, { message: 'Invalid or inaccessible category' });
}

export async function confirm(userId: string, rows: ConfirmRow[]): Promise<ConfirmResult> {
  // Validate all categoryIds
  const uniqueCategoryIds = [...new Set(rows.map((r) => r.categoryId))];
  for (const catId of uniqueCategoryIds) {
    await assertCategoryAccess(userId, catId);
  }

  const expenseRows = rows.filter((r) => r.type === 'expense');
  const incomeRows = rows.filter((r) => r.type === 'income');

  await db.transaction(async (tx) => {
    if (expenseRows.length > 0) {
      await tx.insert(expenses).values(
        expenseRows.map((r) => ({
          userId,
          categoryId: r.categoryId,
          amount: String(r.amount),
          date: new Date(r.date),
          description: r.description ?? null,
        })),
      );
    }

    if (incomeRows.length > 0) {
      await tx.insert(incomes).values(
        incomeRows.map((r) => ({
          userId,
          categoryId: r.categoryId,
          amount: String(r.amount),
          date: new Date(r.date),
          source: r.source ?? null,
          description: r.description ?? null,
        })),
      );
    }
  });

  return {
    inserted: { expenses: expenseRows.length, incomes: incomeRows.length },
  };
}
