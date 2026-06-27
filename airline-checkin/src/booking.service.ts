import { pool } from "./db";

const sleep = (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms));

export async function bookSeat(
    user: string,
    seatNo: string
) {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const result = await client.query(
            `
            SELECT *
            FROM seats
            WHERE seat_no=$1
            FOR UPDATE
            `,
            [seatNo]
        );

        if (result.rows.length === 0) {

            console.log(`${seatNo} doesn't exist`);

            await client.query("ROLLBACK");
            return;

        }

        const seat = result.rows[0];

        if (seat.booked) {

            console.log(`${user} failed. ${seatNo} already booked`);

            await client.query("ROLLBACK");
            return;

        }

        await sleep(Math.random() * 5000);

        await client.query(
            `
            UPDATE seats
            SET booked=true,
                booked_by=$1,
                booked_at=NOW()
            WHERE seat_no=$2
            `,
            [user, seatNo]
        );

        await client.query("COMMIT");

        console.log(`✅ ${user} booked ${seatNo}`);

    } catch (err) {

        await client.query("ROLLBACK");
        console.error(err);

    } finally {

        client.release();

    }

}