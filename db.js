// Simple file-based database.
// This is intentionally dependency-free (no native modules) so it deploys
// cleanly on any free host without build issues.
//
// UPGRADE PATH: once you have real traffic, swap this for a real database
// (Postgres via Supabase/Neon/Railway, or MySQL). The route files only call
// the functions below, so you'd only need to rewrite this file.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

const SEED_PRODUCTS = [
  { id: 'p1', type: 'material', name: 'Dangote Cement (50kg)', category: 'Cement', price: 9500, unit: 'bag', stock: 200, desc: 'Grade 42.5 Portland cement, standard bag.' },
  { id: 'p2', type: 'material', name: 'Sandcrete Block (9 inch)', category: 'Blocks', price: 650, unit: 'block', stock: 1500, desc: 'Solid 9-inch hollow block for load-bearing walls.' },
  { id: 'p3', type: 'material', name: 'Sandcrete Block (6 inch)', category: 'Blocks', price: 480, unit: 'block', stock: 1800, desc: '6-inch block for partition walls.' },
  { id: 'p4', type: 'material', name: 'Iron Rod (12mm, Y12)', category: 'Iron & Steel', price: 8200, unit: 'length', stock: 400, desc: 'High-tensile reinforcement rod, 12mm.' },
  { id: 'p5', type: 'material', name: 'Iron Rod (16mm, Y16)', category: 'Iron & Steel', price: 13500, unit: 'length', stock: 250, desc: 'High-tensile reinforcement rod, 16mm.' },
  { id: 'p6', type: 'material', name: 'Long Span Roofing Sheet', category: 'Roofing', price: 6200, unit: 'sheet', stock: 300, desc: 'Aluminum long span roofing sheet, 0.55mm.' },
  { id: 'p7', type: 'material', name: 'Stone Coated Roofing Tile', category: 'Roofing', price: 9800, unit: 'sheet', stock: 150, desc: 'Stone-coated steel roofing tile.' },
  { id: 'p8', type: 'material', name: 'PVC Pipe (4 inch)', category: 'Plumbing', price: 3200, unit: 'length', stock: 220, desc: 'Class B PVC waste pipe, 4 inch diameter.' },
  { id: 'p9', type: 'material', name: 'PVC Pipe (1 inch)', category: 'Plumbing', price: 1100, unit: 'length', stock: 400, desc: 'Water supply PVC pipe, 1 inch.' },
  { id: 'p10', type: 'material', name: 'Electrical Cable (2.5mm, 100m)', category: 'Electrical', price: 24500, unit: 'roll', stock: 90, desc: 'Single-core PVC insulated cable, 100m roll.' },
  { id: 'p11', type: 'material', name: 'Circuit Breaker (30A)', category: 'Electrical', price: 2800, unit: 'unit', stock: 120, desc: 'Single pole MCB, 30A.' },
  { id: 'p12', type: 'material', name: 'River Sand (Tipper Load)', category: 'Aggregates', price: 45000, unit: 'tipper', stock: 30, desc: 'Sharp river sand, full tipper load.' },
  { id: 'p13', type: 'material', name: 'Granite Chippings (Tipper Load)', category: 'Aggregates', price: 78000, unit: 'tipper', stock: 25, desc: 'Crushed granite, 3/4 size, full tipper load.' },
  { id: 'p14', type: 'material', name: 'Ceramic Floor Tile (60x60)', category: 'Finishing', price: 3800, unit: 'carton', stock: 180, desc: 'Glazed ceramic floor tile, per carton.' },
  { id: 'p15', type: 'material', name: 'Emulsion Paint (20L)', category: 'Finishing', price: 32000, unit: 'bucket', stock: 60, desc: 'Interior/exterior emulsion paint, 20 litre.' },
  { id: 'p16', type: 'material', name: 'Wood Plank (2x4, 12ft)', category: 'Timber', price: 2400, unit: 'plank', stock: 300, desc: 'Treated timber plank, 2x4 inch, 12ft length.' }
];

const SEED_RENTALS = [
  { id: 'r1', type: 'rental', name: 'Concrete Mixer (1 bag capacity)', category: 'Mixing', price: 15000, unit: 'day', stock: 6, desc: 'Diesel concrete mixer, ideal for small to mid jobs.' },
  { id: 'r2', type: 'rental', name: 'Generator (10KVA)', category: 'Power', price: 20000, unit: 'day', stock: 4, desc: 'Site power generator, fuel not included.' },
  { id: 'r3', type: 'rental', name: 'Scaffolding Set (per bay)', category: 'Access', price: 3500, unit: 'day', stock: 40, desc: 'Steel scaffolding bay, includes boards.' },
  { id: 'r4', type: 'rental', name: 'Wheelbarrow', category: 'Site Tools', price: 1200, unit: 'day', stock: 25, desc: 'Heavy duty steel wheelbarrow.' },
  { id: 'r5', type: 'rental', name: 'Vibrator (Concrete Poker)', category: 'Mixing', price: 8000, unit: 'day', stock: 8, desc: 'Concrete vibrating poker for slab work.' },
  { id: 'r6', type: 'rental', name: 'Water Pump (2 inch)', category: 'Power', price: 9000, unit: 'day', stock: 10, desc: 'Petrol-powered water pump, 2 inch outlet.' }
];

function defaultData() {
  return {
    products: SEED_PRODUCTS,
    rentals: SEED_RENTALS,
    orders: [],
    contracts: [],
    customers: []
  };
}

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData(), null, 2));
  }
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const data = JSON.parse(raw);
  if (!data.customers) data.customers = []; // safety for DBs created before customers existed
  return data;
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb };
