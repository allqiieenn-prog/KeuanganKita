/* Laporan: pilih tampilan "Jumlah" (total bulan) atau "Harian" (satu tanggal). Hanya data yang sudah diinput. */
import { store } from '../store.js';
import { summarize } from '../calc.js';
import { exportExcel, printReport } from '../export.js';
import { table, badge, donut, empty } from '../ui.js';
import { buildModel, docHTML, slideInner, pct, DOC_CSS, SLIDE_COUNT } from './report-parts.js';
import { esc, rp, dm, sum, monthLabel, dateLabel, fmtQty, $ } from '../utils.js';

export const title = 'Laporan';

const TABS = [['dash', 'Dashboard'], ['slide', 'Presentasi'], ['doc', 'Laporan resmi'], ['day', 'Per hari'], ['kind', 'Per jenis'], ['cat', 'Kategori & gaji']];
let tab = 'dash', scope = 'total', day = null, slide = 0, topN = 10, clusterFilter = -1;

/* Ringkasan sesuai pilihan: seluruh bulan, atau satu tanggal yang sudah diinput */
function current() {
  const all = summarize(store.data, store.month), dates = all.rows.map((r) => r.date);
  if (scope === 'day') {
    if (!dates.includes(day)) day = dates.includes(store.date) ? store.date : dates[dates.length - 1] || null;
    if (day) return { s: summarize(store.data, store.month, new Set([day])), dates, label: dateLabel(day), tag: day };
  }
  return { s: all, dates, label: `Total ${monthLabel(store.month)}`, tag: store.month };
}
const org = () => store.data.settings.org_name || 'Keuangan Kita';
const injectDocCss = () => { if (!document.getElementById('docCss')) document.head.insertAdjacentHTML('beforeend', `<style id="docCss">${DOC_CSS}</style>`); };

