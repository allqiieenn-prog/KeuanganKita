# Keuangan Kita

Aplikasi web statis (HTML, CSS, JavaScript modul) dengan database Supabase. Semua data diinput manual;
laporan hanya menampilkan hari yang sudah diinput, tanpa rata-rata atau pembagian otomatis.

## Struktur
```
index.html            halaman tunggal
css/base.css          warna, reset, kerangka
css/components.css    kartu, tombol, tabel, grafik, kalender, modal
js/config.js          URL & key Supabase (isi sendiri)
js/main.js            login, kerangka, router, penghubung event
js/db.js              satu-satunya akses ke Supabase
js/store.js           state aplikasi
js/calc.js            perhitungan laporan (murni, tanpa DOM)
js/crud.js            tambah / ubah / hapus
js/ui.js              komponen: formulir, modal, tabel, grafik, kalender
js/money.js           titik pemisah ribuan pada isian nominal
js/export.js          Excel & cetak PDF
js/clusters.js        klaster laporan (A-D)
js/views/*.js         halaman: dashboard, daily, expenses, staff, report (+report-parts), settings
sql/schema.sql        tabel database (instalasi baru)
sql/update-v2.sql     pembaruan untuk yang sudah menjalankan schema.sql sebelumnya
```

## Pasang
1. Supabase: buat project, buka **SQL Editor**, jalankan `sql/schema.sql`.
2. **Authentication → Users → Add user** (email + sandi untuk login). Matikan pendaftaran baru di Sign In / Providers.
3. **Project Settings → API**: salin Project URL dan anon/publishable key ke `js/config.js` (jangan pakai `service_role`).
4. Upload semua file ke repository GitHub (struktur folder dipertahankan), lalu **Settings → Pages → Deploy from branch → main / root**.

Catatan: karena memakai modul JavaScript, aplikasi harus dibuka lewat `https://` (GitHub Pages), bukan dengan klik dua kali file `index.html`.
Tabel memakai awalan `kk_`, jadi tidak bentrok dengan aplikasi versi lama di project yang sama.

## Cara pakai
- **Pegawai**: tambah divisi, lalu pegawai (nama, divisi, gaji per hari).
- **Input harian**: pilih tanggal, isi jumlah PM, klik nama pegawai yang masuk (gaji bisa disesuaikan per hari), Simpan.
  Tombol "Salin dari kemarin" mengisi formulir dari hari sebelumnya.
- **Pengeluaran**: harian, mingguan, atau bulanan, masing-masing dicatat pada tanggalnya. Enter menyimpan, kursor kembali ke kolom nama.
- **Laporan**: pilih **Jumlah** (total bulan) atau **Harian** (satu tanggal yang sudah diinput). Tab: Dashboard, Presentasi, Laporan resmi (A4 + tanda tangan), Per hari, Per jenis, Kategori & gaji. Unduh Excel atau cetak.
- **Pengaturan**: tarif per PM, identitas laporan, dan kategori (bisa diubah nama dan klasternya).

## Sudah memasang versi sebelumnya?
Jalankan `sql/update-v2.sql` di Supabase SQL Editor (sekali saja), lalu ganti file di GitHub.
