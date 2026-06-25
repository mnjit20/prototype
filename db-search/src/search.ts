import { pool } from './db';

export type SearchMode = 'auto' | 'strict' | 'fuzzy';

/** When mode=auto, enable trigram fallback only if FTS matches stay below this. */
const FTS_FALLBACK_THRESHOLD = 20;

/** Trigram fallback requires at least this many folded characters. */
const FUZZY_MIN_LENGTH = 4;

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  created_at: string;
  preview_image_url: string | null;
  score: number;
}

export interface SearchResponse {
  query: string;
  mode: SearchMode;
  total: number;
  limit: number;
  offset: number;
  results: SearchResult[];
}

// Hybrid retrieval:
//   1. Lexical match on the weighted tsvector, ranked by ts_rank_cd.
//   2. Trigram fallback (auto/fuzzy) only when FTS is sparse — not parallel OR.
// strict => FTS only; fuzzy => always allow trigram for queries >= FUZZY_MIN_LENGTH.
const SEARCH_SQL = `
  WITH q AS (
    SELECT
      websearch_to_tsquery('german', immutable_unaccent($1)) AS ts_query,
      immutable_unaccent(lower($1))                          AS fuzzy_query
  ),
  fts_count AS (
    SELECT count(*)::int AS n
    FROM documents d, q
    WHERE d.search_vector @@ q.ts_query
  )
  SELECT
    d.id, d.title, d.description, d.tags, d.created_at, d.preview_image_url,
    (CASE WHEN d.search_vector @@ q.ts_query
          THEN ts_rank_cd(d.search_vector, q.ts_query) * 4.0
          ELSE 0 END
     + CASE WHEN q.fuzzy_query <% d.search_text
            THEN word_similarity(q.fuzzy_query, d.search_text)
            ELSE 0 END) AS score,
    count(*) OVER() AS total
  FROM documents d, q, fts_count fc
  WHERE d.search_vector @@ q.ts_query
     OR (
       $4::text <> 'strict'
       AND length(q.fuzzy_query) >= ${FUZZY_MIN_LENGTH}
       AND q.fuzzy_query <% d.search_text
       AND NOT (d.search_vector @@ q.ts_query)
       AND (
         $4::text = 'fuzzy'
         OR fc.n < ${FTS_FALLBACK_THRESHOLD}
       )
     )
  ORDER BY score DESC, d.created_at DESC
  LIMIT $2 OFFSET $3
`;

const BROWSE_SQL = `
  SELECT
    d.id, d.title, d.description, d.tags, d.created_at, d.preview_image_url,
    0::float8 AS score,
    count(*) OVER() AS total
  FROM documents d
  ORDER BY d.created_at DESC
  LIMIT $1 OFFSET $2
`;

interface Row extends Omit<SearchResult, 'score'> {
  score: number;
  total: string;
}

export async function search(
  rawQuery: string,
  limit: number,
  offset: number,
  mode: SearchMode = 'auto',
): Promise<SearchResponse> {
  const query = rawQuery.trim();
  const isBrowse = query.length === 0;

  const { rows } = isBrowse
    ? await pool.query<Row>(BROWSE_SQL, [limit, offset])
    : await pool.query<Row>(SEARCH_SQL, [query, limit, offset, mode]);

  const total = rows.length > 0 ? Number(rows[0]!.total) : 0;

  const results: SearchResult[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    tags: r.tags,
    created_at: r.created_at,
    preview_image_url: r.preview_image_url,
    score: Number(r.score),
  }));

  return { query, mode: isBrowse ? 'auto' : mode, total, limit, offset, results };
}
