import { env } from './config/env';
import { createApp, shutdown } from './http/app';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Teaching material search listening on port ${env.PORT}`);
});

async function stop(): Promise<void> {
  console.log('Shutting down search service...');
  server.close(async () => {
    await shutdown();
    process.exit(0);
  });
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
