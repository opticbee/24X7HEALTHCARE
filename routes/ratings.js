const express = require('express');
const router = express.Router();
const db = require('../db'); 
const { randomBytes } = require('crypto');

// --- Helper function to generate a unique ID ---
const generateUniqueId = () => {
    return randomBytes(4).toString('hex');
};

// --- Create Doctor Reviews Table ---
const createDoctorReviewsTableQuery = `
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id VARCHAR(10) UNIQUE NOT NULL,
    appointment_id INT UNIQUE, 
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    doctor_uid VARCHAR(10) NOT NULL,
    doctor_name VARCHAR(255),
    specialization VARCHAR(100),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
db.query(createDoctorReviewsTableQuery, (err) => {
    if (err) console.error('❌ Failed to create doctor_reviews table:', err.message);
    else console.log('✅ doctor_reviews table is ready.');
});


// --- Create Diagnostic Reviews Table ---
// ✅ FIXED: Removed the strict FOREIGN KEY constraint on test_id to prevent server crashes
// if a test being reviewed doesn't exist in the master test list.
const createDiagnosticReviewsTableQuery = `
CREATE TABLE IF NOT EXISTS diagnostic_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id VARCHAR(10) UNIQUE NOT NULL,
    appointment_id VARCHAR(255) UNIQUE, 
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    center_id VARCHAR(10) NOT NULL,
    center_name VARCHAR(255),
    test_id VARCHAR(6),
    test_name VARCHAR(255),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
db.query(createDiagnosticReviewsTableQuery, (err) => {
    if (err) console.error('❌ Failed to create diagnostic_reviews table:', err.message);
    else console.log('✅ diagnostic_reviews table is ready.');
});


// --- ROUTE: SUBMIT A DOCTOR REVIEW ---
router.post('/doctor', async (req, res) => {
    const {
        appointmentId, userId, userName, userEmail, doctorUid, doctorName,
        specialization, rating, review
    } = req.body;

    if (!appointmentId || !userId || !doctorUid || !rating) {
        return res.status(400).json({ success: false, error: 'Required fields are missing.' });
    }

    try {
        const [existing] = await db.promise().query('SELECT id FROM doctor_reviews WHERE appointment_id = ?', [appointmentId]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, error: 'A review has already been submitted for this appointment.' });
        }

        const review_id = generateUniqueId();
        const insertQuery = `
            INSERT INTO doctor_reviews (review_id, appointment_id, user_id, user_name, user_email, doctor_uid, doctor_name, specialization, rating, review)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [review_id, appointmentId, userId, userName, userEmail, doctorUid, doctorName, specialization, rating, review];

        await db.promise().query(insertQuery, values);
        res.status(201).json({ success: true, message: 'Doctor review submitted successfully.', review_id });

    } catch (error) {
        console.error('Error submitting doctor review:', error);
        res.status(500).json({ success: false, error: 'Server error occurred.' });
    }
});


// --- ROUTE: SUBMIT A DIAGNOSTIC TEST REVIEW ---
router.post('/diagnostic', async (req, res) => {
    const {
        appointmentId, userId, userName, userEmail, centerId, centerName,
        testId, testName, rating, review
    } = req.body;

    if (!appointmentId || !userId || !centerId || !rating) {
        return res.status(400).json({ success: false, error: 'Required fields are missing.' });
    }

    try {
        const [existing] = await db.promise().query('SELECT id FROM diagnostic_reviews WHERE appointment_id = ?', [appointmentId]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, error: 'A review has already been submitted for this appointment.' });
        }

        const review_id = generateUniqueId();
        const insertQuery = `
            INSERT INTO diagnostic_reviews (review_id, appointment_id, user_id, user_name, user_email, center_id, center_name, test_id, test_name, rating, review)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        // Use testId if provided, otherwise null
        const finalTestId = testId || null;
        const values = [review_id, appointmentId, userId, userName, userEmail, centerId, centerName, finalTestId, testName, rating, review];

        await db.promise().query(insertQuery, values);
        res.status(201).json({ success: true, message: 'Diagnostic review submitted successfully.', review_id });

    } catch (error) {
        console.error('Error submitting diagnostic review:', error);
        res.status(500).json({ success: false, error: 'Server error occurred.' });
    }
});

// --- ROUTE: GET REVIEW IDS FOR A USER ---
router.get('/user/:userId/reviewed-ids', async (req, res) => {
    const { userId } = req.params;
    try {
        const [doctorReviews] = await db.promise().query('SELECT appointment_id FROM doctor_reviews WHERE user_id = ?', [userId]);
        const [diagnosticReviews] = await db.promise().query('SELECT appointment_id FROM diagnostic_reviews WHERE user_id = ?', [userId]);
        
        const doctorIds = doctorReviews.map(r => r.appointment_id);
        const diagnosticIds = diagnosticReviews.map(r => r.appointment_id);

        res.json({ success: true, doctor: doctorIds, diagnostic: diagnosticIds });
    } catch (error) {
        console.error('Error fetching reviewed IDs:', error);
        res.status(500).json({ success: false, error: 'Server error.' });
    }
});

module.exports = router;

