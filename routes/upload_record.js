const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db'); // Assuming db.js exports the MySQL connection pool

// --- IMPORTANT SETUP ---
// NOTE: To allow files to be viewed, you must serve the 'uploads' directory statically in your main server file (e.g., app.js or server.js)
// Add this line to your main server file:
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --------------------

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename to prevent overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Allow only specific file types
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes));
    }
});

// Create MySQL table if it doesn't exist (removed aadhaar column)
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mobile VARCHAR(10) NOT NULL,
    email VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;
db.query(createTableQuery, (err) => {
  if (err) console.error("Error creating 'records' table:", err);
  else console.log("Table 'records' is ready.");
});

/**
 * @route   POST /api/upload_record
 * @desc    Uploads a health record file and saves metadata to the database
 * @access  Public
 */
router.post('/upload_record', upload.single('file'), (req, res) => {
  const { mobile, email, description } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ message: "File is required." });
  }
  
  const filename = req.file.filename;
  // Construct the full URL to the file
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

  if (!mobile || !email || !description) {
    return res.status(400).json({ message: "Mobile, email, and description fields are required." });
  }

  const insertQuery = `INSERT INTO records (mobile, email, description, filename, file_url) VALUES (?, ?, ?, ?, ?)`;
  db.query(insertQuery, [mobile, email, description, filename, fileUrl], (err, result) => {
    if (err) {
      console.error("Database insert error:", err);
      return res.status(500).json({ message: "Failed to save record to the database." });
    }
    res.status(200).json({ message: "Record uploaded successfully." });
  });
});

/**
 * @route   GET /api/get_records
 * @desc    Fetches records for a given mobile number
 * @access  Public
 */
router.get('/get_records', (req, res) => {
    const { mobile } = req.query;

    if (!mobile || mobile.length !== 10) {
        return res.status(400).json({ message: "A valid 10-digit mobile number is required." });
    }

    const selectQuery = 'SELECT mobile, email, description, file_url, created_at FROM records WHERE mobile = ? ORDER BY created_at DESC';
    db.query(selectQuery, [mobile], (err, results) => {
        if (err) {
            console.error("Database select error:", err);
            return res.status(500).json({ message: "Failed to fetch records." });
        }
        res.status(200).json({ success: true, records: results });
    });
});

module.exports = router;
