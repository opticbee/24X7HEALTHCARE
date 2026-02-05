const express = require('express');
const router = express.Router();
const db = require('../db');

// Create poll_votes table if not exists
const createTable = `
  CREATE TABLE IF NOT EXISTS poll_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    answer VARCHAR(100),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
db.query(createTable, err => {
  if (err) console.error('❌ Table creation error:', err.message);
  else console.log('✅ poll_votes table ready');
});

// POST /api/poll
router.post('/poll', (req, res) => {
  const { answer } = req.body;
  const validAnswers = [
    "Ear",
    "Nose",
    "Throat",
    "Head and Neck",
    "All of the Above"
  ];

  if (!answer || !validAnswers.includes(answer)) {
    return res.status(400).json({ success: false, message: "❌ Invalid or missing answer" });
  }

  const sql = `INSERT INTO poll_votes (answer) VALUES (?)`;
  db.query(sql, [answer], (err, result) => {
    if (err) {
      console.error('❌ SQL error:', err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    res.json({ success: true, message: "✅ Vote recorded!" });
  });
});

module.exports = router;
