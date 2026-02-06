// db.js
const mysql = require('mysql2');

// Create the connection pool
const db = mysql.createPool({
  host: '34.14.183.204',           // your VM public IP
  user: '24x7health',              // MySQL username
  password: 'Healthcare@2142',              // MySQL password
  database: 'healthcare',  // Your DB name
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Optional: Test the connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ DB connection error:', err);
    return;
  }
  if (connection) {
    console.log('✅ Database connected successfully (via pool)');
    connection.release();
  }
});

module.exports = db;
