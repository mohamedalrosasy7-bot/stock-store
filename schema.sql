-- stock-store D1 schema
-- Local:  npx wrangler d1 migrations execute stock-store-db --local  --file schema.sql
-- Remote: npx wrangler d1 migrations execute stock-store-db --remote --file schema.sql

PRAGMA foreign_keys = ON;

-- Admins: one row per admin account. The password is never stored in plain
-- text; we keep a PBKDF2 hash (see functions/_lib/auth.js).
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Products: the whole product document is stored as JSON so the storefront
-- gets exactly the shape it uses today (colors, sizes, images, season...).
CREATE TABLE IF NOT EXISTS products (
  id         TEXT PRIMARY KEY,          -- slug, e.g. "court-sneakers"
  data       TEXT NOT NULL,             -- full product JSON
  position   INTEGER NOT NULL DEFAULT 0,-- newest first
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categories: whole document as JSON (id, label, labelAr, image).
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Shop ads (one row): { enabled, banners: [...] }
CREATE TABLE IF NOT EXISTS shop_ads (
  id   INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

-- Site settings (one row): seasonal visibility etc.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Customer orders
CREATE TABLE IF NOT EXISTS orders (
  id         TEXT PRIMARY KEY,          -- "ord_" + random
  data       TEXT NOT NULL,             -- full order JSON (items, address, totals...)
  status     TEXT NOT NULL DEFAULT 'new',
  total      REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Newsletter subscribers (public signup; admin list/export).
CREATE TABLE IF NOT EXISTS newsletter (
  email      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_position  ON products (position);
CREATE INDEX IF NOT EXISTS idx_categories_position ON categories (position);
CREATE INDEX IF NOT EXISTS idx_orders_created     ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders (status);
