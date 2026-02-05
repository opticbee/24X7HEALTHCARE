const express = require("express");
const router = express.Router();
const db = require("../db");

/* =========================================================
   CREATE DRIVERS TABLE (RUNS ONCE SAFELY)
========================================================= */
const createDriversTable = `
CREATE TABLE IF NOT EXISTS ambulance_drivers (
  driver_id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  driving_license_no VARCHAR(100) NOT NULL,
  license_expiry DATE NOT NULL,
  ambulance_training_cert VARCHAR(255),
  experience_years INT,
  status ENUM('Active','Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES ambulance_providers(id)
);
`;

db.query(createDriversTable, err => {
  if (err) console.error("❌ Drivers table error:", err);
  else console.log("✅ Ambulance drivers table ready");
});

/* =========================================================
   ADD DRIVER (ONLY APPROVED PROVIDERS)
   POST /api/drivers/add
========================================================= */
router.post("/add", (req, res) => {
  const {
    provider_uid,
    full_name,
    mobile,
    driving_license_no,
    license_expiry,
    ambulance_training_cert,
    experience_years
  } = req.body;

  if (!provider_uid || !full_name || !mobile || !driving_license_no || !license_expiry) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 🔐 Check provider approval
  db.query(
    "SELECT id, status FROM ambulance_providers WHERE provider_uid = ?",
    [provider_uid],
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.status(403).json({ error: "Invalid provider" });
      }

      if (rows[0].status !== "Approved") {
        return res.status(403).json({
          error: "Provider not approved. Cannot add drivers."
        });
      }

      const provider_id = rows[0].id;

      db.query(
        `INSERT INTO ambulance_drivers
         (provider_id, full_name, mobile, driving_license_no, license_expiry,
          ambulance_training_cert, experience_years)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          provider_id,
          full_name,
          mobile,
          driving_license_no,
          license_expiry,
          ambulance_training_cert || null,
          experience_years || null
        ],
        err2 => {
          if (err2) {
            console.error(err2);
            return res.status(500).json({ error: "Database error" });
          }

          res.status(201).json({
            success: true,
            message: "Driver added successfully"
          });
        }
      );
    }
  );
});

/* =========================================================
   GET DRIVERS BY PROVIDER
   GET /api/drivers/provider/:provider_uid
========================================================= */
router.get("/provider/:provider_uid", (req, res) => {
  db.query(
    `SELECT d.*
     FROM ambulance_drivers d
     JOIN ambulance_providers p ON d.provider_id = p.id
     WHERE p.provider_uid = ?
     ORDER BY d.created_at DESC`,
    [req.params.provider_uid],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ drivers: rows });
    }
  );
});

module.exports = router;
