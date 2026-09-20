const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { readDb, writeDb } = require('../db');
const adminAuth = require('../middleware/adminAuth');
const customerAuth = require('../middleware/customerAuth');

// Admin: view all contract requests
router.get('/', adminAuth, (req, res) => {
  const db = readDb();
  res.json(db.contracts);
});

// Customer must be logged in: submit a new contract request
router.post('/', customerAuth, (req, res) => {
  const { name, phone, type, location, budget, desc } = req.body;
  if (!name || !phone || !type || !location || !desc) {
    return res.status(400).json({ error: 'name, phone, type, location and desc are required' });
  }
  const db = readDb();
  const contract = {
    id: 'CTR-' + uuidv4().slice(0, 8).toUpperCase(),
    customerId: req.customer.id,
    name, phone, type, location,
    budget: budget || 'Not specified',
    desc,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.contracts.unshift(contract);
  writeDb(db);
  res.status(201).json(contract);
});

// Admin: update contract status
router.patch('/:id', adminAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'approved', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use one of: ' + allowed.join(', ') });
  }
  const db = readDb();
  const contract = db.contracts.find(c => c.id === req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract request not found' });

  contract.status = status;
  writeDb(db);
  res.json(contract);
});

module.exports = router;
