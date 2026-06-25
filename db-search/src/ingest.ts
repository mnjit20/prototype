import { pool } from './db';
import { enrichFacets } from './normalize';
import { DocumentInput } from './schema';

// 7 columns/row; Postgres caps params at 65535, so stay well under.
export const INGEST_BATCH = 500;

export interface UpsertResult {
  upserted: number;
  skipped: number;
}

function dedupeById(documents: DocumentInput[]): DocumentInput[] {
  const byId = new Map<string, DocumentInput>();
  for (const doc of documents) byId.set(doc.id, doc);
  return [...byId.values()];
}

const UPSERT_SQL = (tuples: string) => `
  INSERT INTO documents (id, title, description, tags, created_at, preview_image_url, facets)
  VALUES ${tuples}
  ON CONFLICT (id) DO UPDATE SET
    title             = EXCLUDED.title,
    description       = EXCLUDED.description,
    tags              = EXCLUDED.tags,
    created_at        = EXCLUDED.created_at,
    preview_image_url = EXCLUDED.preview_image_url,
    facets            = EXCLUDED.facets,
    ingested_at       = now()
`;

/** Idempotent upsert — shared by seed, CLI ingest, and POST /api/documents. */
export async function upsertDocuments(
  documents: DocumentInput[],
): Promise<UpsertResult> {
  const deduped = dedupeById(documents);
  const skipped = documents.length - deduped.length;

  if (deduped.length === 0) {
    return { upserted: 0, skipped };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let upserted = 0;
    for (let i = 0; i < deduped.length; i += INGEST_BATCH) {
      const chunk = deduped.slice(i, i + INGEST_BATCH);
      const values: unknown[] = [];
      const tuples = chunk
        .map((d, j) => {
          const b = j * 7;
          values.push(
            d.id,
            d.title,
            d.description,
            d.tags,
            d.created_at,
            d.preview_image_url,
            enrichFacets(d.tags),
          );
          return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`;
        })
        .join(',');
      await client.query(UPSERT_SQL(tuples), values);
      upserted += chunk.length;
    }

    await client.query('COMMIT');
    return { upserted, skipped };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const BACKFILL_SQL = (tuples: string) => `
  UPDATE documents AS d
  SET facets = c.facets
  FROM (VALUES ${tuples}) AS c(id, facets)
  WHERE d.id = c.id
`;

/** Recompute facets for rows still at the default empty array (post-migration backfill). */
export async function backfillFacets(
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const { rows } = await pool.query<{ id: string; tags: string[] }>(
    `SELECT id, tags FROM documents
     WHERE facets = '{}'::text[] AND tags <> '{}'::text[]`,
  );

  if (rows.length === 0) return 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let done = 0;
    for (let i = 0; i < rows.length; i += INGEST_BATCH) {
      const chunk = rows.slice(i, i + INGEST_BATCH);
      const values: unknown[] = [];
      const tuples = chunk
        .map((row, j) => {
          const b = j * 2;
          values.push(row.id, enrichFacets(row.tags));
          return `($${b + 1}, $${b + 2}::text[])`;
        })
        .join(',');
      await client.query(BACKFILL_SQL(tuples), values);
      done += chunk.length;
      onProgress?.(done, rows.length);
    }

    await client.query('COMMIT');
    return rows.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function parseDocuments(raw: unknown): {
  documents: DocumentInput[];
  skipped: number;
} {
  const list = Array.isArray(raw) ? raw : [raw];
  const documents: DocumentInput[] = [];
  let skipped = 0;

  for (const rec of list) {
    const parsed = DocumentInput.safeParse(rec);
    if (parsed.success) {
      documents.push(parsed.data);
    } else {
      skipped++;
    }
  }

  return { documents, skipped };
}
