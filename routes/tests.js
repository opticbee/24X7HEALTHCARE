const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ✅ Ensure diagnostic_test table exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS diagnostic_test (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_id VARCHAR(6) UNIQUE,
  test_name VARCHAR(255),
  test_code VARCHAR(50),
  category VARCHAR(100),
  sample_required VARCHAR(100),
  description TEXT,
  pre_test_instructions TEXT,
  test_duration VARCHAR(100),
  report_time VARCHAR(100),
  price DECIMAL(10,2),
  discount DECIMAL(5,2),
  final_price DECIMAL(10,2),
  available_from DATE,
  diagnostic_id INT,
  center_id VARCHAR(10),       
  center_name VARCHAR(255),
  status VARCHAR(50),
  tags TEXT,
  home_collection VARCHAR(10),
  test_image VARCHAR(255),
  map_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
db.query(createTableQuery, (err) => {
  if (err) console.error('❌ Table creation failed:', err.message);
  else console.log('✅ diagnostic_test table ready');
});

// (Multer config and other functions remain the same)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'tests');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'test-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

function generateTestId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}


// ✅ Register new test (No changes needed here, it already saves both IDs)
router.post('/test/register', upload.single('test_image'), async (req, res) => {
  try {
    const {
      test_name, test_code, category, sample_required, description,
      pre_test_instructions, test_duration, report_time, price, discount,
      final_price, available_from, diagnostic_id, status, tags, home_collection
    } = req.body;

    if (!diagnostic_id || !test_name || !price || !category) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    
    const [centerResult] = await db.promise().query(
      'SELECT center_name, center_id FROM diagnostic_centers WHERE id = ?',
      [diagnostic_id]
    );

    if (!centerResult.length) {
      return res.status(404).json({ success: false, error: 'Diagnostic center not found.' });
    }

    const { center_name, center_id } = centerResult[0];
    const map_url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center_name)}`;
    const test_id = generateTestId();
    const test_image = req.file ? `/uploads/tests/${req.file.filename}` : null;

    const insertQuery = `
      INSERT INTO diagnostic_test (
        test_id, test_name, test_code, category, sample_required, description,
        pre_test_instructions, test_duration, report_time, price, discount,
        final_price, available_from, diagnostic_id, center_id, center_name,
        status, tags, home_collection, test_image, map_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      test_id, test_name, test_code || null, category, sample_required, description,
      pre_test_instructions, test_duration, report_time, price, discount,
      final_price, available_from, diagnostic_id, center_id, center_name,
      status, tags, home_collection, test_image, map_url
    ];

    await db.promise().query(insertQuery, values);
    res.json({ success: true, test_id });
  } catch (error) {
    console.error('❌ Error registering test:', error.message);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});


// ✅ Get all tests
router.get('/test/all', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM diagnostic_test');
    res.json({ success: true, tests: rows });
  } catch (error) {
    console.error('Error fetching all tests:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// =================================================================
// ✅ FIXED: Get tests for a center using the alphanumeric center_id
// =================================================================
// ✅ Fetch tests by either numeric diagnostic_id OR string center_id
router.get('/test/center/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);

    const sql = isNumeric
      ? 'SELECT * FROM diagnostic_test WHERE diagnostic_id = ?'
      : 'SELECT * FROM diagnostic_test WHERE center_id = ?';

    const [rows] = await db.promise().query(sql, [id]);
    res.json({ success: true, tests: rows });
  } catch (err) {
    console.error("Error fetching tests:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ✅ Get single test by ID
router.get('/test/:test_id', async (req, res) => {
  const { test_id } = req.params;
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM diagnostic_test WHERE test_id = ?',
      [test_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test not found.' });
    }
    res.json({ success: true, test: rows[0] });
  } catch (error) {
    console.error('Error fetching test by ID:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

module.exports = router;
