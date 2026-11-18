/* Fungsi bantu umum: DOM, format angka & tanggal */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sum = (arr, fn = (x) => x) => arr.reduce((t, x) => t + (+fn(x) || 0), 0);

/* ---------- angka ---------- */
export const thousands = (n) => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const rp = (n) => (n < 0 ? '-' : '') + 'Rp' + thousands(Math.abs(n));
export const num = (s) => +String(s ?? '').replace(/\D/g, '') || 0; // "1.500.000" -> 1500000
export const short = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' jt' : v >= 1e3 ? Math.round(v / 1e3) + ' rb' : String(Math.round(v)));

/* ---------- tanggal ---------- */
export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const addDays = (d, n) => { const x = new Date(d + 'T00:00'); x.setDate(x.getDate() + n); return iso(x); };
export const monthOf = (d) => d.slice(0, 7);
export const shiftMonth = (m, n) => { const [y, o] = m.split('-').map(Number); return iso(new Date(y, o - 1 + n, 1)).slice(0, 7); };
export const daysIn = (m) => { const [y, o] = m.split('-').map(Number); return new Date(y, o, 0).getDate(); };
export const dm = (d) => `${d.slice(8)}/${d.slice(5, 7)}`;
export const monthLabel = (m) => `${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
export const dateLabel = (d) => `${+d.slice(8)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;

/* ---------- browser ---------- */
export const loadScript = (url) => new Promise((ok, no) => {
  if ([...document.scripts].some((s) => s.src === url)) return ok();
  const s = document.createElement('script');
  s.src = url; s.onload = ok; s.onerror = () => no(new Error('Gagal memuat library. Periksa koneksi internet.'));
  document.head.append(s);
});

/* Perkecil foto nota sebelum diunggah (hemat penyimpanan) */
export const shrinkImage = (file, max = 1280) => new Promise((ok, no) => {
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => (b ? ok(b) : no(new Error('Gagal memproses foto'))), 'image/jpeg', 0.8);
  };
  img.onerror = () => no(new Error('File bukan gambar'));
  img.src = URL.createObjectURL(file);
});
