const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');

// ✅ Ensure payments table exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(10) UNIQUE,
    test_name VARCHAR(255),
    amount INT,
    payment_method VARCHAR(50),
    patient_name VARCHAR(255),
    patient_email VARCHAR(255),
    patient_mobile VARCHAR(20),
    timestamp DATETIME
  )
`;
db.query(createTableQuery, (err) => {
  if (err) console.error("❌ Failed to create payments table:", err);
  else console.log("✅ Payments table ready");
});

// ✅ Generate unique payment ID
function generatePaymentID() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('') +
         Array.from({ length: 6 }, () => numbers[Math.floor(Math.random() * numbers.length)]).join('');
}

// ✅ Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'spltechnologycorp@gmail.com',
    pass: 'cbkm ntdm cuvp vygh' // 🔹 Should use process.env.GMAIL_PASS
  }
});

// ✅ POST /api/payment/register
router.post('/payment/register', (req, res) => {
  const { testName, amount, paymentMethod, patientName, patientEmail, patientMobile } = req.body;

  if (!testName || !amount || !paymentMethod || !patientName || !patientEmail || !patientMobile) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const paymentID = generatePaymentID();
  const formattedTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const insertQuery = `
    INSERT INTO payments (payment_id, test_name, amount, payment_method, patient_name, patient_email, patient_mobile, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [paymentID, testName, amount, paymentMethod, patientName, patientEmail, patientMobile, formattedTime], (err) => {
    if (err) {
      console.error('❌ Insert Error:', err.sqlMessage || err);
      return res.status(500).json({ error: 'Database insert failed', details: err.sqlMessage });
    }

    // ✅ Send confirmation email
    const mailOptions = {
      from: 'spltechnologycorp@gmail.com',
      to: patientEmail,
      subject: 'Booking Confirmation - Hitaishi Healthcare',
      html: `
        <h3>Booking Confirmed</h3>
        <p>Dear ${patientName},</p>
        <p>Your booking for the <strong>${testName}</strong> test is confirmed.</p>
        <p><strong>Payment ID:</strong> ${paymentID}</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p><strong>Method:</strong> ${paymentMethod}</p>
        <p>Thank you for choosing Hitaishi Healthcare.</p>
      `
    };

    transporter.sendMail(mailOptions, (emailErr) => {
      if (emailErr) {
        console.error('❌ Email Error:', emailErr);
        // ✅ Don't fail booking if email fails
        return res.json({ success: true, paymentID, email: 'failed' });
      }

      res.json({ success: true, paymentID, email: 'sent' });
    });
  });
});

// ✅ GET /api/payments/get → fetch all
router.get('/payments/get', (req, res) => {
  db.query('SELECT * FROM payments ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error('❌ Fetch all error:', err);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
    res.json(results);
  });
});

// ✅ GET /api/payments/get/:id → fetch by ID
router.get('/payments/get/:id', (req, res) => {
  const paymentID = req.params.id;
  db.query('SELECT * FROM payments WHERE payment_id = ?', [paymentID], (err, results) => {
    if (err) {
      console.error('❌ Fetch by ID error:', err);
      return res.status(500).json({ error: 'Failed to fetch payment' });
    }
    if (results.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(results[0]);
  });
});

module.exports = router;
