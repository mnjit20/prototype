import { Pool } from "pg";

export const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "flight_demo",
    user: "postgres",
    password: "password",

    max: 20
});