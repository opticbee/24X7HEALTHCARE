// db.js
const mysql = require('mysql2');

// Create the connection pool
const db = mysql.createPool({
  host: '35.226.137.141',           // your VM public IP
  user: 'hitaishihealth',              // MySQL username
  password: 'Hitaishi@2142',              // MySQL password
  database: 'hitaishihealthcare',  // Your DB name
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
