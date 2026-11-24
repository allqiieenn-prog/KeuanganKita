-- Jalankan sekali di Supabase > SQL Editor (petty cash harian).
-- Instalasi baru cukup schema.sql.
alter table kk_settings add column if not exists petty_daily bigint not null default 0;
alter table kk_settings add column if not exists petty_mode text not null default 'full';
alter table kk_expenses add column if not exists petty boolean not null default false;
