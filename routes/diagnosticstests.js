const express = require('express');
const router = express.Router();
const db = require('../db');


// Create the bookings1 table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS bookings1 (
    id INT AUTO_INCREMENT PRIMARY KEY,
  
    testName VARCHAR(255) NOT NULL,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    preferredDate DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;
db.query(createTableQuery, (err) => {
  if (err) console.error('🚫 Failed to create table:', err);
  else console.log('✅ bookings1 table is ready');
});

// POST /api/book-test
router.post('/diagnosticstests', (req, res) => {
  const { testName, fullName, email, phone, preferredDate } = req.body;

  if (!testName || !fullName || !email || !phone || !preferredDate) {
    return res.status(400).json({ message: 'All fields are required' });
  }






  const insertQuery = `
    INSERT INTO bookings1 (testName, fullName, email, phone, preferredDate)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(insertQuery, [testName, fullName, email, phone, preferredDate], (err, result) => {
    if (err) {
      console.error('🚫 Error inserting booking:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.status(200).json({ message: 'Booking submitted successfully' });
  });
});

module.exports = router;
