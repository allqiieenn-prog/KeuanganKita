-- ============================================================================
-- Salin data dari aplikasi LAMA ke aplikasi BARU (Keuangan Kita) di project Supabase yang SAMA.
-- Tabel lama (settings, days, expenses, ...) tidak diubah atau dihapus; tabel baru berawalan kk_.
--
-- Cara pakai:
--   1. Jalankan dulu sql/schema.sql (membuat tabel kk_).
--   2. Jalankan file ini SEKALI di Supabase > SQL Editor.
-- Yang disalin: pengaturan, divisi, pegawai, jumlah PM harian, kehadiran (gaji per hari), pengeluaran, foto nota.
-- Yang TIDAK disalin (tidak ada di aplikasi baru): stok FIFO, gudang, gas otomatis, rutin otomatis.
-- ============================================================================

do $$
begin
  if exists (select 1 from kk_employees) or exists (select 1 from kk_expenses) or exists (select 1 from kk_days) then
    raise exception 'Tabel kk_ sudah berisi data. Migrasi dihentikan agar tidak terjadi data ganda.';
  end if;
end $$;

-- 1. Pengaturan (to_jsonb dipakai agar tetap jalan walau kolom lama belum lengkap)
update kk_settings k set
  rate     = coalesce(nullif(to_jsonb(s)->>'rate','')::bigint, k.rate),
  org_name = to_jsonb(s)->>'org_name',
  sign_by  = to_jsonb(s)->>'sign_by',
  sign_ok  = to_jsonb(s)->>'sign_ok'
from (select * from settings limit 1) s
where k.id = 1;

-- 2. Divisi & pegawai (ID dipertahankan agar relasi tetap benar)
insert into kk_divisions (id, name) overriding system value select id, name from divisions;
insert into kk_employees (id, name, division_id, wage) overriding system value select id, name, division_id, wage from employees;
select setval(pg_get_serial_sequence('kk_divisions','id'), coalesce((select max(id) from kk_divisions), 1));
select setval(pg_get_serial_sequence('kk_employees','id'), coalesce((select max(id) from kk_employees), 1));

-- 3. Jumlah PM harian (hari tanpa PM tidak disalin)
insert into kk_days (date, pm) select date, pm from days where pm is not null;

-- 4. Kehadiran: gaji per hari diambil dari riwayat gaji pada tanggal itu (jika ada), kalau tidak dari gaji pegawai
do $$
begin
  if to_regclass('public.wage_history') is not null then
    execute $q$
      insert into kk_attendance (date, employee_id, wage)
      select a.date, a.employee_id,
             coalesce((select h.wage from wage_history h
                       where h.employee_id = a.employee_id and h.from_date <= a.date
                       order by h.from_date desc, h.id desc limit 1), e.wage)
      from attendance a join employees e on e.id = a.employee_id $q$;
  else
    execute $q$
      insert into kk_attendance (date, employee_id, wage)
      select a.date, a.employee_id, e.wage from attendance a join employees e on e.id = a.employee_id $q$;
  end if;
end $$;

-- 5. Kategori yang dipakai di data lama tetapi belum ada di daftar baru
insert into kk_categories (name)
select distinct category from expenses where category is not null and category not in (select name from kk_categories)
on conflict (name) do nothing;

-- 6. Pengeluaran (harian/bulanan lama -> jenis yang sama; foto nota tetap menunjuk berkas yang sama)
insert into kk_expenses (date, name, category, kind, amount, photo)
select x.date, x.name, x.category, x.type, x.amount, to_jsonb(x)->>'photo' from expenses x;

-- ============================================================================
-- OPSIONAL (hapus tanda -- pada baris yang diinginkan, jalankan sekali):
-- Pembelian gas dan belanja mingguan lama dicatat sebagai pengeluaran MINGGUAN pada tanggal belinya.
-- Hati-hati: jangan dijalankan jika pembelian itu sudah Anda catat juga di tabel expenses lama.
--
-- insert into kk_expenses (date, name, category, kind, amount) select date, 'Gas LPG', 'Gas/LPG', 'mingguan', total from gas_log;
-- insert into kk_expenses (date, name, category, kind, amount) select buy_date, name, category, 'mingguan', total from stocks;
-- ============================================================================
