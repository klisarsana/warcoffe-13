-- ============================================================================
-- WARCOFFE 13 — SEED DATA KATALOG MENU AWAL (57 ITEM)
-- Capstone Project Asah 2026 | Team ID: A26-CS187
-- ============================================================================
-- PENTING:
-- 1. Hanya berisi 3 kategori dan 57 entri menu resmi dari foto menu Warcoffe 13.
-- 2. current_stock = NULL (belum diketahui sampai pemilik mengisi sendiri).
-- 3. TIDAK ADA data transaksi, omzet, atau pengeluaran dummy yang di-seed.
-- 4. Variasi suhu yang tidak disebutkan pada foto disimpan sebagai 'UNSPECIFIED'.
-- ============================================================================

INSERT INTO menu_categories (id, name, slug, sort_order) VALUES
  ('cat-kemasan', 'Minuman Kemasan', 'minuman-kemasan', 1),
  ('cat-racikan', 'Minuman Racikan / Sachet', 'minuman-racikan-sachet', 2),
  ('cat-makanan', 'Makanan', 'makanan', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  sort_order = EXCLUDED.sort_order;

-- A. MINUMAN KEMASAN (20 Item)
INSERT INTO menu_items (id, name, category_id, description, temperature_mode, default_price, hot_price, cold_price, is_active, current_stock, min_stock_threshold, stock_unit, notes) VALUES
  ('mk-01', 'Teh Botol Original', 'cat-kemasan', 'Minuman kemasan siap saji', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-02', 'Nipis Madu', 'cat-kemasan', 'Minuman kemasan jeruk nipis madu', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-03', 'C1000 Orange', 'cat-kemasan', 'Minuman vitamin C1000 rasa jeruk', 'NONE', 8000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-04', 'Good Day Cappuccino (Kemasan)', 'cat-kemasan', 'Minuman kemasan botol/kotak Good Day Cappuccino (tercatat pada daftar kemasan; pemilik dapat menggabungkan jika sama dengan versi racikan)', 'NONE', 7000, NULL, NULL, TRUE, NULL, NULL, 'botol', 'Muncul pada daftar Minuman Kemasan & Minuman Racikan di foto menu'),
  ('mk-05', 'C1000 Orange Water', 'cat-kemasan', 'Minuman isotonik/vitamin C1000 Orange Water', 'NONE', 8000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-06', 'Good Day Fantastic Mocaccino', 'cat-kemasan', 'Minuman kopi kemasan Good Day Fantastic Mocaccino', 'NONE', 7000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-07', 'Teh Kotak', 'cat-kemasan', 'Minuman teh melati kemasan kotak', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'kotak', ''),
  ('mk-08', 'ABC Kacang Hijau', 'cat-kemasan', 'Minuman sari kacang hijau kemasan kotak', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'kotak', ''),
  ('mk-09', 'Sosro Fruit Tea Apel', 'cat-kemasan', 'Minuman teh rasa apel kemasan', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-10', 'Indomilk Kids Coklat', 'cat-kemasan', 'Susu UHT anak rasa coklat', 'NONE', 3500, NULL, NULL, TRUE, NULL, NULL, 'kotak', ''),
  ('mk-11', 'Yakult', 'cat-kemasan', 'Minuman susu fermentasi', 'NONE', 3000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-12', 'Isoplus Coco', 'cat-kemasan', 'Minuman isotonik dengan air kelapa', 'NONE', 4000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-13', 'Pocari Sweat', 'cat-kemasan', 'Minuman isotonik kemasan', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-14', 'Pucuk', 'cat-kemasan', 'Teh Pucuk Harum kemasan botol', 'NONE', 4000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-15', 'Cincau Selasih', 'cat-kemasan', 'Minuman cincau biji selasih kemasan kaleng/botol', 'NONE', 8000, NULL, NULL, TRUE, NULL, NULL, 'kaleng', ''),
  ('mk-16', 'Cincau Hitam', 'cat-kemasan', 'Minuman cincau hitam kemasan', 'NONE', 8000, NULL, NULL, TRUE, NULL, NULL, 'kaleng', ''),
  ('mk-17', 'Adem Sari Kaleng', 'cat-kemasan', 'Minuman penyegar Adem Sari kemasan kaleng', 'NONE', 8000, NULL, NULL, TRUE, NULL, NULL, 'kaleng', ''),
  ('mk-18', 'Larutan Cap Kaki Tiga Botol', 'cat-kemasan', 'Larutan penyegar kemasan botol (item terpisah dari versi kaleng)', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'botol', ''),
  ('mk-19', 'Larutan Cap Kaki Tiga Kaleng', 'cat-kemasan', 'Larutan penyegar kemasan kaleng (item terpisah dari versi botol)', 'NONE', 7000, NULL, NULL, TRUE, NULL, NULL, 'kaleng', ''),
  ('mk-20', 'Bear Brand Susu', 'cat-kemasan', 'Susu steril Bear Brand kemasan kaleng', 'NONE', 11000, NULL, NULL, TRUE, NULL, NULL, 'kaleng', ''),

-- B. MINUMAN RACIKAN / SACHET (23 Item)
  ('mr-01', 'Kopi Hitam', 'cat-racikan', 'Kopi hitam seduh (tercatat varian Panas)', 'HOT_ONLY', NULL, 4000, NULL, TRUE, NULL, NULL, 'sachet', 'Hanya harga Panas yang tercantum di foto menu'),
  ('mr-02', 'Kopi Luwak', 'cat-racikan', 'Kopi Luwak White Koffie seduh (tercatat varian Panas)', 'HOT_ONLY', NULL, 4000, NULL, TRUE, NULL, NULL, 'sachet', 'Hanya harga Panas yang tercantum di foto menu'),
  ('mr-03', 'Kopi ABC', 'cat-racikan', 'Kopi ABC seduh (tercatat varian Panas)', 'HOT_ONLY', NULL, 4000, NULL, TRUE, NULL, NULL, 'sachet', 'Hanya harga Panas yang tercantum di foto menu'),
  ('mr-04', 'Indocafe', 'cat-racikan', 'Indocafe Coffeemix seduh (tercatat varian Panas)', 'HOT_ONLY', NULL, 4000, NULL, TRUE, NULL, NULL, 'sachet', 'Hanya harga Panas yang tercantum di foto menu'),
  ('mr-05', 'Coffee Milk', 'cat-racikan', 'Kopi susu seduh (tercatat varian Panas)', 'HOT_ONLY', NULL, 4000, NULL, TRUE, NULL, NULL, 'sachet', 'Hanya harga Panas yang tercantum di foto menu'),
  ('mr-06', 'Kopi Liong', 'cat-racikan', 'Kopi Liong Bulan seduh (tercatat varian Panas)', 'HOT_ONLY', NULL, 5000, NULL, TRUE, NULL, NULL, 'sachet', 'Hanya harga Panas yang tercantum di foto menu'),
  ('mr-07', 'Teh Manis', 'cat-racikan', 'Teh manis racikan (tersedia Panas & Dingin)', 'HOT_COLD', NULL, 3000, 4000, TRUE, NULL, NULL, 'porsi', ''),
  ('mr-08', 'Good Day Vanilla', 'cat-racikan', 'Kopi Good Day Vanilla Latte (tersedia Panas & Dingin)', 'HOT_COLD', NULL, 5000, 6000, TRUE, NULL, NULL, 'sachet', ''),
  ('mr-09', 'Good Day Mocacino', 'cat-racikan', 'Kopi Good Day Mocacinno (tersedia Panas & Dingin)', 'HOT_COLD', NULL, 5000, 6000, TRUE, NULL, NULL, 'sachet', ''),
  ('mr-10', 'Good Day Latte', 'cat-racikan', 'Kopi Good Day Original/Choco Latte (tersedia Panas & Dingin)', 'HOT_COLD', NULL, 6000, 7000, TRUE, NULL, NULL, 'sachet', ''),
  ('mr-11', 'Milo', 'cat-racikan', 'Minuman coklat malt Milo (tersedia Panas & Dingin)', 'HOT_COLD', NULL, 5000, 7000, TRUE, NULL, NULL, 'sachet', ''),
  ('mr-12', 'Susu Jahe', 'cat-racikan', 'Minuman susu jahe hangat/dingin (tersedia Panas & Dingin)', 'HOT_COLD', NULL, 5000, 7000, TRUE, NULL, NULL, 'sachet', ''),
  ('mr-13', 'Matcha Zen Latte', 'cat-racikan', 'Minuman matcha latte (variasi suhu tidak disebutkan pada foto)', 'UNSPECIFIED', 7000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Variasi suhu tidak disebutkan pada foto menu'),
  ('mr-14', 'Nutrisari', 'cat-racikan', 'Minuman jeruk Nutrisari (variasi suhu tidak disebutkan pada foto)', 'UNSPECIFIED', 5000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Variasi suhu tidak disebutkan pada foto menu'),
  ('mr-15', 'Chocolatos', 'cat-racikan', 'Minuman coklat Chocolatos (variasi suhu tidak disebutkan pada foto)', 'UNSPECIFIED', 7000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Variasi suhu tidak disebutkan pada foto menu'),
  ('mr-16', 'Mextea Teh Tarik', 'cat-racikan', 'Minuman MaxTea Teh Tarik (variasi suhu tidak disebutkan pada foto)', 'UNSPECIFIED', 10000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Variasi suhu tidak disebutkan pada foto menu'),
  ('mr-17', 'Beng Beng', 'cat-racikan', 'Minuman coklat Drink Beng-Beng (variasi suhu tidak disebutkan pada foto)', 'UNSPECIFIED', 7000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Variasi suhu tidak disebutkan pada foto menu'),
  ('mr-18', 'Good Day Freeze', 'cat-racikan', 'Minuman kopi Good Day Freeze (variasi suhu tidak disebutkan pada foto)', 'UNSPECIFIED', 7000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Variasi suhu tidak disebutkan pada foto menu'),
  ('mr-19', 'Caffelatte', 'cat-racikan', 'Minuman kopi Caffelatte (variasi suhu tidak disebutkan pada foto)', 'UNSPECIFIED', 10000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Variasi suhu tidak disebutkan pada foto menu'),
  ('mr-20', 'Dalgona', 'cat-racikan', 'Minuman Dalgona Coffee (variasi suhu tidak disebutkan pada foto)', 'UNSPECIFIED', 12000, NULL, NULL, TRUE, NULL, NULL, 'porsi', 'Variasi suhu tidak disebutkan pada foto menu'),
  ('mr-21', 'Ovaltine', 'cat-racikan', 'Minuman coklat malt Ovaltine (variasi suhu tidak disebutkan pada foto)', 'UNSPECIFIED', 7000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Variasi suhu tidak disebutkan pada foto menu'),
  ('mr-22', 'Good Day Cappuccino', 'cat-racikan', 'Good Day Cappuccino racikan/sachet (catatan tulisan tangan 7K; variasi suhu tidak disebutkan)', 'UNSPECIFIED', 7000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Catatan tulisan tangan pada foto menu; dapat digabung dengan versi kemasan jika produk sama'),
  ('mr-23', 'Bonteh Teh Tarik', 'cat-racikan', 'Minuman Bonteh Teh Tarik (catatan tulisan tangan 7K; variasi suhu tidak disebutkan)', 'UNSPECIFIED', 7000, NULL, NULL, TRUE, NULL, NULL, 'sachet', 'Catatan tulisan tangan pada foto menu; variasi suhu tidak disebutkan'),

-- C. MAKANAN (14 Item)
  ('fd-01', 'Mie Goreng + Telur', 'cat-makanan', 'Mie instan goreng disajikan dengan telur', 'NONE', 11000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-02', 'Indomie Rebus', 'cat-makanan', 'Indomie kuah/rebus polos tanpa telur', 'NONE', 7000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-03', 'Indomie Telur', 'cat-makanan', 'Indomie disajikan dengan tambahan telur', 'NONE', 11000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-04', 'Indomie Double + Telur', 'cat-makanan', 'Indomie porsi ganda (2 bungkus) dengan tambahan telur', 'NONE', 16000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-05', 'Sosis Bakar', 'cat-makanan', 'Camilan sosis bakar bumbu spesial', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'tusuk', ''),
  ('fd-06', 'Otak-Otak Bakar', 'cat-makanan', 'Camilan otak-otak bakar', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-07', 'Baso Bakar', 'cat-makanan', 'Camilan bakso bakar bumbu oles', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'tusuk', ''),
  ('fd-08', 'Pisang Keju Coklat', 'cat-makanan', 'Pisang goreng/bakar topping keju dan susu coklat', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-09', 'Roti Bakar', 'cat-makanan', 'Roti bakar manis hangat', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-10', 'Kentang Goreng', 'cat-makanan', 'French fries / kentang goreng renyah', 'NONE', 7000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-11', 'Seblak Original', 'cat-makanan', 'Seblak kuah pedas gurih original', 'NONE', 10000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-12', 'Seblak Ceker Tulangan', 'cat-makanan', 'Seblak pedas komplit dengan ceker dan tulangan ayam', 'NONE', 12000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-13', 'Takoyaki', 'cat-makanan', 'Camilan bola-bola takoyaki saus khas', 'NONE', 5000, NULL, NULL, TRUE, NULL, NULL, 'porsi', ''),
  ('fd-14', 'Dimsum', 'cat-makanan', 'Dimsum kukus hangat (catatan tulisan tangan Dimsum 10K)', 'NONE', 10000, NULL, NULL, TRUE, NULL, NULL, 'porsi', 'Catatan tulisan tangan pada foto daftar menu')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  temperature_mode = EXCLUDED.temperature_mode,
  default_price = EXCLUDED.default_price,
  hot_price = EXCLUDED.hot_price,
  cold_price = EXCLUDED.cold_price,
  is_active = EXCLUDED.is_active,
  stock_unit = EXCLUDED.stock_unit,
  notes = EXCLUDED.notes,
  updated_at = NOW();
