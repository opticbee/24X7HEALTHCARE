// routes/bloodtest.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ Create the table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS blood_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255) NOT NULL,
    testDate DATE NOT NULL,
    testType VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error("❌ Error creating blood_tests table:", err);
  } else {
    console.log("✅ blood_tests table ready.");
  }
});

// ✅ POST endpoint for form submission
router.post('/bloodtest', (req, res) => {
  const { fullName, mobile, email, testDate, testType } = req.body;

  // Validate required fields
  if (!fullName || !mobile || !email || !testDate || !testType) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  // Validate mobile number (minimum 10 digits)
  if (mobile.length < 10) {
    return res.status(400).json({ message: "Mobile number must be at least 10 digits." });
  }

  const insertQuery = `
    INSERT INTO blood_tests (fullName, mobile, email, testDate, testType)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [fullName, mobile, email, testDate, testType], (err, result) => {
    if (err) {
      console.error("❌ Database insertion error:", err);
      return res.status(500).json({ message: "Failed to book blood test. Please try again." });
    }
    console.log("✅ Blood test booked successfully:", result);
    res.status(201).json({ message: "Blood test booked successfully.", data: result });
  });
});

module.exports = router;