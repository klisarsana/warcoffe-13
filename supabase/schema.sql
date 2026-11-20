-- ============================================================================
-- WARCOFFE 13 MANAGEMENT SYSTEM — SUPABASE POSTGRESQL SCHEMA
-- Capstone Project Asah 2026 | Team ID: A26-CS187
-- UMKM: Warcoffe 13
-- ============================================================================
-- Catatan Aturan Bisnis:
-- 1. Semua nominal harga dan uang disimpan dalam INTEGER Rupiah (IDR).
-- 2. Stok awal produk (current_stock) default NULL (unknown) sampai pemilik
--    mengisi sendiri melalui Stock Management.
-- 3. Tidak ada pengurangan stok bahan baku berbasis resep otomatis.
-- 4. Varian menu yang tidak jelas pada foto disimpan sebagai temperature_mode = 'UNSPECIFIED'.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL KATEGORI MENU
CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABEL MENU ITEMS
-- temperature_mode:
--   'NONE'        : Tidak berlaku suhu (makanan / minuman kemasan standar)
--   'HOT_ONLY'    : Hanya tersedia varian Panas
--   'HOT_COLD'    : Tersedia varian Panas dan Dingin dengan harga masing-masing
--   'UNSPECIFIED' : Harga tercatat pada foto tetapi variasi panas/dingin tidak disebutkan
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES menu_categories(id) ON UPDATE CASCADE,
  description TEXT DEFAULT '',
  temperature_mode TEXT NOT NULL CHECK (temperature_mode IN ('NONE', 'HOT_ONLY', 'HOT_COLD', 'UNSPECIFIED')),
  default_price INTEGER CHECK (default_price IS NULL OR default_price >= 0),
  hot_price INTEGER CHECK (hot_price IS NULL OR hot_price >= 0),
  cold_price INTEGER CHECK (cold_price IS NULL OR cold_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  current_stock INTEGER DEFAULT NULL,
  min_stock_threshold INTEGER DEFAULT NULL CHECK (min_stock_threshold IS NULL OR min_stock_threshold >= 0),
  stock_unit TEXT NOT NULL DEFAULT 'pcs',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABEL TRANSAKSI PENJUALAN (PEMASUKAN / POS)
CREATE TABLE IF NOT EXISTS sales_transactions (
  id TEXT PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal_amount INTEGER NOT NULL CHECK (subtotal_amount >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('TUNAI', 'QRIS', 'TRANSFER')),
  amount_paid INTEGER NOT NULL CHECK (amount_paid >= total_amount),
  change_amount INTEGER NOT NULL CHECK (change_amount >= 0),
  customer_note TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'POS_MANUAL' CHECK (source IN ('POS_MANUAL', 'AI_DRAFT_CONFIRMED')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL DETAIL ITEM TRANSAKSI PENJUALAN
CREATE TABLE IF NOT EXISTS sales_transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,
  menu_item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_name_snapshot TEXT NOT NULL,
  category_name_snapshot TEXT NOT NULL,
  variant_label TEXT NOT NULL DEFAULT 'Standar',
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total INTEGER NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABEL PENGELUARAN OPERASIONAL (EXPENSES)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'AI_DRAFT_CONFIRMED')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABEL RIWAYAT PERGERAKAN STOK (STOCK MOVEMENTS)
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  menu_name_snapshot TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('INITIAL', 'IN', 'OUT', 'ADJUSTMENT')),
  quantity_change INTEGER NOT NULL,
  previous_stock INTEGER DEFAULT NULL,
  resulting_stock INTEGER NOT NULL CHECK (resulting_stock >= 0),
  reason TEXT NOT NULL,
  note TEXT DEFAULT '',
  movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEKS UNTUK PERFORMA QUERY LAPORAN & FILTER BULANAN
CREATE INDEX IF NOT EXISTS idx_sales_transactions_date ON sales_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_items_tx_id ON sales_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_menu ON stock_movements(menu_item_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) — OWNER-ONLY AUTHENTICATION PROTECTION
-- Hanya pengguna terautentikasi (authenticated owner) yang dapat membaca
-- atau memodifikasi data bisnis Warcoffe 13.
-- ============================================================================
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner authenticated full access menu_categories" ON menu_categories;
CREATE POLICY "Owner authenticated full access menu_categories"
  ON menu_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owner authenticated full access menu_items" ON menu_items;
CREATE POLICY "Owner authenticated full access menu_items"
  ON menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owner authenticated full access sales_transactions" ON sales_transactions;
CREATE POLICY "Owner authenticated full access sales_transactions"
  ON sales_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owner authenticated full access sales_transaction_items" ON sales_transaction_items;
CREATE POLICY "Owner authenticated full access sales_transaction_items"
  ON sales_transaction_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owner authenticated full access expenses" ON expenses;
CREATE POLICY "Owner authenticated full access expenses"
  ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owner authenticated full access stock_movements" ON stock_movements;
CREATE POLICY "Owner authenticated full access stock_movements"
  ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
