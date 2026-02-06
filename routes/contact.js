const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ Create table if it doesn't exist
const createTable = `
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    subject VARCHAR(255),
    message TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

db.query(createTable, (err) => {
  if (err) {
    console.error('❌ Failed to create table:', err.message);
  } else {
    console.log('✅ contact_messages table is ready.');
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

// ✅ POST route to handle form submissions
router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;

  // Basic validation
  if (!name || name.trim() === "") {
    return res.status(400).json({ status: false, error: 'Name is required.' });
  }
  if (!email || email.trim() === "") {
    return res.status(400).json({ status: false, error: 'Email is required.' });
  }
  if (!message || message.trim() === "") {
    return res.status(400).json({ status: false, error: 'Message cannot be empty.' });
  }

  const sql = 'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)';
  db.query(sql, [name, email, subject, message], (err, result) => {
    if (err) {
      console.error('❌ SQL Error:', err.message);
      return res.status(500).json({
        status: false,
        error: 'Internal Server Error. Could not save your message.',
        sqlMessage: err.message
      });
    }

    // ✅ Send confirmation email
    const mailOptions = {
      from: 'ganap294@gmail.com',
      to: email,
      subject: `Thanks for contacting us - ${subject || 'No Subject'}`,
      html: `
        <h3>Hi ${name},</h3>
        <p>Thank you for reaching out! We've received your message:</p>
        <blockquote>${message}</blockquote>
        <p>We'll get back to you shortly.</p>
        <br>
        <p>Best regards,<br>Your Dental Clinic</p>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Email Error:', err.message);
        // Continue even if email fails
      } else {
        console.log(`✅ Email sent: ${info.response}`);
      }
    });

    // Success response
    return res.status(200).json({
      status: true,
      message: '✅ Message sent successfully!',
      id: result.insertId
    });
  });
});

module.exports = router;
