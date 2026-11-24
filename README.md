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

Aplikasi web ini menyediakan *service adapter* di [`src/lib/ai-adapter.ts`](./src/lib/ai-adapter.ts) serta *API Route Proxy* di `/api/ai/parse-transactions`, `/api/ai/parse-transaction`, dan `/api/ai/chat` yang meneruskan permintaan ke `AI_SERVICE_URL`.

### A. Endpoint 1: Ekstraksi Teks ke Draft Transaksi
- **URL FastAPI Target (multi-tanggal):** `POST {AI_SERVICE_URL}/api/v1/parse-transactions`
- **URL FastAPI Target (satu draft):** `POST {AI_SERVICE_URL}/api/v1/parse-transaction`
- **Response multi-tanggal:** `AIMultiTransactionDraftResponse` berisi array `drafts`; detail aturan ada di bagian [8F](#f-input-beberapa-tanggal-sekaligus).
- **Request JSON:**
  ```json
  {
    "text": "laku Kopi Hitam panas 2, Indomie Telur 1 qris",
    "menu_catalog_hints": ["Kopi Hitam", "Indomie Telur"]
  }
  ```
- **Response JSON (`AITransactionDraftResponse`):**
  ```json
  {
    "status": "SUCCESS",
    "draft_type": "INCOME_SALE",
    "predicted_category": "Makanan",
    "classifier_model_used": "TF-IDF (word + char n-gram) + Logistic Regression",
    "confidence_score": 0.5475,
    "transaction_date": "2026-11-22",
    "payment_method": "QRIS",
    "items": [
      {
        "raw_item_text": "laku kopi hitam panas 2",
        "matched_menu_item_id": "mr-01",
        "item_name": "Kopi Hitam",
        "variant_label": "Panas",
        "quantity": 2,
        "unit_price": 4000,
        "line_total": 8000,
        "confidence": 1.0
      },
      {
        "raw_item_text": "indomie telur 1",
        "matched_menu_item_id": "fd-03",
        "item_name": "Indomie Telur",
        "variant_label": "Standar",
        "quantity": 1,
        "unit_price": 11000,
        "line_total": 11000,
        "confidence": 1.0
      }
    ],
    "total_amount": 19000,
    "missing_fields": [],
    "assistant_message": "Draft penjualan berhasil dibuat. Mohon periksa item, varian, dan total sebelum menyimpan.",
    "requires_owner_confirmation": true
  }
  ```

> Untuk transaksi campuran (minuman + makanan), `predicted_category` adalah prediksi untuk keseluruhan kalimat. Kategori tiap item tetap mengikuti katalog menu saat draft disimpan.

> `payment_method` hanya diisi untuk draft penjualan (`INCOME_SALE`): `TUNAI`, `QRIS`, atau `TRANSFER`. Jika metode tidak ditulis, nilainya `TUNAI`. Nilai ini yang dipakai saat draft disimpan, bukan lagi hardcode tunai.

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

## 8. Implementasi Model AI Text-to-Draft & Perbandingan Model

Fitur input teks ke draft transaksi diimplementasikan di folder [`ai-service/`](./ai-service/) dengan **FastAPI + scikit-learn**. Alur lengkapnya:

```text
Next.js /ai-assistant
  -> POST /api/ai/parse-transactions (proxy Next.js)
  -> POST http://localhost:8000/api/v1/parse-transactions (FastAPI)
  -> pemecah teks per tanggal + parser aturan (item, qty, harga, nominal)
  -> model TF-IDF + linear classifier (kategori menu)
  -> daftar draft JSON (satu draft per tanggal/jenis)
  -> konfirmasi pemilik, lalu simpan semua draft valid
```

Endpoint singular `POST /api/v1/parse-transaction` tetap tersedia untuk kompatibilitas dengan klien lama.

### A. Dataset dan Skenario Evaluasi

Dataset latih dibangun dari **57 item menu resmi Warcoffe 13** (20 Minuman Kemasan, 23 Minuman Racikan/Sachet, 14 Makanan). Variasi kalimat mencakup nama item, kuantitas, prefix penjualan, varian suhu, harga eksplisit, deskripsi, dan typo ringan. Total data latih: **1.293 sampel**.

Evaluasi memakai metrik yang sama untuk kedua model:

1. **Random split 80/20** — variasi kalimat dengan item yang sudah dikenal model.
2. **Group split 80/20 berdasarkan item** — mengukur generalisasi ke nama menu yang belum pernah dilihat model.
3. **Manual test set 40 kalimat** — ditulis terpisah dan tidak dipakai saat training.
4. **5-fold StratifiedGroupKFold** — cross-validation dengan grup berupa item menu.

### B. Tabel Perbandingan Model

Angka berikut berasal dari eksekusi [`ai-service/notebooks/train_text_classifier.ipynb`](./ai-service/notebooks/train_text_classifier.ipynb) dengan seed 42, bukan estimasi.

| Model | Random Acc | Random Macro-F1 | Group Acc | Group Macro-F1 | Manual Acc | Manual Macro-F1 | CV Macro-F1 | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| TF-IDF (word + char n-gram) + Logistic Regression | 0.9846 | 0.9863 | 0.6792 | 0.6713 | 1.0000 | 1.0000 | 0.6977 ± 0.1359 | 0.12 ms/sample |
| TF-IDF (word + char n-gram) + Linear SVC | 0.9807 | 0.9829 | 0.6528 | 0.6591 | 1.0000 | 1.0000 | 0.6943 ± 0.1328 | 0.11 ms/sample |

### C. Model Terpilih dan Alasannya

Model yang dipakai service: **TF-IDF (word + char n-gram) + Logistic Regression**.

1. Pada manual test set kedua model sama-sama mencapai macro-F1 **1.0000**, sehingga pemilihan dilanjutkan ke skenario yang lebih ketat.
2. Pada group split (nama menu yang belum pernah dilihat), Logistic Regression lebih tinggi: **0.6713** vs **0.6591** macro-F1.
3. Pada random split, Logistic Regression juga lebih tinggi: **0.9863** vs **0.9829** macro-F1.
4. Logistic Regression menyediakan `predict_proba`, sehingga confidence dapat ditampilkan langsung di UI.
5. Latency kedua model sama-sama di bawah 1 ms/sample; selisih 0.01 ms tidak relevan untuk skala warung.

Group split lebih rendah dari random split karena model diuji pada nama menu yang benar-benar baru. Ini tetap jauh lebih baik daripada tebakan acak 3 kelas (sekitar 0.33 accuracy).

### D. Tanggal Transaksi Mengikuti Teks

Tanggal tidak lagi selalu dianggap hari ini. Parser membaca tanggal dari text box dan mengosongkannya dari teks sebelum pencocokan item, sehingga item tetap dikenali. Format yang didukung antara lain:

- `hari ini`, `kemarin`, `besok`, `kemarin lusa`, `besok lusa`
- `3 hari lalu`, `2 hari lagi`, `minggu lalu`, `bulan depan`, `tahun depan`
- `tanggal 25` / `tgl 25` (bulan berjalan)
- `20 November 2026`, `20 Nov 2026`, `20 Desember`
- `20/11/2026`, `20-11-26`, `2026-11-20`, `tgl 20/11/2026`

Contoh: `"laku Kopi Liong panas 2 tanggal 20 November 2026"` menghasilkan `transaction_date: "2026-11-20"` dan item **Kopi Liong** tetap terdeteksi. Tanggal tidak valid seperti `31/02/2026` diabaikan dan jatuh ke tanggal hari ini.

Saat pemilik menekan **Simpan Semua Draft Valid**, tanggal draft dipakai untuk transaksi penjualan (`transactionDate`) maupun pengeluaran (`expense_date`), sehingga tanggal yang tersimpan tidak lagi selalu tanggal hari ini.

### E. Metode Pembayaran Mengikuti Teks

Draft penjualan kini membaca metode pembayaran dari kalimat:

- `tunai`, `cash`, `kontan` → `TUNAI`
- `qris`, `qr`, `scan qr`, `qr code` → `QRIS`
- `transfer`, `transfer bank`, `tf` → `TRANSFER`

Contoh:

| Kalimat | `payment_method` |
|---|---|
| `terjual 5 kopi liong qris` | `QRIS` |
| `laku 2 kopi liong transfer bank` | `TRANSFER` |
| `terjual 5 kopi liong` | `TUNAI` (default) |

Frasa metode pembayaran dibuang sebelum pencocokan item, sehingga nama item dan kuantitas tetap terbaca. Nilai `payment_method` ditampilkan pada pratinjau draft dan dipakai saat transaksi penjualan disimpan—tidak lagi selalu `TUNAI`.

### F. Input Beberapa Tanggal Sekaligus

Satu text box dapat memuat beberapa tanggal:

```text
10 november terjual 5 kopi
7 november terjual 3 indomie
```

Hasilnya dua draft terpisah:

| Tanggal | Jenis | Item | Total |
|---|---|---|---:|
| `2026-11-10` | Penjualan | Kopi Hitam ×5 | Rp20.000 |
| `2026-11-07` | Penjualan | Indomie ×3 | sesuai harga katalog |

Aturan pemecahan:

1. Baris baru dan tanda `;` memisahkan baris input.
2. Setiap kemunculan tanggal memulai draft baru.
3. Baris tanpa tanggal setelah baris bertanggal mengikuti tanggal terakhir.
4. Teks sebelum tanggal pertama memakai tanggal hari ini.
5. Tanggal, jenis transaksi, dan metode pembayaran yang sama digabung menjadi satu draft; item yang sama dijumlahkan.
6. Penjualan dan pengeluaran pada tanggal yang sama tetap menjadi dua draft karena disimpan ke tabel berbeda.
7. Penjualan pada tanggal yang sama dengan metode pembayaran berbeda juga tetap menjadi dua draft.
8. Maksimal 20 draft ditampilkan per request; pecah input bila jumlahnya lebih banyak.

Tombol **Simpan Semua Draft Valid** menyimpan semua draft berstatus `SUCCESS` secara berurutan. Draft `INCOMPLETE`/`OUT_OF_CONTEXT` tidak disimpan dan tetap tampil. Jika hanya sebagian draft yang gagal, teks input diisi ulang hanya dengan potongan teks draft yang belum tersimpan agar tidak terjadi duplikasi saat parse ulang.

### G. Menjalankan dan Menguji

```bash
# terminal 1 — service AI
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# terminal 2 — Next.js
npm run dev
```

```bash
cd ai-service
pytest -q                 # 47 test
python scripts/train_model.py
```

Model artifacts dan metadata tersimpan di [`ai-service/models/`](./ai-service/models/). Detail dataset, endpoint, dan format response ada di [`ai-service/README.md`](./ai-service/README.md).

---

## 9. Deployment ke Vercel

Proyek telah dilengkapi dengan [`vercel.json`](./vercel.json):
1. Push repositori ke GitHub.
2. Import proyek di dashboard [Vercel](https://vercel.com).
3. Tambahkan Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `AI_SERVICE_URL`).
4. Klik **Deploy**.
