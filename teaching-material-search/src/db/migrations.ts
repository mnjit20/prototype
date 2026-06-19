import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pool } from './pool';

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const id = file.replace(/\.sql$/, '');
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      const existing = await client.query(
        'SELECT id FROM schema_migrations WHERE id = $1',
        [id]
      );

      if (existing.rowCount === 0) {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
        console.log(`Applied migration ${file}`);
      } else {
        console.log(`Skipping migration ${file}`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
