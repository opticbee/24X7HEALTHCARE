const express = require('express');
const router = express.Router();
const db = require('../db'); // Make sure your db.js is correctly set up

// ✅ Create table to store form data
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS homesample_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date DATETIME NOT NULL,
    note TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error('❌ Failed to create homesample_bookings table:', err);
  } else {
    console.log('✅ homesample_bookings table is ready.');
  }
});

// ✅ Handle POST form submissions
router.post('/homesample_test_booking', (req, res) => {
  const { name, email, phone, date, note } = req.body;

  if (!name || !email || !phone || !date || !note) {
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  const insertQuery = `
    INSERT INTO homesample_bookings (name, email, phone, date, note)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [name, email, phone, date, note], (err, result) => {
    if (err) {
      console.error('❌ Error inserting form data:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    return res.status(200).json({ message: 'Booking saved successfully.' });
  });
});

module.exports = router;
