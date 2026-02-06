const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/unified-login", (req, res) => {
  const { email, password } = req.body;

  // 1. Check Doctors
  db.query("SELECT * FROM doctors WHERE email = ? AND password = ?", [email, password], (err, docResults) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (docResults.length > 0) {
      const user = docResults[0];
      req.session.isAuthenticated = true;
      req.session.user = { type: 'doctor', id: user.id, name: user.first_name, email: user.email };
      return res.json({ success: true, role: "doctor", user });
    }

    // 2. Check Diagnostics
    db.query("SELECT * FROM diagnostic_centers WHERE email = ? AND password = ?", [email, password], (err, diagResults) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (diagResults.length > 0) {
        const user = diagResults[0];

        req.session.isAuthenticated = true;
        req.session.user = {
          type: 'diagnostic',
          id: user.id,
          center_id: user.center_id, // <-- This is the crucial addition
          name: user.center_name,
          email: user.email
        };
        return res.json({ success: true, role: "diagnostic", user });
      }

      // 3. Check Patients
      db.query("SELECT * FROM patients WHERE email = ? AND password = ?", [email, password], (err, patResults) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (patResults.length > 0) {
          const user = patResults[0];
          req.session.isAuthenticated = true;
          req.session.user = { type: 'patient', id: user.id, unique_id: user.unique_id, name: `${user.first_name} ${user.last_name}`, email: user.email };
          return res.json({ success: true, role: "patient", user });
        }

        // 4. Not found
        res.status(401).json({ success: false, error: "Invalid email or password." });
      });
    });
  });
});

module.exports = router;
