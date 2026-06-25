import { pool } from './db';
import { seed } from './seed';

export async function ensureSeeded(): Promise<void> {
  const { rows } = await pool.query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM documents',
  );
  const count = rows[0]?.count ?? 0;

  if (count > 0) {
    console.log(`database already seeded (${count} documents), skipping`);
    return;
  }

  console.log('empty database, seeding…');
  await seed();
}
