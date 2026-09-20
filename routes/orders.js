const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { readDb, writeDb } = require('../db');
const adminAuth = require('../middleware/adminAuth');
const customerAuth = require('../middleware/customerAuth');

// Admin: view all orders
router.get('/', adminAuth, (req, res) => {
  const db = readDb();
  res.json(db.orders);
});

// Customer must be logged in: place a new order (checkout)
router.post('/', customerAuth, (req, res) => {
  const { customerName, phone, address, items } = req.body;
  if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerName, phone, address and items are required' });
  }

  const db = readDb();

  // Re-price server-side using current catalog prices (never trust client-sent totals)
  // and reduce stock for whichever list (materials or rentals) each item belongs to.
  let total = 0;
  const resolvedItems = [];

  for (const reqItem of items) {
    const material = db.products.find(p => p.id === reqItem.productId);
    const rental = db.rentals.find(p => p.id === reqItem.productId);
    const product = material || rental;

    if (!product) {
      return res.status(400).json({ error: `Unknown product: ${reqItem.productId}` });
    }
    const qty = Math.max(1, Number(reqItem.qty) || 1);
    const lineTotal = product.price * qty;
    total += lineTotal;
    resolvedItems.push({ productId: product.id, name: product.name, qty, price: product.price });
    product.stock = Math.max(0, product.stock - qty);
  }

  const order = {
    id: 'ORD-' + uuidv4().slice(0, 8).toUpperCase(),
    customerId: req.customer.id,
    customerName,
    phone,
    address,
    items: resolvedItems,
    total,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(order);
  writeDb(db);
  res.status(201).json(order);
});

// Admin: update a single order's status
router.patch('/:id', adminAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'approved', 'cancelled', 'returned', 'completed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use one of: ' + allowed.join(', ') });
  }
  const db = readDb();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = status;
  writeDb(db);
  res.json(order);
});

// Admin: bulk status update
router.patch('/', adminAuth, (req, res) => {
  const { ids, status } = req.body;
  const allowed = ['pending', 'approved', 'cancelled', 'returned', 'completed'];
  if (!Array.isArray(ids) || ids.length === 0 || !allowed.includes(status)) {
    return res.status(400).json({ error: 'ids (array) and a valid status are required' });
  }
  const db = readDb();
  let updated = 0;
  db.orders.forEach(o => {
    if (ids.includes(o.id)) { o.status = status; updated++; }
  });
  writeDb(db);
  res.json({ updated });
});

module.exports = router;
