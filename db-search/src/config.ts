import 'dotenv/config';
import type { ConnectionOptions } from 'tls';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5432/test-db';

/** SSL for managed Postgres (Neon, Railway, Render, etc.). */
function databaseSsl(url: string): ConnectionOptions | undefined {
  try {
    const parsed = new URL(url);
    const sslmode = parsed.searchParams.get('sslmode');
    if (sslmode === 'disable') return undefined;
    if (
      sslmode === 'require' ||
      sslmode === 'verify-ca' ||
      sslmode === 'verify-full'
    ) {
      return { rejectUnauthorized: false };
    }
    if (/neon\.tech|railway|rldp\.io|render\.com/i.test(parsed.hostname)) {
      return { rejectUnauthorized: false };
    }
  } catch {
    // Let pg surface a bad connection string.
  }
  return undefined;
}

export const config = {
  databaseUrl,
  databaseSsl: databaseSsl(databaseUrl),
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
};
