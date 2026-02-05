// donations.js
const express = require("express");
const router = express.Router();
const db = require("./db");  // adjust if your db file path is different

// Example: Register a donation
router.post("/donate", async (req, res) => {
    try {
        const { name, email, amount } = req.body;

        if (!name || !email || !amount) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const sql = "INSERT INTO Donations (name, email, amount) VALUES (?, ?, ?)";
        await db.query(sql, [name, email, amount]);

        res.json({ message: "Donation registered successfully ✅" });
    } catch (err) {
        console.error("Donation error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Example: Get all donations
router.get("/donations", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM Donations ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error("Fetch donations error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
