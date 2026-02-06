const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create table for feedback if not exists
const createTable = `
  CREATE TABLE IF NOT EXISTS sleep_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    subject VARCHAR(255),
    message TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

db.query(createTable, err => {
  if (err) console.error('❌ Table error:', err.message);
  else console.log('✅ sleep_feedback table ready');
});

// Configure mail transporter
const transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
          user: 'ganap294@gmail.com',
          pass: 'fwxryolgpswlxbzq' // App-specific password
        }
});

// POST /api/sleepfeedback
router.post('/sleepfeedback', (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  const sql = `INSERT INTO sleep_feedback (name, email, subject, message) VALUES (?, ?, ?, ?)`;
  db.query(sql, [name, email, subject, message], (err, result) => {
    if (err) {
      console.error('❌ SQL Error:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    const mailOptions = {
     from: 'ganap294@gmail.com',
      to: email,
      subject: `We received your sleep feedback: ${subject}`,
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for sharing your sleep feedback. Here's what you sent:</p>
        <blockquote>${message}</blockquote>
        <p>We appreciate your input.</p>
        <br><p>ENT Sleep Care Team</p>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error('❌ Email send error:', err.message);
      else console.log('✅ Email sent:', info.response);
    });

    res.status(200).json({ success: true, message: 'Feedback received successfully!' });
  });
});

module.exports = router;
