// routes/specialists.js
const express = require('express');
const router = express.Router();
const {dbAppointments} = require('../db');

// ✅ Create table if not exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS specialists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    fee DECIMAL(10,2) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    expertise VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

dbAppointments.query(createTableQuery, (err) => {
  if (err) {
    console.error('❌ Failed to create specialists table:', err);
  } else {
    console.log('✅ Specialists table is ready.');
  }
});

// ✅ POST: Register specialist
router.post('/specialists', (req, res) => {
  const { image, name, fee, degree, branch, expertise, specialization, location, description } = req.body;

  if (!name || !fee || !degree || !branch || !expertise || !specialization || !location) {
    return res.status(400).json({ error: 'All fields except description are required' });
  }

  const sql = `
    INSERT INTO specialists 
    (image, name, fee, degree, branch, expertise, specialization, location, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    image || 'https://via.placeholder.com/300x200?text=Doctor+Image',
    name, fee, degree, branch, expertise, specialization, location,
    description || ''
  ];

  dbAppointments.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Insert error:', err);
      return res.status(500).json({ error: 'Failed to register specialist' });
    }

    res.status(201).json({ id: result.insertId, ...req.body });
  });
});

// ✅ GET: Fetch all specialists
router.get('/specialists', (req, res) => {
  dbAppointments.query('SELECT * FROM specialists ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error('❌ Fetch error:', err);
      return res.status(500).json({ error: 'Failed to fetch specialists' });
    }

    res.json(results);
  });
});

module.exports = router;
