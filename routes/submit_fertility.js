const express = require('express');
const router = express.Router();
const {dbFertility} = require('../db');

// Ensure the table exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS centre_appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    centre VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

dbFertility.query(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating centre_appointments table:', err);
  } else {
    console.log('centre_appointments table is ready');
  }
});

// POST endpoint
router.post('/submit_fertility', (req, res) => {
  const { name, email, phone, centre } = req.body;

  if (!name || !phone || !centre) {
    return res.status(400).json({ error: 'Name, phone, and centre are required' });
  }

  const sql = 'INSERT INTO centre_appointments (name, email, phone, centre) VALUES (?, ?, ?, ?)';
  dbFertility.query(sql, [name, email, phone, centre], (err, result) => {
    if (err) {
      console.error('Database insert error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ message: 'Appointment saved successfully' });
  });
});

module.exports = router;
