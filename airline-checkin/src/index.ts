import { bookSeat } from "./booking.service";
import { pool } from "./db";

async function runSimulation() {

    console.log("--------------------------------");
    console.log("Flight Booking Simulation");
    console.log("--------------------------------");

    const requests = [];

    for (let i = 1; i <= 100; i++) {

        requests.push(
            bookSeat(`User-${i}`)
        );

    }

    await Promise.all(requests);

    console.log("\nSimulation Complete\n");

    const result = await pool.query(
        "SELECT * FROM seats"
    );

    console.table(result.rows);

    await pool.end();

}

runSimulation();