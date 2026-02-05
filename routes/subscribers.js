const express = require('express');
const router = express.Router();
const {dbClinic} = require('../db'); // Adjust path to your db.js

// Create the subscribers table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS subscribers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

dbClinic.query(createTableQuery, (err) => {
  if (err) {
    console.error("Error creating subscribers table:", err);
  } else {
    console.log("Subscribers table ensured.");
  }
});

// Subscribe (POST)
router.post('/subscribers', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const insertQuery = `INSERT INTO subscribers (email) VALUES (?) 
                       ON DUPLICATE KEY UPDATE subscribed_at = CURRENT_TIMESTAMP`;

  dbClinic.query(insertQuery, [email], (err, result) => {
    if (err) {
      console.error("Error inserting subscriber:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(200).json({ message: "Subscribed successfully" });
  });
});

// Unsubscribe (DELETE)
router.delete('/subscribers', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const deleteQuery = `DELETE FROM subscribers WHERE email = ?`;

  dbClinic.query(deleteQuery, [email], (err, result) => {
    if (err) {
      console.error("Error deleting subscriber:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Email not found" });
    }
    res.status(200).json({ message: "Unsubscribed successfully" });
  });
});

module.exports = router;
