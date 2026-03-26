import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import logger from './logger';
import * as schema from '../db/schema';

const CONNECTION_STRING = process.env.DATABASE_URL!;

const isProduction = process.env.NODE_ENV === 'production';
const useSSL = isProduction || CONNECTION_STRING.includes('sslmode=require');

const client = postgres(CONNECTION_STRING, {
  ssl: useSSL ? 'require' : false,
  prepare: useSSL ? false : true,
  max: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 10,
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
