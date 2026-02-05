const express = require("express");
const router = express.Router();
const db = require("../db");

/* =========================================================
   CREATE SHIFTS TABLE (SAFE – NO MULTI STATEMENTS)
========================================================= */

// 1️⃣ Disable FK checks
db.query("SET FOREIGN_KEY_CHECKS = 0", err => {
  if (err) console.error("❌ FK disable error:", err.sqlMessage);
});

// 2️⃣ Create table
const createShiftsTable = `
CREATE TABLE IF NOT EXISTS ambulance_shifts (
  shift_id INT AUTO_INCREMENT PRIMARY KEY,
  ambulance_id INT NOT NULL,
  driver_id INT NOT NULL,
  shift_type ENUM('Shift1','Shift2','Shift3') NOT NULL,
  shift_start DATETIME NOT NULL,
  shift_end DATETIME NOT NULL,
  status ENUM('Scheduled','On-duty','Completed') DEFAULT 'Scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ambulance (ambulance_id),
  INDEX idx_driver (driver_id),
  CONSTRAINT fk_shift_ambulance
    FOREIGN KEY (ambulance_id)
    REFERENCES ambulances(ambulance_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_shift_driver
    FOREIGN KEY (driver_id)
    REFERENCES ambulance_drivers(driver_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
`;

db.query(createShiftsTable, err => {
  if (err) {
    console.error("❌ Ambulance shifts table creation failed:", err.sqlMessage);
  } else {
    console.log("✅ Ambulance shifts table ready");
  }
});

// 3️⃣ Re-enable FK checks
db.query("SET FOREIGN_KEY_CHECKS = 1", err => {
  if (err) console.error("❌ FK enable error:", err.sqlMessage);
});

/* =========================================================
   ASSIGN SHIFT (ADMIN OR PROVIDER)
========================================================= */
router.post("/assign", (req, res) => {
  const { ambulance_id, driver_id, shift_type, shift_date } = req.body;

  if (!ambulance_id || !driver_id || !shift_type || !shift_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 1️⃣ Check driver already assigned on same day
  const driverCheck = `
    SELECT 1 FROM ambulance_shifts
    WHERE driver_id = ? AND shift_date = ?
  `;

  db.query(driverCheck, [driver_id, shift_date], (err, rows) => {
    if (rows.length > 0) {
      return res.status(409).json({
        error: "Driver already assigned for this date"
      });
    }

    // 2️⃣ Check ambulance + shift already used
    const ambCheck = `
      SELECT 1 FROM ambulance_shifts
      WHERE ambulance_id = ? AND shift_date = ? AND shift_type = ?
    `;

    db.query(ambCheck, [ambulance_id, shift_date, shift_type], (err2, rows2) => {
      if (rows2.length > 0) {
        return res.status(409).json({
          error: "This ambulance shift is already assigned"
        });
      }

      // 3️⃣ Shift timings
      const times = {
        Shift1: ["06:00:00", "14:00:00"],
        Shift2: ["14:00:00", "22:00:00"],
        Shift3: ["22:00:00", "06:00:00"]
      };

      const [start, end] = times[shift_type];
      const shift_start = `${shift_date} ${start}`;
      const shift_end =
        shift_type === "Shift3"
          ? `${new Date(new Date(shift_date).getTime() + 86400000)
              .toISOString()
              .split("T")[0]} ${end}`
          : `${shift_date} ${end}`;

      // 4️⃣ Insert safely
      db.query(
        `
        INSERT INTO ambulance_shifts
        (ambulance_id, driver_id, shift_type, shift_date, shift_start, shift_end)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [ambulance_id, driver_id, shift_type, shift_date, shift_start, shift_end],
        err3 => {
          if (err3) {
            return res.status(500).json({ error: "Database error" });
          }
          res.json({ success: true, message: "Shift assigned successfully" });
        }
      );
    });
  });
});


// 📊 Allocated (date + shift)
router.get("/allocated", (req, res) => {
  const { date, shift_type } = req.query;

  db.query(
    `
    SELECT 
      s.shift_date,
      s.shift_type,
      a.vehicle_number,
      d.full_name AS driver_name
    FROM ambulance_shifts s
    JOIN ambulances a ON s.ambulance_id = a.ambulance_id
    JOIN ambulance_drivers d ON s.driver_id = d.driver_id
    WHERE s.shift_date = ? AND s.shift_type = ?
    `,
    [date, shift_type],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ data: rows });
    }
  );
});

// 📜 Full History
router.get("/history", (req, res) => {
  db.query(
    `
    SELECT 
      s.shift_date,
      s.shift_type,
      a.vehicle_number,
      d.full_name AS driver_name
    FROM ambulance_shifts s
    JOIN ambulances a ON s.ambulance_id = a.ambulance_id
    JOIN ambulance_drivers d ON s.driver_id = d.driver_id
    ORDER BY s.shift_date DESC
    `,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ data: rows });
    }
  );
});


/* =========================================================
   LIVE AVAILABILITY CHECK (CRITICAL)
========================================================= */
router.get("/available-ambulances", (req, res) => {
  db.query(
    `
    SELECT DISTINCT
      a.ambulance_id,
      a.vehicle_number
    FROM ambulances a
    JOIN ambulance_providers p ON a.provider_id = p.id
    JOIN ambulance_shifts s ON s.ambulance_id = a.ambulance_id
    JOIN ambulance_drivers d ON s.driver_id = d.driver_id
    WHERE
      p.status = 'Approved'
      AND a.active_status = 'Active'
      AND d.status = 'Active'
      AND s.status = 'On-duty'
      AND NOW() BETWEEN s.shift_start AND s.shift_end
    `,
    (err, rows) => {
      if (err) {
        console.error("❌ Availability query error:", err.sqlMessage);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ available_ambulances: rows });
    }
  );
});

module.exports = router;
