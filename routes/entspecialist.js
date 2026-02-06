// Routes/specialist.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Create table if not exists
const createTable = `
  CREATE TABLE IF NOT EXISTS ent_specialist_searches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    keywords VARCHAR(255),
    distance VARCHAR(50),
    specialist_name VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    specialty VARCHAR(100),
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

db.query(createTable, (err) => {
  if (err) console.error('❌ Table creation failed:', err.message);
  else console.log('✅ ent_specialist_searches table is ready');
});

// POST route to accept form submissions
router.post('/entspecialist', (req, res) => {
  const {
    keywords, distance, specialist_name,
    city, state, country, specialty
  } = req.body;

  // Validate required fields
  if (!keywords || !distance || !city || !state || !country || !specialty) {
    return res.status(400).json({ success: false, message: '❌ Please fill all required fields.' });
  }

  const sql = `
    INSERT INTO ent_specialist_searches 
    (keywords, distance, specialist_name, city, state, country, specialty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [keywords, distance, specialist_name, city, state, country, specialty], (err, result) => {
    if (err) {
      console.error('❌ SQL Error:', err.message);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }

    return res.status(200).json({
      success: true,
      message: '✅ ENT specialist search submitted!',
      id: result.insertId
    });
  });
});

module.exports = router;
