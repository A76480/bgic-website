const crypto = require('crypto');

// Simple salted hash using Node's built-in crypto module — no extra
// dependency needed. Good enough for a small business site's customer
// accounts. If this grows into a larger platform, consider bcrypt instead.

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return hash === expectedHash;
}

module.exports = { hashPassword, verifyPassword };
