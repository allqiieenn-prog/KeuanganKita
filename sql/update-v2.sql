-- Jalankan sekali di Supabase > SQL Editor (kategori punya klaster untuk halaman Laporan).
-- Instalasi baru cukup schema.sql.
alter table kk_categories add column if not exists cluster text not null default 'ATK & Administrasi';
update kk_categories set cluster = 'Energi & Utilitas' where name in ('Gas/LPG','Listrik & air','Transportasi');
update kk_categories set cluster = 'Dapur & Kebersihan' where name in ('Bahan makanan','Kebersihan','Perawatan alat','APD');
