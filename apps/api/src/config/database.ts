import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import logger from './logger';
import * as schema from '../db/schema';

const CONNECTION_STRING = process.env.DATABASE_URL!;

const client = postgres(CONNECTION_STRING, {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(client, { schema });

export async function testConnection() {
  try {
    await client`SELECT 1`;
    logger.info('Successfully connected to the database');
  } catch (error) {
    logger.error('Failed to connect to the database:', error);
    throw error;
  }
}
