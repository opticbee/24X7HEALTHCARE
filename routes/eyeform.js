// api.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Adjust path if db.js is elsewhere

// ✅ Create pledges table if it doesn't exist
const createTableQuery = `
CREATE TABLE IF NOT EXISTS eyedonation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    address TEXT,
    email VARCHAR(255),
    mobile VARCHAR(15) NOT NULL,
    whatsapp VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

db.query(createTableQuery, (err) => {
    if (err) {
        console.error('❌ Error creating pledges table:', err);
    } else {
        console.log('✅ eyedonation table is ready.');
    }
});

// ✅ POST /api/pledge
router.post('/eyeform', (req, res) => {
    const { name, age, address, email, mobile, whatsapp } = req.body;

    // Basic validation
    if (!name || !age || !mobile) {
        return res.status(400).json({ message: 'Name, age, and mobile are required.' });
    }

    const sql = `
        INSERT INTO eyedonation (name, age, address, email, mobile, whatsapp)
        VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [name, age, address, email, mobile, whatsapp];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('❌ Error inserting pledge:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        res.status(200).json({ message: 'eyeform submitted successfully!' });
    });
});

module.exports = router;
