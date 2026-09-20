const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { readDb, writeDb } = require('../db');
const { hashPassword, verifyPassword } = require('../utils/password');

// Register a new customer
router.post('/register', (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'name, phone and password are required' });
  }
  const db = readDb();

  const exists = db.customers.find(c => c.phone === phone);
  if (exists) {
    return res.status(409).json({ error: 'An account with this phone number already exists. Please log in instead.' });
  }

  const { hash, salt } = hashPassword(password);
  const customer = {
    id: uuidv4(),
    name, phone, email: email || '',
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString()
  };
  db.customers.push(customer);
  writeDb(db);

  // Never send password hash/salt back to the browser
  res.status(201).json({ id: customer.id, name: customer.name, phone: customer.phone });
});

// Log in an existing customer
router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'phone and password are required' });
  }
  const db = readDb();
  const customer = db.customers.find(c => c.phone === phone);
  if (!customer || !verifyPassword(password, customer.passwordSalt, customer.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect phone number or password' });
  }
  res.json({ id: customer.id, name: customer.name, phone: customer.phone });
});

module.exports = router;
