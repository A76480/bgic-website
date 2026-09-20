const { readDb } = require('../db');

// Checks that the request includes a valid logged-in customer ID.
// The frontend sends this as a header after the customer registers/logs in.

function customerAuth(req, res, next) {
  const customerId = req.headers['x-customer-id'];
  if (!customerId) {
    return res.status(401).json({ error: 'Please log in or create an account first.' });
  }
  const db = readDb();
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) {
    return res.status(401).json({ error: 'Your session is invalid. Please log in again.' });
  }
  req.customer = customer;
  next();
}

module.exports = customerAuth;
