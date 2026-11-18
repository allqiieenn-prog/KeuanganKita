/* Komponen tampilan yang dipakai berulang: toast, modal, formulir, tabel, grafik, kalender */
import { esc, num, thousands, rp, short, sum, daysIn, today } from './utils.js';

export const PALETTE = ['var(--lime)', 'var(--orange)', 'var(--purple)', 'var(--yellow)', 'var(--blue)', 'var(--pink)'];
export const empty = (msg) => `<p class="muted empty">${msg}</p>`;
export const badge = (kind) => `<span class="badge ${kind}">${kind}</span>`;
export const icon = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2800);
}

/* ---------- formulir berbasis definisi kolom ---------- */
/* kolom: { n: nama, l: label, t: text|number|money|date|select, opts, req, int, list, af } */
export function fieldHTML(f, values = {}) {
  const val = values[f.n] ?? f.def ?? '';
  let input;
  if (f.t === 'select') {
    let opts = typeof f.opts === 'function' ? f.opts() : f.opts;
    if (val !== '' && !opts.some((o) => String(o[0]) === String(val))) opts = [...opts, [val, val]]; // nilai lama yang sudah tidak ada di daftar
    input = `<select name="${f.n}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (f.t === 'money') {
    input = `<input name="${f.n}" class="money" inputmode="numeric" value="${val === '' ? '' : thousands(val)}" ${f.req ? 'required' : ''} autocomplete="off">`;
  } else {
    input = `<input name="${f.n}" type="${f.t || 'text'}" value="${esc(val)}" ${f.t === 'number' ? 'min="0" step="any"' : ''} ${f.list ? `list="${f.list}"` : ''} ${f.af ? 'data-autofill' : ''} ${f.req ? 'required' : ''} autocomplete="off">`;
  }
  return `<label>${f.l}${input}</label>`;
}
export const fieldsHTML = (fields, values) => fields.map((f) => fieldHTML(f, values)).join('');

export function readFields(form, fields) {
  const out = {};
  for (const f of fields) {
    const raw = form.elements[f.n].value;
    out[f.n] = f.t === 'money' ? num(raw) : f.t === 'number' ? +raw || 0 : f.int ? +raw : raw.trim();
  }
  return out;
}

/* ---------- modal ---------- */
export function modal({ title, body, submit = 'Simpan', onSubmit }) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<form class="modal-box"><h3>${title}</h3><div class="fields">${body}</div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Batal</button><button class="btn primary">${submit}</button></div></form>`;
  const close = () => el.remove();
  el.addEventListener('click', (e) => { if (e.target === el || e.target.dataset.close !== undefined) close(); });
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await onSubmit(e.target); close(); } catch (err) { toast(err.message || 'Gagal menyimpan'); }
  });
  document.body.append(el);
  el.querySelector('input,select')?.focus();
}

