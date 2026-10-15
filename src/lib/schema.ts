// Single source of truth for the SQLite schema. Used by the importer and at runtime.

export const CATALOG_SCHEMA = `
CREATE TABLE IF NOT EXISTS manufacturers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  brand_count INTEGER NOT NULL DEFAULT 0,
  generic_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS generics (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  drug_class TEXT,
  indication TEXT,
  indication_desc TEXT,
  pharmacology TEXT,
  dosage TEXT,
  administration TEXT,
  interaction TEXT,
  contraindications TEXT,
  side_effects TEXT,
  pregnancy TEXT,
  precautions TEXT,
  pediatric TEXT,
  overdose TEXT,
  storage TEXT,
  brand_count INTEGER NOT NULL DEFAULT 0
);

-- One row per brand + strength + dosage form (a sellable product).
CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY,
  brand_name TEXT NOT NULL,
  type TEXT NOT NULL,                 -- allopathic | herbal
  dosage_form TEXT NOT NULL,
  form_group TEXT NOT NULL,           -- normalized form used for equivalence
  generic_id INTEGER REFERENCES generics(id),
  generic_name TEXT NOT NULL,
  strength TEXT,
  strength_key TEXT NOT NULL,         -- normalized strength used for equivalence
  manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id),
  equiv_key TEXT NOT NULL,            -- generic|strength|form: same key = substitutable
  compare_price REAL,                 -- normalized price for ranking (per unit/ml/gm)
  compare_unit TEXT,                  -- 'tablet', 'ml', 'gm', 'vial' ...
  list_price REAL,                    -- price of the default (smallest) pack
  list_label TEXT,                    -- e.g. 'tablet', '100 ml bottle'
  price_text TEXT,
  price_suspect INTEGER NOT NULL DEFAULT 0, -- far from the group median: likely a data error
  stock INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_med_equiv ON medicines(equiv_key, compare_price);
CREATE INDEX IF NOT EXISTS idx_med_generic ON medicines(generic_id, compare_price);
CREATE INDEX IF NOT EXISTS idx_med_mfr ON medicines(manufacturer_id);

-- Purchasable options for a medicine (single piece, box, bottle size...)
CREATE TABLE IF NOT EXISTS packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  medicine_id INTEGER NOT NULL REFERENCES medicines(id),
  label TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,     -- units inside (30 for a box of 30)
  price REAL NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_packs_med ON packs(medicine_id);

CREATE VIRTUAL TABLE IF NOT EXISTS medicines_fts USING fts5(
  brand_name, generic_name, manufacturer,
  content='', tokenize='unicode61 remove_diacritics 2', prefix='2 3'
);
`;

export const APP_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT,
  password_hash TEXT,
  google_sub TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  division TEXT NOT NULL,
  district TEXT NOT NULL,
  area TEXT NOT NULL,
  line TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  guest_email TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  division TEXT NOT NULL,
  district TEXT NOT NULL,
  area TEXT NOT NULL,
  line TEXT NOT NULL,
  note TEXT,
  prescription_file TEXT,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'placed',
  subtotal REAL NOT NULL,
  delivery_fee REAL NOT NULL,
  total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_id INTEGER NOT NULL,
  pack_id INTEGER NOT NULL,
  brand_name TEXT NOT NULL,
  description TEXT NOT NULL,
  pack_label TEXT NOT NULL,
  unit_price REAL NOT NULL,
  qty INTEGER NOT NULL
);
`;
