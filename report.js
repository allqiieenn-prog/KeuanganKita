/* Laporan: hanya hari yang sudah diinput */
import { store } from '../store.js';
import { summarize } from '../calc.js';
import { exportExcel, printReport } from '../export.js';
import { table, badge } from '../ui.js';
import { esc, rp, dm, sum, monthLabel } from '../utils.js';

export const title = 'Laporan';

const TABS = [['day', 'Per hari'], ['kind', 'Per jenis'], ['cat', 'Kategori & gaji']];
let tab = 'day';

const perDay = (s) => table(
  [{ h: 'Tanggal' }, { h: 'PM', cls: 'num' }, { h: 'Dana masuk', cls: 'num' }, { h: 'Harian', cls: 'num' }, { h: 'Mingguan', cls: 'num' }, { h: 'Bulanan', cls: 'num' }, { h: 'Gaji', cls: 'num' }, { h: 'Total keluar', cls: 'num' }, { h: 'Sisa', cls: 'num' }, { h: 'Saldo', cls: 'num' }, { h: '' }],
  s.rows.map((r) => [dm(r.date), r.pm, rp(r.income), rp(r.harian), rp(r.mingguan), rp(r.bulanan), rp(r.wages), rp(r.out), `<span class="${r.net < 0 ? 'neg' : 'pos'}">${rp(r.net)}</span>`, rp(r.saldo), `<button class="link" data-act="goDay" data-date="${r.date}">Ubah</button>`]),
  { foot: ['Total', s.totals.pm, rp(s.totals.income), rp(s.totals.harian), rp(s.totals.mingguan), rp(s.totals.bulanan), rp(s.totals.wages), rp(s.totals.out), rp(s.totals.net), '', ''], emptyText: 'Belum ada hari yang diinput bulan ini.' },
);

const perKind = (s) => ['harian', 'mingguan', 'bulanan'].map((k) => {
  const list = s.entries.filter((e) => e.kind === k).sort((a, b) => (a.date < b.date ? -1 : 1));
  return `<section class="card"><h3>Pengeluaran ${k} ${badge(k)}</h3>${table([{ h: 'Tanggal' }, { h: 'Nama' }, { h: 'Kategori' }, { h: 'Jumlah', cls: 'num' }], list.map((e) => [dm(e.date), esc(e.name), esc(e.category), rp(e.amount)]), { foot: ['Subtotal', '', '', rp(sum(list, (e) => e.amount))], emptyText: `Belum ada pengeluaran ${k}.` })}</section>`;
}).join('');

const perCategory = (s) => `<div class="two"><section class="card"><h3>Per kategori</h3>${table([{ h: 'Kategori' }, { h: 'Total', cls: 'num' }, { h: '%', cls: 'num' }], s.byCat.map((c) => [esc(c.name), rp(c.v), s.totals.out ? Math.round((c.v / s.totals.out) * 100) + '%' : '0%']), { foot: ['Total', rp(s.totals.out), ''] })}</section>
  <section class="card"><h3>Gaji per divisi</h3>${table([{ h: 'Divisi' }, { h: 'Orang-hari', cls: 'num' }, { h: 'Total', cls: 'num' }], s.byDiv.map((d) => [esc(d.name), d.days, rp(d.total)]), { foot: ['Total', sum(s.byDiv, (d) => d.days), rp(s.totals.wages)] })}</section></div>
  <section class="card"><h3>Gaji per pegawai</h3>${table([{ h: 'Pegawai' }, { h: 'Hadir', cls: 'num' }, { h: 'Total gaji', cls: 'num' }], s.byEmp.map((e) => [esc(e.name), e.days + ' hari', rp(e.total)]), { foot: ['Total', '', rp(s.totals.wages)] })}</section>`;

export function render() {
  const s = summarize(store.data, store.month), T = s.totals;
  const card = (l, v) => `<div class="card stat"><span class="stat-l">${l}</span><b class="stat-v">${v}</b></div>`;
  return `<div class="card-head toolbar"><div class="chips">${TABS.map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-act="setTab" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="chips"><button class="btn primary" data-act="exportExcel">Unduh Excel</button><button class="btn ghost" data-act="printReport">Cetak / PDF</button></div></div>
    <div class="stats">${card('Dana masuk', rp(T.income))}${card('Total pengeluaran', rp(T.out))}${card('Sisa dana', `<span class="${T.net < 0 ? 'neg' : ''}">${rp(T.net)}</span>`)}${card('Hari terisi', T.days + ' hari')}</div>
    <p class="muted note">Laporan ${monthLabel(store.month)}: hanya data yang sudah diinput, tanpa rata-rata atau perhitungan turunan.</p>
    ${tab === 'day' ? `<section class="card">${perDay(s)}</section>` : tab === 'kind' ? perKind(s) : perCategory(s)}`;
}

export const actions = {
  setTab: (d) => { tab = d.k; store.rerender(); },
  goDay: (d) => { store.date = d.date; location.hash = '#/daily'; },
  exportExcel,
  printReport,
};
