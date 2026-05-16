import dotenv from 'dotenv';

dotenv.config();

export const env = {
    db: {
        host: process.env.DB_HOST!,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        database: process.env.DB_NAME!,

        min: Number(process.env.DB_POOL_MIN ?? 2),
        max: Number(process.env.DB_POOL_MAX ?? 10),
        idleTimeoutMillis: Number(
            process.env.DB_IDLE_TIMEOUT ?? 30000
        ),
        connectionTimeoutMillis: Number(
            process.env.DB_CONNECTION_TIMEOUT ?? 2000
        ),
    },
};