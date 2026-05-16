import { Pool } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,

    min: 10,//env.db.min,
    max: 100,

    idleTimeoutMillis: env.db.idleTimeoutMillis,
    connectionTimeoutMillis:
        env.db.connectionTimeoutMillis,
});

pool.on('connect', () => {
    console.log('New DB connection established', pool.totalCount, pool.waitingCount);
});

pool.on('error', (err) => {
    console.error('Unexpected DB pool error', err);
});

pool.on('remove', () => {
    console.log('DB connection removed');
});