/* ---------- tabel ---------- */
/* cols: [{h, cls}], rows: array of array sel HTML */
export function table(cols, rows, { foot, emptyText = 'Belum ada data.' } = {}) {
  const td = (c, i) => `<td class="${cols[i]?.cls || ''}">${c}</td>`;
  return `<div class="scroll"><table><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}">${c.h}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map((r) => `<tr>${r.map(td).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" class="muted">${emptyText}</td></tr>`}</tbody>
    ${foot ? `<tfoot><tr>${foot.map(td).join('')}</tr></tfoot>` : ''}</table></div>`;
}

/* ---------- grafik (SVG) ---------- */
export function barChart(rows) { // rows: [{label, a (dana masuk), b (pengeluaran)}]
  if (!rows.length) return empty('Belum ada data harian bulan ini.');
  const W = 640, H = 230, P = { l: 44, r: 8, t: 10, b: 26 }, iw = W - P.l - P.r, ih = H - P.t - P.b;
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b])), gw = iw / rows.length, bw = Math.min(16, gw / 3), y = (v) => P.t + ih - (v / max) * ih;
  const step = Math.ceil(rows.length / 10);
  const grid = [0, 1, 2, 3, 4].map((i) => { const v = (max * i) / 4; return `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end" class="axis">${short(v)}</text>`; }).join('');
  const bars = rows.map((r, i) => {
    const x = P.l + i * gw + gw / 2;
    return `<rect x="${x - bw - 1}" y="${y(r.a)}" width="${bw}" height="${Math.max(0, P.t + ih - y(r.a))}" rx="4" fill="url(#hatch)" class="bar-a"><title>${r.label} · Dana masuk ${rp(r.a)}</title></rect>
      <rect x="${x + 1}" y="${y(r.b)}" width="${bw}" height="${Math.max(0, P.t + ih - y(r.b))}" rx="4" class="bar-b"><title>${r.label} · Pengeluaran ${rp(r.b)}</title></rect>
      ${i % step ? '' : `<text x="${x}" y="${H - 8}" text-anchor="middle" class="axis">${r.label}</text>`}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart"><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="hatch-bg"/><line x1="0" y1="0" x2="0" y2="6" class="hatch-line"/></pattern></defs>${grid}${bars}</svg>
    <div class="legend"><span><i class="dot lime"></i>Dana masuk</span><span><i class="dot purple"></i>Pengeluaran</span></div>`;
}

export function donut(parts, center) { // parts: [{n, v, c}]
  const R = 62, C = 2 * Math.PI * R, total = sum(parts, (p) => p.v) || 1;
  let offset = 0;
  const segs = parts.filter((p) => p.v > 0).map((p) => {
    const len = (p.v / total) * C, dash = Math.max(0, len - 3);
    const s = `<circle cx="90" cy="90" r="${R}" fill="none" stroke-width="26" style="stroke:${p.c}" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}"><title>${esc(p.n)}: ${rp(p.v)}</title></circle>`;
    offset += len; return s;
  }).join('');
  return `<svg viewBox="0 0 180 180" class="donut"><g transform="rotate(-90 90 90)">${segs}</g><text x="90" y="86" text-anchor="middle" class="axis">${esc(center[0])}</text><text x="90" y="106" text-anchor="middle" class="donut-v">${esc(center[1])}</text></svg>`;
}

export function lineChart(points) { // points: [{label, v}]
  if (points.length < 2) return empty('Butuh minimal 2 hari data.');
  const W = 320, H = 110, P = 8, vs = points.map((p) => p.v), min = Math.min(0, ...vs), max = Math.max(1, ...vs);
  const x = (i) => P + (i * (W - 2 * P)) / (points.length - 1), y = (v) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const pts = points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart"><polyline points="${pts}" fill="none" class="line"/>${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="3.5" class="line-dot"><title>${p.label} · ${rp(p.v)}</title></circle>`).join('')}</svg>`;
}

export function miniBars(values) {
  const v = values.slice(-8), max = Math.max(1, ...v), w = 80 / Math.max(v.length, 1);
  return `<svg viewBox="0 0 80 36" class="mini">${v.map((n, i) => `<rect x="${i * w + 1}" y="${36 - Math.max(3, (n / max) * 34)}" width="${w - 3}" height="${Math.max(3, (n / max) * 34)}" rx="3" class="${i === v.length - 1 ? 'hi' : ''}"/>`).join('')}</svg>`;
}

export const progress = (pct, cls = '') => `<div class="progress ${cls}"><i style="width:${Math.min(100, Math.max(0, pct))}%"></i></div>`;

/* ---------- kalender bulanan ---------- */
export function calendar({ month, selected, filled }) {
  const [y, m] = month.split('-').map(Number), off = (new Date(y, m - 1, 1).getDay() + 6) % 7, now = today();
  const days = Array.from({ length: daysIn(month) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  return `<div class="cal">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => `<span class="cal-h">${d}</span>`).join('')}
    ${'<span></span>'.repeat(off)}${days.map((d) => `<button class="cal-d ${filled.has(d) ? 'has' : ''} ${d === now ? 'today' : ''} ${d === selected ? 'sel' : ''}" data-act="pickDate" data-date="${d}">${+d.slice(8)}</button>`).join('')}</div>`;
}
