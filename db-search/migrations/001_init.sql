-- 001_init.sql
-- Extensions, German full-text config, and the documents table.

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() is only STABLE (its dictionary *could* change), so Postgres
-- refuses to use it inside generated columns / index expressions, which must
-- be IMMUTABLE. This thin wrapper asserts immutability -- the standard,
-- documented workaround. Our dictionary is fixed at deploy time.
--
-- NOTE: putting unaccent *inside* a text-search config (ALTER MAPPING ...
-- WITH unaccent, german_stem) is the linguistically tidier option, but it
-- makes to_tsvector() over that config non-immutable, which a generated
-- column rejects. So we fold umlauts with this wrapper FIRST, then stem with
-- the built-in 'german' config -- both immutable, so the column is valid and
-- "koln" still matches "Köln".
-- NOTE: this MUST be plpgsql, not sql. A simple SQL-language function gets
-- inlined during planning, which re-exposes the underlying non-immutable
-- unaccent() and makes the generated column fail the immutability check.
-- plpgsql functions are not inlined, so the declared IMMUTABLE is honored.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
BEGIN
  RETURN unaccent('unaccent', $1);
END;
$$;

-- array_to_string is only STABLE (its volatility is generic across element
-- types), so it also can't appear directly in a generated column. For text[]
-- it is effectively immutable -- wrap it likewise.
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
BEGIN
  RETURN array_to_string($1, $2);
END;
$$;

CREATE TABLE IF NOT EXISTS documents (
  id                text        PRIMARY KEY,
  title             text        NOT NULL DEFAULT '',
  description       text,
  tags              text[]      NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL,
  preview_image_url text,
  -- Operational column: when this row was last (re)ingested. Not search-facing.
  ingested_at       timestamptz NOT NULL DEFAULT now(),

  -- Derived lexical index, weighted title (A) > tags (B) > description (C).
  -- Umlauts folded first (immutable_unaccent), then stemmed with 'german'.
  -- Recomputed by Postgres on every write -- no triggers, no app-side sync.
  search_vector tsvector GENERATED ALWAYS AS (
       setweight(to_tsvector('german', immutable_unaccent(coalesce(title, ''))),        'A')
    || setweight(to_tsvector('german', immutable_unaccent(immutable_array_to_string(tags, ' '))), 'B')
    || setweight(to_tsvector('german', immutable_unaccent(coalesce(description, ''))),  'C')
  ) STORED,

  -- Folded, lower-cased blob used for trigram (typo-tolerant) matching.
  -- Catches misspelled *queries* AND the catalog's own misspelled data.
  search_text text GENERATED ALWAYS AS (
    immutable_unaccent(lower(
         coalesce(title, '')       || ' '
      || coalesce(description, '') || ' '
      || immutable_array_to_string(tags, ' ')
    ))
  ) STORED
);
