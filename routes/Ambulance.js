const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =========================================================
   ENSURE UPLOAD DIRECTORY EXISTS
========================================================= */
const uploadDir = path.join(__dirname, "..", "uploads", "ambulances");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================================================
   MULTER CONFIG (RC + INSURANCE)
========================================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* =========================================================
   CREATE AMBULANCES TABLE (RUNS ONCE SAFELY)
========================================================= */
const createAmbulancesTable = `
CREATE TABLE IF NOT EXISTS ambulances (
  ambulance_id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  vehicle_number VARCHAR(20) UNIQUE NOT NULL,
  ambulance_type ENUM('Basic','ICU','Cardiac','Neonatal') NOT NULL,
  vehicle_model VARCHAR(100),
  rc_document VARCHAR(255) NOT NULL,
  insurance_document VARCHAR(255) NOT NULL,
  gps_enabled ENUM('Yes','No') DEFAULT 'No',
  active_status ENUM('Active','Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES ambulance_providers(id)
);
`;

db.query(createAmbulancesTable, (err) => {
  if (err) {
    console.error("❌ Ambulances table error:", err);
  } else {
    console.log("✅ Ambulances table ready");
  }
});

/* =========================================================
   ADD AMBULANCE (ONLY APPROVED PROVIDERS)
   POST /api/ambulances/add
========================================================= */
router.post("/add",
  upload.fields([
    { name: "rc_document", maxCount: 1 },
    { name: "insurance_document", maxCount: 1 }
  ]),
  (req, res) => {
    const {
    provider_uid,
    vehicle_number,
    ambulance_type,
    vehicle_model,
    gps_enabled
    } = req.body;

    const active_status = "Active";

    // ✅ Sanitize gps_enabled (VERY IMPORTANT)
    const cleanGps =
    gps_enabled === "Yes" || gps_enabled === "No" ? gps_enabled : "No";



    if (!provider_uid || !vehicle_number || !ambulance_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    /* =====================================================
       CHECK PROVIDER STATUS
    ===================================================== */
    db.query(
      "SELECT id, status FROM ambulance_providers WHERE provider_uid = ?",
      [provider_uid],
      (err, providerRows) => {
        if (err || providerRows.length === 0) {
          return res.status(403).json({ error: "Invalid provider" });
        }

        if (providerRows[0].status !== "Approved") {
          return res.status(403).json({
            error: "Provider not approved. Cannot add ambulances."
          });
        }

        const provider_id = providerRows[0].id;

        const rcPath = req.files?.rc_document?.[0]?.path;
        const insurancePath = req.files?.insurance_document?.[0]?.path;

        if (!rcPath || !insurancePath) {
          return res.status(400).json({
            error: "RC document and Insurance document are required"
          });
        }


        /* =====================================================
           INSERT AMBULANCE
        ===================================================== */
        db.query(
          `INSERT INTO ambulances 
          (provider_id, vehicle_number, ambulance_type, vehicle_model,
           rc_document, insurance_document, gps_enabled, active_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            provider_id,
            vehicle_number.toUpperCase(),
            ambulance_type,
            vehicle_model || null,
            rcPath,
            insurancePath,
            cleanGps,
            active_status    
          ],
          (err2) => {
          if (err2) {
            console.error("❌ Ambulance insert error:", err2.sqlMessage || err2);
            return res.status(500).json({
                error: err2.sqlMessage || "Database insert failed"
            });
            }
            res.status(201).json({
              success: true,
              message: "Ambulance added successfully"
            });
          }
        );
      }
    );
  }
);

/* =========================================================
   GET AMBULANCES BY PROVIDER
   GET /api/ambulances/provider/:provider_uid
========================================================= */
router.get("/provider/:provider_uid", (req, res) => {
  const { provider_uid } = req.params;

  db.query(
    `SELECT 
        a.ambulance_id,
        a.vehicle_number,
        a.ambulance_type,
        a.vehicle_model,
        a.gps_enabled,
        a.active_status,
        a.created_at
     FROM ambulances a
     JOIN ambulance_providers p ON a.provider_id = p.id
     WHERE p.provider_uid = ?
     ORDER BY a.created_at DESC`,
    [provider_uid],
    (err, rows) => {
      if (err) {
        console.error("❌ Fetch ambulances error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ ambulances: rows });
    }
  );
});

module.exports = router;
