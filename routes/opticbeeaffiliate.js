// affiliate.js
const express = require('express');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db'); // Import MySQL connection pool
const util = require('util');

const router = express.Router();

// --- 1. CORS Configuration ---
// const corsOptions = {
//   origin: 'https://opticbee.in',
//   optionsSuccessStatus: 200
// };
// router.use(cors(corsOptions));

// --- 2. Nodemailer Transporter ---
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

// --- 3. Ensure affiliates table exists ---
const createTableQuery = `
CREATE TABLE IF NOT EXISTS affiliates (
  id VARCHAR(36) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  partnership_type VARCHAR(100) NOT NULL,
  website VARCHAR(255),
  message TEXT,
  submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error('❌ Error creating affiliates table:', err);
  } else {
    console.log('✅ affiliates table ready');
  }
});

// --- 4. Affiliate Signup API ---
router.post('/affiliate', async (req, res) => {
  const { companyName, contactName, email, phone, partnershipType, website, message } = req.body;

  if (!companyName || !contactName || !email || !phone || !partnershipType) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }

  const submissionId = uuidv4();
  const submissionDate = new Date();

  try {
    const query = util.promisify(db.query).bind(db);

    // Save into DB
    const insertQuery = `
      INSERT INTO affiliates (id, company_name, contact_name, email, phone, partnership_type, website, message, submittedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(insertQuery, [
      submissionId, companyName, contactName, email, phone,
      partnershipType, website, message, submissionDate
    ]);

    console.log('✅ Affiliate saved to DB:', submissionId);

    // Send confirmation email to applicant
    const applicantMailOptions = {
      from: '"Optic Bee" <no-reply@opticbee.in>',
      to: email,
      subject: 'Thank you for applying as an Affiliate Partner',
      html: `
        <p>Hi ${contactName},</p>
        <p>Thank you for your interest in partnering with Optic Bee. We have received your affiliate application.</p>
        <p><strong>Your Application Summary:</strong></p>
        <ul>
          <li><strong>Company:</strong> ${companyName}</li>
          <li><strong>Partnership Type:</strong> ${partnershipType}</li>
          <li><strong>Website:</strong> ${website || 'N/A'}</li>
          <li><strong>Message:</strong> ${message || 'N/A'}</li>
        </ul>
        <p>Our team will review your details and get back to you soon.</p>
        <p>Best regards,<br>The Optic Bee Team</p>
      `
    };
    await transporter.sendMail(applicantMailOptions);
    console.log(`📧 Confirmation email sent to ${email}`);

    // Send notification email to HR
    const hrMailOptions = {
      from: '"Affiliate Form" <form-notifications@opticbee.in>',
      to: 'hr@opticbee.in',
      subject: `New Affiliate Application: ${companyName}`,
      html: `
        <p>A new affiliate application has been submitted.</p>
        <p><strong>Details:</strong></p>
        <ul>
          <li><strong>ID:</strong> ${submissionId}</li>
          <li><strong>Company:</strong> ${companyName}</li>
          <li><strong>Contact Name:</strong> ${contactName}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Phone:</strong> ${phone}</li>
          <li><strong>Partnership Type:</strong> ${partnershipType}</li>
          <li><strong>Website:</strong> ${website || 'N/A'}</li>
        </ul>
        <p><strong>Message:</strong></p>
        <pre>${message || 'N/A'}</pre>
      `
    };
    await transporter.sendMail(hrMailOptions);
    console.log(`📧 Notification email sent to hr@opticbee.in`);

    res.status(200).json({ message: 'Affiliate application submitted successfully!' });

  } catch (error) {
    console.error('❌ Error processing affiliate form:', error);
    res.status(500).json({
      message: 'There was an error submitting your application. Please try again later.',
      error: error.message
    });
  }
});

module.exports = router;
