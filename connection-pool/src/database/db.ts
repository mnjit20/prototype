import { pool } from './pool';

export async function query<T>(
    text: string,
    params?: unknown[]
): Promise<T[]> {
    const result = await pool.query(text, params);

    return result.rows;
}