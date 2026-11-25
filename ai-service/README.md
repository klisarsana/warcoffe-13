# Warcoffe 13 — AI Text-to-Draft & Business Chat Service

Service Python/FastAPI yang mengubah kalimat transaksi sehari-hari menjadi **draft transaksi** yang wajib dikonfirmasi pemilik sebelum disimpan ke database, serta menjawab pertanyaan bisnis dari ringkasan data.

Model utama memakai **TF-IDF (word + char n-gram)** dengan classifier linear untuk memprediksi kategori menu:

- `Minuman Kemasan`
- `Minuman Racikan / Sachet`
- `Makanan`

Ekstraksi nama item, kuantitas, harga, tanggal, nominal pengeluaran, dan kategori pengeluaran ditangani oleh parser berbasis aturan. Endpoint `POST /api/v1/chat` memakai Gemini untuk menjawab pertanyaan bisnis dari `context_summary`; jika Gemini gagal atau API key tidak tersedia, service memakai fallback aturan deterministik. Service tetap dapat berjalan tanpa API key, tetapi jawaban chat akan selalu memakai fallback.

---

## 1. Struktur

```text
ai-service/
├── app/
│   ├── api/v1/                 # Endpoint FastAPI (/health, /parse-transaction, /chat)
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

Dari root repository:

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Konfigurasi Gemini bersifat opsional. Salin `.env.example` menjadi `.env` (atau `.env.local`) lalu isi:

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.8-flash
GEMINI_TIMEOUT_SECONDS=8
GEMINI_TOTAL_BUDGET_SECONDS=10
GEMINI_MAX_OUTPUT_TOKENS=512
```

Tanpa `GEMINI_API_KEY`, endpoint chat tetap merespons memakai fallback aturan.

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

Cakupan tes:

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
- Gemini 3.x tidak memakai `temperature`, `top_p`, atau `top_k`; konfigurasi thinking memakai `thinking_level=LOW` agar kompatibel dengan model utama dan cadangan.
- Model artifact dibuat ulang dengan `python scripts/train_model.py`; jangan mengedit `model_metadata.json` secara manual.
