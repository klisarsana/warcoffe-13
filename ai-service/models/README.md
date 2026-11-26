# Model Artifacts

Folder ini berisi artifact model hasil training yang dipakai oleh service AI Warcoffe 13.

## File

| File | Fungsi |
|---|---|
| `tfidf_logreg.joblib` | Pipeline TF-IDF (word + char n-gram) + Logistic Regression |
| `tfidf_linearsvc.joblib` | Pipeline TF-IDF (word + char n-gram) + Linear SVC |
| `best_model.joblib` | Model terpilih yang dipakai service untuk inference |
| `model_metadata.json` | Metrik evaluasi, daftar kelas, versi library, dan alasan pemilihan model |

Ukuran total artifact sekitar 800 KB. File ini **harus ikut ter-commit dan ikut ter-deploy** agar service AI dapat memuat model.

## Membuat ulang model

Dari folder `ai-service`:

```bash
python scripts/train_model.py
```

Atau jalankan notebook:

```bash
jupyter notebook notebooks/train_text_classifier.ipynb
```

## Aturan

- Jangan mengedit `model_metadata.json` secara manual. File ini dihasilkan oleh proses training.
- Jika mengubah dataset, katalog menu, atau pipeline, latih ulang model dan commit artifact baru.
- Pastikan versi `scikit-learn`, `numpy`, dan `joblib` di environment training sama dengan environment deployment. Perbedaan versi besar dapat membuat artifact tidak bisa dimuat.
- Model hanya memprediksi **kategori menu**. Nama item, harga, kuantitas, tanggal, dan metode pembayaran tetap diverifikasi oleh parser dan katalog.
- Detail evaluasi dan perbandingan model ada di [README service AI](../README.md) dan notebook training.

## Dokumentasi terkait

- [README service AI](../README.md)
- [Panduan Deployment](../../docs/DEPLOYMENT.md)
- [README utama](../../README.md)

---

*Terakhir diperbarui: 26 November 2026.*
