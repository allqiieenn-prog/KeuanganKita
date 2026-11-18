/* Bagian laporan: model data, slide presentasi, dan dokumen resmi (A4) */
import { esc, rp, dm, sum } from '../utils.js';
import { CLUSTERS, clusterIndex } from '../clusters.js';

export const pct = (v, total) => `${(total ? (v / total) * 100 : 0).toFixed(1).replace('.', ',')}%`;
const byAmount = (a) => [...a].sort((x, y) => y.amt - x.amt);

/* Model laporan dari ringkasan (summarize). Semua angka = data yang sudah diinput. */
export function buildModel(s, categories) {
  const items = s.items.map((i) => ({ ...i, k: clusterIndex(i.category, categories) }));
  const clusters = CLUSTERS.map((c, i) => { const list = items.filter((x) => x.k === i); return { ...c, i, list, amt: sum(list, (x) => x.amt) }; });
  return { s, T: s.totals, items, clusters, total: sum(items, (x) => x.amt), income: s.totals.income, sisa: s.totals.net };
}

/* ---------- slide presentasi ---------- */
const slideRows = (list, total) => (list.length ? byAmount(list).map((x) => `<div class="sli"><div><b>${esc(x.name)}</b><small>${esc(x.category)}</small></div><div><b>${rp(x.amt)}</b><small>${pct(x.amt, total)} dari pengeluaran</small></div></div>`).join('') : '<p>Belum ada data.</p>');

function slides(m, label, org) {
  const { T, clusters, total, income, sisa, items } = m, ok = sisa >= 0, rest = byAmount(clusters.slice(1).flatMap((c) => c.list));
  return [
    `<small class="sk">Slide 01 • Ringkasan</small><h2>Laporan Keuangan</h2><h3>${esc(org)} · ${label}</h3>
     <div class="sst"><div><small>Dana masuk</small><b>${rp(income)}</b><small>${T.pm} PM · ${T.days} hari diinput</small></div><div><small>Total pengeluaran</small><b>${rp(total)}</b><small>${items.length} komponen biaya</small></div><div><small>Sisa dana</small><b>${rp(sisa)}</b><small>${pct(sisa, income)} dari dana masuk</small></div></div>`,
    `<small class="sk">Slide 02 • ${clusters[0].n} (${pct(clusters[0].amt, total)})</small><h2>Gaji Pegawai &amp; Insentif</h2><div class="sst"><div><small>Subtotal klaster</small><b>${rp(clusters[0].amt)}</b></div></div>${slideRows(clusters[0].list, total)}`,
    `<small class="sk">Slide 03 • Energi, Dapur &amp; Administrasi (${pct(total - clusters[0].amt, total)})</small><h2>Biaya Operasional Lainnya</h2><div class="sst"><div><small>Subtotal klaster B–D</small><b>${rp(total - clusters[0].amt)}</b></div></div>${slideRows(rest.slice(0, 8), total)}${rest.length > 8 ? `<p>…dan ${rest.length - 8} komponen lainnya.</p>` : ''}`,
    `<small class="sk">Slide 04 • Kesimpulan</small><h2>Dana Masuk vs Pengeluaran</h2><span class="${ok ? 'sok' : 'sbad'}">${ok ? 'PENGELUARAN DI DALAM DANA MASUK' : 'PENGELUARAN MELEBIHI DANA MASUK'}</span>
     <div class="sst"><div><small>Dana masuk</small><b>${rp(income)}</b></div><div><small>Pengeluaran</small><b>${rp(total)}</b></div><div><small>Sisa</small><b>${rp(sisa)}</b></div></div>
     ${[['Pengeluaran harian', T.harian], ['Pengeluaran mingguan', T.mingguan], ['Pengeluaran bulanan', T.bulanan], ['Gaji pegawai', T.wages]].map(([l, v]) => `<div class="sli"><div><b>${l}</b></div><div><b>${rp(v)}</b><small>${pct(v, total)}</small></div></div>`).join('')}`,
  ];
}

export const SLIDE_COUNT = 4;
export const slideInner = (m, label, org, i) => `${slides(m, label, org)[i]}<div class="snav"><button data-act="slide" data-n="-1">‹ Sebelumnya</button><span>SLIDE ${i + 1} / ${SLIDE_COUNT}</span><button data-act="slide" data-n="1">Berikutnya ›</button></div>`;

