# Warcoffe Management System (Warcoffe 13)

**Capstone Project Asah 2026 — Team ID: A26-CS187**  
**UMKM:** Warcoffe 13 (Kuliner / F&B)  
**Judul Use Case:** Sistem Pencatatan Keuangan Bulanan dan Pemantauan Stok Warcoffe 13

---

## 1. Gambaran Umum Proyek

**Warcoffe Management System** adalah aplikasi web *responsive* (ponsel & desktop) yang dirancang khusus untuk pemilik UMKM **Warcoffe 13** guna mencatat pemasukan penjualan harian, pengeluaran operasional, memantau riwayat transaksi & rekap bulanan secara otomatis, mengelola katalog menu beserta stok sederhana, serta menyediakan antarmuka dan kontrak integrasi *AI Business Assistant*.

> **Catatan Penting:** Aplikasi ini merupakan *prototype capstone* untuk demonstrasi dan validasi operasional usaha, bukan laporan akuntansi formal atau sistem produksi berskala korporasi. Seluruh angka ringkasan dihitung langsung dari data transaksi dan pengeluaran yang benar-benar tersimpan (tidak ada angka penjualan, pengeluaran, atau stok awal yang dikarang/di-*hardcode*).

---

## 2. Daftar Modul Aplikasi & Alur Autentikasi Owner-Only

0. **Halaman Login Khusus Pemilik (`/` — Root URL)**:
   - Menggunakan **Supabase Auth** (Email & Password) tanpa registrasi publik.
   - Setelah login berhasil, pemilik diarahkan ke `/dashboard`.
   - Seluruh rute aplikasi (`/dashboard`, `/pos`, `/transactions`, `/menu`, `/stock`, `/expenses`, `/reports`, dan `/ai-assistant`) diproteksi; pengguna yang belum login otomatis diarahkan kembali ke `/`.
   - Data bisnis tidak dimuat atau diekspos ke pengguna yang belum terautentikasi.
   - Jika kredensial Supabase belum dikonfigurasi, halaman `/` menampilkan status konfigurasi yang jelas (tanpa *fake authentication* atau kredensial yang di-*hardcode*).
1. **Dashboard (`/dashboard`)**:
   - Penjualan hari ini, pemasukan bulan terpilih, pengeluaran bulan terpilih, selisih bersih (*pemasukan dikurangi pengeluaran*), dan jumlah transaksi.
   - Grafik tren pemasukan vs pengeluaran harian (Recharts).
   - Daftar menu terlaris berdasarkan transaksi penjualan tercatat.
   - Peringatan stok menipis berdasarkan stok yang telah diisi pemilik.
2. **Kasir / Point of Sale (`/pos`)**:
   - Pencarian & filter katalog menu per kategori.
   - Pemilihan varian suhu (*Panas* / *Dingin* hanya bila terkonfigurasi pada menu; item dengan suhu belum jelas pada foto tetap ditandai *Suhu Tidak Disebutkan*).
   - Keranjang pesanan, metode pembayaran (`TUNAI`, `QRIS`, `TRANSFER`), hitung uang kembalian otomatis.
   - Modal **Konfirmasi Penjualan** wajib sebelum transaksi disimpan.
   - **Struk Pembayaran Siap Cetak** (*Printable Receipt*).
3. **Riwayat Transaksi (`/transactions`)**:
   - Gabungan riwayat pemasukan penjualan dan pengeluaran operasional.
   - Filter per bulan, jenis transaksi, kategori, dan kata kunci pencarian.
   - Lihat detail struk, ubah (*edit*), dan hapus (*delete*) dengan dialog konfirmasi yang langsung memperbarui Dashboard & Laporan Bulanan.
4. **Manajemen Menu (`/menu`)**:
   - Di-seed dengan **57 entri menu resmi Warcoffe 13** (20 Minuman Kemasan, 23 Minuman Racikan/Sachet, 14 Makanan).
   - CRUD item menu & kategori, pengaturan harga integer Rupiah (IDR), konfigurasi variasi suhu (`NONE`, `HOT_ONLY`, `HOT_COLD`, `UNSPECIFIED`), dan status Aktif/Nonaktif.
