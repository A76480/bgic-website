const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { password } = req.body;
  const expected = process.env.ADMIN_PASSWORD || 'bgic2026';

  if (password === expected) {
    // The password itself acts as the token for this simple setup —
    // the frontend stores it and sends it back on every admin request.
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect password' });
  }
});

module.exports = router;
