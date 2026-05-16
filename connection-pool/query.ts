import { pool } from './db';

export async function query(
    sql: string,
    params: unknown[] = []
) {
    const result = await pool.query(sql, params);

    return result.rows;
}