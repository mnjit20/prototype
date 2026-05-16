import { pool } from './db';

process.on('SIGINT', async () => {
    await pool.end();

    process.exit(0);
});