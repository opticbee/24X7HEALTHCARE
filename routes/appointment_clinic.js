const express = require('express');
const router = express.Router();
const {dbClinic} = require('../db'); // Ensure your db.js exports the MySQL connection

// Create table if not exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS appointments_clinic (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    date DATE NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

dbClinic.query(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating appointments_clinic table:', err);
  } else {
    console.log('appointments_clinic table is ready.');
  }
});

// POST route to handle appointment form
router.post('/appointment_clinic', (req, res) => {
  const { name, email, phone, date, message } = req.body;

  if (!name || !email || !phone || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const insertQuery = `
    INSERT INTO appointments_clinic (name, email, phone, date, message)
    VALUES (?, ?, ?, ?, ?)
  `;

  dbClinic.query(insertQuery, [name, email, phone, date, message], (err, result) => {
    if (err) {
      console.error('Error inserting appointment:', err);
      return res.status(500).json({ error: 'Failed to book appointment' });
    }

    res.status(200).json({ message: 'Appointment booked successfully', id: result.insertId });
  });
});

module.exports = router;
