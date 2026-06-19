import { runMigrations } from '../db/migrations';
import { closePool } from '../db/pool';

async function main(): Promise<void> {
  await runMigrations();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
