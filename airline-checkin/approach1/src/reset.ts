import { pool } from "./db";

async function reset() {

    await pool.query(`
        UPDATE seats
        SET booked=false,
            booked_by=NULL,
            booked_at=NULL
    `);

    console.log("Seat reset.");

    await pool.end();

}

reset();