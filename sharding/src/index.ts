import { query } from './database/db';
import { User } from './types/database';
import { pool } from './database/pool';

async function getUsers() {
    const users = await query<User>(
        'select NOW()'
    );

    return users;
}

async function callMultipleConnections() {
    const promises = [];

    for (let i = 0; i < 50; i++) {
        promises.push(getUsers());
    }
}

callMultipleConnections();


async function shutdown() {
    console.log('Shutting down...');

    await pool.end();

    console.log('DB pool closed');

    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);