/* ---------- bagian halaman ---------- */
const toolbar = (cur) => `<div class="card-head toolbar">
  <div class="chips"><button class="chip ${scope === 'total' ? 'on' : ''}" data-act="setScope" data-k="total">Jumlah (total bulan)</button><button class="chip ${scope === 'day' ? 'on' : ''}" data-act="setScope" data-k="day">Harian</button></div>
  ${scope === 'day' ? `<div class="date-nav"><button class="btn icon" data-act="stepDay" data-n="-1">‹</button>
    <select data-change="pickDay">${cur.dates.map((d) => `<option value="${d}" ${d === day ? 'selected' : ''}>${dateLabel(d)}</option>`).join('') || '<option>Belum ada hari diinput</option>'}</select>
    <button class="btn icon" data-act="stepDay" data-n="1">›</button></div>` : ''}
  <div class="chips"><button class="btn primary" data-act="exportExcel">Unduh Excel</button><button class="btn ghost" data-act="printReport">Cetak ringkas</button></div></div>
  <div class="chips tabs">${TABS.map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-act="setTab" data-k="${k}">${l}</button>`).join('')}</div>`;

const statCard = (l, v, sub, cls = '') => `<div class="card stat ${cls}"><span class="stat-l">${l}</span><b class="stat-v">${v}</b><small class="muted">${sub}</small></div>`;

function dashboard(m, cur) {
  const { T, clusters, items, total, income, sisa } = m, sorted = [...items].sort((a, b) => b.amt - a.amt);
  const shown = topN ? sorted.slice(0, topN) : sorted, max = Math.max(1, ...shown.map((x) => x.amt));
  const rows = (clusterFilter < 0 ? sorted : sorted.filter((x) => x.k === clusterFilter));
  const chip = (act, key, val, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-n="${val}">${label}</button>`;
  return `<section class="card"><h3>Ringkasan · ${cur.label}</h3>
      <p>Dana masuk dari PM yang diinput <b>${rp(income)}</b>. Pengeluaran tercatat <b>${rp(total)}</b> (${pct(total, income)} dari dana masuk), sisa <b>${rp(sisa)}</b>.</p>
      <p class="muted note">Dihitung dari ${T.days} hari yang sudah diinput (${T.pm} PM). Tanpa rata-rata.</p></section>
    <div class="stats">${statCard('Dana masuk', rp(income), `${T.pm} PM · ${T.days} hari`, 'lime')}${statCard('Total pengeluaran', rp(total), `${items.length} komponen biaya`, 'purple')}${statCard('Sisa dana', rp(sisa), sisa < 0 ? 'Melebihi dana masuk' : 'Masih tersedia', sisa < 0 ? 'neg' : 'orange')}${statCard('Gaji pegawai', rp(T.wages), `${pct(T.wages, total)} dari pengeluaran`, 'pink')}</div>
    <div class="stats">${clusters.map((c) => `<div class="card" style="border-left:6px solid ${c.c};background:linear-gradient(135deg,color-mix(in srgb,${c.c} 24%,var(--card)),var(--card))"><small class="muted"><b>KLASTER ${c.k} • ${c.n.toUpperCase()}</b></small><b class="stat-v">${pct(c.amt, total)}</b><b>${rp(c.amt)}</b>
      <small class="muted">${esc([...c.list].sort((a, b) => b.amt - a.amt).slice(0, 3).map((x) => x.name).join(', ') || 'Belum ada data')}</small></div>`).join('')}</div>
    <div class="split"><section class="card"><div class="card-head"><h3>Peringkat komponen biaya</h3><div class="chips">${[[10, 'Top 10'], [15, 'Top 15'], [0, 'Semua']].map(([n, l]) => chip('setTop', 'n', n, l, topN === n)).join('')}</div></div>
        ${shown.map((x) => `<div class="bar-row"><div class="kv"><span>${esc(x.name)}</span><b>${rp(x.amt)}</b></div><div class="progress"><i style="width:${(x.amt / max) * 100}%;background:${clusters[x.k].c}"></i></div></div>`).join('') || empty('Belum ada data.')}</section>
      <section class="card"><h3>Proporsi klaster</h3>${total ? `<div class="donut-wrap">${donut(clusters.map((c) => ({ n: c.n, v: c.amt, c: c.c })), ['Total', rp(total)])}<ul class="legend-list">${clusters.map((c) => `<li><i class="dot" style="background:${c.c}"></i><span>${c.n}</span><b>${pct(c.amt, total)}</b></li>`).join('')}</ul></div>` : empty('Belum ada pengeluaran.')}</section></div>
    <section class="card"><div class="card-head"><h3>Rincian komponen biaya</h3><div class="chips">${chip('setCluster', 'n', -1, 'Semua klaster', clusterFilter < 0)}${clusters.map((c) => chip('setCluster', 'n', c.i, c.n, clusterFilter === c.i)).join('')}</div></div>
      ${table([{ h: 'No' }, { h: 'Uraian' }, { h: 'Jumlah', cls: 'num' }, { h: 'Proporsi', cls: 'num' }], rows.map((x, i) => [i + 1, `<b>${esc(x.name)}</b><br><small class="muted">${esc(clusters[x.k].n)} · ${esc(x.category)}</small>`, rp(x.amt), pct(x.amt, total)]),
        { foot: ['', 'Total pengeluaran', rp(sum(rows, (x) => x.amt)), clusterFilter < 0 ? '100,0%' : pct(sum(rows, (x) => x.amt), total)] })}</section>`;
}

const perDay = (s) => table(
  [{ h: 'Tanggal' }, { h: 'PM', cls: 'num' }, { h: 'Dana masuk', cls: 'num' }, { h: 'Harian', cls: 'num' }, { h: 'Mingguan', cls: 'num' }, { h: 'Bulanan', cls: 'num' }, { h: 'Gaji', cls: 'num' }, { h: 'Total keluar', cls: 'num' }, { h: 'Sisa', cls: 'num' }, { h: 'Saldo', cls: 'num' }, { h: '' }],
  s.rows.map((r) => [dm(r.date), r.pm, rp(r.income), rp(r.harian), rp(r.mingguan), rp(r.bulanan), rp(r.wages), rp(r.out), `<span class="${r.net < 0 ? 'neg' : 'pos'}">${rp(r.net)}</span>`, rp(r.saldo), `<button class="link" data-act="goDay" data-date="${r.date}">Ubah</button>`]),
  { foot: ['Total', s.totals.pm, rp(s.totals.income), rp(s.totals.harian), rp(s.totals.mingguan), rp(s.totals.bulanan), rp(s.totals.wages), rp(s.totals.out), rp(s.totals.net), '', ''], emptyText: 'Belum ada hari yang diinput.' },
);

