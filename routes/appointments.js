const express = require("express");
const router = express.Router();
const db = require("../db");

// =================================================================
// ✅ UPDATED: Appointments table schema with more details
// =================================================================
const createAppointmentsTable = `
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
)
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

  // --- Server-side validation ---
  if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ success: false, message: "Missing required appointment details." });
  }

  // --- Check for existing booking at the same time slot ---
  const checkQuery = "SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?";
  db.query(checkQuery, [doctorId, appointmentDate, appointmentTime], (checkErr, checkResult) => {
      if (checkErr) {
          console.error("❌ Error checking for existing appointment:", checkErr);
          return res.status(500).json({ success: false, message: "Database error while checking for appointment." });
      }

      if (checkResult.length > 0) {
          return res.status(409).json({ success: false, message: "This time slot has just been booked. Please select another one." });
      }

      // --- Insert new appointment ---
      const insertQuery = `
        INSERT INTO appointments (
          patient_id, patient_name, patient_email, patient_mobile,
          doctor_id, doctor_uid, doctor_name, doctor_email, doctor_mobile, doctor_specialization,
          appointment_date, appointment_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        patientId, patientName, patientEmail, patientMobile,
        doctorId, doctorUid, doctorName, doctorEmail, doctorMobile, doctorSpecialization,
        appointmentDate, appointmentTime
      ];

      db.query(insertQuery, values, (insertErr, insertResult) => {
        if (insertErr) {
          console.error("❌ Error inserting appointment:", insertErr);
          return res.status(500).json({ success: false, message: "Database error while booking appointment." });
        }
        res.status(201).json({ success: true, message: "Appointment booked successfully!", appointmentId: insertResult.insertId });
      });
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

module.exports = router;


