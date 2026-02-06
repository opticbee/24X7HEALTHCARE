const express = require("express");
const router = express.Router();
const db = require("../db"); // Import DB connection

// Create table if not exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS hr_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    preferredDate DATE NOT NULL,
    preferredTime VARCHAR(50) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error("❌ Error creating bookings table:", err);
  } else {
    console.log("✅ hr_packages table ready.");
  }
});

// Handle form submission
router.post("/hr_packages", (req, res) => {
  const { fullName, email, phone, preferredDate, preferredTime } = req.body;

  const insertQuery = `
    INSERT INTO hr_packages (fullName, email, phone, preferredDate, preferredTime)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [fullName, email, phone, preferredDate, preferredTime], (err, result) => {
    if (err) {
      console.error("❌ Insert error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.status(200).json({ message: "✅ Booking successful!" });
  });
});

module.exports = router;
