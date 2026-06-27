import { pool } from "./db";

const sleep = (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms));

export async function bookSeat(user: string) {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        // Lock the row
        const result = await client.query(
            `
            SELECT *
            FROM seats
            WHERE booked_by = ""
            FOR UPDATE
            `
        );

        const seat = result.rows[0];

        if (seat.booked) {

            console.log(`${user} -> Seat already booked`);

            await client.query("ROLLBACK");

            return false;
        }

        // Simulate payment gateway delay
        await sleep(Math.random() * 500);

        await client.query(
            `
            UPDATE seats
            SET booked=true,
                booked_by=$1,
                booked_at=NOW()
            WHERE seat_no='1A'
            `,
            [user]
        );

        await client.query("COMMIT");

        console.log(`✅ ${user} booked Seat 1A`);

        return true;

    } catch (err) {

        await client.query("ROLLBACK");

        console.error(err);

        return false;

    } finally {

        client.release();

    }

}