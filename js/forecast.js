/*
  Perkiraan anggaran (murni, tanpa DOM).
  Dasar perkiraan: rata-rata dari N hari terisi terakhir, dipakai pada hari aktif di periode yang diperkirakan.
  Semua asumsi bisa ditimpa manual untuk membuat skenario.
*/
import { sum, addDays, daysIn, monthOf, shiftMonth } from './utils.js';
import { activeChecker, DEFAULT_WORK_DAYS } from './calc.js';

export const HORIZONS = [
  ['nextweek', 'Minggu depan (Senin–Minggu)'], ['next7', '7 hari ke depan'], ['restmonth', 'Sisa bulan ini'],
  ['next30', '30 hari ke depan'], ['nextmonth', 'Bulan depan'],
];
export const WINDOWS = [[7, '7 hari terisi terakhir'], [14, '14 hari terisi terakhir'], [30, '30 hari terisi terakhir']];

const weekday = (d) => new Date(d + 'T00:00').getDay();
const mean = (arr) => (arr.length ? sum(arr) / arr.length : 0);
const spanDays = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/* daftar tanggal yang diperkirakan (mulai besok, kecuali "minggu depan" dan "bulan depan") */
export function horizonDates(kind, today) {
  const run = (from, n) => Array.from({ length: Math.max(0, n) }, (_, i) => addDays(from, i));
  const tomorrow = addDays(today, 1);
  if (kind === 'nextweek') return run(addDays(today, 7 - ((weekday(today) + 6) % 7)), 7);
  if (kind === 'next7') return run(tomorrow, 7);
  if (kind === 'next30') return run(tomorrow, 30);
  if (kind === 'restmonth') return run(tomorrow, daysIn(monthOf(today)) - +today.slice(8));
  const m = shiftMonth(monthOf(today), 1); // nextmonth
  return run(`${m}-01`, daysIn(m));
}

/* angka dasar dari data: rata-rata per hari terisi dalam jendela N hari terakhir */
export function baseline(data, windowDays, today) {
  const petty = +data.settings.petty_daily || 0, pettyOn = petty > 0, rec = {};
  const get = (d) => rec[d] || (rec[d] = { pm: null, harian: 0, petty: 0, wages: 0, direct: false });
  data.days.forEach((x) => { if (x.pm != null) { const r = get(x.date); r.pm = +x.pm; r.direct = true; } });
  data.attendance.forEach((a) => { const r = get(a.date); r.wages += +a.wage; r.direct = true; });
  data.expenses.forEach((e) => {
    if (!(e.kind === 'harian' || e.spread === false)) return; // yang dibagi bukan input langsung
    const r = get(e.date); r.direct = true;
    if (e.kind !== 'harian') return;
    if (e.petty && pettyOn) r.petty += +e.amount; else r.harian += +e.amount;
  });

  const win = Object.keys(rec).filter((d) => rec[d].direct && d <= today).sort().slice(-windowDays);
  const first = win[0] || null, last = win[win.length - 1] || null;
  const weeks = first ? Math.max(1, Math.ceil((spanDays(first, last) + 1) / 7)) : 1;
  const weekly = first ? sum(data.expenses.filter((e) => e.kind === 'mingguan' && e.date >= first && e.date <= last), (e) => e.amount) / weeks : 0;
  const months = [...new Set(data.expenses.filter((e) => e.kind === 'bulanan').map((e) => monthOf(e.date)))].sort();
  const monthlyMonth = months[months.length - 1] || null;
  const monthly = monthlyMonth ? sum(data.expenses.filter((e) => e.kind === 'bulanan' && monthOf(e.date) === monthlyMonth), (e) => e.amount) : 0;
  const pettyUsed = mean(win.map((d) => rec[d].petty));

  return {
    days: win.length, from: first, to: last, monthlyMonth,
    pm: mean(win.filter((d) => rec[d].pm != null).map((d) => rec[d].pm)),
    rate: +data.settings.rate || 0,
    harian: mean(win.map((d) => rec[d].harian)),
    petty: pettyOn ? ((data.settings.petty_mode || 'full') === 'full' ? Math.max(petty, pettyUsed) : pettyUsed) : 0,
    wages: mean(win.filter((d) => rec[d].wages > 0).map((d) => rec[d].wages)),
    weekly, monthly,
  };
}

/* proyeksi per hari aktif. a = asumsi akhir {pm, rate, harian, petty, wages, weekly, monthly} */
export function project({ data, dates, a, startBalance = 0 }) {
  const isActive = activeChecker(data), perWeek = (data.settings.work_days || DEFAULT_WORK_DAYS).length || 6, activeCount = {};
  const activeIn = (m) => activeCount[m] ?? (activeCount[m] = Array.from({ length: daysIn(m) }, (_, i) => `${m}-${String(i + 1).padStart(2, '0')}`).filter(isActive).length);
  let balance = startBalance;
  const rows = [];
  dates.filter(isActive).forEach((date) => {
    const income = a.pm * a.rate, weekly = a.weekly / perWeek, monthly = a.monthly / (activeIn(monthOf(date)) || 1);
    const out = a.harian + a.petty + a.wages + weekly + monthly, net = income - out;
    balance += net;
    rows.push({ date, income, harian: a.harian, petty: a.petty, wages: a.wages, weekly, monthly, out, net, balance });
  });
  const total = (k) => sum(rows, (r) => r[k]);
  const totals = { days: rows.length, inactive: dates.length - rows.length, end: balance };
  ['income', 'harian', 'petty', 'wages', 'weekly', 'monthly', 'out', 'net'].forEach((k) => { totals[k] = total(k); });
  const breakEvenPm = rows.length && a.rate > 0 ? totals.out / rows.length / a.rate : 0; // PM per hari agar tidak defisit
  return { rows, totals, breakEvenPm };
}
