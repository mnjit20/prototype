import { pool } from "./db";

const letters = ["A", "B", "C", "D", "E", "F"];

export async function seed() {

    await pool.query("DELETE FROM seats");

    let count = 0;

    for (let row = 1; row <= 100; row++) {

        for (const letter of letters) {

            if (count >= 100)
                break;

            await pool.query(
                `
                INSERT INTO seats(seat_no)
                VALUES($1)
                `,
                [`${row}${letter}`]
            );

            count++;
        }

        if (count >= 100)
            break;
    }

    console.log(`Inserted ${count} seats`);

    await pool.end();

}