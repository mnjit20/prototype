import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDocuments, upsertDocuments } from './ingest';

const DEFAULT_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'teaching-materials.json',
);

export async function seed(file = DEFAULT_FILE): Promise<void> {
  const raw = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(raw)) throw new Error('Expected a JSON array of documents');

  const { documents, skipped } = parseDocuments(raw);
  console.log(`parsed ${documents.length} valid records (${skipped} skipped)`);

  const { upserted, skipped: dupes } = await upsertDocuments(documents);
  if (dupes > 0) {
    console.warn(`collapsed ${dupes} duplicate id(s) (last occurrence kept)`);
  }
  console.log(`seed complete (${upserted} upserted)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  seed(process.argv[2])
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
