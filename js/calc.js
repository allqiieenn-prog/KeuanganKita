/*
  Perhitungan laporan. Aturan utama:
  - HANYA data yang sudah diinput. Tidak ada rata-rata, pembagian ke hari lain, atau data turunan.
  - Pengeluaran harian/mingguan/bulanan dicatat pada tanggal inputnya masing-masing.
*/
import { sum } from './utils.js';

const KINDS = ['harian', 'mingguan', 'bulanan'];

export function summarize(data, month, only = null) {
  // only: Set tanggal. Jika diisi, hanya tanggal itu yang dihitung (laporan harian).
  const rate = +data.settings.rate || 0;
  const inMonth = (d) => d.startsWith(month) && (!only || only.has(d));
  const byDate = {};
  const row = (d) => byDate[d] || (byDate[d] = { date: d, pm: 0, income: 0, harian: 0, mingguan: 0, bulanan: 0, wages: 0, staff: 0, out: 0, net: 0, saldo: 0 });

  data.days.filter((x) => inMonth(x.date)).forEach((x) => { const r = row(x.date); r.pm = +x.pm || 0; r.income = r.pm * rate; });
  data.attendance.filter((a) => inMonth(a.date)).forEach((a) => { const r = row(a.date); r.wages += +a.wage; r.staff++; });
  const entries = data.expenses.filter((e) => inMonth(e.date)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  entries.forEach((e) => { row(e.date)[e.kind] += +e.amount; });

  const rows = Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1));
  let saldo = 0;
  rows.forEach((r) => { r.out = r.harian + r.mingguan + r.bulanan + r.wages; r.net = r.income - r.out; saldo += r.net; r.saldo = saldo; });

  const totals = {
    days: rows.length, pm: sum(rows, (r) => r.pm), income: sum(rows, (r) => r.income), wages: sum(rows, (r) => r.wages), out: sum(rows, (r) => r.out),
    ...Object.fromEntries(KINDS.map((k) => [k, sum(rows, (r) => r[k])])),
  };
  totals.net = totals.income - totals.out;

  /* per kategori (pengeluaran) + gaji sebagai kategori tersendiri */
  const cat = {};
  entries.forEach((e) => { cat[e.category] = (cat[e.category] || 0) + +e.amount; });
  if (totals.wages) cat['Gaji pegawai'] = totals.wages;
  const byCat = Object.entries(cat).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v);

  /* gaji per pegawai & per divisi, dari catatan kehadiran */
  const emp = {};
  data.attendance.filter((a) => inMonth(a.date)).forEach((a) => {
    const o = emp[a.employee_id] || (emp[a.employee_id] = { days: 0, total: 0 });
    o.days++; o.total += +a.wage;
  });
  const byEmp = data.employees.filter((e) => emp[e.id]).map((e) => ({ ...e, ...emp[e.id] }));
  const byDiv = data.divisions.map((d) => ({ ...d, days: sum(byEmp.filter((e) => e.division_id === d.id), (e) => e.days), total: sum(byEmp.filter((e) => e.division_id === d.id), (e) => e.total) }));

  /* komponen biaya: tiap nama pengeluaran per kategori + gaji per divisi (jumlah apa adanya) */
  const itemMap = {};
  entries.forEach((e) => { const o = itemMap[e.category + '|' + e.name] || (itemMap[e.category + '|' + e.name] = { name: e.name, category: e.category, amt: 0 }); o.amt += +e.amount; });
  const items = [...Object.values(itemMap), ...byDiv.filter((d) => d.total).map((d) => ({ name: 'Gaji ' + d.name, category: 'Gaji pegawai', amt: d.total }))];

  return { rows, totals, byCat, byEmp, byDiv, entries, items };
}
