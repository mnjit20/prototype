const express = require("express");
const pool = require("../db");

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM users ORDER BY id"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Create user
router.post("/", async (req, res) => {
    try {
        const { name, email } = req.body;

        const result = await pool.query(
            `INSERT INTO users(name, email)
       VALUES($1, $2)
       RETURNING *`,
            [name, email]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;