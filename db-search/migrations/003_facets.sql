-- 003_facets.sql
-- Ingest-time normalized facets (canonical subjects, grades) for better search.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS facets text[] NOT NULL DEFAULT '{}';

DROP INDEX IF EXISTS idx_documents_search_vector;
DROP INDEX IF EXISTS idx_documents_search_text_trgm;

ALTER TABLE documents DROP COLUMN IF EXISTS search_vector;
ALTER TABLE documents DROP COLUMN IF EXISTS search_text;

ALTER TABLE documents ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
     setweight(to_tsvector('german', immutable_unaccent(coalesce(title, ''))), 'A')
  || setweight(to_tsvector('german', immutable_unaccent(immutable_array_to_string(tags, ' '))), 'B')
  || setweight(to_tsvector('german', immutable_unaccent(immutable_array_to_string(facets, ' '))), 'B')
  || setweight(to_tsvector('german', immutable_unaccent(coalesce(description, ''))), 'C')
) STORED;

ALTER TABLE documents ADD COLUMN search_text text GENERATED ALWAYS AS (
  immutable_unaccent(lower(
       coalesce(title, '')       || ' '
    || coalesce(description, '') || ' '
    || immutable_array_to_string(tags, ' ')   || ' '
    || immutable_array_to_string(facets, ' ')
  ))
) STORED;

CREATE INDEX IF NOT EXISTS idx_documents_search_vector
  ON documents USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_documents_search_text_trgm
  ON documents USING GIN (search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_documents_facets
  ON documents USING GIN (facets);
