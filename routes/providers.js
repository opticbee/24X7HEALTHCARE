const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

/* =========================================================
   ZOHO MAIL TRANSPORTER
========================================================= */
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASS
  }
});

/* =========================================================
   UNIQUE PROVIDER ID GENERATOR (HH-AMB-XXXXXX)
========================================================= */
function generateProviderId() {
  return "HH-AMB-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

/* =========================================================
   CREATE TABLE (RUNS ONCE SAFELY)
========================================================= */
const createProvidersTable = `
CREATE TABLE IF NOT EXISTS ambulance_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_uid VARCHAR(20) UNIQUE,
  provider_name VARCHAR(255) NOT NULL,
  provider_type ENUM('Individual','Hospital','Company') NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  gst_number VARCHAR(50),
  status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

db.query(createProvidersTable, err => {
  if (err) console.error("❌ Providers table error:", err);
  else console.log("✅ Ambulance providers table ready");
});

/* =========================================================
   PROVIDER REGISTRATION
   POST /api/providers/register
========================================================= */
router.post("/providers/register", (req, res) => {
  const {
    provider_name,
    provider_type,
    contact_person,
    contact_phone,
    contact_email,
    address,
    city,
    state,
    gst_number
  } = req.body;

  if (
    !provider_name ||
    !provider_type ||
    !contact_person ||
    !contact_phone ||
    !contact_email ||
    !address
  ) {
    return res.status(400).json({ error: "All required fields missing" });
  }

  const provider_uid = generateProviderId();

  const insertQuery = `
    INSERT INTO ambulance_providers
    (provider_uid, provider_name, provider_type, contact_person, contact_phone,
     contact_email, address, city, state, gst_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    provider_uid,
    provider_name,
    provider_type,
    contact_person,
    contact_phone,
    contact_email,
    address,
    city,
    state,
    gst_number || null
  ];

  db.query(insertQuery, values, async (err) => {
    if (err) {
      console.error("❌ Provider insert error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    /* 📧 EMAIL TO PROVIDER (PENDING) */
    try {
      await transporter.sendMail({
        from: `"Hitaishi Healthcare" <${process.env.ZOHO_EMAIL}>`,
        to: contact_email,
        subject: "Ambulance Partner Application Received",
        html: `
          <p>Dear ${contact_person},</p>
          <p>Thank you for registering as an <b>Ambulance Partner</b> with <b>Hitaishi Healthcare</b>.</p>
          <p><b>Provider ID:</b> ${provider_uid}</p>
          <p>Your application is currently under review. Our team will contact you shortly.</p>
          <br/>
          <p>Regards,<br/>Hitaishi Healthcare Team</p>
        `
      });
    } catch (mailErr) {
      console.error("📧 Mail error:", mailErr);
    }

    res.status(201).json({
      success: true,
      message: "Provider registered successfully. Awaiting admin approval.",
      provider_uid
    });
  });
});

/* =========================================================
   ADMIN APPROVAL
   PUT /api/providers/approve/:provider_uid
========================================================= */
router.put("/providers/approve/:provider_uid", (req, res) => {
  const { provider_uid } = req.params;

  const fetchQuery = `
    SELECT * FROM ambulance_providers WHERE provider_uid = ?
  `;

  db.query(fetchQuery, [provider_uid], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const provider = results[0];

    const updateQuery = `
      UPDATE ambulance_providers SET status = 'Approved'
      WHERE provider_uid = ?
    `;

    db.query(updateQuery, [provider_uid], async (err2) => {
      if (err2) {
        console.error("❌ Approval error:", err2);
        return res.status(500).json({ error: "Database error" });
      }

      /* 📧 EMAIL AFTER APPROVAL */
      try {
        await transporter.sendMail({
          from: `"Hitaishi Healthcare" <${process.env.ZOHO_EMAIL}>`,
          to: provider.contact_email,
          subject: "Ambulance Partner Approved 🎉",
          html: `
            <p>Dear ${provider.contact_person},</p>
            <p>Congratulations! 🎉</p>
            <p>Your Ambulance Partner account has been <b>APPROVED</b>.</p>
            <p><b>Provider ID:</b> ${provider.provider_uid}</p>
            <p>You can now add ambulances, drivers, and start receiving bookings.</p>
            <br/>
            <p>Welcome onboard,<br/>Hitaishi Healthcare Team</p>
          `
        });
      } catch (mailErr) {
        console.error("📧 Approval mail error:", mailErr);
      }

      res.json({ success: true, message: "Provider approved successfully" });
    });
  });
});

