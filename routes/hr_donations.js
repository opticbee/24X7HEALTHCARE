// routes/hr_donations.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ Create donations table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT,
    donationType VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error('❌ Failed to create donations table:', err);
  } else {
    console.log('✅ Donations table ensured.');
  }
});

// ✅ POST route handler
router.post('/hr_donations', (req, res) => {
  const { name, mobile, email, message, donationType } = req.body;

  if (!name || !mobile || !email) {
    return res.status(400).json({ success: false, message: 'Required fields missing.' });
  }

  const insertQuery = `
    INSERT INTO donations (name, mobile, email, message, donationType)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [name, mobile, email, message, donationType], (err, result) => {
    if (err) {
      console.error('❌ Insert error:', err);
      return res.status(500).json({ success: false, message: 'Database insert failed' });
    }

    res.status(200).json({ success: true, message: 'Donation saved successfully', id: result.insertId });
  });
});

module.exports = router;
