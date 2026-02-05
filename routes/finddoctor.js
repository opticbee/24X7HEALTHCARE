const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ Create appointment table
const createTable = `
  CREATE TABLE IF NOT EXISTS nose_appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    location VARCHAR(100),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

db.query(createTable, (err) => {
  if (err) {
    console.error('❌ Failed to create table:', err.message);
  } else {
    console.log('✅ nose_appointments table is ready.');
  }
});

// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
   auth: {
          user: 'ganap294@gmail.com',
          pass: 'fwxryolgpswlxbzq' // App-specific password
        }
});

// ✅ POST route to handle booking
router.post('/finddoctor', (req, res) => {
  const {
    name,
    phone,
    email,
    location
  } = req.body;

  // Validation
  if (!name || !phone || !email || !location) {
    return res.status(400).json({ status: false, error: 'All fields are required.' });
  }

  const sql = `
    INSERT INTO nose_appointments
    (name, phone, email, location)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [name, phone, email, location], (err, result) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ status: false, error: 'Internal server error' });
    }

    // ✅ Send email confirmation
    const mailOptions = {
      from: 'ganap294@gmail.com',
      to: email,
      html: `
        <h3>Hi ${name},</h3>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <br><p>Location: ${location}</p>
        <br><p>Thank you,<br>ENT Clinic</p>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Email send failed:', err.message);
      } else {
        console.log(`✅ Email sent: ${info.response}`);
      }
    });

    return res.status(200).json({ status: true, message: '✅ Appointment booked successfully!', id: result.insertId });
  });
});

module.exports = router;
