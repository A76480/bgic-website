require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const customersRoutes = require('./routes/customers');
const productsRoutes = require('./routes/products');
const rentalsRoutes = require('./routes/rentals');
const ordersRoutes = require('./routes/orders');
const contractsRoutes = require('./routes/contracts');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/contracts', contractsRoutes);

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`BGIC server running on port ${PORT}`);
});
