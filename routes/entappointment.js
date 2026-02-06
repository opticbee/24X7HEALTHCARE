const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create table if not exists
const createTable = `
  CREATE TABLE IF NOT EXISTS appointments_ent (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    date DATE,
    time_slot VARCHAR(50),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

db.query(createTable, (err) => {
  if (err) console.error('❌ Table create error:', err.message);
  else console.log('✅ appointments_ent table is ready.');
});

// Setup Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
 auth: {
          user: 'ganap294@gmail.com',
          pass: 'fwxryolgpswlxbzq' // App-specific password
        }
});

// POST /api/appointment
router.post('/appointment', (req, res) => {
  const { name, email, date, time_slot } = req.body;

  if (!name || !email || !date || !time_slot) {
    return res.status(400).json({ status: false, message: 'All fields are required.' });
  }

  const sql = 'INSERT INTO appointments_ent (name, email, date, time_slot) VALUES (?, ?, ?, ?)';
  db.query(sql, [name, email, date, time_slot], (err, result) => {
    if (err) {
      console.error('❌ SQL error:', err.message);
      return res.status(500).json({ status: false, message: 'Internal Server Error.' });
    }

    // Send confirmation email
    const mailOptions = {
      from: 'ganap294@gmail.com',
      to: email,
      subject: 'Appointment Confirmation',
      html: `
        <h2>Hello ${name},</h2>
        <p>Your appointment has been scheduled on <strong>${date}</strong> at <strong>${time_slot}</strong>.</p>
        <p>Thank you for booking with us!</p>
        <br>
        <p><em>Dental Clinic</em></p>
      `
    };

    transporter.sendMail(mailOptions, (emailErr, info) => {
      if (emailErr) {
        console.error('❌ Email Error:', emailErr.message);
        // Optional: Still continue
      } else {
        console.log('✅ Email sent:', info.response);
      }
    });

    res.status(200).json({
      status: true,
      message: '✅ Appointment scheduled and confirmation sent!',
      id: result.insertId
    });
  });
});

module.exports = router;
