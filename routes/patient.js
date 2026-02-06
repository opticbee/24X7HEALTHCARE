const express = require('express');
const router = express.Router();
const db = require('../db'); // Import the database connection

// --- UPDATE: Added unique_id and profile_photo columns ---
const createPatientsTable = `
  CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unique_id VARCHAR(6) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    mobile VARCHAR(20) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    dob DATE NOT NULL,
    disease VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_photo TEXT,
    otp_code VARCHAR(6) DEFAULT NULL
  )
`;


db.query(createPatientsTable, (err) => {
  if (err) {
    console.error("❌ Failed to create patients table:", err);
  } else {
    console.log("✅ Patients table is ready.");
  }
});

// Helper: Check email across all roles
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

// --- NEW: Helper function to generate a unique 6-character ID ---
function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}


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

// --- NEW: TEMPORARY ROUTE TO UPDATE EXISTING USERS ---
// Run this ONCE by going to /api/patients/update-ids in your browser
router.get('/patients/update-ids', (req, res) => {
    db.query('SELECT id FROM patients WHERE unique_id IS NULL', (err, results) => {
        if (err) {
            return res.status(500).send('Error fetching patients');
        }

        if (results.length === 0) {
            return res.send('No patients needed updating.');
        }

        let updatedCount = 0;
        results.forEach(patient => {
            const unique_id = generateUniqueId();
            db.query('UPDATE patients SET unique_id = ? WHERE id = ?', [unique_id, patient.id], (updateErr) => {
                if (updateErr) {
                    console.error(`Failed to update patient ${patient.id}:`, updateErr);
                }
                updatedCount++;
                if (updatedCount === results.length) {
                    res.send(`Successfully updated ${updatedCount} patients.`);
                }
            });
        });
    });
});
// --- END OF TEMPORARY ROUTE ---


// Register a new patient
router.post('/patients', (req, res) => {
  const {
    first_name, last_name, email, mobile,
    blood_group, gender, dob, disease, address,
    password, confirm_password, profile_photo
  } = req.body;

  // ✅ Step 1: Confirm password check
  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }


  // ✅ Step 2: Check email across all roles
  checkEmailExists(email, (err, exists) => {
    if (err) return res.status(500).json({ error: 'Database error during email check' });
    if (exists) return res.status(400).json({ error: 'Email already registered in another account type.' });

    // --- UPDATE: Generate unique ID and handle profile photo ---
    const unique_id = generateUniqueId();
    const photo = profile_photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; // Default photo

    const sql = `
      INSERT INTO patients
        (unique_id, first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password, profile_photo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      unique_id, first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password, photo
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          // This could be for email or the generated unique_id
          return res.status(409).json({ error: 'Email or generated ID already exists. Please try again.' });
        }
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error on registration' });
      }

      // ✅ Step 4: Set session
      req.session.isAuthenticated = true;
      req.session.user = {
        type: 'patient',
        id: result.insertId,
        name: `${first_name} ${last_name}`,
        email
      };

      res.status(201).json({
        message: 'Patient added successfully',
        patientId: result.insertId
      });
    });
  });
});



/**
 * Route for patient login (local lock).
 * Prevents logging in with a different role in the same browser.
 * Records login times.
 */
router.post('/patientlogin', localRoleLock('patient'), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'All fields are required' });

  // Validate user credentials
  const sql = 'SELECT * FROM patients WHERE email = ? AND password = ?';
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error("Login DB error (validating credentials):", err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = results[0];

    // Set the session (local lock)
    req.session.isAuthenticated = true;
    req.session.user = { type: 'patient', id: user.id, name: `${user.first_name} ${user.last_name}`, email: user.email };

    // Record Login Time
    const loginActivityQuery = "INSERT INTO login_activity (session_id, user_id, user_type, login_time) VALUES (?, ?, ?, NOW())";
    db.query(loginActivityQuery, [req.sessionID, String(user.id), 'patient'], (logErr) => {
      if (logErr) console.error("Error logging login activity:", logErr);
    });

    // --- UPDATE: Send back unique_id with other user details ---
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        unique_id: user.unique_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        mobile: user.mobile
      }
    });
  });
});

/**
 * Route to get a patient's profile by their ID.
 */
router.get('/patients/:id', (req, res) => {
    const patientId = req.params.id;
    // --- UPDATE: Select new columns ---
    const sql = 'SELECT id, unique_id, first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, profile_photo FROM patients WHERE id = ?';
    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.status(200).json({ patient: results[0] });
    });
});

// --- NEW: Get Patient Profile by UNIQUE ID ---
router.get('/patient/profile/:uniqueId', (req, res) => {
    const uniqueId = req.params.uniqueId;
    const sql = 'SELECT id, unique_id, first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, profile_photo FROM patients WHERE unique_id = ?';
    
    db.query(sql, [uniqueId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.status(200).json({ patient: results[0] });
    });
});

/**
 * Route to update a patient's profile information.
 */
// --- UPDATE: Update Patient Profile by UNIQUE ID ---
router.put('/patient/profile/:uniqueId', (req, res) => {
    const uniqueId = req.params.uniqueId;
    const { first_name, last_name, mobile, blood_group, gender, dob, disease, address, profile_photo } = req.body;

    if (!uniqueId) {
        return res.status(400).json({ error: 'Patient Unique ID is required' });
    }

    const sql = `UPDATE patients SET
        first_name = ?, last_name = ?, mobile = ?,
        blood_group = ?, gender = ?, dob = ?, disease = ?, address = ?, profile_photo = ?
        WHERE unique_id = ?`;

    const values = [first_name, last_name, mobile, blood_group, gender, dob, disease, address, profile_photo, uniqueId];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.status(200).json({ message: 'Profile updated successfully' });
    });
});


/**
 * Route to fetch all appointments for a specific patient.
 */
router.get('/patient/appointments', (req, res) => {
    const patientId = req.query.patientId;
    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }
    // ✅ UPDATED: Query the new 'appointments' table
    const sql = 'SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC, appointment_time DESC';
    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json({ appointments: results });
    });
});

// Route to fetch all appointments for a specific patient. reschedule the appointments


module.exports = router;
