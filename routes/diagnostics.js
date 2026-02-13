const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

// --- MULTER CONFIGURATION FOR FILE UPLOADS ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// TABLE SETUP
const createTable = `
CREATE TABLE IF NOT EXISTS diagnostic_centers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  center_id VARCHAR(6) UNIQUE,
  center_name VARCHAR(255),
  owner_name VARCHAR(255),
  center_type VARCHAR(100),
  phone VARCHAR(20),
  alt_phone VARCHAR(20),
  email VARCHAR(255) UNIQUE NOT NULL,
  whatsapp VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  pincode VARCHAR(10),
  map_url TEXT,
  registration_number VARCHAR(100),
  gst_number VARCHAR(50),
  services TEXT,
  home_sample ENUM('Yes','No'),
  operational_hours TEXT,
  account_holder_name VARCHAR(255),
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  ifsc_code VARCHAR(20),
  upi_id VARCHAR(255),
  pan_aadhar_jpeg TEXT,
  license_copy_jpeg TEXT,
  upi_qr_code_jpeg TEXT,
  profile_image_url VARCHAR(255),
  password VARCHAR(255),
  is_verified TINYINT DEFAULT 0,
  otp_code VARCHAR(6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
db.query(createTable, (err) => {
  if (err) console.error('❌ Table error:', err);
  else console.log('✅ diagnostic_centers table ready');
});


// EMAIL SETUP
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASS
  }
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({ from: `"24x7 Health Care Services" <${process.env.ZOHO_EMAIL}>`, to, subject, html });
    console.log('✅ OTP Email sent');
  } catch (err) {
    console.error('❌ Email error:', err);
  }
}

function checkEmailExists(email, callback) {
  const queries = [
    "SELECT email FROM doctors WHERE email = ?",
    "SELECT email FROM patients WHERE email = ?",
    "SELECT email FROM diagnostic_centers WHERE email = ?"
  ];

  let found = false;
  let checked = 0;

  queries.forEach(q => {
    db.query(q, [email], (err, results) => {
      if (err) return callback(err);
      if (results.length > 0) found = true;
      checked++;
      if (checked === queries.length) {
        callback(null, found);
      }
    });
  });
}

// CHECK EMAIL ALREADY EXISTS
router.post('/diagnostics/check-email', (req, res) => {
  const { email } = req.body;
  checkEmailExists(email, (err, exists) => {
    if (err) return res.status(500).json({ error: 'Database error during email check' });
    if (exists) {
      return res.json({ exists: true, message: 'Email already registered in another account type.' });
    }
    res.json({ exists: false });
  });
});


// SEND OTP
router.post('/diagnostics/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  checkEmailExists(email, (err, exists) => {
    if (err) return res.status(500).json({ error: 'Database error during email check' });
    if (exists) return res.status(400).json({ error: 'Email already registered in another account type.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sql = `
      INSERT INTO diagnostic_centers (email, otp_code, is_verified)
      VALUES (?, ?, 0)
      ON DUPLICATE KEY UPDATE otp_code = ?, is_verified = IF(is_verified = 1, 1, 0)
    `;
    db.query(sql, [email, otp, otp], (err) => {
      if (err) return res.status(500).json({ error: 'DB error during OTP gen' });

    const html = `
    <div style="margin:0;padding:0;background-color:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(90deg,#2563eb,#1e3a8a);padding:25px;text-align:center;color:#ffffff;">
                  <h2 style="margin:0;font-size:24px;">24x7 Health Care Services</h2>
                  <p style="margin:5px 0 0;font-size:14px;opacity:0.9;">Secure Email Verification</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px 30px;text-align:center;">
                  <h3 style="margin-top:0;color:#111827;">Verify Your Email Address</h3>
                  <p style="color:#4b5563;font-size:15px;line-height:1.6;">
                    Thank you for choosing <strong>24x7 Health Care Services</strong>.<br>
                    Please use the One-Time Password (OTP) below to complete your verification process.
                  </p>

                  <!-- OTP Box -->
                  <div style="margin:30px 0;">
                    <span style="
                      display:inline-block;
                      padding:15px 30px;
                      font-size:26px;
                      letter-spacing:6px;
                      font-weight:bold;
                      color:#2563eb;
                      background:#f1f5ff;
                      border-radius:8px;
                      border:2px dashed #2563eb;">
                      ${otp}
                    </span>
                  </div>

                  <p style="color:#6b7280;font-size:14px;">
                    This OTP is valid for <strong>10 minutes</strong>.<br>
                    Do not share this code with anyone for security reasons.
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding:0 30px;">
                  <hr style="border:none;border-top:1px solid #e5e7eb;">
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 30px;text-align:center;font-size:13px;color:#9ca3af;">
                  © ${new Date().getFullYear()} 24x7 Health Care Services<br>
                  This is an automated message. Please do not reply to this email.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
    `;
      sendEmail(email, 'Hitaishi OTP Verification', html);
      res.json({ success: true, message: 'OTP sent successfully.' });
    });
  });
});


// VERIFY OTP
router.post('/diagnostics/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  db.query("SELECT * FROM diagnostic_centers WHERE email = ? AND otp_code = ?", [email, otp], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error verifying OTP' });
    if (result.length > 0) {
      db.query("UPDATE diagnostic_centers SET is_verified = 1, otp_code = NULL WHERE email = ?", [email], (err) => {
        if (err) return res.status(500).json({ error: 'Error updating verification' });
        return res.json({ success: true, message: 'OTP verified successfully!' });
      });
    } else {
      res.status(400).json({ error: 'Invalid OTP' });
    }
  });
});

// Local role lock middleware
function localRoleLock(targetRole) {
  return (req, res, next) => {
    if (req.session?.isAuthenticated && req.session?.user?.type && req.session.user.type !== targetRole) {
      return res.status(409).json({
        error: `You are already logged in as '${req.session.user.type}' on this device. Please logout to switch to '${targetRole}'.`
      });
    }
    next();
  };
}

// REGISTER ROUTE (local lock only)
router.post('/diagnostics/register', localRoleLock('diagnostic'), (req, res) => {
  const {
    email, centerName, ownerName, centerType, phone, altPhone, whatsapp,
    address, city, state, country, pincode, mapUrl, registrationNumber, gstNumber,
    accountHolderName, bankName, accountNumber, ifscCode, upiId,
    fromTime, toTime, services, homeSample, password
  } = req.body;

  if (!email || !centerName || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

    const operational_hours = `${fromTime} - ${toTime}`;
    const center_id = require('crypto').randomBytes(3).toString('hex').toUpperCase();
    const sql = `
      UPDATE diagnostic_centers SET 
        center_id=?, center_name=?, owner_name=?, center_type=?,
        phone=?, alt_phone=?, whatsapp=?, address=?, city=?, state=?, country=?, pincode=?, map_url=?,
        registration_number=?, gst_number=?, services=?, home_sample=?, operational_hours=?,
        account_holder_name=?, bank_name=?, account_number=?, ifsc_code=?, upi_id=?, password=?
      WHERE email=? AND is_verified=1
    `;
    const values = [
      center_id, centerName, ownerName, centerType,
      phone, altPhone, whatsapp, address, city, state, country, pincode, mapUrl,
      registrationNumber, gstNumber, JSON.stringify(services), homeSample, operational_hours,
      accountHolderName, bankName, accountNumber, ifscCode, upiId, password, email
    ];

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error during registration' });
      if (result.affectedRows === 0) {
        return res.status(400).json({ error: 'Please verify email before registration.' });
      }

      req.session.isAuthenticated = true;
      req.session.user = { type: 'diagnostic', id: center_id, name: centerName, email };

      res.json({ success: true, message: 'Registration successful!' });
    });
  });



// Login Route with local lock
router.post('/diagnostics/login', localRoleLock('diagnostic'), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const query = "SELECT * FROM diagnostic_centers WHERE email = ? AND password = ? AND is_verified = 1";
  db.query(query, [email, password], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (result.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result[0];

    req.session.isAuthenticated = true;
    req.session.user = { type: 'diagnostic', id: user.center_id, name: user.center_name, email: user.email };

    const loginActivityQuery = "INSERT INTO login_activity (session_id, user_id, user_type, login_time) VALUES (?, ?, ?, NOW())";
    db.query(loginActivityQuery, [req.sessionID, String(user.center_id), 'diagnostic']);

    res.json({
      success: true,
      message: 'Login successful',
      user: { center_id: user.center_id, center_name: user.center_name }
    });
  });
});


// Forgot Password - Step 1: Send OTP
router.post('/diagnostics/forgot-password/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const checkQuery = "SELECT * FROM diagnostic_centers WHERE email = ?";
    db.query(checkQuery, [email], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) return res.status(400).json({ error: 'Email not found' });

        const updateOtpQuery = "UPDATE diagnostic_centers SET otp_code = ? WHERE email = ?";
        db.query(updateOtpQuery, [otp, email], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            const mailHtml = `
                <div style="font-family: Arial, sans-serif; text-align: center;">
                    <h2>Password Reset OTP</h2>
                    <p>Your OTP for password reset is:</p>
                    <div style="font-size: 22px; font-weight: bold; padding: 10px; background: #eee;">${otp}</div>
                </div>`;
            sendEmail(email, 'Hitaishi Healthcare: Password Reset OTP', mailHtml);

            res.json({ success: true, message: 'OTP sent to your email.' });
        });
    });
});

// Forgot Password - Step 2: Verify OTP
router.post('/diagnostics/forgot-password/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const verifyQuery = "SELECT * FROM diagnostic_centers WHERE email = ? AND otp_code = ?";
    db.query(verifyQuery, [email, otp], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) return res.status(400).json({ error: 'Invalid OTP' });

        res.json({ success: true, message: 'OTP verified. You may now reset your password.' });
    });
});

// Forgot Password - Step 3: Reset Password
router.post('/diagnostics/forgot-password/reset', (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password required' });

    const updateQuery = "UPDATE diagnostic_centers SET password = ?, otp_code = NULL WHERE email = ?";
    db.query(updateQuery, [newPassword, email], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Password reset successful' });
    });
});

// Get All Diagnostic Centers
router.get('/diagnostics/all', (req, res) => {
    db.query("SELECT * FROM diagnostic_centers", (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, users: result });
    });
});

// =================================================================
// ✅ CORRECTED: Get User by Center ID
// =================================================================
router.get('/diagnostics/:centerId', (req, res) => {
    const { centerId } = req.params;
    db.query("SELECT * FROM diagnostic_centers WHERE center_id = ?", [centerId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user: result[0] });
    });
});




// =================================================================
// ✅ CORRECTED: Update User Profile by Center ID
// =================================================================
router.put('/diagnostics/:centerId', upload.single('profile_image'), (req, res) => {
    const { centerId } = req.params;
    const updatedData = req.body;

    if (req.file) {
        updatedData.profile_image_url = `/uploads/profiles/${req.file.filename}`;
    }

    const allowedColumns = [
        'center_name', 'owner_name', 'center_type', 'phone', 'alt_phone', 'whatsapp',
        'address', 'city', 'state', 'country', 'pincode', 'map_url', 'registration_number',
        'gst_number', 'account_holder_name', 'bank_name', 'account_number',
        'ifsc_code', 'upi_id', 'operational_hours', 'services', 'home_sample',
        'profile_image_url'
    ];

    const validUpdates = {};
    for (const key of allowedColumns) {
        if (updatedData[key] !== undefined && updatedData[key] !== null) {
            validUpdates[key] = updatedData[key];
        }
    }
    
    if (Object.keys(validUpdates).length === 0) {
        return res.json({ success: true, message: 'No data to update.' });
    }

    const fields = Object.keys(validUpdates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(validUpdates);

    const updateQuery = `UPDATE diagnostic_centers SET ${fields} WHERE center_id = ?`;
    db.query(updateQuery, [...values, centerId], (err, result) => {
        if (err) {
            console.error('DB Update Error:', err);
            return res.status(500).json({ error: 'Database error during profile update' });
        }
        res.json({ success: true, message: 'User updated successfully' });
    });
});


// Get Dashboard Stats
router.get('/diagnostics/:centerId/stats', (req, res) => {
    const { centerId } = req.params;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

    const queries = {
        todayAppointments: `SELECT COUNT(*) as count FROM newpayment WHERE center_id = ? AND test_date = ?`,
        completedTests: `SELECT COUNT(*) as count FROM newpayment WHERE center_id = ? AND test_date < ?`,
        pendingPayments: `SELECT COUNT(*) as count FROM newpayment WHERE center_id = ? AND test_date > ?`
    };

    const stats = {};
    const promises = [];

    for (const [key, query] of Object.entries(queries)) {
        const promise = new Promise((resolve, reject) => {
            db.query(query, [centerId, today], (err, result) => {
                if (err) {
                    console.error(`Error fetching ${key}:`, err);
                    return reject(err);
                }
                resolve({ key, count: result[0].count });
            });
        });
        promises.push(promise);
    }

    Promise.all(promises)
        .then(results => {
            results.forEach(result => {
                stats[result.key] = result.count;
            });
            res.json({ success: true, stats });
        })
        .catch(err => {
            res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
        });
});


// =================================================================
// ✅ CORRECTED: Delete User by Center ID
// =================================================================
router.delete('/diagnostics/:centerId', (req, res) => {
    const { centerId } = req.params;
    db.query("DELETE FROM diagnostic_centers WHERE center_id = ?", [centerId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, message: 'User deleted successfully' });
    });
});


module.exports = router;
