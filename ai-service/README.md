# Warcoffe 13 — AI Text-to-Draft & Business Chat Service

Service Python/FastAPI yang mengubah kalimat transaksi sehari-hari menjadi **draft transaksi** yang wajib dikonfirmasi pemilik sebelum disimpan ke database, serta menjawab pertanyaan bisnis dari ringkasan data.

Model utama memakai **TF-IDF (word + char n-gram)** dengan classifier linear untuk memprediksi kategori menu:

- `Minuman Kemasan`
- `Minuman Racikan / Sachet`
- `Makanan`

Ekstraksi nama item, kuantitas, harga, tanggal, nominal pengeluaran, dan kategori pengeluaran ditangani oleh parser berbasis aturan. Endpoint `POST /api/v1/chat` memakai Gemini untuk menjawab pertanyaan bisnis dari `context_summary`; jika Gemini gagal atau API key tidak tersedia, service memakai fallback aturan deterministik. Service tetap dapat berjalan tanpa API key, tetapi jawaban chat akan selalu memakai fallback.

**Dokumen ini untuk:** AI Engineer, Data Scientist, atau developer yang mengelola service AI. Untuk gambaran aplikasi dan deployment website, lihat [README utama](../README.md) dan [Panduan Deployment](../docs/DEPLOYMENT.md).

---

## Daftar Isi

