const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

/* =========================================================
   MULTER CONFIG – DOCTOR PROFILE IMAGE
========================================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/doctor_profiles/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "doctor-" + unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};

const upload = multer({ storage, fileFilter });

/* =========================================================
   HELPER – FULL ADDRESS
========================================================= */
const composeFullAddress = (data) => {
  return [
    data.flat_no,
    data.street,
    data.city,
    data.state,
    data.zip_code,
    data.country,
  ]
    .filter(Boolean)
    .join(", ");
};

/* =========================================================
   DOCTORS TABLE
========================================================= */
const createDoctorsTable = `
CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(10) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(100),
  mobile VARCHAR(20),

  flat_no VARCHAR(50),
  street TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  zip_code VARCHAR(20),
  
  

  clinic VARCHAR(255),
  license_number VARCHAR(100),
  aadhar_card VARCHAR(20) UNIQUE,
  experience VARCHAR(50),
  degree VARCHAR(100),
  university VARCHAR(100),
  specialization VARCHAR(100),

  availability VARCHAR(50),
  from_time VARCHAR(20),
  to_time VARCHAR(20),
  additional_info TEXT,

  password VARCHAR(255),
  profile_image_url VARCHAR(255),
  otp_code VARCHAR(6) DEFAULT NULL
)
`;

db.query(createDoctorsTable, () =>
  console.log("✅ Doctors table ready")
);

/* =========================================================
   APPOINTMENTS TABLE
========================================================= */
const createAppointmentsTable = `
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_uid VARCHAR(10),
  patient_id INT,
  appointment_date DATE,
  appointment_time VARCHAR(10),
  mode VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Pending',
  payment_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

db.query(createAppointmentsTable, () =>
  console.log("✅ Appointments table ready")
);

/* =========================================================
   REGISTER DOCTOR
========================================================= */
router.post("/doctors", upload.single("profile_image"), (req, res) => {
  const data = req.body;
  const uid = crypto.randomBytes(3).toString("hex");

  if (req.file) {
    data.profile_image_url = `/uploads/doctor_profiles/${req.file.filename}`;
  }

 

  const sql = `
    INSERT INTO doctors (
      uid, first_name, last_name, email, mobile,
      flat_no, street, city, state, country, zip_code,
       
      clinic, license_number, aadhar_card, experience,
      degree, university, specialization,
      availability, from_time, to_time,
      additional_info, password, profile_image_url
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const values = [
    uid,
    data.first_name,
    data.last_name,
    data.email,
    data.mobile,
    data.flat_no,
    data.street,
    data.city,
    data.state,
    data.country,
    data.zip_code,
    data.clinic,
    data.license_number,
    data.aadhar_card,
    data.experience,
    data.degree,
    data.university,
    data.specialization,
    data.availability,
    data.from_time,
    data.to_time,
    data.additional_info,
    data.password,
    data.profile_image_url,
  ];

  db.query(sql, values, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Registration failed" });
    }
    res.status(201).json({ message: "Doctor registered", uid });
  });
});

/* =========================================================
   LOGIN
========================================================= */
router.post("/doctorlogin", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM doctors WHERE email = ?",
    [email],
    (err, rows) => {
      if (err || rows.length === 0)
        return res.status(401).json({ message: "Invalid login" });

      if (rows[0].password !== password)
        return res.status(401).json({ message: "Invalid login" });

      res.json({
        message: "Login successful",
        uid: rows[0].uid,
        doctor: rows[0],
      });
    }
  );
});

/* =========================================================
   GET DOCTOR BY UID
========================================================= */
router.get("/gdoctors/:uid", (req, res) => {
  db.query(
    "SELECT * FROM doctors WHERE uid = ?",
    [req.params.uid],
    (err, rows) => {
      if (err || rows.length === 0)
        return res.status(404).json({ message: "Doctor not found" });
      res.json(rows[0]);
    }
  );
});

/* =========================================================
   UPDATE DOCTOR
========================================================= */
router.put(
  "/updatedoctors/:uid",
  upload.single("profile_image"),
  (req, res) => {
    const data = req.body;

    if (req.file) {
      data.profile_image_url = `/uploads/doctor_profiles/${req.file.filename}`;
    }

    

    const sql = `
      UPDATE doctors SET
        first_name=?, last_name=?, email=?, mobile=?,
        flat_no=?, street=?, city=?, state=?, country=?, zip_code=?,
        
        clinic=?, license_number=?, aadhar_card=?, experience=?,
        degree=?, university=?, specialization=?,
        availability=?, from_time=?, to_time=?,
        additional_info=?,
        profile_image_url = COALESCE(?, profile_image_url)
      WHERE uid=?
    `;

    const values = [
      data.first_name,
      data.last_name,
      data.email,
      data.mobile,
      data.flat_no,
      data.street,
      data.city,
      data.state,
      data.country,
      data.zip_code,
      
      data.clinic,
      data.license_number,
      data.aadhar_card,
      data.experience,
      data.degree,
      data.university,
      data.specialization,
      data.availability,
      data.from_time,
      data.to_time,
      data.additional_info,
      data.profile_image_url,
      req.params.uid,
    ];

    db.query(sql, values, (err, result) => {
      if (err || result.affectedRows === 0)
        return res.status(500).json({ message: "Update failed" });

      res.json({ message: "Doctor updated successfully" });
    });
  }
);

/* =========================================================
   GET ALL DOCTORS
========================================================= */
router.get("/getdoctors", (req, res) => {
  db.query("SELECT * FROM doctors", (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows);
  });
});

/* =========================================================
   SPECIALIZATION SEARCH
========================================================= */
router.get("/specializations", (req, res) => {
  const q = req.query.q || "";
  db.query(
    "SELECT DISTINCT specialization FROM doctors WHERE specialization LIKE ? LIMIT 10",
    [`${q}%`],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows.map((r) => r.specialization));
    }
  );
});

/* =========================================================
   BOOKED SLOTS (UID BASED)
========================================================= */
router.get("/getBookedSlots", (req, res) => {
  const { doctorUid, date } = req.query;

  db.query(
    `SELECT appointment_time FROM appointments
     WHERE doctor_uid=? AND appointment_date=?`,
    [doctorUid, date],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows.map((r) => r.appointment_time));
    }
  );
});

module.exports = router;
