-- Jalankan sekali di Supabase > SQL Editor (hari aktif/nonaktif + pembagian biaya mingguan/bulanan).
-- Instalasi baru cukup schema.sql.
-- Catatan: pengeluaran mingguan/bulanan yang sudah ada otomatis ikut DIBAGI ke hari aktif (spread = true).
-- Untuk mencatatnya di tanggalnya saja, ubah pengeluarannya dan hapus centang "Bagi rata".
alter table kk_settings add column if not exists work_days int[] not null default '{1,2,3,4,5,6}';
alter table kk_days add column if not exists active boolean;
alter table kk_expenses add column if not exists spread boolean not null default true;
