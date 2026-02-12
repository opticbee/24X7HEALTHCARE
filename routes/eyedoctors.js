const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const crypto = require("crypto");
const upload = multer(); // handles form-data without files



// Create the doctors table if it doesn't exist
const createDoctorsTable = `
  CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(10) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(100),
  mobile VARCHAR(20),

  door_no VARCHAR(100),
  area VARCHAR(150),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  zipcode VARCHAR(20),

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
  profile_image_url VARCHAR(255)
)

`;


db.query(createDoctorsTable, (err) => {
  if (err) {
    console.error("Failed to create doctors table:", err);
  } else {
    console.log("✅ Doctors table ready (or already exists).");
  }
});


 const createAppointmentsTable = `
  CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    doctor_uid VARCHAR(10),
    patient_name VARCHAR(100),
    slot_time TIME NOT NULL,
    slot_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_slot (doctor_id, slot_time, slot_date)
  )
`;


  db.query(createAppointmentsTable, (err, result) => {
    if (err) {
      console.error('Error creating appointments table:', err);
    } else {
      console.log('✅ Appointments table ensured/created successfully.');
    }
  });



// POST: Book a time slot
router.post('/bookSlot', (req, res) => {
  const {
    doctorId,
    doctorUid, // added
    slot,
    date = new Date().toISOString().split('T')[0],
    patientName = 'Anonymous'
  } = req.body;

  const sql = `INSERT INTO appointments (doctor_id, doctor_uid, slot_time, slot_date, patient_name)
               VALUES (?, ?, ?, ?, ?)`;

  db.query(sql, [doctorId, doctorUid, slot, date, patientName], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Slot already booked.' });
      }
      console.error('Booking Error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ message: 'Slot booked successfully!' });
  });
});

router.get('/getBookedSlots', (req, res) => {
  const doctorId = req.query.doctorId;
  const date = req.query.date; // take the selected date

  const sql = "SELECT slot_time FROM appointments WHERE doctor_id = ? AND slot_date = ? ORDER BY slot_time";

  db.query(sql, [doctorId, date], (err, results) => {
    if (err) {
      console.error('Fetch Error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const bookedSlots = results.map(row => row.slot_time.slice(0, 5)); // e.g., "10:30"
    res.json(bookedSlots);
  });
});



// Register Doctor
router.post("/doctors", upload.single("profile_image"), (req, res) => {
  
  let profileImagePath = null;

  if (req.file) {
    profileImagePath = `/uploads/doctor_profiles/${req.file.filename}`;
  }


    const {first_name, last_name, email, mobile, door_no, area, city, state, country, zipcode, clinic, license_number, aadhar_card, experience, degree,university,specialization,availability,from_time,to_time,additional_info,password } = req.body;


    const uid = crypto.randomBytes(3).toString("hex"); // Generate 6-char UID

    // Check for duplicate Aadhar
    db.query("SELECT * FROM doctors WHERE aadhar_card = ?", [aadhar_card], (err, results) => {
        if (err) return res.status(500).json({ message: "Error checking Aadhar." });

        if (results.length > 0) {
            return res.status(400).json({ message: "Aadhar already registered." });
        }

        // If not duplicate, insert into DB
        const sql = `INSERT INTO doctors 
                    (uid, first_name, last_name, email, mobile,
                    door_no, area, city, state, country, zipcode,
                    clinic, license_number, aadhar_card,
                    experience, degree, university, specialization,
                    availability, from_time, to_time, additional_info,
                    password, profile_image_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

  const values = [ uid, first_name, last_name, email,mobile, door_no, area,city,state, country,zipcode, clinic, license_number,aadhar_card,experience,degree,university, specialization,availability,from_time, to_time,additional_info,password,profileImagePath];
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error inserting doctor." });
            }

            res.status(201).json({ message: "Doctor registered successfully", uid });
        });
    });
});

// Doctor Login
router.post("/doctorlogin", async (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM doctors WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error!" });

        if (results.length === 0) {
            return res.status(404).json({ message: "Doctor not found!" });
        }

        const doctor = results[0];
        if (doctor.password !== password) {
            return res.status(401).json({ message: "Invalid credentials!" });
        }

        res.status(200).json({
            message: "Login successful",
            uid: doctor.uid,
            doctor: {
                name: doctor.first_name + " " + doctor.last_name,
                email: doctor.email,
                specialization: doctor.specialization
            }
        });
    });
});

// Get Filters (Specialization, Clinics, Locations)
router.get("/getfilters", (req, res) => {
    const filters = {
        specialization: [],
        clinic: [],
        city: []
    };

    db.query("SELECT DISTINCT specialization FROM doctors", (err, specResults) => {
        if (err) return res.status(500).send(err);
        filters.specialization = specResults.map(r => r.specialization);

        db.query("SELECT DISTINCT clinic FROM doctors", (err, clinicResults) => {
            if (err) return res.status(500).send(err);
            filters.clinic = clinicResults.map(r => r.clinic);

            db.query("SELECT DISTINCT city FROM doctors", (err, locResults) => {
                if (err) return res.status(500).send(err);
                filters.city = locResults.map(r => r.city);
                res.json(filters); // Final response after all three queries
            });
        });
    });
});

// Get All Doctors
router.get("/getdoctors", (req, res) => {
    db.query("SELECT * FROM doctors", (err, rows) => {
        if (err) {
            console.error("Error:", err);
            return res.status(500).json({ message: "Server error!" });
        }
        res.status(200).json(rows);
    });
});

// Get Doctor by UID
router.get("/gdoctors/:uid", (req, res) => {
    const { uid } = req.params;

    db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, rows) => {
        if (err) {
            console.error("Error:", err);
            return res.status(500).json({ message: "Server error!" });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "Doctor not found!" });
        }

        res.status(200).json(rows[0]);
    });
});

// Update Doctor
router.put("/updatedoctors/:uid", (req, res) => {
    const { uid } = req.params;
    const {
        first_name, last_name, email, mobile, door_no, area, city, state, country, zipcode, clinic, license_number,
        aadhar_card, experience, degree, university, specialization,
        availability, from_time, to_time, additional_info
    } = req.body;

    const sql = `UPDATE doctors SET 
        first_name = ?, last_name = ?, email = ?, mobile = ?, door_no = ?, area = ?, city = ?, state = ?, country = ?, zipcode = ?, clinic = ?, 
        license_number = ?, aadhar_card = ?, experience = ?, degree = ?, university = ?, 
        specialization = ?, availability = ?, from_time = ?, to_time = ?, additional_info = ? 
        WHERE uid = ?`;

    db.query(sql, [
        first_name, last_name, email, mobile, door_no, area, city, state, country, zipcode , clinic, license_number,
        aadhar_card, experience, degree, university, specialization,
        availability, from_time, to_time, additional_info, uid
    ], (err, result) => {
        if (err) {
            console.error("Error:", err);
            return res.status(500).json({ message: "Server error!" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Doctor not found!" });
        }

        res.status(200).json({ message: "Doctor details updated successfully!" });
    });
});

// Delete Doctor
router.delete("/deletedoctors/:uid", (req, res) => {
    const { uid } = req.params;

    db.query("DELETE FROM doctors WHERE uid = ?", [uid], (err, result) => {
        if (err) {
            console.error("Error:", err);
            return res.status(500).json({ message: "Server error!" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Doctor not found!" });
        }

        res.status(200).json({ message: "Doctor deleted successfully!" });
    });
});

module.exports = router;