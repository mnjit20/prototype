# DBSearch — Search MVP

A backend that lets teachers search the legacy teaching-materials catalog in
German and get the most relevant documents back instantly.

The deliberate constraint: **stay in PostgreSQL.** At ~10k documents (and well
into the low millions for this access pattern) native full-text search is the
correct, lowest-overhead choice. Where Postgres FTS stops being the right answer
— and what replaces it — is covered in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Stack

- **Node.js + TypeScript**, run directly with `tsx` (no build step for the MVP)
- **Fastify** HTTP API
- **PostgreSQL 16** — full-text search + trigram fuzzy matching, no ORM
- **zod** for ingestion validation
- A dead-simple unstyled HTML page for manual testing

## Run locally

Copy the env file once, pick an option below, then open <http://localhost:3000>.

On first boot the server migrates and seeds automatically when the database is empty.

### Option 1 — Postgres in Docker, app on your machine

Best for development (hot reload via `tsx watch`).

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

### Option 2 — App in Docker

Build and run the app container. Postgres must be reachable from inside the container:

- **Local Postgres** (from Option 1): run `docker compose up -d` first, then in `.env` set
  `DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/dbSearch`
  (Mac/Windows Docker Desktop).
- **Neon**: put your pooled Neon URL in `.env` instead — no local Postgres needed.

```bash
cp .env.example .env
docker build -t search-mvp .
docker run --env-file .env --rm -it -p 3000:3000 search-mvp
```

### Option 3 — Postgres + app in Docker

One command, no hot reload. No `.env` needed — `DATABASE_URL` is set in
[`docker-compose.prod.yml`](./docker-compose.prod.yml).

```bash
docker compose -f docker-compose.prod.yml up --build
```

## Search design

Two complementary strategies behind one endpoint:

1. **Lexical (primary).** A weighted `tsvector` built with the built-in `german`
   text-search config after folding umlauts/eszett via `immutable_unaccent()`,
   so `koln` matches `Köln`. Title is weighted above tags/facets above
   description. Ranked with `ts_rank_cd`.
2. **Fuzzy (fallback).** Trigram word-similarity (`<%`) over a folded text blob,
   enabled only when FTS matches are sparse (`mode=auto`, default) or when
   explicitly requested (`mode=fuzzy`). Requires query length ≥ 4. Use
   `mode=strict` for FTS-only ranking.

The full query decision flow — browse vs search, the three modes, the
sparse-FTS fallback, and final scoring:

<p align="center">
  <img src="./public/Search-decision-flow.png" alt="Search decision flow: empty query browses by created_at; otherwise mode (strict/auto/fuzzy) selects FTS-only, FTS-with-sparse-fallback, or FTS+trigram; results scored by ts_rank_cd x4 + word_similarity, then paginated." width="520" />
</p>

Both `tsvector` and the trigram blob are **`GENERATED ALWAYS … STORED`**
columns, so the search index is recomputed by Postgres on every write and can
never drift out of sync with the row. No triggers, no application-side
denormalization. See [`migrations/001_init.sql`](./migrations/001_init.sql) for
the immutability wrappers (`immutable_unaccent`, `immutable_array_to_string`) that
make generated columns valid — a custom text-search config with `unaccent` baked
in was rejected by Postgres because it is not immutable enough.

At ingest time, canonical **facets** (e.g. `reli` → `religion`, `KLASSE 5` →
`klasse-5`) are derived in [`src/normalize.ts`](./src/normalize.ts) and indexed
alongside raw tags. Source tags are stored verbatim; we never destroy the
original data.

## Ingestion

Idempotent upsert keyed on `id` — the same path for seed, delta import, and API:

| Entry point | Usage |
| --- | --- |
| Boot-time seed | Auto-runs when DB is empty ([`src/ensure-seeded.ts`](./src/ensure-seeded.ts)) |
| CLI | `npm run ingest -- data/delta.json` |
| API | `POST /api/documents` (single object or array) |

Generated search columns update automatically on every upsert — no redeploy or
manual reindex step.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness + DB check |
| `GET` | `/api/search?q=&limit=&offset=&mode=` | Ranked search; `mode=auto\|strict\|fuzzy`; empty `q` browses newest |
| `GET` | `/api/documents/:id` | Single document |
| `POST` | `/api/documents` | Upsert one or many documents (JSON body) |

