const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { readDb, writeDb } = require('../db');
const adminAuth = require('../middleware/adminAuth');

// Public: list all materials
router.get('/', (req, res) => {
  const db = readDb();
  res.json(db.products);
});

// Admin: add a new material
router.post('/', adminAuth, (req, res) => {
  const { name, localName, category, icon, price, deposit, stock, unit, desc } = req.body;
  if (!name || price == null || stock == null) {
    return res.status(400).json({ error: 'name, price and stock are required' });
  }
  const db = readDb();
  const item = {
    id: uuidv4(),
    type: 'material',
    name,
    localName: localName || '',
    category: category || 'General',
    icon: icon || '',
    price: Number(price),
    deposit: Number(deposit) || 0,
    stock: Number(stock),
    unit: unit || 'unit',
    desc: desc || ''
  };
  db.products.push(item);
  writeDb(db);
  res.status(201).json(item);
});

// Admin: update price/stock/details of a material
router.put('/:id', adminAuth, (req, res) => {
  const db = readDb();
  const item = db.products.find(p => p.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Material not found' });

  const { name, localName, category, icon, price, deposit, stock, unit, desc } = req.body;
  if (name != null) item.name = name;
  if (localName != null) item.localName = localName;
  if (category != null) item.category = category;
  if (icon != null) item.icon = icon;
  if (price != null) item.price = Number(price);
  if (deposit != null) item.deposit = Number(deposit);
  if (stock != null) item.stock = Number(stock);
  if (unit != null) item.unit = unit;
  if (desc != null) item.desc = desc;

  writeDb(db);
  res.json(item);
});

// Admin: delete a material
router.delete('/:id', adminAuth, (req, res) => {
  const db = readDb();
  const before = db.products.length;
  db.products = db.products.filter(p => p.id !== req.params.id);
  if (db.products.length === before) {
    return res.status(404).json({ error: 'Material not found' });
  }
  writeDb(db);
  res.json({ success: true });
});

module.exports = router;
