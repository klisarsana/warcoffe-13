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
-- 5. Seluruh tabel menggunakan TEXT PRIMARY KEY (tanpa SERIAL/sequence).
-- 6. Akses tabel menggunakan Least-Privilege GRANT & Owner-Only RLS
--    berdasarkan klaim JWT app_metadata.role = 'owner'.
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

-- 7. TABEL AUDIT LOGS (RIWAYAT AKTIVITAS & PERUBAHAN DATA WARCOFFE 13)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'STOCK_MOVE', 'AI_CONFIRM')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('SALE_TRANSACTION', 'EXPENSE', 'MENU_ITEM', 'CATEGORY', 'STOCK')),
  entity_id TEXT NOT NULL,
  actor_email TEXT NOT NULL DEFAULT 'owner',
  summary TEXT NOT NULL,
  before_data JSONB DEFAULT NULL,
  after_data JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEKS UNTUK PERFORMA QUERY LAPORAN & FILTER BULANAN
CREATE INDEX IF NOT EXISTS idx_sales_transactions_date ON sales_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_items_tx_id ON sales_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_menu ON stock_movements(menu_item_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- ============================================================================
-- 7. FUNGSI VERIFIKASI OWNER & LEAST-PRIVILEGE GRANTS
-- Memeriksa klaim JWT app_metadata.role = 'owner' yang hanya dapat diatur
-- dari sisi server/admin Supabase Auth (tidak dapat dimodifikasi oleh client).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_warcoffe_owner()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner',
    false
  );
$$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_warcoffe_owner() TO authenticated;

-- Pastikan anon dan PUBLIC tidak memiliki akses apa pun pada seluruh tabel bisnis
REVOKE ALL ON TABLE
  public.menu_categories,
  public.menu_items,
  public.sales_transactions,
  public.sales_transaction_items,
  public.expenses,
  public.stock_movements,
  public.audit_logs
FROM anon, PUBLIC;

-- Berikan izin CRUD eksplisit paling minimal kepada role authenticated (bukan GRANT ALL)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.menu_categories,
  public.menu_items,
  public.sales_transactions,
  public.sales_transaction_items,
  public.expenses,
  public.stock_movements
TO authenticated;

-- Tabel audit_logs bersifat append-only (hanya SELECT dan INSERT, tidak boleh UPDATE/DELETE)
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) — STRICT OWNER-ONLY POLICIES
-- Seluruh policy lama dihapus dan diganti dengan pemeriksaan public.is_warcoffe_owner().
-- ============================================================================
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama (jika pernah dibuat sebelumnya) agar tidak ada permissive policy yang tersisa
DROP POLICY IF EXISTS "Owner authenticated full access menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owner only access menu_categories" ON public.menu_categories;

DROP POLICY IF EXISTS "Owner authenticated full access menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Owner only access menu_items" ON public.menu_items;

DROP POLICY IF EXISTS "Owner authenticated full access sales_transactions" ON public.sales_transactions;
DROP POLICY IF EXISTS "Owner only access sales_transactions" ON public.sales_transactions;

DROP POLICY IF EXISTS "Owner authenticated full access sales_transaction_items" ON public.sales_transaction_items;
DROP POLICY IF EXISTS "Owner only access sales_transaction_items" ON public.sales_transaction_items;

DROP POLICY IF EXISTS "Owner authenticated full access expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owner only access expenses" ON public.expenses;

DROP POLICY IF EXISTS "Owner authenticated full access stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Owner only access stock_movements" ON public.stock_movements;

DROP POLICY IF EXISTS "Owner only access audit_logs" ON public.audit_logs;

-- Buat policy ketat Owner-Only menggunakan public.is_warcoffe_owner()
CREATE POLICY "Owner only access menu_categories"
  ON public.menu_categories
  FOR ALL
  TO authenticated
  USING (public.is_warcoffe_owner())
  WITH CHECK (public.is_warcoffe_owner());

CREATE POLICY "Owner only access menu_items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.is_warcoffe_owner())
  WITH CHECK (public.is_warcoffe_owner());

CREATE POLICY "Owner only access sales_transactions"
  ON public.sales_transactions
  FOR ALL
  TO authenticated
  USING (public.is_warcoffe_owner())
  WITH CHECK (public.is_warcoffe_owner());

CREATE POLICY "Owner only access sales_transaction_items"
  ON public.sales_transaction_items
  FOR ALL
  TO authenticated
  USING (public.is_warcoffe_owner())
  WITH CHECK (public.is_warcoffe_owner());

CREATE POLICY "Owner only access expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (public.is_warcoffe_owner())
  WITH CHECK (public.is_warcoffe_owner());

CREATE POLICY "Owner only access stock_movements"
  ON public.stock_movements
  FOR ALL
  TO authenticated
  USING (public.is_warcoffe_owner())
  WITH CHECK (public.is_warcoffe_owner());

CREATE POLICY "Owner only access audit_logs"
  ON public.audit_logs
  FOR ALL
  TO authenticated
  USING (public.is_warcoffe_owner())
  WITH CHECK (public.is_warcoffe_owner());
