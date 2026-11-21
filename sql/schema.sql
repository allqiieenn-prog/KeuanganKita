-- Jalankan di Supabase > SQL Editor.
-- Semua tabel memakai awalan kk_ sehingga aman dipakai di project yang sama dengan aplikasi lama.

create table kk_settings (
  id int primary key default 1 check (id = 1),
  rate bigint not null default 3000,
  org_name text, sign_by text, sign_ok text,
  work_days int[] not null default '{1,2,3,4,5,6}' -- hari kerja rutin (0 = Minggu)
);
insert into kk_settings default values;

create table kk_categories (
  id bigint generated always as identity primary key, name text not null unique,
  cluster text not null default 'ATK & Administrasi' -- klaster di halaman Laporan
);
insert into kk_categories (name, cluster) values
  ('Bahan makanan','Dapur & Kebersihan'),('Gas/LPG','Energi & Utilitas'),('Listrik & air','Energi & Utilitas'),('Transportasi','Energi & Utilitas'),
  ('Sewa','ATK & Administrasi'),('Perawatan alat','Dapur & Kebersihan'),('Kebersihan','Dapur & Kebersihan'),('APD','Dapur & Kebersihan'),('Lainnya','ATK & Administrasi');

create table kk_divisions (id bigint generated always as identity primary key, name text not null);
create table kk_employees (
  id bigint generated always as identity primary key, name text not null,
  division_id bigint not null references kk_divisions(id) on delete cascade, wage bigint not null default 0
);

-- jumlah PM per hari (hanya hari yang diinput yang punya baris)
-- active: kosong = ikut hari kerja rutin; true/false = pengecualian untuk tanggal itu
create table kk_days (date date primary key, pm int, active boolean);
-- kehadiran; gaji disimpan per hari sehingga perubahan gaji tidak mengubah hari yang sudah tercatat
create table kk_attendance (
  date date not null, employee_id bigint not null references kk_employees(id) on delete cascade,
  wage bigint not null, primary key (date, employee_id)
);
create table kk_expenses (
  id bigint generated always as identity primary key, date date not null, name text not null,
  category text not null default 'Lainnya', kind text not null check (kind in ('harian','mingguan','bulanan')),
  amount bigint not null, note text, photo text,
  qty numeric, unit text, unit_price bigint, -- jumlah barang × harga satuan (opsional)
  spread boolean not null default true -- mingguan/bulanan dibagi rata ke hari aktif
);

-- data barang: nama, satuan, harga satuan (dipakai berulang saat input pengeluaran)
create table kk_items (
  id bigint generated always as identity primary key, name text not null,
  unit text, price bigint not null default 0, category text not null default 'Lainnya'
);
create unique index kk_items_name on kk_items (lower(name));

-- hanya pengguna yang login yang boleh membaca/menulis
do $$ declare t text; begin
  foreach t in array array['kk_settings','kk_categories','kk_divisions','kk_employees','kk_days','kk_attendance','kk_expenses','kk_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "login_penuh" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- penyimpanan foto nota (privat)
insert into storage.buckets (id, name, public) values ('nota', 'nota', false) on conflict (id) do nothing;
drop policy if exists "nota_login" on storage.objects;
create policy "nota_login" on storage.objects for all to authenticated using (bucket_id = 'nota') with check (bucket_id = 'nota');
