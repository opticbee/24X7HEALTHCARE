const express = require('express');
const router = express.Router();
const db = require('../db');



const createTableQuery = `
CREATE TABLE IF NOT EXISTS packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    note TEXT,
    packageName VARCHAR(255) NOT NULL,
    packageCost VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

db.query(createTableQuery, (err) => {
    if (err) {
        console.error('❌ Error creating diagnostics table:', err);
    } else {
        console.log('✅ Diagnostics table ready');
    }
});

router.post('/packages', (req, res) => {
    const { name, email, phone, date, note, packageName, packageCost } = req.body;

    if (!name || !email || !phone || !date || !packageName || !packageCost) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    const query = `
        INSERT INTO packages (name, email, phone, date, note, packageName, packageCost)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [name, email, phone, date, note, packageName, packageCost], (err, result) => {
        if (err) {
            console.error('❌ Error inserting booking:', err);
            return res.status(500).json({ message: 'Failed to save booking.' });
        }

        res.status(200).json({ message: 'Booking saved successfully!', id: result.insertId });
    });
});

module.exports = router;
