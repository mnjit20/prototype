import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { buildApp } from '../src/app';
import { pool } from '../src/db';
import { upsertDocuments } from '../src/ingest';
import { migrate } from '../src/migrate';
import type { DocumentInput } from '../src/schema';

const FIXTURES: DocumentInput[] = [
  {
    id: 'test_koln',
    title: 'ZZZ Test Freiarbeit: Köln und Nürnberg',
    description: 'Unterrichtsmaterial zu Köln und Nürnberg für Grundschule.',
    tags: ['zzz-test-only', 'köln-und-nürnberg', 'histo', 'geschicte', '9'],
    created_at: '2024-01-01T00:00:00.000Z',
    preview_image_url: null,
  },
  {
    id: 'test_reli',
    title: 'ZZZ Test Projektarbeit – Klage (Klasse 5)',
    description: 'Projektarbeit zum Thema Klage in Religion.',
    tags: ['zzz-test-only', 'klage', 'religion', 'reli', 'KLASSE 5', 'Grundschule'],
    created_at: '2024-02-01T00:00:00.000Z',
    preview_image_url: null,
  },
];

before(async () => {
  await migrate();
  await upsertDocuments(FIXTURES);
});

after(async () => {
  await pool.query(`DELETE FROM documents WHERE id LIKE 'test_%'`);
  await pool.end();
});

describe('integration', () => {
  it('health returns ok', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { status: 'ok' });
    await app.close();
  });

  it('umlaut query matches Köln via strict FTS', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/search',
      query: { q: 'zzz-test-only koln', limit: 5, mode: 'strict' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { results: { id: string }[] };
    assert.ok(body.results.some((r) => r.id === 'test_koln'));
    await app.close();
  });

  it('misspelled catalog tag is findable via fuzzy mode', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/search',
      query: { q: 'zzz-test-only geschichte', limit: 10, mode: 'fuzzy' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { results: { id: string }[] };
    assert.ok(body.results.some((r) => r.id === 'test_koln'));
    await app.close();
  });

  it('auto mode uses trigram fallback for typo queries with sparse FTS', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/search',
      query: { q: 'zzz-test-only geschicte', limit: 10, mode: 'auto' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { results: { id: string }[] };
    assert.ok(body.results.some((r) => r.id === 'test_koln'));
    await app.close();
  });

  it('reli strict search stays narrower than fuzzy', async () => {
    const app = await buildApp();
    const strict = await app.inject({
      method: 'GET',
      url: '/api/search',
      query: { q: 'zzz-test-only reli', limit: 100, mode: 'strict' },
    });
    const fuzzy = await app.inject({
      method: 'GET',
      url: '/api/search',
      query: { q: 'zzz-test-only reli', limit: 100, mode: 'fuzzy' },
    });
    const strictBody = strict.json() as { total: number; results: { id: string }[] };
    const fuzzyBody = fuzzy.json() as { total: number };
    assert.ok(strictBody.results.some((r) => r.id === 'test_reli'));
    assert.ok(fuzzyBody.total >= strictBody.total);
    await app.close();
  });

  it('upsert is idempotent', async () => {
    const first = await upsertDocuments(FIXTURES);
    const second = await upsertDocuments(FIXTURES);
    assert.equal(first.upserted, FIXTURES.length);
    assert.equal(second.upserted, FIXTURES.length);
    const { rows } = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM documents WHERE id LIKE 'test_%'`,
    );
    assert.equal(rows[0]?.count, FIXTURES.length);
  });

  it('POST /api/documents ingests a document', async () => {
    const app = await buildApp();
    const doc: DocumentInput = {
      id: 'test_ingest_api',
      title: 'API ingest smoke test',
      description: 'Inserted via POST /api/documents',
      tags: ['reli', 'KLASSE 3'],
      created_at: '2024-03-01T00:00:00.000Z',
      preview_image_url: null,
    };

    const post = await app.inject({
      method: 'POST',
      url: '/api/documents',
      payload: doc,
    });
    assert.equal(post.statusCode, 200);
    assert.equal((post.json() as { upserted: number }).upserted, 1);

    const get = await app.inject({
      method: 'GET',
      url: '/api/documents/test_ingest_api',
    });
    assert.equal(get.statusCode, 200);
    const row = get.json() as { facets: string[] };
    assert.ok(row.facets.includes('religion'));
    assert.ok(row.facets.includes('klasse-3'));

    await pool.query(`DELETE FROM documents WHERE id = 'test_ingest_api'`);
    await app.close();
  });
});
