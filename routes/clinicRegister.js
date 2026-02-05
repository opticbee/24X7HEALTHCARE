const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../db"); // adjust the path if needed
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null,  `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });




// Create the clinics table if not exists
const createClinicsTable = `
  CREATE TABLE IF NOT EXISTS clinics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinicName VARCHAR(255),
    clinicSpecialization VARCHAR(255),
    clinicType VARCHAR(100),
    registrationNumber VARCHAR(100),
    establishedYear INT,
    address1 TEXT,
    address2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    mapLink TEXT,
    phone1 VARCHAR(20),
    phone2 VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    contactPerson VARCHAR(100),
    designation VARCHAR(100),
    contactEmail VARCHAR(100),
    contactMobile VARCHAR(20),
    timings TEXT,
    emergency BOOLEAN,
    licensePath VARCHAR(255),
    idProofPath VARCHAR(255),
    clinicPhotoPath VARCHAR(255),
    gst VARCHAR(50),
    username VARCHAR(100),
    password VARCHAR(255)
  )
`;

db.query(createClinicsTable, (err) => {
  if (err) {
    console.error("Failed to create clinics table:", err);
  } else {
    console.log("✅ Clinics table ready (or already exists).");
  }
});





router.post(
  "/clinicregister",
  upload.fields([
    { name: "licenseUpload", maxCount: 1 },
    { name: "idproof", maxCount: 1 },
    { name: "clinicPhoto", maxCount: 1 },
  ]),
  (req, res) => {
    const {
      clinicName, clinicSpecialization, clinicType, registrationNumber,
      establishedYear, address1, address2, city, state, country, pincode,
      mapLink, phone1, phone2, email, website, contactPerson, designation,
      contactEmail, contactMobile, timings, emergency, gst,
      username, password, confirmPassword,
    } = req.body;

    console.log("Form data:", req.body);
    console.log("Files:", req.files);

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const licensePath = req.files?.licenseUpload?.[0]?.filename || null;
    const idProofPath = req.files?.idproof?.[0]?.filename || null;
    const clinicPhotoPath = req.files?.clinicPhoto?.[0]?.filename || null;

    const sql = `
      INSERT INTO clinics (
        clinicName, clinicSpecialization, clinicType, registrationNumber, establishedYear,
        address1, address2, city, state, country, pincode, mapLink,
        phone1, phone2, email, website, contactPerson, designation,
        contactEmail, contactMobile, timings, emergency, licensePath,
        idProofPath, clinicPhotoPath, gst, username, password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      clinicName, clinicSpecialization, clinicType, registrationNumber, establishedYear,
      address1, address2, city, state, country, pincode, mapLink,
      phone1, phone2, email, website, contactPerson, designation,
      contactEmail, contactMobile, timings, emergency ? 1 : 0,
      licensePath, idProofPath, clinicPhotoPath, gst, username, password
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("MySQL Insert Error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.status(201).json({ message: "Clinic registered successfully" });
    });
  }
);

//Route: GET /api/clinicregister
// Route: GET /api/clinics (used by clinics.html)
router.get("/clinics", (req, res) => {
  const sql = "SELECT * FROM clinics";
  db.query(sql, (err, clinics) => {
    if (err) {
      console.error("MySQL Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    // Extract unique values for filters
    const cities = [...new Set(clinics.map(c => c.city))];
    const specializations = [...new Set(clinics.map(c => c.clinicSpecialization))];
    const types = [...new Set(clinics.map(c => c.clinicType))];

    res.status(200).json({
      clinics: clinics.map(c => ({
        id: c.id,
        name: c.clinicName,
        city: c.city,
        specialization: c.clinicSpecialization,
        fee: c.fee || 0 // default to 0 if not available
      })),
      cities,
      specializations,
      types
    });
  });
});




// Route: DELETE /api/clinicregister/:id
router.delete("/clinicRegister/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM clinics WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("MySQL Error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Clinic not found" });
    }
    res.status(200).json({ message: "Clinic deleted successfully!" });
  });
});

// Route: PUT /api/clinicregister/:id
router.put("/clinicRegister/:id",
  upload.fields([
    { name: "licenseUpload", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
    { name: "clinicPhoto", maxCount: 1 },
  ]),
  (req, res) => {
    const { id } = req.params;
    const {
      clinicName,
      clinicSpecialization,
      clinicType,
      registrationNumber,
      establishedYear,
      address1,
      address2,
      city,
      state,
      country,
      pincode,
      mapLink,
      phone1,
      phone2,
      email,
      website,
      contactPerson,
      designation,
      contactEmail,
      contactMobile,
      timings,
      emergency,
      gst,
    } = req.body;

    const licensePath = req.files?.licenseUpload?.[0]?.path || null;
    const idProofPath = req.files?.idProof?.[0]?.path || null;
    const clinicPhotoPath = req.files?.clinicPhoto?.[0]?.path || null;

    const sql = `
      UPDATE clinics SET
        clinicName = ?, clinicSpecialization = ?, clinicType = ?,
        registrationNumber = ?, establishedYear = ?,
        address1 = ?, address2 = ?, city = ?, state = ?,
        country = ?, pincode = ?, mapLink = ?,
        phone1 = ?, phone2 = ?, email = ?,
        website = ?, contactPerson = ?, designation = ?,
        contactEmail = ?, contactMobile = ?,
        timings = ?, emergency = ?,
        gst = ?
        ${licensePath ? ", licensePath = ?" : ""}
        ${idProofPath ? ", idProofPath = ?" : ""}
        ${clinicPhotoPath ? ", clinicPhotoPath = ?" : ""}
      WHERE id = ?
    `;

    const values = [
      clinicName, clinicSpecialization, clinicType, registrationNumber, establishedYear,
      address1, address2, city, state, country, pincode, mapLink,
      phone1, phone2, email, website, contactPerson, designation,
      contactEmail, contactMobile, timings, emergency, gst
    ];

    if (licensePath) values.push(licensePath);
    if (idProofPath) values.push(idProofPath);
    if (clinicPhotoPath) values.push(clinicPhotoPath);
    
    values.push(id);
  })
  
module.exports = router;