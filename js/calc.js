/*
  Perhitungan laporan.
  - Pengeluaran HARIAN dan pengeluaran yang tidak dibagi dicatat pada tanggal inputnya.
  - Pengeluaran MINGGUAN dibagi rata ke hari aktif pada minggu itu (Senin-Minggu).
    Pengeluaran BULANAN dibagi rata ke hari aktif pada bulan itu.
  - Bagian per hari hanya tampil pada hari yang SUDAH TERISI (ada PM, kehadiran, atau pengeluaran langsung).
    Bagian untuk hari yang belum terisi dilaporkan sebagai "belum terbagi" dan masuk saat hari itu terisi.
*/
import { sum, addDays, daysIn } from './utils.js';

const KINDS = ['harian', 'mingguan', 'bulanan'];
export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5, 6]; // Senin-Sabtu (0 = Minggu)

const weekday = (d) => new Date(d + 'T00:00').getDay();
const weekDates = (d) => { const start = addDays(d, -((weekday(d) + 6) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); };
const monthDates = (m) => Array.from({ length: daysIn(m) }, (_, i) => `${m}-${String(i + 1).padStart(2, '0')}`);

const workDays = (data) => data.settings.work_days || DEFAULT_WORK_DAYS;
export const defaultActive = (data, date) => workDays(data).includes(weekday(date));

/* fungsi: apakah tanggal ini hari aktif? (pengecualian per tanggal menang atas hari kerja rutin) */
export function activeChecker(data) {
  const override = new Map(data.days.filter((x) => x.active != null).map((x) => [x.date, x.active]));
  const work = new Set(workDays(data));
  return (d) => (override.has(d) ? override.get(d) : work.has(weekday(d)));
}

/* hari aktif tempat sebuah pengeluaran dibagi; [] berarti dicatat langsung pada tanggalnya */
export function spreadDates(e, isActive) {
  if (e.kind === 'harian' || e.spread === false) return [];
  return (e.kind === 'mingguan' ? weekDates(e.date) : monthDates(e.date.slice(0, 7))).filter(isActive);
}

export function summarize(data, month, only = null) { // only: Set tanggal (laporan harian)
  const rate = +data.settings.rate || 0, isActive = activeChecker(data);
  const inScope = (d) => d.startsWith(month) && (!only || only.has(d));

  /* rencana pembagian tiap pengeluaran */
  const plan = new Map();
  data.expenses.forEach((e) => { const dates = spreadDates(e, isActive); if (dates.length) plan.set(e.id, { dates, share: +e.amount / dates.length }); });

  /* hari terisi = ada PM, kehadiran, atau pengeluaran yang dicatat langsung */
  const days = data.days.filter((x) => x.pm != null && inScope(x.date));
  const attendance = data.attendance.filter((a) => inScope(a.date));
  const filled = new Set([...days.map((x) => x.date), ...attendance.map((a) => a.date), ...data.expenses.filter((e) => !plan.has(e.id) && inScope(e.date)).map((e) => e.date)]);

  const byDate = {}, cat = {}, itemMap = {}, counted = {};
  const row = (d) => byDate[d] || (byDate[d] = { date: d, pm: 0, income: 0, harian: 0, mingguan: 0, bulanan: 0, wages: 0, staff: 0, out: 0, net: 0, saldo: 0 });
  const addCost = (e, date, amount) => {
    row(date)[e.kind] += amount;
    cat[e.category] = (cat[e.category] || 0) + amount;
    const key = e.category + '|' + e.name, item = itemMap[key] || (itemMap[key] = { name: e.name, category: e.category, amt: 0 });
    item.amt += amount; counted[e.id] = (counted[e.id] || 0) + amount;
  };

  days.forEach((x) => { const r = row(x.date); r.pm = +x.pm; r.income = r.pm * rate; });
  attendance.forEach((a) => { const r = row(a.date); r.wages += +a.wage; r.staff++; });
  data.expenses.forEach((e) => {
    const p = plan.get(e.id);
    if (!p) { if (inScope(e.date)) addCost(e, e.date, +e.amount); return; }
    p.dates.forEach((d) => { if (filled.has(d)) addCost(e, d, p.share); });
  });

  /* bagian yang belum terbagi karena harinya belum terisi (bulan ini) */
  let pending = 0;
  if (!only) data.expenses.forEach((e) => { const p = plan.get(e.id); if (p) p.dates.forEach((d) => { if (d.startsWith(month) && !filled.has(d)) pending += p.share; }); });

  const rows = Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1));
  let saldo = 0;
  rows.forEach((r) => { r.out = r.harian + r.mingguan + r.bulanan + r.wages; r.net = r.income - r.out; saldo += r.net; r.saldo = saldo; });

  const totals = {
    days: rows.length, pm: sum(rows, (r) => r.pm), income: sum(rows, (r) => r.income), wages: sum(rows, (r) => r.wages), out: sum(rows, (r) => r.out), pending,
    ...Object.fromEntries(KINDS.map((k) => [k, sum(rows, (r) => r[k])])),
  };
  totals.net = totals.income - totals.out;

  if (totals.wages) cat['Gaji pegawai'] = totals.wages;
  const byCat = Object.entries(cat).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v);

  /* gaji per pegawai & per divisi, dari catatan kehadiran */
  const emp = {};
  attendance.forEach((a) => { const o = emp[a.employee_id] || (emp[a.employee_id] = { days: 0, total: 0 }); o.days++; o.total += +a.wage; });
  const byEmp = data.employees.filter((e) => emp[e.id]).map((e) => ({ ...e, ...emp[e.id] }));
  const byDiv = data.divisions.map((d) => ({ ...d, days: sum(byEmp.filter((e) => e.division_id === d.id), (e) => e.days), total: sum(byEmp.filter((e) => e.division_id === d.id), (e) => e.total) }));

  /* komponen biaya: tiap nama per kategori (sesuai bagian yang masuk) + gaji per divisi */
  const items = [...Object.values(itemMap), ...byDiv.filter((d) => d.total).map((d) => ({ name: 'Gaji ' + d.name, category: 'Gaji pegawai', amt: d.total }))];

  /* pengeluaran yang masuk laporan ini, terbaru dulu */
  const entries = data.expenses.filter((e) => counted[e.id] !== undefined).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  return { rows, totals, byCat, byEmp, byDiv, entries, counted, items, plan };
}
