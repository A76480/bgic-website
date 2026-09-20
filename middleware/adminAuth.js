// Checks that admin-only requests include the correct password in a header.
// This is intentionally simple for a small business site. If you later add
// multiple staff accounts, replace this with real user accounts + sessions.

function adminAuth(req, res, next) {
  const provided = req.headers['x-admin-password'];
  const expected = process.env.ADMIN_PASSWORD || 'Galadima123@';

  if (provided !== expected) {
    return res.status(401).json({ error: 'Not authorized. Admin login required.' });
  }
  next();
}

module.exports = adminAuth;
