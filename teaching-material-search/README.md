# Teaching Material Search MVP

Node.js + TypeScript backend for the Search technical challenge. The MVP ingests messy legacy teaching-material metadata into PostgreSQL, normalizes inconsistent tags into searchable facets, and exposes fast search through a JSON API plus a minimal browser page.

## Why this approach

For the provided 10k-record dataset, PostgreSQL full-text search is the pragmatic choice:

- No extra search cluster to deploy or operate for the MVP.
- GIN indexes support low-latency text search and facet filters.
- `pg_trgm` gives a useful fallback for typos, ASCII/umlaut mismatches, and inconsistent legacy tags.
- The schema keeps raw JSON and normalized fields side by side, so ingestion can improve without losing legacy provenance.

## Features

- Weighted full-text ranking: title/material/subject fields are weighted above description.
- Messy tag normalization: subject aliases (`deutsh` -> `deutsch`, `matematik` -> `mathematik`, `reli` -> `religion / ethik`), grade parsing (`Klasse acht`, `Kl. 8`, `12te Klasse`), school types, material types, and publishers.
- German query expansion: keeps original text, `ä/ö/ü/ß` transliterations, and normalized ASCII tokens searchable.
- Duplicate suppression: exact duplicate content groups are stored but collapsed in search results via `content_hash`.
- Ingestion-run tracking for repeatable batch imports.
- Simple HTML page at `/` and API endpoints for backend-focused review.

## Run locally

```bash
cd teaching-material-search
cp .env.example .env
docker compose up -d
npm install
npm run migrate
npm run seed
npm run dev
```

The default `DATA_FILE` is `./data/teaching-materials.json`. Place the full 10k-record challenge file there before running `npm run seed`.

Open:

- Browser UI: <http://localhost:3000>
- Health check: <http://localhost:3000/health>

## API examples

```bash
curl "http://localhost:3000/api/search?q=mathe%20klasse%206&limit=5"
curl "http://localhost:3000/api/search?q=sonnenenergie&subject=physik"
curl "http://localhost:3000/api/search?subject=geschichte&grade=9"
curl "http://localhost:3000/api/facets"
```

Search query parameters:

| Parameter | Description |
| --- | --- |
| `q` | Free-text query. Uses PostgreSQL `websearch_to_tsquery` plus trigram fallback. |
| `subject` | Optional normalized or legacy subject alias. |
| `grade` | Optional grade `1` through `13`. |
| `schoolType` | Optional school type, e.g. `Gymnasium`. |
| `materialType` | Optional type, e.g. `Arbeitsblatt`. |
| `limit` | Page size, max `100`. |
| `offset` | Pagination offset. |

## User stories covered by the MVP

1. As a teacher, I can search for a topic in natural language, such as `Sonnenenergie` or `mathe klasse 6`, and receive relevant materials immediately.
2. As a teacher, I can narrow broad searches by subject and grade so that legacy tag noise does not dominate the result list.
3. As an operator, I can import a new JSON snapshot repeatedly while retaining raw legacy data, validation warnings, and import-run statistics.

## Data model

`resources` stores:

- Raw legacy record (`raw JSONB`) for auditability.
- Display fields (`title`, `description`, `preview_image_url`, `created_at`).
- Normalized facets (`subjects`, `grades`, `school_types`, `material_types`, `publishers`).
- Search fields (`search_vector`, `search_text`, `normalized_search_text`).
- Data-quality fields (`legacy_warnings`, `content_hash`, `ingestion_run_id`).

The design intentionally avoids a hard dependency on a perfect taxonomy. New aliases can be added in `src/domain/normalization.ts` and applied on the next seed run.

## Target production architecture on AWS

### Search and storage at scale

For millions of documents and high concurrent traffic, I would evolve the MVP in stages:

1. **PostgreSQL as source of truth**
   - Use Amazon Aurora PostgreSQL for normalized metadata, raw legacy payloads, ingestion audit tables, and transactional updates.
   - Partition or index by tenant/domain if catalog ownership grows.
   - Keep GIN indexes for admin/internal lookup and as a fallback search path.

2. **Dedicated search serving**
   - Introduce Amazon OpenSearch Service for user-facing search once PostgreSQL ranking/facet latency or relevance tuning becomes limiting.
   - Store a denormalized search document per resource containing weighted title, description, canonical facets, publisher, grade ranges, freshness signals, and popularity signals.
   - Use aliases for blue/green index swaps so reindexing does not affect live traffic.

3. **Continuous ingestion pipeline**
   - Land source files or events in S3.
   - Trigger validation/normalization workers through EventBridge + SQS.
   - Process records idempotently with deterministic resource ids and content hashes.
   - Write normalized state to Aurora in small transactions.
   - Publish changed resource ids to another SQS stream for search-index workers.
   - Bulk index into OpenSearch with backpressure, retries, dead-letter queues, and per-run metrics.

4. **Serving layer**
   - Run the Node API on ECS Fargate or AWS Lambda behind API Gateway/ALB.
   - Cache common facet responses and empty-query pages in Redis/ElastiCache or CloudFront where appropriate.
   - Use OpenTelemetry traces and CloudWatch dashboards for query latency, index lag, import failures, and zero-result searches.

### Zero-downtime migration from the legacy schema

1. **Create the new schema in parallel**
   - Add the normalized resource tables without changing legacy production reads/writes.
   - Backfill from the legacy database into the new schema in resumable batches.

2. **Dual-write or CDC**
   - Prefer database change data capture, such as AWS DMS or logical replication, to stream legacy changes into the new pipeline.
   - If CDC is not available, add application-level dual-writes behind a feature flag after the initial backfill.

3. **Validate before cutover**
   - Compare counts, checksums, representative search samples, duplicate rates, missing-title rates, and facet distributions.
   - Run shadow search traffic: production queries hit both old and new search paths, but users still see old results.

4. **Progressive read cutover**
   - Enable the new API/search index for internal users, then a small percentage of teachers, then all users.
   - Keep old read path available for rollback until error rates, latency, and business metrics are stable.

5. **Retire legacy path**
   - Stop dual-write/CDC only after a full verification window.
   - Archive raw legacy payloads and ingestion logs for auditability.

## Deployment notes

For a challenge deployment, Render or Railway is sufficient:

1. Provision PostgreSQL.
2. Set `DATABASE_URL`, `DB_SSL=true`, `NODE_ENV=production`.
3. Build command: `npm install && npm run build`.
4. Start command: `npm run migrate && npm run seed && npm start`.

For a larger dataset, seed should usually be run as a one-off job instead of inside every web dyno start.

## AI tool usage

AI assistance was used as a development accelerator for:

- Translating the challenge requirements into a pragmatic project structure.
- Drafting boilerplate for Express, TypeScript configuration, SQL migrations, and README sections.
- Generating first-pass normalization tests from representative messy sample records.

Validation and corrections applied:

- The normalization logic is deterministic TypeScript with unit tests for aliases, grade parsing, umlaut expansion, invalid grade warnings, and duplicate hashing.
- SQL remains hand-written and parameterized; no AI-generated string interpolation is used for user-supplied filters.
- A suboptimal early idea was to rely only on full-text search. That would miss messy spellings and transliterations, so the implementation adds normalized search text and `pg_trgm` fallback while keeping PostgreSQL as the only datastore for the MVP.

## Scripts

```bash
npm run build     # Type-check
npm test          # Unit tests
npm run migrate   # Apply SQL migrations
npm run seed      # Import DATA_FILE
npm run dev       # Start with tsx watch
npm start         # Run compiled dist
```
