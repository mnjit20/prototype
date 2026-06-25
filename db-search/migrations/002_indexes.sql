-- 002_indexes.sql
-- One GIN index per search strategy, plus a recency index for browse mode.

-- Lexical search: GIN over the weighted tsvector.
CREATE INDEX IF NOT EXISTS idx_documents_search_vector
  ON documents USING GIN (search_vector);

-- Fuzzy / typo-tolerant search: GIN trigram over the folded text blob.
-- Supports the <% (word_similarity) operator used in the query.
CREATE INDEX IF NOT EXISTS idx_documents_search_text_trgm
  ON documents USING GIN (search_text gin_trgm_ops);

-- Browse / empty-query mode and recency tie-breaks.
CREATE INDEX IF NOT EXISTS idx_documents_created_at
  ON documents (created_at DESC);