/* ---------- dokumen resmi (A4) ---------- */
export const DOC_CSS = `.doc{background:#fff;color:#14140f;font:11px/1.45 "Segoe UI",Arial,sans-serif;padding:18px;min-width:640px}
.doc table{width:100%;border-collapse:collapse;margin:8px 0}.doc th,.doc td{border:1px solid #cfcfd6;padding:3px 6px;text-align:right;white-space:normal;background:none;color:#14140f;font-size:11px}
.doc th{background:#eef7d6;font-weight:700}.doc .l{text-align:left}.doc tfoot td{font-weight:700;background:#f6f8ee;border-radius:0}.doc tr.tt td{background:#eef7d6}
.doc h1{font-size:15px;margin:4px 0}.doc .dh{text-align:center;border-bottom:2px solid #14140f;padding-bottom:8px;margin-bottom:10px}
.doc .box{border:1px solid #cfcfd6;border-radius:6px;padding:8px 10px;margin-top:8px;line-height:1.6}
.doc .sig{display:flex;justify-content:space-around;margin-top:26px;text-align:center}.doc .sig>div{width:40%}
.doc .sig .ln{margin-top:56px;border-top:1px solid #14140f;padding-top:2px;font-weight:700}.doc .pb{page-break-before:always;margin-top:26px}.doc tr{page-break-inside:avoid}`;

export function docHTML(m, label, settings) {
  const { T, clusters, total, income, sisa } = m, org = esc(settings.org_name || 'Keuangan Kita');
  const rows = clusters.flatMap((c) => byAmount(c.list).map((x) => ({ ...x, cn: c.n })));
  const sdm = clusters[0].amt, non = total - sdm;
  const sum3 = (label2, v, cls = '') => `<tr class="${cls}"><td colspan="4" class="l">${label2}</td><td>${rp(v)}</td><td>${pct(v, total)}</td></tr>`;
  return `<div class="doc"><div class="dh"><div>${org}</div><h1>LAPORAN KEUANGAN OPERASIONAL</h1><div>${label} · ${T.days} hari diinput · ${T.pm} PM</div></div>
    <table><thead><tr><th>No</th><th class="l">Uraian Komponen Biaya</th><th class="l">Klaster</th><th class="l">Kategori</th><th>Jumlah</th><th>% Pengeluaran</th></tr></thead>
    <tbody>${rows.map((x, i) => `<tr><td>${i + 1}</td><td class="l">${esc(x.name)}</td><td class="l">${esc(x.cn)}</td><td class="l">${esc(x.category)}</td><td>${rp(x.amt)}</td><td>${pct(x.amt, total)}</td></tr>`).join('') || '<tr><td colspan="6">Belum ada data.</td></tr>'}</tbody>
    <tfoot>${sum3('SUBTOTAL SDM &amp; INSENTIF', sdm)}${sum3('SUBTOTAL NON-SDM (ENERGI, DAPUR, ADMINISTRASI)', non)}${sum3('TOTAL PENGELUARAN', total, 'tt')}
    <tr><td colspan="4" class="l">DANA MASUK (${T.pm} PM)</td><td>${rp(income)}</td><td></td></tr><tr class="tt"><td colspan="4" class="l">SISA DANA</td><td>${rp(sisa)}</td><td></td></tr></tfoot></table>
    <div class="box"><b>Rekapitulasi</b><br>1. Dana masuk: ${rp(income)}<br>2. Pengeluaran harian / mingguan / bulanan: ${rp(T.harian)} / ${rp(T.mingguan)} / ${rp(T.bulanan)}<br>3. Gaji pegawai: ${rp(T.wages)}<br>4. Total pengeluaran / sisa dana: ${rp(total)} / ${rp(sisa)}</div>
    <div class="sig"><div>Dibuat oleh,<div class="ln">${esc(settings.sign_by || '………………………')}</div></div><div>Mengetahui,<div class="ln">${esc(settings.sign_ok || '………………………')}</div></div></div>
    <div class="pb"><div class="dh"><h1>LAMPIRAN: GAJI PEGAWAI</h1><div>${label}</div></div>
    <table><thead><tr><th class="l">Divisi</th><th>Orang-hari</th><th>Total gaji</th></tr></thead><tbody>${m.s.byDiv.map((d) => `<tr><td class="l">${esc(d.name)}</td><td>${d.days}</td><td>${rp(d.total)}</td></tr>`).join('')}</tbody><tfoot><tr><td class="l">Total</td><td>${sum(m.s.byDiv, (d) => d.days)}</td><td>${rp(T.wages)}</td></tr></tfoot></table>
    <table><thead><tr><th class="l">Pegawai</th><th>Hadir</th><th>Total gaji</th></tr></thead><tbody>${m.s.byEmp.map((e) => `<tr><td class="l">${esc(e.name)}</td><td>${e.days} hari</td><td>${rp(e.total)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
