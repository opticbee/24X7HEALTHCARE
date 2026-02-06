// routes/session.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Corrected path

/**
 * Creates the session_lock table if it doesn't exist.
 * This table acts as a global lock to ensure only one user is logged in at a time.
 * It has a single row (id=1) that represents the lock state of the entire application.
 */
const createSessionLockTable = `
  CREATE TABLE IF NOT EXISTS session_lock (
    id INT PRIMARY KEY,
    is_locked TINYINT(1) DEFAULT 0,
    session_id VARCHAR(255) NULL,
    user_type VARCHAR(50) NULL,
    user_id VARCHAR(255) NULL,
    started_at TIMESTAMP NULL
  );
`;
db.query(createSessionLockTable, (err) => {
  if (err) {
    console.error('❌ Table creation error (session_lock):', err);
  } else {
    // Ensure the single lock row exists with a default unlocked state.
    db.query("INSERT IGNORE INTO session_lock (id, is_locked) VALUES (1, 0)", () => {
        console.log('✅ session_lock table ready');
    });
  }
});

/**
 * Creates the login_activity table if it doesn't exist.
 * This table logs every successful login and logout event for auditing purposes.
 */
const createLoginActivityTable = `
  CREATE TABLE IF NOT EXISTS login_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255),
    user_id VARCHAR(255),
    user_type VARCHAR(50),
    login_time TIMESTAMP NULL,
    logout_time TIMESTAMP NULL,
    KEY session_id_index (session_id)
  );
`;
db.query(createLoginActivityTable, (err) => {
  if (err) console.error('❌ Table creation error (login_activity):', err);
  else console.log('✅ login_activity table ready');
});

// Route to get the current session and lock status.
router.get('/session/status', (req, res) => {
  db.query("SELECT is_locked, session_id, user_type, user_id, started_at FROM session_lock WHERE id=1", (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error on status check' });
    const lock = rows[0] || {};
    res.json({
      locked: !!lock.is_locked,
      lockedByMe: lock.session_id === req.sessionID,
      lock: lock,
      me: req.session?.user || null,
      isAuthenticated: !!req.session?.isAuthenticated
    });
  });
});

/**
 * Route to handle user logout.
 * This is the ONLY way the system lock should be released during normal operation.
 */
router.post('/logout', (req, res) => {
  db.query("SELECT session_id FROM session_lock WHERE id=1", (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error on logout' });
    const currentLockSid = rows?.[0]?.session_id;

    const finish = () => {
      res.clearCookie('hh.sid');
      return res.json({ success: true, message: 'Logged out' });
    };

    // Records the logout time in the login_activity table.
    const recordLogoutTime = (cb) => {
        if (req.sessionID) {
            const logoutQuery = "UPDATE login_activity SET logout_time = NOW() WHERE session_id = ? AND logout_time IS NULL";
            db.query(logoutQuery, [req.sessionID], () => {
                cb(); // Proceed even if logging fails.
            });
        } else {
            cb();
        }
    };

    // Releases the global lock ONLY if the current session is the one that holds the lock.
    const unlockIfOwner = (cb) => {
      if (currentLockSid && currentLockSid === req.sessionID) {
        db.query(
          "UPDATE session_lock SET is_locked=0, session_id=NULL, user_type=NULL, user_id=NULL, started_at=NULL WHERE id=1",
          () => cb()
        );
      } else cb();
    };

    // Chain of operations: unlock -> log time -> destroy session -> send response
    unlockIfOwner(() => {
        recordLogoutTime(() => {
            if (req.session) {
                req.session.destroy(() => finish());
            } else finish();
        });
    });
  });
});

// Emergency route to force-unlock the system in case a session terminates unexpectedly.
router.post('/session/force-unlock', (req, res) => {
  const token = req.get('x-admin-token');
  // You should secure this with a strong, environment-specific token.
  if (token !== process.env.ADMIN_UNLOCK_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.query(
    "UPDATE session_lock SET is_locked=0, session_id=NULL, user_type=NULL, user_id=NULL, started_at=NULL WHERE id=1",
    (err) => {
      if (err) return res.status(500).json({ error: 'DB error on force-unlock' });
      res.json({ success: true, message: 'Force-unlocked' });
    }
  );
});

module.exports = router;