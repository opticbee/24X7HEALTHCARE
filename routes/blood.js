const express = require('express');
const router = express.Router();
const db = require('../db');



const createTableQuery = `
        CREATE TABLE IF NOT EXISTS donors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            bloodType VARCHAR(5) NOT NULL,
            location VARCHAR(255) NOT NULL,
            contact VARCHAR(15) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.query(createTableQuery, (err, result) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('✅  Donors table ready');
        }
    });

// Register new donor
router.post('/register', (req, res) => {
    const { fullName, bloodType, location, contactNumber } = req.body;

    if (!fullName || !bloodType || !location || !contactNumber) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const sql = 'INSERT INTO donors (name, bloodType, location, contact) VALUES (?, ?, ?, ?)';
    db.query(sql, [fullName, bloodType, location, contactNumber], (err, result) => {
        if (err) {
            console.error('Insert error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.status(201).json({ success: true, message: 'Donor registered successfully' });
    });
});

// Get all donors
router.get('/donors', (req, res) => {
    const sql = 'SELECT * FROM donors ORDER BY id DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Fetch error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json(results);
    });
});

module.exports = router;
