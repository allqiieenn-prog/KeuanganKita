/* Perkiraan anggaran: prediksi dana masuk, pengeluaran, dan sisa untuk minggu / bulan ke depan */
import { store } from '../store.js';
import { summarize } from '../calc.js';
import { baseline, project, horizonDates, HORIZONS, WINDOWS } from '../forecast.js';
import { barChart, lineChart, table, progress, empty } from '../ui.js';
import { esc, rp, dm, dateLabel, today, monthOf, thousands, num, $ } from '../utils.js';

export const title = 'Perkiraan anggaran';

const DAY = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
/* kunci asumsi: [kunci, label, apakah nominal Rp] */
const FIELDS = [
  ['pm', 'PM per hari', false], ['rate', 'Dana per PM (Rp)', true], ['harian', 'Pengeluaran harian per hari (Rp)', true], ['petty', 'Petty cash per hari (Rp)', true],
  ['wages', 'Gaji pegawai per hari (Rp)', true], ['weekly', 'Pengeluaran mingguan per minggu (Rp)', true], ['monthly', 'Pengeluaran bulanan per bulan (Rp)', true],
];

let horizon = 'nextweek', windowN = 14, withBalance = false;
let over = {}; // asumsi yang ditimpa manual (kosong = pakai angka dari data)

const fmtBase = (k, v) => (k === 'pm' ? String(Math.round(v * 10) / 10) : thousands(v));

/* hitung semuanya dari pilihan saat ini */
function compute() {
  const { data } = store, t = today(), base = baseline(data, windowN, t);
  const a = Object.fromEntries(FIELDS.map(([k]) => [k, over[k] != null ? over[k] : base[k]]));
  const dates = horizonDates(horizon, t), start = withBalance ? summarize(data, monthOf(t)).totals.net : 0;
  return { base, a, dates, start, res: project({ data, dates, a, startBalance: start }) };
}

const card = (cls, label, value, sub) => `<div class="card stat ${cls}"><span class="stat-l">${label}</span><b class="stat-v">${value}</b><small class="muted">${sub}</small></div>`;

function resultHTML({ base, a, dates, res }) {
  const { rows, totals: T } = res, label = HORIZONS.find((h) => h[0] === horizon)[1];
  if (!dates.length) return `<section class="card">${empty('Tidak ada hari tersisa pada periode ini. Pilih periode lain.')}</section>`;
  const parts = [['Harian', T.harian, 'var(--lime)'], ['Petty cash', T.petty, 'var(--orange)'], ['Gaji pegawai', T.wages, 'var(--pink)'], ['Mingguan', T.weekly, 'var(--blue)'], ['Bulanan', T.monthly, 'var(--purple)']];
  const warn = base.days === 0 ? 'Belum ada hari terisi sebagai dasar. Isi asumsi di atas secara manual.' : base.days < 3 ? `Data dasar baru ${base.days} hari, jadi perkiraan masih kasar.` : '';
  return `${warn ? `<p class="al warn">⚠ ${warn}</p>` : ''}
    <div class="stats">${card('lime', 'Perkiraan dana masuk', rp(T.income), `${T.days} hari aktif × ${Math.round(a.pm * 10) / 10} PM`)}
      ${card('purple', 'Perkiraan pengeluaran', rp(T.out), `${rp(T.days ? T.out / T.days : 0)} per hari aktif`)}
      ${card(T.net < 0 ? 'neg' : 'orange', T.net < 0 ? 'Perkiraan defisit' : 'Perkiraan sisa', rp(T.net), T.net < 0 ? 'Pengeluaran melebihi dana masuk' : 'Dana masuk melebihi pengeluaran')}
      ${card('pink', withBalance ? 'Saldo akhir perkiraan' : 'PM minimum', withBalance ? rp(T.end) : `${Math.ceil(res.breakEvenPm)} PM`, withBalance ? 'Termasuk saldo bulan berjalan' : 'per hari agar tidak defisit')}</div>
    <div class="split"><section class="card"><h3>Perkiraan per hari · ${label}</h3>${barChart(rows.map((r) => ({ label: dm(r.date), a: r.income, b: r.out })))}</section>
      <section class="card"><h3>Rincian perkiraan pengeluaran</h3>${parts.map(([l, v, c]) => `<div class="bar-row"><div class="kv"><span>${l}</span><b>${rp(v)}</b></div>${progress(T.out ? (v / T.out) * 100 : 0, c)}</div>`).join('')}
        <h4>Saldo berjalan</h4>${lineChart(rows.map((r) => ({ label: dm(r.date), v: r.balance })))}</section></div>
    <section class="card"><h3>Tabel perkiraan</h3>${table([{ h: 'Tanggal' }, { h: 'Dana masuk', cls: 'num' }, { h: 'Harian', cls: 'num' }, { h: 'Petty', cls: 'num' }, { h: 'Gaji', cls: 'num' }, { h: 'Mingguan', cls: 'num' }, { h: 'Bulanan', cls: 'num' }, { h: 'Total keluar', cls: 'num' }, { h: 'Sisa', cls: 'num' }, { h: 'Saldo', cls: 'num' }],
      rows.map((r) => [`${DAY[new Date(r.date + 'T00:00').getDay()]} ${dm(r.date)}`, rp(r.income), rp(r.harian), rp(r.petty), rp(r.wages), rp(r.weekly), rp(r.monthly), rp(r.out), `<span class="${r.net < 0 ? 'neg' : 'pos'}">${rp(r.net)}</span>`, rp(r.balance)]),
      { foot: ['Total', rp(T.income), rp(T.harian), rp(T.petty), rp(T.wages), rp(T.weekly), rp(T.monthly), rp(T.out), rp(T.net), rp(T.end)] })}
      <p class="muted note">${T.inactive ? `${T.inactive} hari nonaktif pada periode ini tidak dihitung. ` : ''}Dasar perkiraan: rata-rata ${base.days} hari terisi terakhir${base.from ? ` (${dm(base.from)}–${dm(base.to)})` : ''}. Pengeluaran mingguan dibagi ke hari aktif tiap minggu, bulanan ke hari aktif tiap bulan${base.monthlyMonth ? ` (berdasarkan bulanan ${base.monthlyMonth})` : ''}.</p></section>`;
}

