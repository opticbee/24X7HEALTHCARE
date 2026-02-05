const express = require('express');
const router = express.Router();
const db = require('../db');

/* ======================================================
   ✅ CREATE AMBULANCE BOOKINGS TABLE (ONLY HERE)
====================================================== */
const createTableQuery = `
CREATE TABLE IF NOT EXISTS ambulance_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_name VARCHAR(100) NOT NULL,
  patient_phone VARCHAR(20) NOT NULL,
  patient_email VARCHAR(100),
  pickup_address TEXT NOT NULL,
  drop_address TEXT NOT NULL,
  emergency_type VARCHAR(100),
  ambulance_type VARCHAR(50),
  booking_status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error('❌ Error creating ambulance_bookings table:', err);
  } else {
    console.log('✅ ambulance_bookings table ready');
  }
});

/* ======================================================
   🚑 BOOK AMBULANCE API
====================================================== */
router.post('/ambulance/book', (req, res) => {
  const {
    patient_name,
    patient_phone,
    patient_email,
    pickup_address,
    drop_address,
    emergency_type,
    ambulance_type
  } = req.body;

  if (!patient_name || !patient_phone || !pickup_address || !drop_address) {
    return res.status(400).json({
      success: false,
      message: 'Required fields are missing'
    });
  }

  const insertQuery = `
    INSERT INTO ambulance_bookings
    (patient_name, patient_phone, patient_email, pickup_address, drop_address, emergency_type, ambulance_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    patient_name,
    patient_phone,
    patient_email || null,
    pickup_address,
    drop_address,
    emergency_type || 'General',
    ambulance_type || 'Basic'
  ];

  db.query(insertQuery, values, (err, result) => {
    if (err) {
      console.error('❌ Ambulance booking failed:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    res.status(201).json({
      success: true,
      message: '🚑 Ambulance booked successfully',
      bookingId: result.insertId
    });
  });
});

/* ======================================================
   📋 GET ALL BOOKINGS (Admin / Provider use later)
====================================================== */
router.get('/ambulance/bookings', (req, res) => {
  db.query(
    'SELECT * FROM ambulance_bookings ORDER BY created_at DESC',
    (err, results) => {
      if (err) {
        console.error('❌ Fetch error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(results);
    }
  );
});

module.exports = router;
