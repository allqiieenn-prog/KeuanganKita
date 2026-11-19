/* Dashboard: hanya menampilkan data dari hari yang sudah diinput */
import { store } from '../store.js';
import { summarize } from '../calc.js';
import { barChart, donut, lineChart, miniBars, calendar, progress, badge, empty, PALETTE } from '../ui.js';
import { esc, rp, dm, daysIn, sum } from '../utils.js';

export const title = 'Dashboard';

const stat = (cls, label, value, sub, viz = '') =>
  `<div class="card stat ${cls}"><span class="stat-l">${label}</span><b class="stat-v">${value}</b><div class="stat-f"><small>${sub}</small>${viz}</div></div>`;

export function render() {
  const { data, month, date } = store, s = summarize(data, month), T = s.totals, last = s.rows.slice(-8);

  const top = s.byCat.slice(0, 5), rest = sum(s.byCat.slice(5), (c) => c.v);
  const parts = [...top.map((c, i) => ({ n: c.name, v: c.v, c: PALETTE[i] })), ...(rest ? [{ n: 'Lainnya', v: rest, c: PALETTE[5] }] : [])];
  const pct = (v) => (T.out ? Math.round((v / T.out) * 100) : 0);
  const kinds = [['Harian', T.harian, 'var(--lime)'], ['Mingguan', T.mingguan, 'var(--orange)'], ['Bulanan', T.bulanan, 'var(--purple)'], ['Gaji pegawai', T.wages, 'var(--pink)']];

  return `<div class="stats">
      ${stat('lime', 'Dana masuk', rp(T.income), `${T.pm} PM · ${T.days} hari`, miniBars(last.map((r) => r.income)))}
      ${stat('purple', 'Pengeluaran', rp(T.out), `${s.entries.length} transaksi + gaji`, miniBars(last.map((r) => r.out)))}
      ${stat(T.net < 0 ? 'neg' : 'orange', 'Sisa dana', rp(T.net), 'Dana masuk − pengeluaran', '')}
      ${stat('pink', 'Hari terisi', `${T.days} hari`, `dari ${daysIn(month)} hari kalender`, progress((T.days / daysIn(month)) * 100))}
    </div>
    <div class="split">
      <section class="card"><div class="card-head"><h3>Dana masuk &amp; pengeluaran per hari</h3></div>${barChart(s.rows.map((r) => ({ label: dm(r.date), a: r.income, b: r.out })))}</section>
      <section class="card blue"><div class="card-head"><h3>Hari terisi</h3><small>Klik tanggal untuk input</small></div>${calendar({ month, selected: date, filled: new Set(s.rows.map((r) => r.date)) })}</section>
    </div>
    <div class="trio">
      <section class="card"><h3>Pengeluaran per kategori</h3>${parts.length ? `<div class="donut-wrap">${donut(parts, ['Total', rp(T.out)])}<ul class="legend-list">${parts.map((p) => `<li><i class="dot" style="background:${p.c}"></i><span>${esc(p.n)}</span><b>${pct(p.v)}%</b></li>`).join('')}</ul></div>` : empty('Belum ada pengeluaran.')}</section>
      <section class="card"><h3>Rincian jenis</h3>${kinds.map(([l, v, c]) => `<div class="bar-row"><div class="kv"><span>${l}</span><b>${rp(v)}</b></div>${progress(pct(v), c)}</div>`).join('')}</section>
      <section class="card"><h3>Saldo kumulatif</h3>${lineChart(s.rows.map((r) => ({ label: dm(r.date), v: r.saldo })))}<h4>Transaksi terbaru</h4>
        <ul class="recent">${s.entries.slice(0, 5).map((e) => `<li><div><b>${esc(e.name)}</b><small>${dm(e.date)} · ${esc(e.category)}</small></div><div>${rp(e.amount)}${badge(e.kind)}</div></li>`).join('') || empty('Belum ada transaksi.')}</ul></section>
    </div>`;
}

export const actions = {
  pickDate: (d) => { store.date = d.date; location.hash = '#/daily'; },
};
