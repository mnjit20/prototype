import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { closePool } from '../db/pool';
import { normalizeResource } from '../domain/normalization';
import { NormalizedResource } from '../domain/resource';
import { createIngestionRun, finishIngestionRun, upsertResources } from '../repositories/resourceRepository';

const BATCH_SIZE = 500;

async function main(): Promise<void> {
  const sourceFile = path.resolve(process.cwd(), env.DATA_FILE);
  const json = await fs.readFile(sourceFile, 'utf8');
  const records = JSON.parse(json) as unknown;

  if (!Array.isArray(records)) {
    throw new Error(`Expected ${sourceFile} to contain a JSON array`);
  }

  const ingestionRunId = await createIngestionRun(sourceFile);
  const normalized: NormalizedResource[] = [];
  let failedRecords = 0;

  try {
    for (const [index, record] of records.entries()) {
      try {
        normalized.push(normalizeResource(record));
      } catch (error) {
        failedRecords += 1;
        console.warn(`Skipping invalid record at index ${index}:`, error);
      }
    }

    for (let start = 0; start < normalized.length; start += BATCH_SIZE) {
      const batch = normalized.slice(start, start + BATCH_SIZE);
      await upsertResources(batch, ingestionRunId);
      console.log(`Imported ${Math.min(start + batch.length, normalized.length)} / ${normalized.length}`);
    }

    await finishIngestionRun(ingestionRunId, 'completed', {
      totalRecords: records.length,
      importedRecords: normalized.length,
      failedRecords,
      duplicateGroups: countDuplicateGroups(normalized)
    });

    console.log(
      `Seed completed: ${normalized.length} imported, ${failedRecords} failed, ${countDuplicateGroups(
        normalized
      )} duplicate content group(s)`
    );
  } catch (error) {
    await finishIngestionRun(ingestionRunId, 'failed', {
      totalRecords: records.length,
      importedRecords: normalized.length,
      failedRecords,
      duplicateGroups: countDuplicateGroups(normalized),
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

function countDuplicateGroups(resources: NormalizedResource[]): number {
  const counts = new Map<string, number>();
  for (const resource of resources) {
    counts.set(resource.contentHash, (counts.get(resource.contentHash) ?? 0) + 1);
  }

  return [...counts.values()].filter((count) => count > 1).length;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
