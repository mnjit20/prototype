import pg from 'pg';
import { env } from '../config/env';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export type DbClient = pg.PoolClient;

export async function closePool(): Promise<void> {
  await pool.end();
}
