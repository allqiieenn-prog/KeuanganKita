/* Ekspor laporan: Excel (ExcelJS, dimuat saat dibutuhkan) dan cetak/PDF */
import { store } from './store.js';
import { summarize } from './calc.js';
import { toast } from './ui.js';
import { esc, rp, dm, monthLabel, sum, today, loadScript } from './utils.js';

const EXCELJS = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const dmy = (d) => d.split('-').reverse().join('/');
const RP = '"Rp" #,##0';

/* ---------- Excel ---------- */
export async function exportExcel() {
  await loadScript(EXCELJS);
  const s = summarize(store.data, store.month), T = s.totals, wb = new window.ExcelJS.Workbook();
  wb.creator = 'Keuangan Kita';

  /* cols: [{h, w, f: 'rp'|'n'|'c'}] ; rows: array of array ; total: array */
  const sheet = (name, title, cols, rows, total) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
    cols.forEach((c, i) => { ws.getColumn(i + 1).width = c.w || 16; });
    ws.mergeCells(1, 1, 1, cols.length);
    Object.assign(ws.getCell('A1'), { value: title });
    ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF14140F' } };
    ws.getCell('A1').fill = fill('FFC8F169'); ws.getCell('A1').alignment = { vertical: 'middle', indent: 1 }; ws.getRow(1).height = 32;
    ws.mergeCells(2, 1, 2, cols.length);
    ws.getCell('A2').value = `Periode ${monthLabel(store.month)} · hanya data yang sudah diinput`; ws.getCell('A2').font = { italic: true, color: { argb: 'FF7A7894' } };
    const head = ws.getRow(4); head.height = 26;
    cols.forEach((c, i) => {
      const cell = head.getCell(i + 1);
      cell.value = c.h; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = fill('FF26262B');
      cell.alignment = { horizontal: i ? 'center' : 'left', vertical: 'middle', wrapText: true };
    });
    const style = (cell, i) => {
      const c = cols[i];
      if (c.f === 'rp') cell.numFmt = RP; else if (c.f === 'n') cell.numFmt = '#,##0';
      cell.alignment = { horizontal: c.f === 'c' ? 'center' : i && c.f ? 'right' : 'left' };
    };
    rows.forEach((r, ri) => {
      const row = ws.getRow(5 + ri);
      r.forEach((v, i) => {
        const cell = row.getCell(i + 1); cell.value = v; style(cell, i);
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE1E0F0' } } };
        if (ri % 2) cell.fill = fill('FFF6F6FC');
      });
    });
    if (total) {
      const row = ws.getRow(5 + rows.length);
      total.forEach((v, i) => {
        const cell = row.getCell(i + 1); cell.value = v; style(cell, i);
        cell.font = { bold: true }; cell.fill = fill('FFEAF9C8'); cell.border = { top: { style: 'medium', color: { argb: 'FF26262B' } } };
      });
    }
  };

  sheet('Ringkasan', 'Laporan Keuangan Kita', [{ h: 'Keterangan', w: 34 }, { h: 'Nilai', w: 24, f: 'rp' }],
    [['Hari terisi', `${T.days} hari`], ['Total PM', `${T.pm} PM`], ['Dana masuk', T.income], ['Pengeluaran harian', T.harian], ['Pengeluaran mingguan', T.mingguan], ['Pengeluaran bulanan', T.bulanan], ['Gaji pegawai', T.wages], ['Total pengeluaran', T.out]],
    ['SISA DANA', T.net]);
  sheet('Per Hari', 'Rincian Per Hari',
    [{ h: 'Tanggal', w: 13 }, { h: 'PM', w: 9, f: 'n' }, { h: 'Hadir', w: 9, f: 'n' }, { h: 'Dana masuk', w: 16, f: 'rp' }, { h: 'Harian', w: 15, f: 'rp' }, { h: 'Mingguan', w: 15, f: 'rp' }, { h: 'Bulanan', w: 15, f: 'rp' }, { h: 'Gaji', w: 16, f: 'rp' }, { h: 'Total keluar', w: 16, f: 'rp' }, { h: 'Sisa', w: 16, f: 'rp' }, { h: 'Saldo', w: 16, f: 'rp' }],
    s.rows.map((r) => [dmy(r.date), r.pm, r.staff, r.income, r.harian, r.mingguan, r.bulanan, r.wages, r.out, r.net, r.saldo]),
    ['Total', T.pm, '', T.income, T.harian, T.mingguan, T.bulanan, T.wages, T.out, T.net, '']);
  const list = [...s.entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  sheet('Pengeluaran', 'Daftar Pengeluaran', [{ h: 'Tanggal', w: 13 }, { h: 'Nama', w: 30 }, { h: 'Kategori', w: 20 }, { h: 'Jenis', w: 13, f: 'c' }, { h: 'Jumlah', w: 18, f: 'rp' }, { h: 'Catatan', w: 30 }],
    list.map((e) => [dmy(e.date), e.name, e.category, e.kind, +e.amount, e.note || '']), ['Total', '', '', '', sum(list, (e) => e.amount), '']);
  sheet('Kategori', 'Pengeluaran Per Kategori', [{ h: 'Kategori', w: 30 }, { h: 'Total', w: 20, f: 'rp' }], s.byCat.map((c) => [c.name, c.v]), ['Total', T.out]);
  sheet('Gaji Pegawai', 'Gaji Pegawai', [{ h: 'Pegawai', w: 28 }, { h: 'Divisi', w: 20 }, { h: 'Hadir (hari)', w: 14, f: 'n' }, { h: 'Total gaji', w: 20, f: 'rp' }],
    s.byEmp.map((e) => [e.name, store.data.divisions.find((d) => d.id === e.division_id)?.name || '-', e.days, e.total]), ['Total', '', sum(s.byEmp, (e) => e.days), T.wages]);

  const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `keuangan-kita-${store.month}.xlsx` });
  a.click(); toast('Excel diunduh');
}