const perKind = (s) => ['harian', 'mingguan', 'bulanan'].map((k) => {
  const list = s.entries.filter((e) => e.kind === k).sort((a, b) => (a.date < b.date ? -1 : 1));
  return `<section class="card"><h3>Pengeluaran ${k} ${badge(k)}</h3>${table([{ h: 'Tanggal' }, { h: 'Nama' }, { h: 'Kategori' }, { h: 'Qty × harga' }, { h: 'Jumlah', cls: 'num' }], list.map((e) => [dm(e.date), esc(e.name), esc(e.category), e.qty ? `${fmtQty(e.qty)} ${esc(e.unit || '')} × ${rp(e.unit_price)}` : '-', rp(e.amount)]), { foot: ['Subtotal', '', '', '', rp(sum(list, (e) => e.amount))], emptyText: `Belum ada pengeluaran ${k}.` })}</section>`;
}).join('');

const perCategory = (s) => `<div class="two"><section class="card"><h3>Per kategori</h3>${table([{ h: 'Kategori' }, { h: 'Total', cls: 'num' }, { h: '%', cls: 'num' }], s.byCat.map((c) => [esc(c.name), rp(c.v), pct(c.v, s.totals.out)]), { foot: ['Total', rp(s.totals.out), ''] })}</section>
  <section class="card"><h3>Gaji per divisi</h3>${table([{ h: 'Divisi' }, { h: 'Orang-hari', cls: 'num' }, { h: 'Total', cls: 'num' }], s.byDiv.map((d) => [esc(d.name), d.days, rp(d.total)]), { foot: ['Total', sum(s.byDiv, (d) => d.days), rp(s.totals.wages)] })}</section></div>
  <section class="card"><h3>Gaji per pegawai</h3>${table([{ h: 'Pegawai' }, { h: 'Hadir', cls: 'num' }, { h: 'Total gaji', cls: 'num' }], s.byEmp.map((e) => [esc(e.name), e.days + ' hari', rp(e.total)]), { foot: ['Total', '', rp(s.totals.wages)] })}</section>`;

export function render() {
  injectDocCss();
  const cur = current(), m = buildModel(cur.s, store.data.categories);
  const body = {
    dash: () => dashboard(m, cur),
    slide: () => `<div class="actions"><button class="btn ghost" data-act="fullscreen">Layar penuh</button><span class="muted note">Panah kiri/kanan di keyboard untuk berpindah slide.</span></div><div class="sl" id="slideBox">${slideInner(m, cur.label, org(), slide)}</div>`,
    doc: () => `<div class="actions"><button class="btn primary" data-act="printDoc">Cetak laporan resmi (A4)</button><span class="muted note">Nama organisasi dan penandatangan diatur di Pengaturan.</span></div><div class="card paper">${docHTML(m, cur.label, store.data.settings)}</div>`,
    day: () => `<section class="card">${perDay(cur.s)}</section>`,
    kind: () => perKind(cur.s),
    cat: () => perCategory(cur.s),
  }[tab]();
  return toolbar(cur) + body;
}

/* ---------- aksi ---------- */
const moveSlide = (n) => { slide = (slide + n + SLIDE_COUNT) % SLIDE_COUNT; const c = current(); $('#slideBox').innerHTML = slideInner(buildModel(c.s, store.data.categories), c.label, org(), slide); };

export const actions = {
  setTab: (d) => { tab = d.k; store.rerender(); },
  setScope: (d) => { scope = d.k; store.rerender(); },
  stepDay: (d) => { const { dates } = current(), i = dates.indexOf(day) + +d.n; if (dates[i]) { day = dates[i]; store.rerender(); } },
  pickDay: (d, el) => { day = el.value; store.rerender(); },
  setTop: (d) => { topN = +d.n; store.rerender(); },
  setCluster: (d) => { clusterFilter = +d.n; store.rerender(); },
  slide: (d) => moveSlide(+d.n),
  fullscreen: () => $('#slideBox')?.requestFullscreen?.(),
  goDay: (d) => { store.date = d.date; location.hash = '#/daily'; },
  exportExcel: () => { const c = current(); return exportExcel(c.s, c.label, c.tag); },
  printReport: () => { const c = current(); return printReport(c.s, c.label); },
  printDoc: () => {
    const c = current(), w = window.open('', '_blank');
    if (!w) throw new Error('Pop-up diblokir. Izinkan pop-up untuk situs ini.');
    w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan ${c.label}</title><style>@page{size:A4;margin:12mm}body{margin:0}${DOC_CSS}</style></head><body>${docHTML(buildModel(c.s, store.data.categories), c.label, store.data.settings)}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
  },
};

document.addEventListener('keydown', (e) => {
  if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && location.hash === '#/report' && tab === 'slide' && !e.target.matches?.('input,select')) moveSlide(e.key === 'ArrowRight' ? 1 : -1);
});