```bash
curl "http://localhost:3000/api/search?q=Religion%20Klasse%205&limit=5"
curl "http://localhost:3000/api/search?q=geschichte"          # typo-tolerant (auto)
curl "http://localhost:3000/api/search?q=koln&mode=strict"   # umlaut folding, FTS only
curl "http://localhost:3000/api/documents/doc_000001"
curl -X POST http://localhost:3000/api/documents \
  -H 'Content-Type: application/json' \
  -d '{"id":"doc_new","title":"…","description":"…","tags":["reli"],"created_at":"2024-01-01T00:00:00.000Z","preview_image_url":null}'
```

Response shape:

```json
{
  "query": "religion",
  "mode": "auto",
  "total": 42,
  "limit": 20,
  "offset": 0,
  "results": [
    { "id": "doc_000002", "title": "…", "description": "…",
      "tags": ["…"], "created_at": "…", "preview_image_url": null,
      "score": 1.234 }
  ]
}
```

See [`requests.http`](./requests.http) for a ready-to-run set (VS Code REST
Client / JetBrains HTTP client).

## User stories

1. **As a teacher, I type a topic in natural German and get the most relevant
   materials ranked title-first, instantly.** → weighted FTS + `ts_rank_cd`.
2. **As a teacher, I still find materials when I misspell a term — or when the
   catalog's own tags are misspelled.** → trigram fuzzy fallback. Directly
   addresses the legacy data quality.
3. **As the platform, newly ingested materials become searchable with no
   redeploy and no manual reindex step.** → idempotent upsert keyed on `id` +
   generated search columns, exposed via `POST /api/documents` and
   `npm run ingest`.

## Deployment

Live demo: `https://manjeet-verma.fly.dev`

### Fly.io + Neon

**1. Neon (database)**

1. Create a Neon project (Postgres 16).
2. Copy the **pooled** connection string (host like `*.pooler.neon.tech`).
3. Ensure `?sslmode=require` is in the URL if Neon did not add it.
4. Extensions `unaccent` and `pg_trgm` are enabled automatically on first migrate;
   pre-enabling in the Neon SQL editor is optional.

**2. Fly.io (app)**

1. `fly launch` — select the [`Dockerfile`](./Dockerfile) when prompted.
2. `fly secrets set DATABASE_URL="..."` — your Neon pooled URL.
3. `fly deploy`

Fly sets `PORT` automatically (usually 8080); the app reads `process.env.PORT`.
`HOST` defaults to `0.0.0.0` in [`src/config.ts`](./src/config.ts). On boot the
container migrates and seeds when the database is empty. SSL to Neon is configured
automatically when `sslmode=require` is in the URL.

Health check: `GET /health` (first deploy may take ~30–60s while ~10k rows seed).

Verify:

```bash
curl https://manjeet-verma.fly.dev/health
curl "https://manjeet-verma.fly.dev/api/search?q=geschichte&limit=5"
```

**Neon free-tier note:** the database can scale to zero after idle time. Hit
`/health` before a demo if the first request after a long gap feels slow.

### Other platforms

Railway / Render work similarly: managed Postgres, `DATABASE_URL` + `PORT`, `npm start`.
See [`railway.toml`](./railway.toml) for Railway. `tsx` runs at runtime (no compile step).

## AI tool usage

This scaffold was produced with an AI assistant (Claude). Documented per the
challenge's transparency requirement:

- **Used for:** project boilerplate (Fastify wiring, migration runner, the
  batched upsert loop), and drafting the SQL and docs.
- **Validated by:** running migrations + seed against a local Postgres,
  `npm test` integration smoke tests, exercising the endpoints in
  `requests.http` (including the typo and umlaut cases), and a `tsc --noEmit`
  typecheck.
- **Where judgment overrode the AI:** the first-pass instinct for German search
  is reliably wrong in three ways — `to_tsvector('english', …)` (wrong language
  config, no umlaut handling), `ILIKE '%q%'` instead of a real FTS/trigram
  strategy, and dropping `unaccent()` straight into a generated column, which
  fails Postgres' immutability requirement at migration time. The corrections —
  `immutable_unaccent()` before the built-in `german` config, and a hybrid
  FTS + trigram query with trigram as a true fallback — are the parts that
  actually required understanding Postgres internals rather than pattern-matching.