/* ---------- Cetak / PDF (dengan tanda tangan) ---------- */
const PRINT_CSS = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font:11.5px/1.45 "Segoe UI",Arial,sans-serif;color:#14140f;margin:0}
h1{margin:0;font-size:21px}h2{font-size:13.5px;margin:16px 0 6px;border-bottom:2px solid #9ccf2a;padding-bottom:3px}.sub{color:#666}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfcfd6;padding:3px 6px;text-align:right}th{background:#eef7d6}.l{text-align:left}
tfoot td{font-weight:700;background:#f6f8ee}.sum{display:flex;gap:10px;margin:12px 0}.sum div{flex:1;border:1px solid #cfcfd6;border-radius:8px;padding:7px 10px}.sum b{display:block;font-size:15px}
.sig{display:flex;justify-content:space-around;margin-top:34px;page-break-inside:avoid}.sig div{text-align:center;width:30%}.sig .ln{margin-top:64px;border-top:1px solid #14140f;padding-top:3px;font-weight:700}tr{page-break-inside:avoid}`;

const tableHTML = (head, rows, foot) => `<table><thead><tr>${head.map((h, i) => `<th class="${i ? '' : 'l'}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? '' : 'l'}">${c}</td>`).join('')}</tr>`).join('')}</tbody>${foot ? `<tfoot><tr>${foot.map((c, i) => `<td class="${i ? '' : 'l'}">${c}</td>`).join('')}</tr></tfoot>` : ''}</table>`;

export function printReport() {
  const s = summarize(store.data, store.month), T = s.totals, st = store.data.settings;
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan ${monthLabel(store.month)}</title><style>${PRINT_CSS}</style></head><body>
    <h1>${esc(st.org_name || 'Keuangan Kita')}</h1><div class="sub">Laporan Keuangan · ${monthLabel(store.month)} · Dicetak ${dmy(today())}</div>
    <div class="sum"><div>Dana masuk<b>${rp(T.income)}</b></div><div>Total pengeluaran<b>${rp(T.out)}</b></div><div>Sisa dana<b>${rp(T.net)}</b></div><div>Hari terisi<b>${T.days} hari · ${T.pm} PM</b></div></div>
    <h2>Rincian per hari</h2>${tableHTML(['Tanggal', 'PM', 'Dana masuk', 'Harian', 'Mingguan', 'Bulanan', 'Gaji', 'Total keluar', 'Sisa'],
      s.rows.map((r) => [dm(r.date), r.pm, rp(r.income), rp(r.harian), rp(r.mingguan), rp(r.bulanan), rp(r.wages), rp(r.out), rp(r.net)]),
      ['Total', T.pm, rp(T.income), rp(T.harian), rp(T.mingguan), rp(T.bulanan), rp(T.wages), rp(T.out), rp(T.net)])}
    <h2>Pengeluaran per kategori</h2>${tableHTML(['Kategori', 'Total'], s.byCat.map((c) => [esc(c.name), rp(c.v)]), ['Total', rp(T.out)])}
    <h2>Gaji pegawai</h2>${tableHTML(['Pegawai', 'Hadir', 'Total gaji'], s.byEmp.map((e) => [esc(e.name), e.days + ' hari', rp(e.total)]), ['Total', '', rp(T.wages)])}
    <div class="sig"><div>Dibuat oleh,<div class="ln">${esc(st.sign_by || '………………………')}</div></div><div>Mengetahui,<div class="ln">${esc(st.sign_ok || '………………………')}</div></div></div></body></html>`;
  const w = window.open('', '_blank');
  if (!w) throw new Error('Pop-up diblokir. Izinkan pop-up untuk situs ini.');
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => w.print(), 500);
}