/* =========================================================
   ADMIN: GET ALL PROVIDERS
   GET /api/admin/providers
========================================================= */
router.get("/admin/providers", (req, res) => {
  const sql = `
    SELECT 
      provider_uid,
      provider_name,
      provider_type,
      contact_person,
      contact_phone,
      contact_email,
      city,
      state,
      status,
      created_at
    FROM ambulance_providers
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Fetch providers error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ providers: results });
  });
});


/* =========================================================
   ADMIN: GET PROVIDER DETAILS
   GET /api/admin/providers/:provider_uid
========================================================= */
router.get("/admin/providers/:provider_uid", (req, res) => {
  const { provider_uid } = req.params;

  db.query(
    "SELECT * FROM ambulance_providers WHERE provider_uid = ?",
    [provider_uid],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: "Provider not found" });
      }
      res.json({ provider: results[0] });
    }
  );
});



/* =========================================================
   ADMIN: REJECT PROVIDER
   PUT /api/providers/reject/:provider_uid
========================================================= */
router.put("/providers/reject/:provider_uid", (req, res) => {
  const { provider_uid } = req.params;
  const { reason } = req.body;

  db.query(
    "SELECT * FROM ambulance_providers WHERE provider_uid = ?",
    [provider_uid],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: "Provider not found" });
      }

      const provider = results[0];

      db.query(
        "UPDATE ambulance_providers SET status = 'Rejected' WHERE provider_uid = ?",
        [provider_uid],
        async (err2) => {
          if (err2) return res.status(500).json({ error: "Database error" });

          // 📧 Rejection mail
          await transporter.sendMail({
            from: `"Hitaishi Healthcare" <${process.env.ZOHO_EMAIL}>`,
            to: provider.contact_email,
            subject: "Ambulance Partner Application Update",
            html: `
              <p>Dear ${provider.contact_person},</p>
              <p>Thank you for applying as an Ambulance Partner.</p>
              <p>After review, your application has been <b>rejected</b>.</p>
              ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ""}
              <p>You may reapply after correcting the issues.</p>
              <br/>
              <p>Regards,<br/>Hitaishi Healthcare Team</p>
            `
          });

          res.json({ success: true, message: "Provider rejected" });
        }
      );
    }
  );
});

/* =========================================================
   PROVIDER LOGIN
   POST /api/providers/login
========================================================= */
router.post("/providers/login", (req, res) => {
  const { provider_uid, contact_email } = req.body;

  if (!provider_uid || !contact_email) {
    return res.status(400).json({ error: "Provider ID and Email required" });
  }

  db.query(
    `SELECT provider_uid, provider_name, status 
     FROM ambulance_providers 
     WHERE provider_uid = ? AND contact_email = ?`,
    [provider_uid, contact_email],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const provider = results[0];

      res.json({
        success: true,
        provider: {
          provider_uid: provider.provider_uid,
          provider_name: provider.provider_name,
          status: provider.status
        }
      });
    }
  );
});


/* =========================================================
   PROVIDER PROFILE
   GET /api/providers/profile/:provider_uid
========================================================= */
router.get("/providers/profile/:provider_uid", (req, res) => {
  db.query(
    "SELECT * FROM ambulance_providers WHERE provider_uid = ?",
    [req.params.provider_uid],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: "Provider not found" });
      }
      res.json({ provider: results[0] });
    }
  );
});


module.exports = router;