- [1. Struktur](#1-struktur)
- [2. Setup](#2-setup)
- [3. Training Model](#3-training-model)
- [4. Menjalankan Service](#4-menjalankan-service)
- [5. Endpoint Parse Transaksi (Singular)](#5-endpoint-post-apiv1parse-transaction-singular)
- [5b. Endpoint Parse Transaksi (Multi-Tanggal)](#5b-endpoint-post-apiv1parse-transactions-multi-tanggal)
- [6. Endpoint Chat](#6-endpoint-post-apiv1chat)
- [7. Notebook](#7-notebook)
- [8. Tests](#8-tests)
- [9. Catatan & Batasan](#9-catatan--batasan)
- [10. Deployment & Hosting](#10-deployment--hosting)
- [11. Troubleshooting](#11-troubleshooting)
- [12. Keamanan](#12-keamanan)
- [13. Dokumentasi Terkait](#13-dokumentasi-terkait)

---

## 1. Struktur

```text
ai-service/
├── app/
│   ├── api/v1/                 # Endpoint FastAPI (health, parse-transaction(s), chat)
│   ├── core/config.py          # Konfigurasi path & environment
│   ├── ml/
│   │   ├── catalog.py          # Load katalog menu
│   │   ├── dataset.py          # Generator dataset sintetis
│   │   ├── predictor.py        # Load model & inference
│   │   └── training.py         # Training, evaluasi, perbandingan model
│   ├── parsers/                # Parser uang, kuantitas, tanggal
│   ├── schemas/                # Pydantic request/response
│   ├── services/               # Intent, chat Gemini + fallback, menu matcher
│   └── main.py                 # Entry point FastAPI
├── data/
│   ├── menu_catalog.json       # 57 item menu (hasil export dari seed TypeScript)
│   └── manual_test_samples.csv # 40 kalimat uji manual (tidak dipakai training)
├── models/                     # Artifact model + metadata
├── notebooks/
│   └── train_text_classifier.ipynb
├── scripts/
│   ├── build_dataset.py
│   └── train_model.py
├── tests/
└── requirements.txt
```

---

## 2. Setup

### Prasyarat

- **Python 3.12+**. Environment pengembangan saat ini memakai Python 3.15.2; `numpy 2.5.5` mensyaratkan Python >= 3.12.
- pip dan virtual environment.
- Tidak perlu API key untuk menjalankan fitur inti. `GEMINI_API_KEY` hanya diperlukan jika ingin chat berbasis Gemini.

### Instalasi

Dari root repository:

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Environment variables

Salin `.env.example` menjadi `.env` (atau `.env.local`), lalu isi sesuai kebutuhan:

| Variabel | Wajib? | Default | Deskripsi |
|---|---|---|---|
| `GEMINI_API_KEY` | Opsional | kosong | API key Gemini untuk chat. Tanpa ini, chat memakai fallback aturan. |
| `GEMINI_MODEL` | Opsional | `gemini-3.5-flash-lite` | Model utama chat. |
| `GEMINI_FALLBACK_MODEL` | Opsional | `gemini-3.8-flash` | Model cadangan saat model utama gagal/429. |
| `GEMINI_TIMEOUT_SECONDS` | Opsional | `8` | Timeout satu percobaan Gemini. |
| `GEMINI_TOTAL_BUDGET_SECONDS` | Opsional | `10` | Total anggaran chat; lebih rendah dari timeout proxy Next.js (12 detik). |
| `GEMINI_MAX_OUTPUT_TOKENS` | Opsional | `512` | Batas output Gemini. |
| `ALLOWED_ORIGINS` | Opsional | `http://localhost:3000,http://127.0.0.1:3000` | Origin yang diizinkan untuk CORS. Isi domain Vercel jika service dipanggil langsung dari browser. |
| `TIMEZONE` | Opsional | `Asia/Jakarta` | Zona waktu parser tanggal. |
| `MENU_MATCH_THRESHOLD` | Opsional | `80` | Ambang pencocokan nama menu (0–100). |
| `AI_DATA_DIR` | Opsional | `ai-service/data` | Lokasi katalog dan dataset. |
| `AI_MODEL_DIR` | Opsional | `ai-service/models` | Lokasi artifact model. |

Contoh `.env`:

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.8-flash
GEMINI_TIMEOUT_SECONDS=8
GEMINI_TOTAL_BUDGET_SECONDS=10
GEMINI_MAX_OUTPUT_TOKENS=512
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
TIMEZONE=Asia/Jakarta
```

Tanpa `GEMINI_API_KEY`, endpoint chat tetap merespons memakai fallback aturan.

### Export ulang katalog

Export ulang katalog menu jika `src/lib/menu-seed-data.ts` berubah:

```bash
# dari root repository
npm run ai:export-catalog
```

---

## 3. Training Model

```bash
cd ai-service
python scripts/build_dataset.py   # opsional: buat data/training_samples.csv
python scripts/train_model.py
```

Output:

- `models/tfidf_logreg.joblib`
- `models/tfidf_linearsvc.joblib`
- `models/best_model.joblib`
- `models/model_metadata.json`

Dataset latih dibuat dari 57 item menu resmi. Setiap item menghasilkan variasi kalimat: nama saja, nama + kuantitas, prefix penjualan, varian suhu, harga eksplisit, deskripsi, dan typo ringan. Total data latih: **1.293 sampel**.

Evaluasi memakai tiga skenario:

1. **Random split 80/20** — variasi kalimat dengan item yang sudah pernah dilihat model.
2. **Group split 80/20 berdasarkan item** — mengukur generalisasi ke nama menu yang belum pernah dilihat model.
3. **Manual test set 40 kalimat** — ditulis terpisah dan tidak dipakai saat training.

Ditambah **5-fold StratifiedGroupKFold** dengan grup berupa item menu untuk menghindari kebocoran data.

### Hasil perbandingan model

Angka di bawah berasal dari eksekusi notebook `notebooks/train_text_classifier.ipynb` (seed 42).

| Model | Random Acc | Random Macro-F1 | Group Acc | Group Macro-F1 | Manual Acc | Manual Macro-F1 | CV Macro-F1 | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| TF-IDF (word + char n-gram) + Logistic Regression | 0.9846 | 0.9863 | 0.6792 | 0.6713 | 1.0000 | 1.0000 | 0.6977 ± 0.1359 | 0.12 ms/sample |
| TF-IDF (word + char n-gram) + Linear SVC | 0.9807 | 0.9829 | 0.6528 | 0.6591 | 1.0000 | 1.0000 | 0.6943 ± 0.1328 | 0.11 ms/sample |

### Model terpilih

**TF-IDF (word + char n-gram) + Logistic Regression**

Alasan:

1. Manual test set menghasilkan macro-F1 yang sama (1.0000), sehingga pemilihan dilanjutkan ke skenario yang lebih ketat.
2. Group split (nama menu yang belum pernah dilihat) lebih tinggi: **0.6713** vs **0.6591** macro-F1.
3. Random split juga lebih tinggi: **0.9863** vs **0.9829** macro-F1.
4. Logistic Regression menyediakan `predict_proba`, sehingga confidence dapat ditampilkan langsung di UI.
5. Latency kedua model sama-sama di bawah 1 ms/sample, jadi selisih 0.01 ms tidak relevan untuk skala warung.

Nilai group split lebih rendah dari random split karena model diuji pada nama menu yang benar-benar baru. Ini adalah skenario realistis ketika pemilik menambah menu baru, dan tetap jauh lebih baik daripada tebakan acak 3 kelas (sekitar 0.33 accuracy).

---

## 4. Menjalankan Service

```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/v1/health
```

Response:

```json
{
  "status": "ok",
  "service": "Warcoffe 13 AI Service",
  "version": "0.1.0",
  "model_loaded": true,
  "best_model": "TF-IDF (word + char n-gram) + Logistic Regression",
  "classes": ["Makanan", "Minuman Kemasan", "Minuman Racikan / Sachet"]
}
```

Di root repository, pastikan `.env.local` berisi:

```bash
AI_SERVICE_URL=http://localhost:8000
```

Lalu jalankan Next.js:

```bash
npm run dev
```

Alur integrasi:

```text
Next.js /ai-assistant
  -> POST /api/ai/parse-transactions (proxy Next.js)
  -> POST http://localhost:8000/api/v1/parse-transactions
  -> pemecah teks per tanggal
  -> parser aturan + model kategori per blok
  -> daftar draft JSON
  -> konfirmasi pemilik & simpan semua draft valid

Next.js chat bisnis
  -> POST /api/ai/chat (proxy Next.js)
  -> POST http://localhost:8000/api/v1/chat
  -> Gemini (model utama, lalu model cadangan saat 429)
  -> fallback aturan bila LLM gagal
```

Endpoint singular tetap tersedia untuk kompatibilitas.

---

## 5. Endpoint `POST /api/v1/parse-transaction` (Singular)

Request:

```json
{
  "text": "laku Kopi Liong panas 2, Indomie Telur 1",
  "menu_catalog_hints": ["Kopi Liong", "Indomie Telur"]
}
```

Response sukses penjualan:

```json
{
  "status": "SUCCESS",
  "draft_type": "INCOME_SALE",
  "predicted_category": "Makanan",
  "classifier_model_used": "TF-IDF (word + char n-gram) + Logistic Regression",
  "confidence_score": 0.5096,
  "transaction_date": "2026-11-21",
  "payment_method": "TUNAI",
  "items": [
    {
      "raw_item_text": "laku kopi liong panas 2",
      "matched_menu_item_id": "mr-06",
      "item_name": "Kopi Liong",
      "variant_label": "Panas",
      "quantity": 2,
      "unit_price": 5000,
      "line_total": 10000,
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
  "total_amount": 21000,
  "expense_description": null,
  "missing_fields": [],
  "assistant_message": "Draft penjualan berhasil dibuat. Mohon periksa item, varian, dan total sebelum menyimpan.",
  "requires_owner_confirmation": true
}
```

Response pengeluaran:

```json
{
  "status": "SUCCESS",
  "draft_type": "EXPENSE",
  "predicted_category": "Gas, Listrik & Air",
  "classifier_model_used": "expense-keyword-rules-v1",
  "confidence_score": 0.8,
  "transaction_date": "2026-11-21",
  "payment_method": null,
  "items": [],
  "total_amount": 35000,
  "expense_description": "beli gas elpiji dan es batu",
  "missing_fields": [],
  "assistant_message": "Draft pengeluaran berhasil dibuat. Mohon periksa kategori dan nominal sebelum menyimpan.",
  "requires_owner_confirmation": true
}
```

Status yang mungkin:

| Status | HTTP | Arti |
|---|---:|---|
| `SUCCESS` | 200 | Draft lengkap dan siap dikonfirmasi pemilik |
| `INCOMPLETE` | 200 | Ada data yang kurang; lihat `missing_fields` dan `assistant_message` |
| `OUT_OF_CONTEXT` | 200 | Teks bukan transaksi penjualan/pengeluaran |
| `SERVICE_UNAVAILABLE` | 200 | Kegagalan internal service; UI menyarankan input manual |

Status bisnis sengaja mengembalikan HTTP 200 agar proxy Next.js tidak mengubahnya menjadi error 502. Hanya request tidak valid (misalnya `text` kosong) yang menghasilkan HTTP 422.

---

## 5b. Endpoint `POST /api/v1/parse-transactions` (Multi-Tanggal)

Endpoint ini menerima beberapa baris transaksi dan mengembalikan `drafts` per tanggal/jenis. Panjang `text` maksimal 4.000 karakter.

Request:

```json
{
  "text": "10 november terjual 5 kopi\n7 november terjual 3 indomie",
  "menu_catalog_hints": ["Kopi Hitam", "Indomie Rebus"]
}
```

Response:

```json
{
  "status": "SUCCESS",
  "drafts": [
    {
      "status": "SUCCESS",
      "draft_type": "INCOME_SALE",
      "transaction_date": "2026-11-10",
      "payment_method": "TUNAI",
      "source_text": "10 november, terjual 5 kopi",
      "items": [
        {
          "item_name": "Kopi Hitam",
          "quantity": 5,
          "unit_price": 4000,
          "line_total": 20000
        }
      ],
      "total_amount": 20000,
      "assistant_message": "Draft penjualan berhasil dibuat.",
      "requires_owner_confirmation": true
    },
    {
      "status": "SUCCESS",
      "draft_type": "INCOME_SALE",
      "transaction_date": "2026-11-07",
      "payment_method": "TUNAI",
      "source_text": "7 november, terjual 3 indomie",
      "items": [
        {
          "item_name": "Indomie Rebus",
          "quantity": 3,
          "unit_price": 7000,
          "line_total": 21000
        }
      ],
      "total_amount": 21000,
      "assistant_message": "Draft penjualan berhasil dibuat.",
      "requires_owner_confirmation": true
    }
  ],
  "assistant_message": "2 draft transaksi berhasil dibuat.",
  "requires_owner_confirmation": true
}
```

Aturan:

- Baris baru dan `;` memisahkan baris input.
- Setiap tanggal memulai blok baru; teks sebelum tanggal pertama memakai tanggal hari ini.
- Baris tanpa tanggal setelah blok bertanggal mengikuti tanggal terakhir.
- Tanggal, jenis transaksi, dan metode pembayaran yang sama digabung; item yang sama dijumlahkan.
- Penjualan dan pengeluaran pada tanggal yang sama menjadi draft terpisah.
- Penjualan pada tanggal yang sama dengan metode pembayaran berbeda juga menjadi draft terpisah.
- Metode pembayaran penjualan dibaca dari teks; default `TUNAI` bila tidak ditulis.
- Status agregat: `SUCCESS`, `PARTIAL`, `INCOMPLETE`, `OUT_OF_CONTEXT`, atau `SERVICE_UNAVAILABLE`.
- Maksimal 20 draft dikembalikan per request.

`source_text` menyimpan potongan input asal draft. UI memakainya untuk mengisi ulang text box hanya dengan draft yang belum berhasil disimpan.

### Format tanggal yang didukung

Tanggal transaksi diambil dari teks yang dikirim, bukan selalu tanggal hari ini. Contoh yang sudah didukung:

| Ditulis di text box | `transaction_date` |
|---|---|
| `hari ini` | tanggal hari ini |
| `kemarin`, `besok`, `kemarin lusa`, `besok lusa` | tanggal relatif |
| `3 hari lalu`, `2 hari lagi` | tanggal relatif |
| `minggu lalu`, `minggu depan`, `bulan lalu`, `tahun depan` | tanggal relatif |
| `tanggal 25` / `tgl 25` | tanggal 25 pada bulan berjalan |
| `20 November 2026`, `20 Nov 2026`, `20 Desember` | tanggal eksplisit |
| `20/11/2026`, `20-11-26`, `2026-11-20` | tanggal eksplisit |
| `tgl 20/11/2026` | tanggal eksplisit dengan prefix |

Frasa tanggal dibuang dari teks sebelum pencocokan item, sehingga `"laku Kopi Liong panas 2 tanggal 20 November 2026"` tetap menghasilkan item **Kopi Liong** dan tanggal **2026-11-20**. Tanggal yang tidak valid (misalnya `31/02/2026`) diabaikan dan jatuh ke tanggal hari ini.

### Format metode pembayaran yang didukung

`payment_method` hanya diisi untuk draft penjualan (`INCOME_SALE`). Draft pengeluaran mengembalikan `null` karena metode pembayaran tidak disimpan pada tabel pengeluaran.

| Ditulis di text box | `payment_method` |
|---|---|
| `tunai`, `cash`, `kontan` | `TUNAI` |
| `qris`, `qr`, `scan qr`, `qr code` | `QRIS` |
| `transfer`, `transfer bank`, `tf` | `TRANSFER` |
| tidak ditulis | `TUNAI` (default) |

Frasa metode pembayaran dan kata penghubung seperti `via`/`pakai` dibuang sebelum pencocokan item. Contoh: `"terjual 5 kopi liong qris"` menghasilkan item **Kopi Liong** dengan kuantitas 5 dan `payment_method: "QRIS"`.

---

## 6. Endpoint `POST /api/v1/chat`

Request:

```json
{
  "question": "Berapa omzet bulan ini?",
  "context_summary": {
    "current_month": "2026-11",
    "monthly_revenue": 150000,
    "monthly_expenses": 45000,
    "net_difference": 105000,
    "transaction_count": 12,
    "top_selling_items": [
      { "name": "Kopi Liong", "qty": 10, "revenue": 50000 }
    ],
    "low_stock_items": [
      { "name": "Gula", "current_stock": 2, "min_threshold": 5 }
    ]
  }
}
```

Response sukses Gemini:

```json
{
  "status": "SUCCESS",
  "answer": "Omzet Warcoffe 13 pada bulan November 2026 adalah Rp150.000.",
  "referenced_metrics": ["monthly_revenue", "current_month"]
}
```

Perilaku:

- `status` hanya `SUCCESS` atau `OUT_OF_CONTEXT`; `referenced_metrics` hanya berisi key yang benar-benar dipakai dari `context_summary`.
- Model utama memakai `thinking_level=MINIMAL` (level terendah yang didukung SDK dan model); model cadangan memakai `LOW`. Parameter `temperature`, `top_p`, dan `top_k` tidak dipakai.
- Anggaran total chat 10 detik (`GEMINI_TOTAL_BUDGET_SECONDS`), lebih rendah dari batas 12 detik proxy Next.js. Setiap percobaan hanya memakai sisa anggaran; jika tersisa ≤2 detik, percobaan berikutnya dilewati dan fallback aturan langsung dipakai.
- Retry satu kali hanya untuk error sementara dan jika waktu masih cukup. Model cadangan hanya dicoba untuk 429 atau error model, bukan untuk timeout.
- Setiap panggilan Gemini dicatat dengan model, durasi (ms), dan hasil (`success`/`timeout`/`429`/`error`); payload dan API key tidak dicatat.
- `error_code` pada respons fallback:
  - `LLM_QUOTA`: model utama dan model cadangan sama-sama 429.
  - `LLM_TIMEOUT`: timeout atau anggaran habis.
  - `LLM_FALLBACK`: kegagalan lain, termasuk output tidak valid setelah retry.
- Respons sukses Gemini tidak membawa `error_code`. Status bisnis tetap HTTP 200; hanya request tidak valid (misalnya `question` kosong) yang menghasilkan HTTP 422.

---

## 7. Notebook

Buka dan jalankan:

```bash
cd ai-service
jupyter notebook notebooks/train_text_classifier.ipynb
```

Notebook memuat:

- distribusi dataset dan contoh sampel,
- arsitektur kedua pipeline,
- training + evaluasi tiga skenario,
- tabel perbandingan model,
- classification report dan confusion matrix,
- alasan pemilihan model,
- uji inference model tersimpan.

Notebook memakai modul bersama di `app/ml/` agar logika training tidak terduplikasi.

---

## 8. Tests

```bash
cd ai-service
pytest -q
```

Saat ini service AI memiliki **96 test**. Cakupan tes:

- format uang (`Rp35.000`, `35rb`, `35k`, `35000`),
- kuantitas (`2x`, `dua`, `3 porsi`),
- tanggal (`hari ini`, `kemarin`, `20/11/2026`),
- pencocokan nama menu termasuk typo (`indomi telor`),
- intent penjualan/pengeluaran/out-of-context,
- endpoint API untuk status `SUCCESS`, `INCOMPLETE`, `OUT_OF_CONTEXT`,
- endpoint multi-tanggal: dua tanggal, tanggal sama digabung, penjualan dan pengeluaran pada tanggal yang sama, baris tanpa tanggal, serta status `PARTIAL`,
- metode pembayaran `TUNAI`/`QRIS`/`TRANSFER`, default tunai, dan pemisahan draft penjualan dengan metode berbeda pada tanggal yang sama,
- prediksi model pada contoh jelas,
- chat fallback deterministik,
- chat Gemini: sukses, out-of-context, JSON rusak, exception, timeout, kuota, perpindahan ke model cadangan, dan API key tidak ada.

---

## 9. Catatan & Batasan

- Dataset latih bersifat sintetis dan dibangun dari 57 menu resmi. Akurasi pada kalimat nyata perlu dipantau dan dataset dapat ditambah dari koreksi pemilik.
- Model hanya memprediksi kategori menu. Nama item dan harga tetap diverifikasi lewat pencocokan katalog + aturan; UI menampilkan hasilnya untuk dikonfirmasi pemilik.
- Teks penjualan campuran (misalnya minuman + makanan) hanya memiliki satu `predicted_category`. Nilai ini adalah prediksi untuk keseluruhan kalimat; kategori tiap item tetap diambil dari katalog saat disimpan.
- Endpoint chat memakai Gemini dengan fallback aturan. Simpan `GEMINI_API_KEY` di `.env` atau `.env.local`; jangan commit file tersebut. Tanpa API key, chat tetap berjalan memakai fallback.
- Model default adalah `gemini-3.5-flash-lite` dengan cadangan `gemini-3.8-flash`. Jika sebuah model dihentikan oleh Google, perbarui `GEMINI_MODEL`/`GEMINI_FALLBACK_MODEL`; fallback aturan tetap menjaga endpoint merespons.
- Gemini 3.x tidak memakai `temperature`, `top_p`, atau `top_k`. Model utama memakai `thinking_level=MINIMAL` (level terendah yang didukung model utama); model cadangan memakai `LOW` karena menolak `MINIMAL`.
- Model artifact dibuat ulang dengan `python scripts/train_model.py`; jangan mengedit `model_metadata.json` secara manual.
- Service ini tidak menyimpan data transaksi. Data bisnis tetap disimpan oleh Next.js/Supabase; service AI hanya memproses teks dan mengembalikan draft.
- Service AI belum memiliki autentikasi bawaan. Jika endpoint diekspos ke publik, tambahkan token/rate limit di depan service.

---

## 10. Deployment & Hosting

Service AI adalah aplikasi Python/FastAPI yang berjalan sebagai proses server. Service ini **tidak ikut di-deploy ke project Next.js di Vercel**. Deploy ke host Python terpisah, lalu hubungkan lewat `AI_SERVICE_URL` di Vercel.

### 10.1 Pilihan hosting

| Host | Gratis permanen? | RAM | Tidur / cold start | Catatan |
|---|---:|---:|---|---|
| **Hugging Face Spaces (Docker, CPU Basic)** | Ya | 16 GB | Tidur setelah ±48 jam tidak aktif | Paling cocok untuk beban ML; Space publik; port 7860 |
| **Render Free Web Service** | Ya | 512 MB | Tidur setelah ±15 menit | Mudah; RAM ketat; cold start bisa 30–60 detik |
| **Koyeb Free** | Ya (cek kuota) | 512 MB | Scale-to-zero | Ringan; cocok untuk demo kecil |
| **Google Cloud Run** | Kuota gratis bulanan | 512 MB–1 GB | Scale-to-zero | Perlu billing account/kartu |
| **Oracle Cloud Always Free** | Ya | Hingga 24 GB (ARM) | Tidak tidur | Perlu kartu verifikasi; setup lebih berat |
| **Railway** | Tidak permanen | Bervariasi | Bervariasi | Trial credit; setelah habis perlu bayar |
| **Vercel Python Functions** | Ya (Hobby) | Terbatas | Cold start | Perlu project terpisah dan adaptasi; tidak disarankan |

> **Kombinasi full gratis:** Hugging Face Spaces CPU Basic untuk service AI, tanpa `GEMINI_API_KEY` (chat memakai fallback aturan). Jika memakai Gemini free tier, pantau kuota/rate limit.

> Free tier bisa berubah. Cek ulang ketentuan provider sebelum demo.

### 10.2 Hugging Face Spaces (rekomendasi gratis)

1. Buat **New Space** → **Docker** → **CPU Basic**.
2. Gunakan Space publik. Jangan menyimpan secret di repository.
3. Tambahkan `Dockerfile` di folder `ai-service/`:

```dockerfile
FROM python:3.13-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

> Sesuaikan tag Python dengan versi yang didukung dependency. Environment pengembangan memakai Python 3.15.2; jika `3.13-slim` tidak cocok, gunakan versi lain yang tersedia dan pastikan `pip install` berhasil.
>
> `requirements.txt` saat ini juga memuat dependency testing/notebook (`pytest`, `ipykernel`, dll.). Untuk image produksi yang lebih kecil, pisahkan dependency runtime dan development.

4. Di **Settings → Variables and secrets**, tambahkan:

```text
GEMINI_API_KEY=<secret>
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.8-flash
ALLOWED_ORIGINS=https://domain-vercel-kamu.vercel.app
TIMEZONE=Asia/Jakarta
```

5. Tes health check:

```bash
curl https://<nama-space>.hf.space/api/v1/health
```

6. Isi `AI_SERVICE_URL` di Vercel dengan URL Space tersebut.

Catatan:

- Space publik berarti kode dan endpoint bisa dilihat orang. Gunakan **Secrets** untuk API key.
- Free tier tidur setelah sekitar 48 jam tidak aktif.
- Jangan commit `.env` atau file berisi secret.

### 10.3 Render Free Web Service

1. Buat **New Web Service** dari repository GitHub.
2. **Root Directory:** `ai-service`.
3. **Build Command:** `pip install -r requirements.txt`.
4. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. **Health Check Path:** `/api/v1/health`.
6. Tambahkan environment variables seperti bagian 10.2.
7. Deploy dan tes health check.

Catatan:

- RAM 512 MB bisa ketat saat model dan dependency dimuat. Pantau log OOM.
- Service tidur setelah ±15 menit tidak aktif; request pertama bisa 30–60 detik.
- Hangatkan service sebelum demo.

### 10.4 Oracle Cloud Always Free

Cocok jika ingin service selalu aktif:

1. Buat VM Ampere A1 dengan konfigurasi Always Free.
2. Install Python, clone repository, buat virtual environment, dan install `requirements.txt`.
3. Jalankan service dengan systemd atau Docker.
4. Pasang reverse proxy HTTPS (Nginx/Caddy).
5. Isi `AI_SERVICE_URL` dengan domain HTTPS tersebut.

Keunggulan: selalu aktif dan RAM besar. Kekurangan: setup, patching, dan monitoring menjadi tanggung jawab sendiri.

### 10.5 Cloud Run, Railway, dan Vercel Python

- **Cloud Run:** cocok jika sudah memakai Google Cloud. Perlu billing account dan container image.
- **Railway:** mudah, tetapi bukan free tier permanen; trial credit akan habis.
- **Vercel Python Functions:** perlu project terpisah, adapter `api/index.py`, rewrite, dan pengurangan dependency. Risiko bundle besar, cold start, dan batas durasi. Tidak disarankan untuk service ini.

### 10.6 Menghubungkan ke Vercel

Setelah service online:

```text
AI_SERVICE_URL=https://domain-service-ai
NEXT_PUBLIC_AI_SERVICE_URL=https://domain-service-ai
```

Redeploy Vercel. Route proxy Next.js memakai timeout 12–15 detik; jika perlu, tambahkan `export const maxDuration = 30` pada route AI di Next.js dan pastikan batas Max Duration Vercel lebih besar.

### 10.7 Checklist production service AI

- [ ] `GET /api/v1/health` mengembalikan `status: "ok"` dan `model_loaded: true`.
- [ ] Folder `models/` ikut ter-deploy.
- [ ] `GEMINI_API_KEY` hanya ada di secret host.
- [ ] `ALLOWED_ORIGINS` diisi domain Vercel jika dipanggil langsung dari browser.
- [ ] Service tidak tidur saat demo (atau sudah dihangatkan).
- [ ] Endpoint tidak diekspos tanpa proteksi jika dipakai untuk production.
- [ ] Log tidak memuat API key atau payload sensitif.

---

## 11. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Health check `degraded` / `model_loaded: false` | `best_model.joblib` atau metadata tidak ditemukan | Pastikan `models/` ikut ter-deploy dan `AI_MODEL_DIR` benar |
| Service gagal start: `ModuleNotFoundError` | Dependency belum terpasang | Jalankan `pip install -r requirements.txt` di environment yang benar |
| `Address already in use` | Port 8000 sudah dipakai | Hentikan proses lain atau pakai port berbeda |
| Build gagal saat install `numpy`/`pandas` | Versi Python tidak didukung | Gunakan Python 3.12+ dan image yang sesuai |
| Chat selalu fallback | `GEMINI_API_KEY` kosong atau model tidak tersedia | Isi API key, cek kuota/model, lihat log |
| Gemini 429 | Kuota/rate limit | Tunggu, gunakan model cadangan, atau fallback aturan |
| Chat timeout | Service lambat/cold start | Hangatkan service, naikkan timeout, cek koneksi |
| CORS error | `ALLOWED_ORIGINS` tidak memuat domain | Tambahkan domain Vercel ke `ALLOWED_ORIGINS` |
| Vercel 503 | `AI_SERVICE_URL` kosong/salah | Isi URL publik, redeploy Vercel |
| Vercel 502 | Service AI error/HTTP non-200 | Cek log service AI dan health check |
| Data draft tidak tersimpan | Draft `INCOMPLETE`/`OUT_OF_CONTEXT` | Perbaiki input, konfirmasi hanya draft valid |
| Model salah memprediksi kategori | Dataset sintetis/kalimat baru | Perbaiki katalog/parser; tambahkan data training |

---

## 12. Keamanan

- **Jangan commit secret.** `GEMINI_API_KEY` hanya di `.env`, secret host, atau environment variable.
- **Jangan taruh API key di repository Hugging Face.** Gunakan **Settings → Secrets**.
- **Service AI belum memiliki autentikasi bawaan.** Siapa pun yang tahu URL dapat memanggil endpoint. Untuk production, tambahkan shared token, verifikasi JWT Supabase, atau rate limit di depan service.
- **Batasi CORS** dengan `ALLOWED_ORIGINS` jika service dipanggil langsung dari browser. Jika hanya lewat proxy Next.js, CORS tidak wajib, tetapi tetap batasi akses.
- **Jangan log payload sensitif atau API key.** Service saat ini mencatat model, durasi, dan hasil, bukan payload/key.
- **Model dan dataset bukan data bisnis.** Data transaksi tetap disimpan di Supabase oleh aplikasi Next.js.
- **Pantau kuota Gemini.** Gunakan fallback aturan jika kuota habis.

---

## 13. Dokumentasi Terkait

- [README utama](../README.md) — gambaran project, modul, setup, keamanan.
- [Panduan Deployment](../docs/DEPLOYMENT.md) — deploy Vercel + Supabase + service AI, opsi gratis, troubleshooting.
- [Panduan Pengguna](../docs/PANDUAN_PENGGUNA.md) — panduan non-teknis untuk pemilik/staf.
- [Model Artifacts](./models/README.md) — file model dan cara membuat ulang.
- [Katalog menu](./data/menu_catalog.json) — 57 item menu untuk service AI.
- [Schema Supabase](../supabase/schema.sql) — tabel, grant, RLS.

---

*Terakhir diperbarui: 26 November 2026.*
