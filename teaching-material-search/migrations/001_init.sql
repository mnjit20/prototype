CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  source_file TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  total_records INTEGER NOT NULL DEFAULT 0,
  imported_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  duplicate_groups INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  original_tags TEXT[] NOT NULL DEFAULT '{}',
  normalized_tags TEXT[] NOT NULL DEFAULT '{}',
  subjects TEXT[] NOT NULL DEFAULT '{}',
  grades INTEGER[] NOT NULL DEFAULT '{}',
  school_types TEXT[] NOT NULL DEFAULT '{}',
  material_types TEXT[] NOT NULL DEFAULT '{}',
  publishers TEXT[] NOT NULL DEFAULT '{}',
  legacy_warnings TEXT[] NOT NULL DEFAULT '{}',
  preview_image_url TEXT,
  created_at TIMESTAMPTZ,
  content_hash TEXT NOT NULL,
  raw JSONB NOT NULL,
  search_text TEXT NOT NULL,
  normalized_search_text TEXT NOT NULL,
  search_vector TSVECTOR NOT NULL,
  ingestion_run_id BIGINT REFERENCES ingestion_runs(id),
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resources_search_vector_idx
  ON resources USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS resources_normalized_search_text_trgm_idx
  ON resources USING GIN (normalized_search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS resources_subjects_idx
  ON resources USING GIN (subjects);

CREATE INDEX IF NOT EXISTS resources_grades_idx
  ON resources USING GIN (grades);

CREATE INDEX IF NOT EXISTS resources_school_types_idx
  ON resources USING GIN (school_types);

CREATE INDEX IF NOT EXISTS resources_material_types_idx
  ON resources USING GIN (material_types);

CREATE INDEX IF NOT EXISTS resources_content_hash_idx
  ON resources (content_hash);

CREATE INDEX IF NOT EXISTS resources_created_at_idx
  ON resources (created_at DESC NULLS LAST);