5. **Manajemen Stok (`/stock`)**:
   - Seluruh stok awal produk dimulai dari `NULL` (*Belum Diisi*) sampai pemilik mengisi jumlah stok fisik warung.
   - Mendukung pencatatan *Stok Awal*, *Stok Masuk*, *Stok Keluar*, dan *Penyesuaian Opname* beserta riwayat pergerakan stok (*stock movement history*) dan batas minimum stok (*low-stock threshold*).
6. **Pengeluaran (`/expenses`)**:
   - CRUD pengeluaran operasional warung dengan validasi ketat (menolak nominal kosong, nol, negatif, atau mengandung huruf).
7. **Laporan Bulanan (`/reports`)**:
   - Rekapitulasi total pemasukan, total pengeluaran, selisih bersih, grafik tren harian, tabel rincian harian, pembeda jelas antara data asli vs data kosong vs data berlabel `DEMO`, serta fitur **Ekspor CSV**.
8. **AI Business Assistant (`/ai-assistant`)**:
   - Antarmuka *chat* dengan pertanyaan contoh yang disarankan, input kalimat sehari-hari ke **Draft Transaksi** yang wajib dikonfirmasi pemilik sebelum disimpan, serta dokumentasi kontrak REST API FastAPI (`AI_SERVICE_URL`).

---

## 3. Teknologi yang Digunakan

- **Framework:** Next.js 15 (App Router) + React 19
- **Bahasa:** TypeScript (Strict Mode)
- **Styling & UI:** Tailwind CSS (Tema hangat Espresso, Cream, Caramel) + Lucide React Icons
- **Visualisasi Data:** Recharts
- **Database & Persistence:** Supabase PostgreSQL (dilengkapi *Local Fallback Persistence* otomatis jika kredensial Supabase belum diisi)
- **Layanan AI Text-to-Draft:** Python + FastAPI + scikit-learn (TF-IDF word + char n-gram dengan Logistic Regression / Linear SVC)
- **Lokalisasi:** Bahasa Indonesia (`id-ID`) & format mata uang Rupiah (`IDR` integer)

---

## 4. Instalasi & Menjalankan Secara Lokal

### Prasyarat
- Node.js `>= 18.18.0` (Disarankan Node.js 20 atau 22 LTS)
- npm `>= 9.x`

### Langkah Setup

1. Masuk ke direktori proyek:
   ```bash
   cd warcoffe-management-system
   ```

2. Instal seluruh dependensi:
   ```bash
   npm install
   ```

3. Salin file contoh *environment variables*:
   ```bash
   cp .env.example .env.local
   ```

4. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` di browser.

### Perintah Penting Lainnya

- **Menjalankan Unit & Validation Tests:**
  ```bash
  npm test
  ```
- **Menjalankan Seed Katalog Menu (57 Item):**
  ```bash
  npm run seed
  ```
- **Typecheck TypeScript:**
  ```bash
  npm run typecheck
  ```
- **Build Produksi:**
  ```bash
  npm run build
  ```

### Menjalankan Layanan AI Text-to-Draft (Opsional)

Fitur input teks ke draft transaksi membutuhkan service Python di folder [`ai-service/`](./ai-service/). Detail lengkap ada di [`ai-service/README.md`](./ai-service/README.md).

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Di terminal lain, dari root repository:

```bash
# pastikan .env.local berisi AI_SERVICE_URL=http://localhost:8000
npm run dev
```

Katalog menu untuk service dapat diekspor ulang dengan:

```bash
npm run ai:export-catalog
```

---

## 5. Konfigurasi Environment Variables & Mode Fallback Lokal

File `.env.example` memuat variabel berikut:

| Variabel | Wajib? | Deskripsi |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Wajib** | URL Project Supabase PostgreSQL & Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Wajib** | Anon Public Key dari Supabase untuk Auth & Database |
| `SUPABASE_SERVICE_ROLE_KEY` | Opsional | Digunakan oleh script CLI `npm run seed` untuk menulis ke Supabase |
| `AI_SERVICE_URL` | Opsional | Base URL layanan FastAPI tim Next-Gen AI Engineer (contoh: `http://localhost:8000`) |
| `NEXT_PUBLIC_AI_SERVICE_URL` | Opsional | Label URL layanan FastAPI untuk indikator status di UI |