export function render() {
  const c = compute(), sel = (id, opts, val, change) => `<select data-change="${change}">${opts.map(([k, l]) => `<option value="${k}" ${String(k) === String(val) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const inputs = FIELDS.map(([k, l, money]) => `<label>${l}<input data-live="fcInput" data-key="${k}" ${money ? 'class="money" inputmode="numeric"' : 'type="number" min="0" step="any"'} value="${over[k] != null ? (money ? thousands(over[k]) : over[k]) : ''}" placeholder="${fmtBase(k, c.base[k])}" autocomplete="off"></label>`).join('');
  return `<section class="card"><h3>Atur perkiraan</h3><div class="grid-form">
      <label>Periode yang diperkirakan${sel('h', HORIZONS, horizon, 'fcHorizon')}</label>
      <label>Dasar perhitungan${sel('w', WINDOWS, windowN, 'fcWindow')}</label>
      <label class="check"><input type="checkbox" data-change="fcBalance" ${withBalance ? 'checked' : ''}> Sertakan saldo bulan berjalan</label></div>
      <h4>Asumsi per hari <small class="muted">· kosong = pakai angka dari data (tampil sebagai petunjuk di kolom)</small></h4>
      <div class="grid-form">${inputs}</div><div class="actions"><button class="btn ghost" data-act="fcReset">Kembalikan ke angka dari data</button></div></section>
    <div id="fc-result">${resultHTML(c)}</div>`;
}

export const actions = {
  fcHorizon: (d, el) => { horizon = el.value; store.rerender(); },
  fcWindow: (d, el) => { windowN = +el.value; store.rerender(); },
  fcBalance: (d, el) => { withBalance = el.checked; store.rerender(); },
  fcReset: () => { over = {}; store.rerender(); },
  /* ketik asumsi -> hasil langsung diperbarui tanpa memuat ulang halaman (kursor tidak hilang) */
  fcInput: (d, el) => {
    const raw = el.value.trim();
    over[d.key] = raw === '' ? null : d.key === 'pm' ? +raw || 0 : num(raw);
    $('#fc-result').innerHTML = resultHTML(compute());
  },
};
