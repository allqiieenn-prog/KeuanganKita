-- Jalankan sekali di Supabase > SQL Editor (data barang + jumlah barang pada pengeluaran).
-- Instalasi baru cukup schema.sql.
create table if not exists kk_items (
  id bigint generated always as identity primary key, name text not null,
  unit text, price bigint not null default 0, category text not null default 'Lainnya'
);
create unique index if not exists kk_items_name on kk_items (lower(name));
alter table kk_items enable row level security;
drop policy if exists "login_penuh" on kk_items;
create policy "login_penuh" on kk_items for all to authenticated using (true) with check (true);

alter table kk_expenses add column if not exists qty numeric, add column if not exists unit text, add column if not exists unit_price bigint;
