# Model Artifacts

Folder ini berisi model hasil training:

- `tfidf_logreg.joblib` — TF-IDF (word + char n-gram) + Logistic Regression
- `tfidf_linearsvc.joblib` — TF-IDF (word + char n-gram) + Linear SVC
- `best_model.joblib` — model terpilih, dipakai oleh service
- `model_metadata.json` — metrik, kelas, versi library, dan alasan pemilihan

Buat ulang dengan:

```bash
cd ai-service
python scripts/train_model.py
```

Atau jalankan notebook:

```bash
jupyter notebook notebooks/train_text_classifier.ipynb
```
