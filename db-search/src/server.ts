import { config } from './config';
import { buildApp } from './app';
import { pool } from './db';
import { ensureSeeded } from './ensure-seeded';
import { backfillFacets } from './ingest';
import { migrate } from './migrate';

async function backfillFacetsIfNeeded(): Promise<void> {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM documents
     WHERE facets = '{}'::text[] AND tags <> '{}'::text[]`,
  );
  const pending = rows[0]?.count ?? 0;
  if (pending === 0) return;

  console.log(`backfilling facets for ${pending} document(s)…`);
  const updated = await backfillFacets((done, total) => {
    process.stdout.write(`\rfacets backfill ${done}/${total}`);
  });
  process.stdout.write('\n');
  console.log(`facets backfill complete (${updated} rows)`);
}

await migrate();
await ensureSeeded();
await backfillFacetsIfNeeded();

const app = await buildApp({ logger: true });

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

try {
  const addr = await app.listen({ port: config.port, host: config.host });
  app.log.info(`listening on ${addr}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
