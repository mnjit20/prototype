import { pool } from "./db";
import { bookSeat } from "./booking.service";
import { seed } from './seed';
import { performance } from "node:perf_hooks";
import { setTimeout } from "node:timers";

const letters = ["A", "B", "C", "D", "E", "F"];

function randomSeat() {

    const row = Math.floor(Math.random() * 17) + 1;

    const letter =
        letters[Math.floor(Math.random() * letters.length)];

    return `${row}${letter}`;

}

async function main() {
    await seed();
    const requests = [];

    for (let i = 1; i <= 100; i++) {

        bookSeat(
            `User-${i}`
        )

    }
    console.time("booking");
    const start = performance.now();

    // await Promise.all(requests);

    const result = await pool.query(`
        SELECT seat_no,
        booked_by
        FROM seats
        WHERE booked=true
        ORDER BY seat_no
    `);
    console.table(result.rows);


    const end = performance.now();
    console.timeEnd("booking");
    console.log(`Execution Time: ${((end - start) / 1000).toFixed(2)} ms`);
    await pool.end();

}

main();