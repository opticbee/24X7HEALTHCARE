// routes/newsletter.js   
// it is opticbee newsletter subscription route==================================

const express = require('express');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db'); // <-- same MySQL pool as affiliate.js
// const cors = require('cors');
const util = require('util');

const router = express.Router();

// 1️⃣ CORS
// const corsOptions = {
//   origin: 'https://opticbee.in', 
//   optionsSuccessStatus: 200
// };
// router.use(cors(corsOptions));

// 2️⃣ Nodemailer (same as affiliate.js)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'spltechnologycorp@gmail.com',
    pass: 'cbkm ntdm cuvp vygh' // Gmail App Password
  },
  tls: { rejectUnauthorized: false }
});

// 3️⃣ Ensure newsletter table exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
db.query(createTableQuery, (err) => {
  if (err) console.error('❌ Error creating newsletter_subscribers table:', err);
  else console.log('✅ newsletter_subscribers table ready');
});

// 4️⃣ API endpoint
router.post('/newsletter', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const id = uuidv4();
  const query = util.promisify(db.query).bind(db);

  try {
    await query(
      `INSERT INTO newsletter_subscribers (id, email) VALUES (?, ?)`,
      [id, email]
    );
    console.log('✅ Newsletter email saved:', email);

    // Send confirmation email
    await transporter.sendMail({
      from: '"Optic Bee" <no-reply@opticbee.in>',
      to: email,
      subject: 'Newsletter Subscription Confirmation',
      html: `
        <p>Hi,</p>
        <p>Thank you for subscribing to our newsletter. You'll now receive updates about our products and services!</p>
        <p>Best regards,<br>The Optic Bee Team</p>
      `
    });
    console.log(`📧 Confirmation email sent to ${email}`);

    res.status(200).json({ message: 'Subscribed successfully!' });

  } catch (error) {
    console.error('❌ Error saving newsletter email:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'This email is already subscribed.' });
    }
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

module.exports = router;
