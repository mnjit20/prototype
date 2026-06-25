import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { pool } from './db';
import { parseDocuments, upsertDocuments } from './ingest';
import { DocumentInput } from './schema';
import { search, type SearchMode } from './search';

const SearchQuery = z.object({
  q: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(150).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  mode: z.enum(['auto', 'strict', 'fuzzy']).optional().default('auto'),
});

const IngestBody = z.union([DocumentInput, z.array(DocumentInput)]);

export async function buildApp(options?: { logger?: boolean }) {
  const app = Fastify({ logger: options?.logger ?? false });

  await app.register(fastifyStatic, {
    root: join(dirname(fileURLToPath(import.meta.url)), '..', 'public'),
    prefix: '/',
  });

  app.get('/health', async () => {
    await pool.query('SELECT 1');
    return { status: 'ok' };
  });

  app.get('/api/search', async (req, reply) => {
    const parsed = SearchQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues });
    }
    const { q, limit, offset, mode } = parsed.data;
    return search(q, limit, offset, mode as SearchMode);
  });

  app.get<{ Params: { id: string } }>(
    '/api/documents/:id',
    async (req, reply) => {
      const { rows } = await pool.query(
        `SELECT id, title, description, tags, facets, created_at, preview_image_url, ingested_at
         FROM documents WHERE id = $1`,
        [req.params.id],
      );
      if (rows.length === 0) return reply.code(404).send({ error: 'not found' });
      return rows[0];
    },
  );

  app.post('/api/documents', async (req, reply) => {
    const parsed = IngestBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues });
    }

    const { documents, skipped } = parseDocuments(parsed.data);
    if (documents.length === 0) {
      return reply.code(400).send({ error: 'no valid documents' });
    }

    const result = await upsertDocuments(documents);
    return reply.code(200).send({ ...result, invalid: skipped });
  });

  return app;
}
