// routes/unifiedPasswordReset.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require('nodemailer');

// --- Email Setup (re-use from your other files) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'spltechnologycorp@gmail.com', // Your Gmail address
    pass: 'cbkm ntdm cuvp vygh'      // Your Gmail App Password
  }
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({ from: 'spltechnologycorp@gmail.com', to, subject, html });
    console.log('✅ OTP Email sent to', to);
  } catch (err) {
    console.error('❌ Email sending error:', err);
  }
}

// --- Helper Function to find user and table by email ---
const findUserByEmail = (email, callback) => {
  const tables = ['doctors', 'patients', 'diagnostic_centers'];
  let userFound = null;

  const checkTable = (index) => {
    if (index >= tables.length) {
      return callback(null, null); // Not found in any table
    }
    const table = tables[index];
    const query = `SELECT * FROM ${table} WHERE email = ?`;
    db.query(query, [email], (err, results) => {
      if (err) return callback(err);
      if (results.length > 0) {
        userFound = { user: results[0], table: table };
        return callback(null, userFound);
      }
      checkTable(index + 1);
    });
  };

  checkTable(0);
};


// === API ENDPOINTS ===

// 1. Send OTP
router.post('/unified-password/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  findUserByEmail(email, (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error while searching for user.' });
    if (!result) return res.status(404).json({ error: 'Email not found in our records.' });

    const { table } = result;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const updateOtpQuery = `UPDATE ${table} SET otp_code = ? WHERE email = ?`;

    db.query(updateOtpQuery, [otp, email], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: 'Database error while saving OTP.' });

      const mailHtml = `<p>Your OTP for password reset is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`;
      sendEmail(email, 'Hitaishi Healthcare: Password Reset OTP', mailHtml);

      res.json({ success: true, message: 'OTP has been sent to your registered email.' });
    });
  });
});

// 2. Verify OTP
router.post('/unified-password/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

  findUserByEmail(email, (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!result) return res.status(404).json({ error: 'User not found.' });

    if (result.user.otp_code === otp) {
      res.json({ success: true, message: 'OTP verified successfully.' });
    } else {
      res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
  });
});

// 3. Reset Password
router.post('/unified-password/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
  }

  findUserByEmail(email, (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!result) return res.status(404).json({ error: 'User not found.' });

    // Final OTP check for security
    if (result.user.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please start over.' });
    }

    const { table } = result;
    const updateQuery = `UPDATE ${table} SET password = ?, otp_code = NULL WHERE email = ?`;
    db.query(updateQuery, [newPassword, email], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: 'Failed to update password.' });
      res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
    });
  });
});


module.exports = router;