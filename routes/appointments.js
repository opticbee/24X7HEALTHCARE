const express = require("express");
const router = express.Router();
const db = require("../db");

// =================================================================
// ✅ UPDATED: Appointments table schema with more details
// =================================================================
const createAppointmentsTable = `
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_uid VARCHAR(50) UNIQUE,
  patient_id INT,
  patient_name VARCHAR(255),
  patient_email VARCHAR(255),
  patient_mobile VARCHAR(20),
  doctor_id INT,
  doctor_uid VARCHAR(10),
  doctor_name VARCHAR(255),
  doctor_email VARCHAR(255),
  doctor_mobile VARCHAR(20),
  doctor_specialization VARCHAR(255),
  appointment_date DATE,
  appointment_time VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Scheduled',
  original_fee INT DEFAULT 500,
  discount_percent INT DEFAULT 30,
  final_amount INT DEFAULT 350,
  payment_status VARCHAR(50) DEFAULT 'Pending',
  payment_id VARCHAR(100),
  doctor_payout_status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
`;

db.query(createAppointmentsTable, (err) => {
  if (err) {
    console.error("❌ Failed to create appointments table:", err);
  } else {
    console.log("✅ Appointments table is ready.");
  }
});


// =================================================================
// ✅ UPDATED: POST route to book an appointment with detailed info
// =================================================================
router.post("/appointments", (req, res) => {
  const {
    patientId,
    patientName,
    patientEmail,
    patientMobile,
    doctorId,
    doctorUid,
    doctorName,
    doctorEmail,
    doctorMobile,
    doctorSpecialization,
    appointmentDate,
    appointmentTime
  } = req.body;

  // Validation
  if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({
      success: false,
      message: "Missing required appointment details."
    });
  }

  // Check slot conflict
  const checkQuery = `
    SELECT id FROM appointments
    WHERE doctor_id = ?
    AND appointment_date = ?
    AND appointment_time = ?
  `;

  db.query(checkQuery, [doctorId, appointmentDate, appointmentTime], (checkErr, checkResult) => {
    if (checkErr) {
      console.error("❌ Error checking appointment:", checkErr);
      return res.status(500).json({
        success: false,
        message: "Database error while checking appointment."
      });
    }

    if (checkResult.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This time slot has just been booked. Please select another one."
      });
    }

    // Insert appointment (NO PAYMENT HERE)
    const insertQuery = `
      INSERT INTO appointments (
        appointment_uid,
        patient_id, patient_name, patient_email, patient_mobile,
        doctor_id, doctor_uid, doctor_name, doctor_email,
        doctor_mobile, doctor_specialization,
        appointment_date, appointment_time,
        status, payment_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const appointmentUid = 'APT_' + Date.now();
    const values = [
      appointmentUid,
      patientId,
      patientName,
      patientEmail,
      patientMobile,
      doctorId,
      doctorUid,
      doctorName,
      doctorEmail,
      doctorMobile,
      doctorSpecialization,
      appointmentDate,
      appointmentTime,
      "Payment Pending",
      "Pending"
    ];

    db.query(insertQuery, values, (insertErr, insertResult) => {
      if (insertErr) {
        console.error("❌ Error inserting appointment:", insertErr);
        return res.status(500).json({
          success: false,
          message: "Database error while booking appointment."
        });
      }

      const newAppointmentId = insertResult.insertId;

      return res.status(201).json({
        success: true,
        message: "Appointment created successfully. Awaiting payment.",
        appointmentId: newAppointmentId
      });
    });
  });
});


// ================= GET BOOKED SLOTS =================
router.get('/getBookedSlots', (req, res) => {
  const { doctorUid, date } = req.query;

  if (!doctorUid || !date) {
    return res.status(400).json({ message: 'doctorUid and date are required' });
  }

  const query = `
    SELECT appointment_time 
    FROM appointments 
    WHERE doctor_uid = ? 
    AND appointment_date = ?
    AND payment_status = 'Paid'
  `;

  db.query(query, [doctorUid, date], (err, results) => {
    if (err) {
      console.error('Error fetching booked slots:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    const bookedSlots = results.map(r => r.appointment_time);
    res.json(bookedSlots);
  });
});


// Reschedule doctor appointment
router.put('/appointments/reschedule/:id', (req, res) => {
  const appointmentId = req.params.id;
  const { newDate, newTime } = req.body; // expected format: newDate -> YYYY-MM-DD, newTime -> HH:MM (24-hour)


  if (!newDate || !newTime) {
    return res.status(400).json({ success: false, error: 'newDate and newTime are required' });
  }


  // 1) fetch appointment to get doctor_id
  db.query('SELECT * FROM appointments WHERE id = ?', [appointmentId], (err, rows) => {
    if (err) {
      console.error('DB error fetching appointment for reschedule', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }


    const appt = rows[0];
    const doctorId = appt.doctor_id;


    // 2) check conflict: another appointment with same doctor/date/time (exclude current appointment id)
    const checkQuery = 'SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND id != ?';
      db.query(checkQuery, [doctorId, newDate, newTime, appointmentId], (checkErr, checkRes) => {
      if (checkErr) {
        console.error('DB error checking conflicts', checkErr);
        return res.status(500).json({ success: false, error: 'Database error' });
      }


      if (checkRes.length > 0) {
        return res.status(409).json({ success: false, error: 'Selected time slot already taken. Please choose another slot.' });
      }


    // 3) update appointment
    const updateQuery = 'UPDATE appointments SET appointment_date = ?, appointment_time = ?, status = ? WHERE id = ?';
      db.query(updateQuery, [newDate, newTime, 'Rescheduled', appointmentId], (updErr) => {
        if (updErr) {
          console.error('DB error updating appointment', updErr);
          return res.status(500).json({ success: false, error: 'Database error while updating appointment' });
        }


        // Optionally: you can send a notification/email to doctor & patient here
        return res.json({ success: true, message: 'Appointment rescheduled successfully' });
      });
    });
  });
});

// Route to fetch all appointments for a specific patient. reschedule the appointments
router.get("/appointments/patient/:patientId", (req, res) => {
    const patientId = req.params.patientId;
    const fetchQuery = "SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC, appointment_time DESC";
    db.query(fetchQuery, [patientId], (err, results) => {
        if (err) {
            console.error("❌ Error fetching appointments:", err);
            return res.status(500).json({ success: false, message: "Database error while fetching appointments." });
        }
        res.status(200).json({ success: true, appointments: results });
    });
});

    // =================================================================
    // Wallet transactions table
    // =================================================================
    const createWalletTable = `
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointment_id INT,
      appointment_uid VARCHAR(50),
      doctor_uid VARCHAR(20),
      type VARCHAR(50),
      amount INT,
      description TEXT,
      admin_payment_amount INT DEFAULT 0,
      doctor_payment_amount INT DEFAULT 0,
      transaction_ref VARCHAR(100),
      processed BOOLEAN DEFAULT FALSE,
      processed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (doctor_uid) REFERENCES doctors(uid)
    );
    `;

    db.query(createWalletTable, (err) => {
      if (err) {
        console.error("❌ Failed to create wallet_transactions table:", err);
      } else {
        console.log("✅ wallet_transactions table is ready.");
      }
    });

// Route to fetch all appointments for a specific doctor. reschedule the appointments
router.get("/appointments/doctor/:doctorId", (req, res) => {
    const doctorId = req.params.doctorId;
    const fetchQuery = "SELECT * FROM appointments WHERE doctor_id = ? ORDER BY appointment_date DESC, appointment_time DESC";
    db.query(fetchQuery, [doctorId], (err, results) => {  
        if (err) {
            console.error("❌ Error fetching appointments:", err);
            return res.status(500).json({ success: false, message: "Database error while fetching appointments." });
        }
        res.status(200).json({ success: true, appointments: results });
    });
});

// ================= SIMULATED PAYMENT =================

router.post("/payment/simulate", (req, res) => {
  const { appointmentId } = req.body;

  const paymentId = "PAY_" + Date.now();

  // 1️⃣ Update appointment as paid
  const updateQuery = `
    UPDATE appointments 
    SET payment_status = 'Paid', 
        status = 'Scheduled',
        payment_id = ?
    WHERE id = ?
  `;

  db.query(updateQuery, [paymentId, appointmentId], (err) => {
    if (err) return res.status(500).json({ message: "Payment update failed" });

    // 2️⃣ Add entry to admin wallet
    const walletQuery = `
      INSERT INTO wallet_transactions 
      (appointment_id, appointment_uid, type, amount, description)
      VALUES (?, ?, 'CREDIT_ADMIN', 350, 'Patient appointment payment')
    `;

    db.query(walletQuery, [appointmentId, appointmentUid], (err2) => {
      if (err2) return res.status(500).json({ message: "Wallet update failed" });

      res.json({ success: true, message: "Payment Successful" });
    });
  });
});

// Admin: fetch wallet transactions
router.get('/admin/wallet', (req, res) => {
  const query = `
    SELECT wt.*, a.patient_name, a.patient_email, a.doctor_name AS appointment_doctor_name, a.doctor_uid AS appointment_doctor_id, a.payment_status, a.appointment_date, a.appointment_time
    FROM wallet_transactions wt
    LEFT JOIN appointments a ON wt.appointment_id = a.id
    ORDER BY wt.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('DB error fetching wallet transactions', err);
      return res.status(500).json({ message: 'DB error' });
    }

    // compute total admin credited amount
    const totalQuery = `SELECT COALESCE(SUM(amount),0) AS total_admin FROM wallet_transactions WHERE type = 'CREDIT_ADMIN'`;
    db.query(totalQuery, (tErr, tRes) => {
      if (tErr) {
        console.error('DB error computing total admin amount', tErr);
        return res.status(500).json({ message: 'DB error' });
      }
      const totalAdmin = (tRes && tRes[0] && tRes[0].total_admin) ? tRes[0].total_admin : 0;
      res.json({ wallet: results, totalAdmin });
    });
  });
});

// Doctor completes appointment -> mark Completed and pay doctor
router.put('/appointments/complete/:id', (req, res) => {
  const appointmentId = req.params.id;

  const updateQuery = `
    UPDATE appointments 
    SET status='Completed'
    WHERE id=?
  `;

  db.query(updateQuery, [appointmentId], (err) => {
    if (err) {
      console.error('DB error completing appointment', err);
      return res.status(500).json({ message: 'Error' });
    }

    // Pay doctor ₹300
    const walletQuery = `
      INSERT INTO wallet_transactions 
      (appointment_id, appointment_uid, doctor_id, type, amount, description)
      VALUES (?, (SELECT appointment_uid FROM appointments WHERE id=?), (SELECT doctor_id FROM appointments WHERE id=?),
              'DEBIT_DOCTOR', 300, 'Doctor payout after completion')
    `;

    db.query(walletQuery, [appointmentId, appointmentId], (werr) => {
      if (werr) {
        console.error('DB error inserting wallet transaction', werr);
        return res.status(500).json({ message: 'Error inserting wallet transaction' });
      }
      res.json({ success: true });
    });
  });
});


module.exports = router;
