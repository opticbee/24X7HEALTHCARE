const express = require('express');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db'); // Import MySQL connection pool
// const cors = require('cors'); // Import the CORS middleware
const util = require('util'); // Import Node.js utility for promisify

const router = express.Router();

// --- 1. CORS Configuration ---
// Only allow requests from your frontend website
// const corsOptions = {
//   origin: 'https://opticbee.in',
//   optionsSuccessStatus: 200 
// };

// Enable CORS with the specified options
// router.use(cors(corsOptions));


// --- 2. Corrected Nodemailer Transporter Configuration ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Corrected: Use Gmail's SMTP host
    port: 587,
    secure: false, 
    auth: {
        user: 'spltechnologycorp@gmail.com', // Your email address
        pass: 'cbkm ntdm cuvp vygh'           // Your app password
    },
    tls: {
        rejectUnauthorized: false
    }
});

// ✅ Ensure contacts table exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`;

db.query(createTableQuery, (err) => {
    if (err) {
        console.error('Error creating contacts table:', err);
    } else {
        console.log('✅ OpticBee website Contacts table ready');
    }
});


// --- 3. Refactored Contact API with Promises and Proper Error Handling ---
router.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const submissionId = uuidv4();
    const submissionDate = new Date();

    try {
        // Promisify the db.query to use it with async/await
        const query = util.promisify(db.query).bind(db);

        // --- Save to MySQL (awaiting the result) ---
        const insertQuery = `
            INSERT INTO contacts (id, name, email, subject, message, submittedAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await query(insertQuery, [submissionId, name, email, subject, message, submissionDate]);
        console.log('✅ Contact form saved to MySQL:', submissionId);

        // --- Send Confirmation Email to User ---
        const userMailOptions = {
            from: '"Optic Bee" <no-reply@opticbee.in>',
            to: email,
            subject: 'Thank you for contacting us!',
            html: `
                <p>Hi ${name},</p>
                <p>Thank you for reaching out to Optic Bee. We have received your message and will get back to you shortly.</p>
                <p><strong>Your Submission Summary:</strong></p>
                <ul>
                    <li><strong>Subject:</strong> ${subject}</li>
                    <li><strong>Message:</strong> ${message}</li>
                </ul>
                <p>Best regards,<br>The Optic Bee Team</p>
            `
        };
        await transporter.sendMail(userMailOptions);
        console.log(`📧 Confirmation email sent to ${email}`);

        // --- Send Notification Email to HR ---
        const hrMailOptions = {
            from: `"Contact Form" <form-notifications@opticbee.in>`,
            to: 'hr@opticbee.in',
            subject: `New Contact Form Submission: ${subject}`,
            html: `
                <p>A new message has been submitted through the contact form.</p>
                <p><strong>Submission Details:</strong></p>
                <ul>
                    <li><strong>Unique ID:</strong> ${submissionId}</li>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Subject:</strong> ${subject}</li>
                    <li><strong>Message:</strong></li>
                </ul>
                <pre>${message}</pre>
            `
        };
        await transporter.sendMail(hrMailOptions);
        console.log(`📧 Notification email sent to hr@opticbee.in`);

        res.status(200).json({ message: 'Your message has been sent successfully. Thank you!' });

    } catch (error) {
        // --- 4. Improved Error Logging ---
        console.error('❌ Error processing contact form:', error);
        // Send back a more detailed error message for easier debugging
        res.status(500).json({ 
            message: 'There was an error sending your message. Please try again later.',
            error: error.message // This provides the specific error reason
        });
    }
});

module.exports = router;
