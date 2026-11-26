# Panduan Pengguna Warcoffe 13

Panduan ini dibuat untuk **pemilik dan staf Warcoffe 13** yang memakai aplikasi sehari-hari. Tidak perlu memahami istilah teknis untuk mengikuti panduan ini.

> **Untuk developer/operator:** lihat [README utama](../README.md) dan [Panduan Deployment](./DEPLOYMENT.md).

---

## Daftar Isi

1. [Tentang Aplikasi](#1-tentang-aplikasi)
2. [Sebelum Mulai](#2-sebelum-mulai)
3. [Login dan Logout](#3-login-dan-logout)
4. [Dashboard](#4-dashboard)
5. [Kasir (POS)](#5-kasir-pos)
6. [Riwayat Transaksi](#6-riwayat-transaksi)
7. [Manajemen Menu](#7-manajemen-menu)
8. [Manajemen Stok](#8-manajemen-stok)
9. [Pengeluaran](#9-pengeluaran)
10. [Laporan Bulanan](#10-laporan-bulanan)
11. [AI Assistant](#11-ai-assistant)
12. [Audit Log](#12-audit-log)
13. [Mode Penyimpanan Data](#13-mode-penyimpanan-data)
14. [Alur Harian yang Disarankan](#14-alur-harian-yang-disarankan)
15. [FAQ & Troubleshooting](#15-faq--troubleshooting)
16. [Glosarium](#16-glosarium)
17. [Tips Keamanan](#17-tips-keamanan)

---

## 1. Tentang Aplikasi

Warcoffe 13 Management System membantu pemilik warung untuk:

- mencatat penjualan harian lewat kasir (POS),
- mencatat pengeluaran operasional,
- mengelola daftar menu dan harga,
- memantau stok sederhana,
- melihat rekap pemasukan, pengeluaran, dan selisih bersih setiap bulan,
- mengekspor laporan ke CSV/Excel,
- memakai AI untuk mengubah kalimat sehari-hari menjadi draft transaksi,
- melihat riwayat aktivitas perubahan data.

Aplikasi ini **bukan** laporan akuntansi formal. Angka yang tampil dihitung dari transaksi dan pengeluaran yang benar-benar dicatat.

---

## 2. Sebelum Mulai

Yang perlu disiapkan:

- Akun pemilik (email dan password) dari admin sistem.
- Browser modern: Chrome, Edge, Firefox, atau Safari versi terbaru.
- Koneksi internet.
- Untuk mencetak struk: printer atau opsi **Save as PDF** di browser.

Hal yang perlu diketahui:

- Aplikasi ini **khusus pemilik**; belum ada akun staf.
- Tidak ada menu registrasi publik. Akun dibuat oleh admin.
- Data bisa tersimpan di database pusat (Supabase) atau hanya di browser (mode lokal). Lihat [bagian 13](#13-mode-penyimpanan-data).

---

## 3. Login dan Logout

### Login

1. Buka alamat aplikasi.
2. Masukkan **email pemilik** dan **password**.
3. Klik **Masuk**.
4. Jika berhasil, Anda diarahkan ke **Dashboard**.

Jika muncul pesan:

- **“Email atau kata sandi salah”** → periksa kembali email/password.
- **“Konfigurasi Supabase Auth belum tersedia”** → hubungi admin; aplikasi belum dikonfigurasi.
- **“Alamat email pemilik belum dikonfirmasi”** → hubungi admin untuk konfirmasi akun.
- **“Terlalu banyak percobaan masuk”** → tunggu beberapa saat, lalu coba lagi.

### Logout

Klik tombol **Keluar** di sidebar atau menu. Selalu logout jika memakai komputer/browser bersama.

---

## 4. Dashboard

Dashboard memberi gambaran cepat kondisi warung:

- **Penjualan hari ini** — total penjualan pada tanggal hari ini.
- **Pemasukan bulan terpilih** — total pemasukan pada bulan yang dipilih.
- **Pengeluaran bulan terpilih** — total pengeluaran pada bulan yang dipilih.
- **Selisih bersih** — pemasukan dikurangi pengeluaran.
- **Jumlah transaksi** — banyaknya transaksi pada periode tersebut.
- **Grafik tren harian** — perbandingan pemasukan dan pengeluaran per hari.
- **Menu terlaris** — menu yang paling banyak terjual.
- **Peringatan stok menipis** — menu yang stoknya di bawah batas minimum.

Jika ada data bertanda **DEMO/UJI**, Dashboard akan menampilkan label peringatan. Data demo bisa disembunyikan di halaman Laporan.

---

## 5. Kasir (POS)

Gunakan halaman **Kasir (POS)** saat melayani pembeli.

### Langkah mencatat penjualan

1. Cari menu lewat kolom pencarian atau filter kategori.
2. Klik menu yang dibeli.
3. Pilih varian suhu jika tersedia:
   - **Panas**
   - **Dingin**
   - **Standar** (jika menu tidak memakai varian suhu)
4. Atur jumlah item di keranjang.
5. Pilih metode pembayaran:
   - **TUNAI**
   - **QRIS**
   - **TRANSFER**
6. Jika pembayaran tunai, isi **uang dibayar**. Aplikasi menghitung kembalian otomatis.
7. Klik tombol konfirmasi.
8. Periksa kembali **modal konfirmasi penjualan**.
9. Setelah disimpan, struk pembayaran muncul dan bisa dicetak.

### Hal penting

- Penjualan **tidak akan tersimpan** sebelum Anda menyetujui modal konfirmasi.
- Pastikan jumlah, varian, dan metode pembayaran benar sebelum menyimpan.
- Struk bisa dicetak dengan tombol **Cetak** atau disimpan sebagai PDF lewat dialog print browser.
- Stok **tidak berkurang otomatis** dari penjualan. Catat stok keluar secara manual di halaman **Stok** jika ingin memantau pemakaian.

---

## 6. Riwayat Transaksi

Halaman **Riwayat Transaksi** menampilkan gabungan:

- transaksi penjualan dari POS,
- transaksi pengeluaran operasional.

Yang bisa dilakukan:

- filter berdasarkan bulan,
- filter jenis transaksi,
- filter kategori,
- cari berdasarkan kata kunci,
- lihat detail struk,
- edit transaksi,
- hapus transaksi dengan dialog konfirmasi.

Setelah edit atau hapus, Dashboard dan Laporan Bulanan ikut diperbarui.

> Berhati-hatilah saat menghapus transaksi. Data yang dihapus tidak bisa dikembalikan dari aplikasi. Jika perlu, ekspor laporan CSV terlebih dahulu.

---

## 7. Manajemen Menu

Halaman **Manajemen Menu** berisi katalog menu Warcoffe 13.

Fitur:

- 57 item menu awal resmi.
- 3 kategori awal: Minuman Kemasan, Minuman Racikan / Sachet, dan Makanan.
- Tambah, edit, dan hapus item menu.
- Tambah, edit, dan hapus kategori.
- Atur harga dalam Rupiah (bilangan bulat, tanpa desimal).
- Atur mode suhu:
  - **NONE** — tidak memakai varian suhu.
  - **HOT_ONLY** — hanya panas.
  - **HOT_COLD** — tersedia panas dan dingin dengan harga masing-masing.
  - **UNSPECIFIED** — varian suhu belum jelas; harga tetap tercatat.
- Aktifkan/nonaktifkan menu.
- Reset katalog ke **57 seed awal** jika ingin kembali ke daftar resmi.

Saran:

- Nonaktifkan menu yang sedang habis, jangan langsung hapus, agar riwayat transaksi lama tetap terbaca.
- Periksa harga setelah mengubah menu.

---

## 8. Manajemen Stok

Halaman **Stok** membantu memantau jumlah fisik produk.

Jenis pencatatan:

| Jenis | Arti |
|---|---|
| **Stok Awal** | Menetapkan jumlah stok fisik pertama kali. |
| **Stok Masuk** | Menambah stok karena pembelian/restock. |
| **Stok Keluar** | Mengurangi stok karena pemakaian/penjualan. |
| **Penyesuaian Opname** | Mengganti total stok dengan hasil hitung fisik terbaru. |

Fitur lain:

- Batas minimum stok per item.
- Riwayat pergerakan stok.
- Peringatan stok menipis di Dashboard dan sidebar.

Hal penting:

- Stok awal sengaja dibiarkan **kosong** sampai pemilik mengisi jumlah fisik.
- Stok tidak otomatis berkurang saat transaksi POS. Catat stok keluar secara manual.
- Lakukan opname berkala agar angka stok sesuai kondisi warung.

---

## 9. Pengeluaran

Halaman **Pengeluaran** dipakai untuk mencatat biaya operasional.

Langkah:

1. Klik **Tambah Pengeluaran**.
2. Isi tanggal, deskripsi, kategori, dan nominal.
3. Klik simpan.

Kategori yang tersedia:

- Bahan Baku & Kemasan
- Gas, Listrik & Air
- Operasional Warung
- Perlengkapan & Peralatan
- Transportasi & Belanja
- Lainnya

Validasi:

- Nominal tidak boleh kosong.
- Nominal tidak boleh nol atau negatif.
- Nominal tidak boleh mengandung huruf.

Pengeluaran bisa diedit atau dihapus dari halaman ini atau dari Riwayat Transaksi.

---

## 10. Laporan Bulanan

Halaman **Laporan Bulanan** menampilkan rekap per bulan:

- total pemasukan,
- total pengeluaran,
- selisih bersih,
- grafik tren harian,
- tabel rincian harian,
- status data: data asli, kosong, atau mengandung DEMO.

Fitur:

- Pilih bulan yang ingin dilihat.
- **Sembunyikan transaksi DEMO** jika tidak ingin data uji masuk ke rekap.
- **Ekspor Laporan ke CSV** untuk dibuka di Excel/Google Sheets.

Saran:

- Ekspor CSV setiap akhir bulan sebagai arsip.
- Periksa status data sebelum mengambil kesimpulan dari angka.

---

## 11. AI Assistant

Halaman **AI Assistant** punya dua fungsi:

### A. Chat bisnis

Contoh pertanyaan:

- “Berapa omzet bulan ini?”
- “Menu apa yang paling laris?”
- “Berapa pengeluaran bulan ini?”
- “Apakah ada stok yang menipis?”

Jawaban diambil dari ringkasan data yang tersedia. Jika layanan AI sedang mati, aplikasi akan menampilkan pesan bahwa layanan tidak tersedia; data tetap bisa dilihat di Dashboard dan Laporan.

### B. Kalimat menjadi draft transaksi

Contoh input:

```text
10 november terjual 5 kopi
7 november terjual 3 indomie
```

Aturan:

- Bisa menulis beberapa tanggal sekaligus.
- Bisa menyebut metode pembayaran: `tunai`, `qris`, atau `transfer`.
- Bisa menulis tanggal seperti `hari ini`, `kemarin`, `20 November 2026`, `20/11/2026`.
- Setiap draft harus **diperiksa dan dikonfirmasi** sebelum disimpan.
- Draft yang tidak lengkap tidak akan disimpan.
- AI bisa salah membaca nama menu, jumlah, atau harga. Selalu periksa pratinjau.

Status draft:

- **SUCCESS** — draft lengkap, siap dikonfirmasi.
- **INCOMPLETE** — ada data yang kurang.
- **OUT_OF_CONTEXT** — kalimat bukan transaksi.
- **SERVICE_UNAVAILABLE** — layanan AI tidak bisa dihubungi.

Jika AI tidak aktif, catat transaksi secara manual lewat **Kasir (POS)** atau **Pengeluaran**.

---

## 12. Audit Log

Halaman **Audit Log** menampilkan riwayat aktivitas:

- tambah data (`CREATE`),
- ubah data (`UPDATE`),
- hapus data (`DELETE`),
- pergerakan stok (`STOCK_MOVE`),
- konfirmasi draft AI (`AI_CONFIRM`).

Yang bisa dilakukan:

- filter berdasarkan jenis aktivitas,
- filter berdasarkan jenis data,
- filter tanggal,
- cari berdasarkan ringkasan, ID, atau email pelaku,
- lihat perbandingan data **sebelum** dan **sesudah** perubahan.

Audit log bersifat **append-only**: data lama tidak boleh diubah/dihapus dari aplikasi. Halaman ini memuat hingga 300 aktivitas terbaru.

---

## 13. Mode Penyimpanan Data

Aplikasi bisa berjalan dalam dua mode:

### Mode Supabase (disarankan)

- Data disimpan di database pusat.
- Bisa diakses dari beberapa perangkat.
- Data tetap ada meskipun browser dibersihkan.
- Digunakan untuk pemakaian normal.

Ciri: tidak ada peringatan penyimpanan lokal.

### Mode Local Fallback

- Data disimpan di `localStorage` browser.
- Hanya terlihat di browser tersebut.
- Tidak dibagi ke perangkat lain.
- Bisa hilang jika cache/data browser dibersihkan.
- Biasanya muncul jika login Supabase berhasil, tetapi tabel/RLS/query database bermasalah. Mode ini **bukan pengganti database pusat**.

Ciri: muncul peringatan **“Menggunakan penyimpanan lokal”**.

Jika muncul peringatan tersebut:

1. Jangan melanjutkan input data penting.
2. Hubungi admin.
3. Minta admin memeriksa koneksi Supabase, schema, dan role owner.

---

## 14. Alur Harian yang Disarankan

### Pagi

- Buka Dashboard.
- Cek stok menipis.
- Cek menu yang aktif.
- Siapkan kasir.

### Saat melayani pembeli

- Catat setiap penjualan lewat POS.
- Pilih metode pembayaran yang benar.
- Cetak/simpan struk jika diperlukan.

### Setelah tutup

- Catat pengeluaran hari ini.
- Catat stok keluar/masuk jika ada.
- Periksa Riwayat Transaksi.
- Cek Dashboard.

### Akhir bulan

- Buka Laporan Bulanan.
- Pilih bulan yang sesuai.
- Periksa status data (asli/DEMO).
- Ekspor CSV.
- Simpan arsip laporan.

---

## 15. FAQ & Troubleshooting

### Saya tidak bisa login

- Periksa email dan password.
- Pastikan akun sudah dikonfirmasi.
- Hubungi admin jika muncul pesan konfigurasi.
- Tunggu beberapa saat jika muncul pesan “terlalu banyak percobaan”.
- Jika lupa password, hubungi admin; aplikasi belum menyediakan halaman reset password mandiri. Admin dapat mereset password lewat dashboard Supabase.

### Login berhasil, tetapi data kosong

Kemungkinan akun belum memiliki role owner di Supabase. Hubungi admin untuk mengatur `app_metadata.role = 'owner'`, lalu logout dan login ulang.

### Muncul “Menggunakan penyimpanan lokal”

Data hanya tersimpan di browser. Hubungi admin untuk memperbaiki koneksi Supabase/RLS. Jangan mengandalkan mode ini untuk data penting.

### Data tidak muncul di perangkat lain

Kemungkinan aplikasi memakai local fallback. Pastikan mode Supabase aktif.

### AI Assistant tidak menjawab

- Layanan AI mungkin belum dinyalakan.
- Layanan AI bisa tidur (cold start) dan butuh waktu untuk bangun.
- Coba lagi beberapa saat.
- Jika tetap gagal, gunakan input manual.

### Draft AI salah membaca menu

Perbaiki pratinjau sebelum menyimpan, atau catat manual lewat POS. AI hanya membantu; keputusan akhir ada di pemilik.

### Stok tidak berkurang setelah penjualan

Memang begitu. Stok tidak otomatis berkurang dari POS. Catat **Stok Keluar** secara manual.

### Struk tidak tercetak rapi

- Gunakan dialog print browser.
- Pilih ukuran kertas yang sesuai.
- Aktifkan opsi background graphics jika perlu.
- Alternatif: simpan sebagai PDF.

### CSV tidak bisa dibuka

- Buka dengan Excel/Google Sheets.
- Pastikan file tidak diubah ekstensinya.
- Jika perlu, impor sebagai CSV dengan pemisah koma.

### Saya salah menghapus transaksi

Aplikasi tidak menyediakan undo. Gunakan backup CSV atau hubungi admin. Untuk ke depan, ekspor laporan secara berkala.

---

## 16. Glosarium

| Istilah | Arti sederhana |
|---|---|
| **Supabase** | Layanan database dan login yang menyimpan data aplikasi. |
| **RLS** | Aturan keamanan database yang membatasi siapa yang boleh melihat data. |
| **Owner** | Pemilik akun dengan akses penuh. |
| **POS** | Point of Sale; halaman kasir. |
| **Draft** | Rancangan transaksi yang belum disimpan. |
| **CSV** | File tabel yang bisa dibuka di Excel/Google Sheets. |
| **LocalStorage** | Penyimpanan kecil di browser; bukan database pusat. |
| **Cold start** | Waktu tunggu saat layanan yang tidur dibangunkan kembali. |
| **API** | Jalur komunikasi antar aplikasi. |
| **Environment variable** | Pengaturan rahasia/konfigurasi di server. |

---

## 17. Tips Keamanan

- Gunakan password yang kuat dan tidak dipakai di akun lain.
- Jangan berbagi password pemilik.
- Logout setelah memakai komputer/browser bersama.
- Jangan membersihkan data browser jika sedang memakai mode local fallback.
- Ekspor CSV laporan secara berkala sebagai arsip.
- Jangan mengubah pengaturan Supabase/Vercel tanpa bantuan admin.
- Laporkan segera jika melihat data atau transaksi yang tidak dikenal.

---

**Warcoffe 13 Management System** — Capstone Project Asah 2026, Team ID **A26-CS187**.

*Terakhir diperbarui: 26 November 2026.*
