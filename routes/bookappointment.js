const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ Create table if not exists
const createTable = `
  CREATE TABLE IF NOT EXISTS bookappointment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    date DATE NOT NULL,
    time TIME,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
db.query(createTable, (err) => {
  if (err) console.error("❌ Error creating table:", err.message);
  else console.log("✅ bookappointment table is ready.");
});

// ✅ Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ganap294@gmail.com',   // Use process.env.EMAIL_USER in production
    pass: 'fwxryolgpswlxbzq'      // Use process.env.EMAIL_PASS in production
  }
});

// ✅ Route to handle appointment form submission
router.post('/bookappointment', (req, res) => {
  const { name,email, date, time, phone } = req.body;

  if (!name ||!email || !date || !time || !phone) {
    return res.status(400).send("❌ All fields are required.");
  }

  const sql = `INSERT INTO bookappointment (name, date, time, phone) VALUES (?, ?, ?, ?)`;
  db.query(sql, [name, date, time, phone], (err, result) => {
    if (err) {
      console.error("❌ DB Error:", err.message);
      return res.status(500).send("❌ Failed to book appointment.");
    }

    // ✅ Send confirmation email to clinic
    const mailOptions = {
      from: 'ganap294@gmail.com',
      to: email,  // Send to your own email
      subject: '✅ New Appointment Booked',
      html: `
        <h3>New Appointment Details</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Name:</strong> ${email}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Phone:</strong> ${phone}</p>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Email Error:", err.message);
      } else {
        console.log("✅ Email sent:", info.response);
      }
    });

    res.send(`<h2>✅ Appointment booked successfully!</h2>`);
  });
});

module.exports = router;
