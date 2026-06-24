import { DbClient, pool } from '../db/pool';
import {
  normalizeMaterialTypeFilter,
  normalizeQuery,
  normalizeSchoolTypeFilter,
  normalizeSubjectFilter
} from '../domain/normalization';
import { NormalizedResource, SearchResponse, SearchResult } from '../domain/resource';

export interface SearchFilters {
  q?: string;
  subject?: string;
  grade?: number;
  schoolType?: string;
  materialType?: string;
  limit: number;
  offset: number;
}

export interface FacetValue {
  value: string | number;
  count: number;
}

export interface Facets {
  subjects: FacetValue[];
  grades: FacetValue[];
  schoolTypes: FacetValue[];
  materialTypes: FacetValue[];
}

const UPSERT_SQL = `
  INSERT INTO resources (
    id,
    title,
    description,
    original_tags,
    normalized_tags,
    subjects,
    grades,
    school_types,
    material_types,
    publishers,
    legacy_warnings,
    preview_image_url,
    created_at,
    content_hash,
    raw,
    search_text,
    normalized_search_text,
    search_vector,
    ingestion_run_id,
    updated_at
  )
  VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15::jsonb, $16, $17,
    setweight(to_tsvector('german', $18), 'A') ||
      setweight(to_tsvector('german', $19), 'B') ||
      setweight(to_tsvector('german', $20), 'A'),
    $21,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    original_tags = EXCLUDED.original_tags,
    normalized_tags = EXCLUDED.normalized_tags,
    subjects = EXCLUDED.subjects,
    grades = EXCLUDED.grades,
    school_types = EXCLUDED.school_types,
    material_types = EXCLUDED.material_types,
    publishers = EXCLUDED.publishers,
    legacy_warnings = EXCLUDED.legacy_warnings,
    preview_image_url = EXCLUDED.preview_image_url,
    created_at = EXCLUDED.created_at,
    content_hash = EXCLUDED.content_hash,
    raw = EXCLUDED.raw,
    search_text = EXCLUDED.search_text,
    normalized_search_text = EXCLUDED.normalized_search_text,
    search_vector = EXCLUDED.search_vector,
    ingestion_run_id = EXCLUDED.ingestion_run_id,
    updated_at = now()
`;

