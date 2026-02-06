const express = require('express');
const router = express.Router();
const dbFertility = require("../db");

// Ensure the database table exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS appointments_fertility (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

dbFertility.query(createTableQuery, (err, result) => {
  if (err) {
    console.error('Error creating appointments table:', err);
  } else {
    console.log('Appointments table ensured.');
  }
});

// API route to handle appointment submission
router.post('/appointment_fertility', (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  const sql = 'INSERT INTO appointments (name, email, phone, message) VALUES (?, ?, ?, ?)';
  dbFertility.query(sql, [name, email, phone, message], (err, result) => {
    if (err) {
      console.error('Error inserting appointment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(200).json({ message: 'Appointment booked successfully' });
  });
});

module.exports = router;
