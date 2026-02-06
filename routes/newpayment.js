const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");

// Ensure newpayment table exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS newpayment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(10) UNIQUE,
    test_name VARCHAR(255) NOT NULL,
    test_id VARCHAR(50),
    center_id VARCHAR(50) NOT NULL,
    center_name VARCHAR(255),
    amount INT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_id VARCHAR(50),
    collection_type ENUM('Home','Center'),
    patient_email VARCHAR(255) NOT NULL,
    patient_mobile VARCHAR(20) NOT NULL,
    test_date DATE NOT NULL,
    timestamp DATETIME NOT NULL
  )
`;

db.query(createTableQuery, (err) => {
  if (err) console.error("❌ Failed to create newpayment table:", err);
  else console.log("✅ newpayment table ready");
});

// Generate unique payment ID
function generatePaymentID() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  return (
    Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join("") +
    Array.from({ length: 6 }, () => numbers[Math.floor(Math.random() * numbers.length)]).join("")
  );
}

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER || "spltechnologycorp@gmail.com",
    pass: process.env.SMTP_PASS || "cbkm ntdm cuvp vygh" // Use environment variables in production
  }
});

// POST /api/newpayment/register
router.post("/newpayment/register", (req, res) => {
  const {
    testName, testId, centerId, centerName, amount, paymentMethod,
    patientName, patientEmail, patientMobile, patientId,
    collectionType, testDate
  } = req.body;

  if (!testName || !amount || !paymentMethod || !patientName || !patientEmail || !patientMobile || !testDate || !centerId) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 30);
  const selectedDate = new Date(testDate);

  if (selectedDate < today || selectedDate > maxDate) {
    return res.status(400).json({ success: false, error: "Test date must be within the next 30 days" });
  }

  const paymentID = generatePaymentID();
  const formattedTime = new Date().toISOString().slice(0, 19).replace("T", " ");

  const insertQuery = `
    INSERT INTO newpayment (
      payment_id, test_name, test_id, center_id, center_name, amount,
      payment_method, patient_name, patient_email, patient_mobile,
      patient_id, collection_type, test_date, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertQuery,
    [
      paymentID, testName, testId, centerId, centerName, amount,
      paymentMethod, patientName, patientEmail, patientMobile,
      patientId, collectionType, testDate, formattedTime
    ],
    (err) => {
      if (err) {
        console.error("❌ Insert Error:", err.sqlMessage || err);
        return res.status(500).json({ success: false, error: "Database insert failed", details: err.sqlMessage });
      }

      // Send Email Confirmation
      const mailOptions = {
        from: '"Hitaishi Healthcare" <spltechnologycorp@gmail.com>',
        to: patientEmail,
        subject: `Booking Confirmation - ${paymentID}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
            <h2 style="color: #0A0A57; text-align: center;">Booking Confirmed</h2>
            <p>Dear ${patientName},</p>
            <p>Your test booking has been successfully confirmed. Please find the details below:</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0A0A57; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Booking Details</h3>
              <p><strong>Payment ID:</strong> ${paymentID}</p>
              <p><strong>Test Name:</strong> ${testName}</p>
              <p><strong>Center:</strong> ${centerName}</p>
              <p><strong>Scheduled Date:</strong> ${new Date(testDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>Collection Type:</strong> ${collectionType}</p>
              <p><strong>Amount Paid:</strong> ₹${amount}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            </div>
            <p>Thank you for choosing Hitaishi Healthcare.</p>
            <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (emailErr) => {
        if (emailErr) {
          console.error("❌ Email Error:", emailErr);
          // Still return success to the frontend, but log the email failure.
          return res.json({ success: true, paymentID, emailStatus: "failed" });
        }
        res.json({ success: true, paymentID, emailStatus: "sent" });
      });
    }
  );
});

// ** NEW ** PUT /api/newpayment/reschedule/:paymentId
router.put("/newpayment/reschedule/:paymentId", (req, res) => {
    const { paymentId } = req.params;
    const { newDate } = req.body;

    // Validate new date
    if (!newDate) {
        return res.status(400).json({ success: false, error: "New date is required." });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newDate);

    if (selectedDate < today) {
        return res.status(400).json({ success: false, error: "Reschedule date cannot be in the past." });
    }

    const updateQuery = "UPDATE newpayment SET test_date = ? WHERE payment_id = ?";

    db.query(updateQuery, [newDate, paymentId], (err, result) => {
        if (err) {
            console.error("❌ Reschedule Error:", err);
            return res.status(500).json({ success: false, error: "Database update failed." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Booking not found with this Payment ID." });
        }
        res.json({ success: true, message: "Booking rescheduled successfully." });
    });
});


// GET all appointments for a center (with optional date filter)
router.get("/diagnostics/:centerId/appointments", (req, res) => {
  const { centerId } = req.params;
  const { date } = req.query;
  let query = `SELECT * FROM newpayment WHERE center_id = ?`;
  const params = [centerId];
  if (date) {
    query += ` AND test_date = ?`;
    params.push(date);
  }
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: "Failed to fetch appointments" });
    res.json({ success: true, appointments: results });
  });
});

// GET all bookings
router.get("/newpayment/get", (req, res) => {
  db.query("SELECT * FROM newpayment ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch bookings" });
    res.json(results);
  });
});

// GET booking by payment ID
router.get("/newpayment/get/:id", (req, res) => {
  const paymentID = req.params.id;
  db.query("SELECT * FROM newpayment WHERE payment_id = ?", [paymentID], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch booking" });
    if (results.length === 0) return res.status(404).json({ error: "Booking not found" });
    res.json(results[0]);
  });
});

module.exports = router;