**Keamanan Autentikasi & Konfigurasi Supabase:**  
Sesuai kesepakatan arsitektur *Owner-Only Authentication*, aplikasi mewajibkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` agar pemilik dapat login melalui Supabase Auth. Apabila variabel tersebut belum diisi, halaman login (`/`) akan menampilkan panduan konfigurasi yang jelas dan tidak mengizinkan akses tanpa autentikasi (tidak ada *fake authentication*).

---

## 6. Setup Database Supabase PostgreSQL

Untuk menghubungkan ke database cloud Supabase:

1. Buat project baru di [Supabase](https://supabase.com).
2. Buka menu **SQL Editor** di dashboard Supabase.
3. Salin dan jalankan seluruh isi file [`supabase/schema.sql`](./supabase/schema.sql) untuk membuat tabel:
   - `menu_categories`
   - `menu_items`
   - `sales_transactions`
   - `sales_transaction_items`
   - `expenses`
   - `stock_movements`
4. Salin dan jalankan seluruh isi file [`supabase/seed.sql`](./supabase/seed.sql) di SQL Editor (atau jalankan `npm run seed` setelah mengisi `.env.local`) untuk memasukkan **3 kategori dan 57 item menu awal Warcoffe 13**.

---

## 7. Kontrak Integrasi API untuk Tim Data Science (DS) & Next-Gen AI Engineer (AE)

Aplikasi web ini menyediakan *service adapter* di [`src/lib/ai-adapter.ts`](./src/lib/ai-adapter.ts) serta *API Route Proxy* di `/api/ai/parse-transaction` dan `/api/ai/chat` yang meneruskan permintaan ke `AI_SERVICE_URL`.

### A. Endpoint 1: Ekstraksi Teks ke Draft Transaksi
- **URL FastAPI Target:** `POST {AI_SERVICE_URL}/api/v1/parse-transaction`
- **Request JSON:**
  ```json
  {
    "text": "beli kopi hitam 2, indomie telur 1",
    "menu_catalog_hints": ["Kopi Hitam", "Indomie Telur"]
  }
  ```
- **Response JSON (`AITransactionDraftResponse`):**
  ```json
  {
    "status": "SUCCESS",
    "draft_type": "INCOME_SALE",
    "predicted_category": "Minuman Racikan / Sachet",
    "classifier_model_used": "IndoBERT-Classifier-v1",
    "confidence_score": 0.95,
    "transaction_date": "2026-11-20",
    "items": [
      {
        "raw_item_text": "kopi hitam 2",
        "matched_menu_item_id": "mr-01",
        "item_name": "Kopi Hitam",
        "variant_label": "Panas",
        "quantity": 2,
        "unit_price": 4000,
        "line_total": 8000,
        "confidence": 0.96
      }
    ],
    "total_amount": 8000,
    "missing_fields": [],
    "assistant_message": "Draft berhasil dibuat. Mohon periksa sebelum menyimpan.",
    "requires_owner_confirmation": true
  }
  ```

### B. Endpoint 2: AI Business Assistant Chat
- **URL FastAPI Target:** `POST {AI_SERVICE_URL}/api/v1/chat`
- **Request JSON (`AIChatRequestPayload`):**
  ```json
  {
    "question": "Berapa omzet bulan ini?",
    "context_summary": {
      "current_month": "2026-11",
      "monthly_revenue": 150000,
      "monthly_expenses": 45000,
      "net_difference": 105000,
      "transaction_count": 12,
      "top_selling_items": [{ "name": "Kopi Liong", "qty": 10, "revenue": 50000 }],
      "low_stock_items": []
    }
  }
  ```
- **Response JSON (`AIChatResponsePayload`):**
  ```json
  {
    "status": "SUCCESS",
    "answer": "Omzet Warcoffe 13 pada bulan ini adalah Rp150.000 dari 12 transaksi.",
    "referenced_metrics": ["monthly_revenue", "transaction_count"]
  }
  ```

---

## 8. Deployment ke Vercel

Proyek telah dilengkapi dengan [`vercel.json`](./vercel.json):
1. Push repositori ke GitHub.
2. Import proyek di dashboard [Vercel](https://vercel.com).
3. Tambahkan Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `AI_SERVICE_URL`).
4. Klik **Deploy**.
