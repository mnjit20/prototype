import { pool } from "./db";
import { performance } from 'node:perf_hooks';

const sleep = (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms));

export async function bookSeat(
    user: string,
    seatNo?: string
) {
    const client = await pool.connect();

    try {

        await client.query("BEGIN");
        const lockStart = performance.now();
        const result = await client.query(
            `
            SELECT *
            FROM seats
            WHERE booked != true
            limit 1
            FOR UPDATE SKIP LOCKED
            `
        );

        if (result.rows.length === 0) {

            console.log(`${seatNo} doesn't exist`);

            await client.query("ROLLBACK");
            return;

        }

        // console.log('results', result.rows);
        const seat = result.rows[0];

        if (seat.booked) {

            console.log(`${user} failed. ${seatNo} already booked`);

            await client.query("ROLLBACK");
            return;

        }

        await sleep(Math.random() * 500);
        const seatNoFromRow = result.rows[0].seat_no;

        await client.query(
            `
            UPDATE seats
            SET booked=true,
                booked_by=$1,
                booked_at=NOW()
            WHERE seat_no=$2
            `,
            [user, seatNoFromRow]
        );
        const lockEnd = performance.now();
        console.log(
            `${user} waited ${(lockEnd - lockStart).toFixed(2)} ms for the lock`
        );
        await client.query("COMMIT");

        console.log(`✅ ${user} booked ${seatNoFromRow}`);

    } catch (err) {

        await client.query("ROLLBACK");
        console.error(err);

    } finally {

        client.release();

    }

}