export async function createIngestionRun(sourceFile: string): Promise<number> {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO ingestion_runs (source_file, status)
      VALUES ($1, 'running')
      RETURNING id
    `,
    [sourceFile]
  );

  return Number(result.rows[0].id);
}

export async function finishIngestionRun(
  id: number,
  status: 'completed' | 'failed',
  stats: {
    totalRecords: number;
    importedRecords: number;
    failedRecords: number;
    duplicateGroups: number;
    errorMessage?: string;
  }
): Promise<void> {
  await pool.query(
    `
      UPDATE ingestion_runs
      SET
        status = $2,
        total_records = $3,
        imported_records = $4,
        failed_records = $5,
        duplicate_groups = $6,
        finished_at = now(),
        error_message = $7
      WHERE id = $1
    `,
    [
      id,
      status,
      stats.totalRecords,
      stats.importedRecords,
      stats.failedRecords,
      stats.duplicateGroups,
      stats.errorMessage ?? null
    ]
  );
}

export async function upsertResources(
  resources: NormalizedResource[],
  ingestionRunId: number
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (const resource of resources) {
      await upsertResource(client, resource, ingestionRunId);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function upsertResource(
  client: DbClient,
  resource: NormalizedResource,
  ingestionRunId: number
): Promise<void> {
  await client.query(UPSERT_SQL, [
    resource.id,
    resource.title,
    resource.description,
    resource.originalTags,
    resource.normalizedTags,
    resource.subjects,
    resource.grades,
    resource.schoolTypes,
    resource.materialTypes,
    resource.publishers,
    resource.legacyWarnings,
    resource.previewImageUrl,
    resource.createdAt,
    resource.contentHash,
    JSON.stringify(resource.raw),
    resource.searchText,
    resource.normalizedSearchText,
    resource.weightedSearch.title,
    resource.weightedSearch.description,
    resource.weightedSearch.facets,
    ingestionRunId
  ]);
}

export async function searchResources(filters: SearchFilters): Promise<SearchResponse> {
  const query = filters.q?.trim() ?? '';
  const tsQueryText = query ? `${query} ${normalizeQuery(query)}` : '';
  const normalizedQuery = normalizeQuery(query);
  const values: unknown[] = [tsQueryText, normalizedQuery];
  const where: string[] = [
    `(
      $1 = ''
      OR resources.search_vector @@ input.ts_query
      OR resources.normalized_search_text % $2
      OR resources.normalized_search_text ILIKE '%' || $2 || '%'
    )`
  ];

  const subject = normalizeSubjectFilter(filters.subject);
  if (subject) {
    values.push(subject);
    where.push(`resources.subjects @> ARRAY[$${values.length}::text]`);
  }

  if (filters.grade) {
    values.push(filters.grade);
    where.push(`resources.grades @> ARRAY[$${values.length}::integer]`);
  }

  const schoolType = normalizeSchoolTypeFilter(filters.schoolType);
  if (schoolType) {
    values.push(schoolType);
    where.push(`resources.school_types @> ARRAY[$${values.length}::text]`);
  }

  const materialType = normalizeMaterialTypeFilter(filters.materialType);
  if (materialType) {
    values.push(materialType);
    where.push(`resources.material_types @> ARRAY[$${values.length}::text]`);
  }

  values.push(filters.limit, filters.offset);
  const limitIndex = values.length - 1;
  const offsetIndex = values.length;

  const result = await pool.query(
    `
      WITH input AS (
        SELECT
          websearch_to_tsquery('german', $1) AS ts_query,
          $2::text AS normalized_query
      ),
      ranked AS (
        SELECT
          resources.*,
          CASE
            WHEN $1 = '' THEN 0
            ELSE
              ts_rank_cd(resources.search_vector, input.ts_query) * 10 +
              similarity(resources.normalized_search_text, input.normalized_query)
          END AS score,
          CASE
            WHEN $1 = '' THEN NULL
            ELSE ts_headline(
              'german',
              COALESCE(resources.description, resources.title, ''),
              input.ts_query,
              'StartSel=<mark>, StopSel=</mark>, MaxWords=28, MinWords=8'
            )
          END AS snippet
        FROM resources
        CROSS JOIN input
        WHERE ${where.join(' AND ')}
      ),
      deduped AS (
        SELECT DISTINCT ON (content_hash) *
        FROM ranked
        ORDER BY content_hash, score DESC, created_at DESC NULLS LAST, id
      )
      SELECT
        id,
        title,
        description,
        original_tags,
        subjects,
        grades,
        school_types,
        material_types,
        publishers,
        preview_image_url,
        created_at,
        score,
        snippet,
        COUNT(*) OVER() AS total_count
      FROM deduped
      ORDER BY score DESC, created_at DESC NULLS LAST, id
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
    `,
    values
  );

  const rows = result.rows as Array<{
    id: string;
    title: string | null;
    description: string | null;
    original_tags: string[];
    subjects: string[];
    grades: number[];
    school_types: string[];
    material_types: string[];
    publishers: string[];
    preview_image_url: string | null;
    created_at: Date | string | null;
    score: string | number;
    snippet: string | null;
    total_count: string | number;
  }>;

  const results: SearchResult[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    tags: row.original_tags ?? [],
    subjects: row.subjects ?? [],
    grades: row.grades ?? [],
    schoolTypes: row.school_types ?? [],
    materialTypes: row.material_types ?? [],
    publishers: row.publishers ?? [],
    previewImageUrl: row.preview_image_url,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    score: Number(row.score),
    snippet: row.snippet
  }));

  return {
    query,
    normalizedQuery,
    limit: filters.limit,
    offset: filters.offset,
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    results
  };
}

export async function getFacets(): Promise<Facets> {
  const [subjects, grades, schoolTypes, materialTypes] = await Promise.all([
    queryFacet('subjects', 'text'),
    queryFacet('grades', 'integer'),
    queryFacet('school_types', 'text'),
    queryFacet('material_types', 'text')
  ]);

  return {
    subjects,
    grades,
    schoolTypes,
    materialTypes
  };
}

async function queryFacet(column: string, type: 'text' | 'integer'): Promise<FacetValue[]> {
  const result = await pool.query(
    `
      SELECT value, COUNT(*)::integer AS count
      FROM resources
      CROSS JOIN LATERAL unnest(${column}) AS value
      GROUP BY value
      ORDER BY count DESC, value ASC
      LIMIT 50
    `
  );

  return result.rows.map((row) => ({
    value: type === 'integer' ? Number(row.value) : row.value,
    count: Number(row.count)
  }));
}
