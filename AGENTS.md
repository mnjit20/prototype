# AGENTS.md

## Cursor Cloud specific instructions

This repo is a collection of independent Node.js/TypeScript learning sub-projects (no root `package.json`, no workspace tool). Run `npm install` and all scripts **inside each sub-directory**. The update script already runs `npm install` for every sub-project on startup.

The two real products are `teaching-material-search` (Express) and `db-search` (Fastify). Standard build/lint/test/run commands are in each project's `README.md` and `package.json` scripts. There is **no linter configured** in any project (no ESLint/Prettier); "build" means a `tsc` type-check.

### PostgreSQL (required by both products + the DB demos)

- PostgreSQL 16 is installed **natively** (not via Docker; Docker is not available in this env, so ignore the `docker compose up` steps in the READMEs).
- Start it each session (idempotent): `sudo pg_ctlcluster 16 main start`
- The `postgres` superuser password is set to `postgres`.
- Databases used by the two products already exist / must exist: `teaching_materials` and `db-search`. Recreate if missing: `sudo -u postgres psql -c "CREATE DATABASE teaching_materials;"` and `sudo -u postgres psql -c 'CREATE DATABASE "db-search";'`
- Extensions `pg_trgm`/`unaccent` are created automatically by the apps' migrations.

### `.env` files (gitignored — recreate if absent)

- `teaching-material-search/.env`: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/teaching_materials` (plus `PORT=3000`, `DB_SSL=false`, `DATA_FILE=./data/teaching-materials.json`).
- `db-search/.env`: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/db-search` (plus `PORT`, `HOST=0.0.0.0`).

### Running the apps (gotchas)

- Both apps default to **port 3000**. Run one at a time, or override `PORT` (e.g. `PORT=3001 npm run dev` for `db-search`).
- `teaching-material-search`: run `npm run migrate` then `npm run seed` before `npm run dev` (seeds ~10k rows from `data/teaching-materials.json`).
- `db-search`: **auto-migrates and seeds on first boot** when the DB is empty — just `npm run dev`. Boot seed of ~10k rows takes ~15s.
