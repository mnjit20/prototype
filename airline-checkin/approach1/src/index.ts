import { pool } from "./db";
import { bookSeat } from "./booking.service";

const letters = ["A", "B", "C", "D", "E", "F"];

function randomSeat() {

    const row = Math.floor(Math.random() * 17) + 1;

    const letter =
        letters[Math.floor(Math.random() * letters.length)];

    return `${row}${letter}`;

}

async function main() {

    const requests = [];

    for (let i = 1; i <= 100; i++) {

        requests.push(
            bookSeat(
                `User-${i}`,
                randomSeat()
            )
        );

    }

    await Promise.all(requests);

    const result = await pool.query(`
        SELECT seat_no,
               booked_by
        FROM seats
        WHERE booked=true
        ORDER BY seat_no
    `);

    console.table(result.rows);

    await pool.end();

}

main();