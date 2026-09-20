# BGIC — Building Materials, Rentals & Contracts

A complete website with a real backend: customer storefront (materials +
rentals + contract requests), cart/checkout, and a full admin panel — built
to be hosted online with a real domain.

## What's included

- **Backend**: Node.js + Express API (`server.js`, `routes/`)
- **Database**: a simple JSON file (`data/db.json`) — no complicated setup,
  works out of the box. See "Upgrading the database" below for when to move
  past this.
- **Frontend**: plain HTML/CSS/JS (`public/`) served by the same server
- **Customer accounts**: customers register with name/phone/password before
  they can check out or submit a contract request. Passwords are hashed
  (never stored in plain text) using Node's built-in crypto module.
- **Admin panel**: password-protected, full control over materials, rentals,
  orders (approve/cancel/return/complete, single or bulk), and contract
  requests. Adding an item uses a real form (name, local name, description,
  category, icon, price, deposit, quantity) — no popup prompts.

## Running it on your own computer first (recommended before hosting)

1. Install Node.js if you don't have it: https://nodejs.org
2. Open this folder in VS Code, open a terminal, run:
   ```
   npm install
   ```
3. Copy `.env.example` to a new file called `.env`, and set your own admin
   password inside it.
4. Start the server:
   ```
   npm start
   ```
5. Open your browser to `http://localhost:3000` — the full site loads there.

## Hosting it online (free options to start)

Any of these work well for this project. All support Node.js apps directly.

### Option A: Render.com (recommended, simplest)
1. Push this project to a GitHub repository (create a free GitHub account
   if you don't have one, create a new repo, upload these files)
2. Go to https://render.com, sign up (free), click **New → Web Service**
3. Connect your GitHub repo
4. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Under **Environment**, add `ADMIN_PASSWORD` with your real password
6. Click **Deploy** — Render gives you a live URL like
   `https://bgic.onrender.com`

**Important**: Render's free tier resets the filesystem on redeploy, which
means `data/db.json` (your products/orders) would reset too. For a real
business, add Render's **Persistent Disk** add-on (small monthly cost) and
mount it at `/opt/render/project/src/data`, or upgrade to a real hosted
database (see below) — this is the single most important next step before
relying on this for real customers.

### Option B: Railway.app
Similar process — connect GitHub repo, set `ADMIN_PASSWORD` env variable,
deploy. Railway's free tier has similar filesystem reset behavior; same
persistent storage note applies.

### Connecting your own domain name
Once deployed on Render or Railway, both let you add a **Custom Domain** in
their dashboard settings — point your domain's DNS (bought from Namecheap,
GoDaddy, etc.) to the address they give you.

## Upgrading the database (do this before real customers rely on this)

The JSON file works for getting started and testing, but isn't safe for:
- Multiple people using the admin panel at the same time (risk of overwritten data)
- Guaranteed data safety on redeploy on free hosting tiers

When ready, move to a real hosted database:
1. **Supabase** (https://supabase.com) or **Neon** (https://neon.tech) — both
   offer free PostgreSQL databases
2. You'd rewrite `db.js` to use a Postgres client (`pg` npm package) instead
   of reading/writing the JSON file — the route files (`routes/*.js`) call
   the same function names, so this is a contained change

## Adding real online payments (Paystack)

Right now "Pay Now" just records the order — no real money moves yet.

1. Sign up at https://paystack.com, get your **Public Key** and **Secret Key**
   from the dashboard
2. Add them to your `.env` file
3. In `public/app.js`, inside the `placeOrder()` function, before calling
   `/api/orders`, add Paystack's inline JS popup
   (docs: https://paystack.com/docs/payments/accept-payments/) to collect
   card details and confirm payment first
4. On the backend, add a route that verifies the payment with Paystack's
   `/transaction/verify/:reference` endpoint before marking the order as
   paid — never trust a "payment successful" message from the browser alone

## Security notes before going fully live

- Change `ADMIN_PASSWORD` in `.env` to something strong — never leave it as
  `bgic2026`
- Never commit your real `.env` file to GitHub (it's already in `.gitignore`)
- Once you have real customers, add HTTPS (Render/Railway provide this
  automatically) and consider real user accounts for admin staff instead of
  one shared password

## Project structure

```
bgic-fullstack/
├── server.js              # Main server, wires everything together
├── db.js                  # Database read/write (JSON file based)
├── middleware/
│   └── adminAuth.js        # Checks admin password on protected routes
├── routes/
│   ├── auth.js              # Admin login check
│   ├── products.js          # Building materials CRUD
│   ├── rentals.js           # Rental equipment CRUD
│   ├── orders.js            # Checkout + order status management
│   └── contracts.js         # Contract request submission + management
├── public/
│   ├── index.html           # Frontend markup
│   ├── style.css             # All styling
│   └── app.js                 # Frontend logic (talks to the API)
├── data/
│   └── db.json              # Your live data (auto-created on first run)
├── .env.example
└── package.json
```
