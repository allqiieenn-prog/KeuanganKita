/* Pengeluaran: harian, mingguan, bulanan. Semua dicatat manual pada tanggalnya masing-masing.
   Barang dari "Data barang" mengisi satuan & harga otomatis; total = jumlah barang × harga satuan. */
import { store } from '../store.js';
import { db } from '../db.js';
import { createEntity, deleteEntity, editModal } from '../crud.js';
import { fieldsHTML, readFields, table, badge, toast } from '../ui.js';
import { esc, rp, dm, sum, shrinkImage, $, thousands, num, fmtQty } from '../utils.js';

export const title = 'Pengeluaran';
export const KINDS = [['harian', 'Harian'], ['mingguan', 'Mingguan'], ['bulanan', 'Bulanan']];

export const expenseFields = () => [
  { n: 'date', l: 'Tanggal', t: 'date', req: true },
  { n: 'name', l: 'Barang / nama pengeluaran', req: true, list: 'names', af: true },
  { n: 'qty', l: 'Jumlah barang (qty)', t: 'number', calc: true },
  { n: 'unit', l: 'Satuan' },
  { n: 'unit_price', l: 'Harga satuan (Rp)', t: 'money', calc: true },
  { n: 'amount', l: 'Total (Rp)', t: 'money', req: true },
  { n: 'category', l: 'Kategori', t: 'select', opts: () => store.data.categories.map((c) => [c.name, c.name]) },
  { n: 'kind', l: 'Jenis', t: 'select', opts: KINDS },
  { n: 'note', l: 'Catatan (opsional)' },
];

/* nilai kosong disimpan sebagai null */
export const normalizeExpense = (v) => ({ ...v, qty: v.qty || null, unit: v.unit || null, unit_price: v.unit_price || null, note: v.note || null });

/* saran nama: data barang + nama pengeluaran yang pernah dipakai */
export const namesList = () => [...new Set([...store.data.items.map((i) => i.name), ...store.data.expenses.map((e) => e.name)])].map((n) => `<option value="${esc(n)}">`).join('');

export const expenseForm = (date) => `<form data-form="expense" class="grid-form">${fieldsHTML(expenseFields(), { date, kind: 'harian' })}
  <label class="check"><input type="checkbox" name="save_item"> Simpan ke data barang</label><button class="btn primary">Tambah pengeluaran</button></form>`;

/* Total otomatis = jumlah barang × harga satuan (bisa tetap diketik manual bila tanpa qty) */
export function calcAmount(form) {
  const qty = +form.elements.qty.value, price = num(form.elements.unit_price.value);
  if (qty > 0 && price > 0) form.elements.amount.value = thousands(Math.round(qty * price));
}

/* Memilih nama barang -> satuan, harga, kategori terisi. Nama biasa -> kategori/jenis/jumlah dari input terakhir. */
export function autofill(form) {
  const name = form.elements.name.value.trim().toLowerCase();
  const item = store.data.items.find((i) => i.name.toLowerCase() === name);
  if (item) {
    form.elements.unit.value = item.unit || '';
    form.elements.unit_price.value = thousands(item.price);
    form.elements.category.value = item.category;
    if (!form.elements.qty.value) form.elements.qty.value = 1;
    calcAmount(form); form.elements.qty.focus(); form.elements.qty.select();
    return;
  }
  const last = [...store.data.expenses].reverse().find((e) => e.name.toLowerCase() === name);
  if (!last) return;
  form.elements.category.value = last.category;
  form.elements.kind.value = last.kind;
  if (!form.elements.amount.value) form.elements.amount.value = thousands(last.amount);
}

let filter = 'all';
let photoTarget = null;

const detail = (e) => [e.qty ? `${fmtQty(e.qty)} ${esc(e.unit || '')} × ${rp(e.unit_price)}` : '', esc(e.note || '')].filter(Boolean).join(' · ');

export function render() {
  const { data, month } = store;
  const list = data.expenses.filter((e) => e.date.startsWith(month) && (filter === 'all' || e.kind === filter)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const photoBtns = (e) => (e.photo
    ? `<button class="link" data-act="viewPhoto" data-id="${e.id}">Lihat</button> <button class="link muted" data-act="photo" data-id="${e.id}">Ganti</button>`
    : `<button class="link" data-act="photo" data-id="${e.id}">+ Foto</button>`);
  const rows = list.map((e) => [
    dm(e.date), `<b>${esc(e.name)}</b>${detail(e) ? `<br><small class="muted">${detail(e)}</small>` : ''}`, esc(e.category), badge(e.kind), rp(e.amount), photoBtns(e),
    `<button class="link" data-act="editExpense" data-id="${e.id}">Ubah</button> <button class="link danger" data-act="deleteExpense" data-id="${e.id}">Hapus</button>`,
  ]);
  const cols = [{ h: 'Tanggal' }, { h: 'Nama' }, { h: 'Kategori' }, { h: 'Jenis' }, { h: 'Total', cls: 'num' }, { h: 'Nota' }, { h: '' }];
  return `<section class="card"><h3>Tambah pengeluaran</h3><p class="muted note">Pilih barang dari <a href="#/items" class="link">Data barang</a> agar satuan &amp; harga terisi otomatis. Total = jumlah barang × harga satuan.</p>${expenseForm(store.date)}</section>
    <section class="card"><div class="card-head"><h3>Daftar pengeluaran</h3>
      <div class="chips">${[['all', 'Semua'], ...KINDS].map(([k, l]) => `<button class="chip ${filter === k ? 'on' : ''}" data-act="setFilter" data-k="${k}">${l}</button>`).join('')}</div></div>
      ${table(cols, rows, { foot: ['Total', '', '', '', rp(sum(list, (e) => e.amount)), '', ''], emptyText: 'Belum ada pengeluaran pada filter ini.' })}</section>`;
}

export const forms = {
  async expense(form) {
    const v = normalizeExpense(readFields(form, expenseFields()));
    if (!v.amount) throw new Error('Isi total pengeluaran (atau jumlah barang dan harga satuan).');
    const known = store.data.items.some((i) => i.name.toLowerCase() === v.name.toLowerCase());
    if (form.elements.save_item?.checked && !known && v.unit_price) {
      await createEntity('items', { name: v.name, unit: v.unit, price: v.unit_price, category: v.category });
    }
    await createEntity('expenses', v);
    store.date = v.date; store.month = v.date.slice(0, 7);
    store.rerender(); toast('Pengeluaran tersimpan');
    $('[data-form=expense] [name=name]')?.focus();
  },
};

export const actions = {
  setFilter: (d) => { filter = d.k; store.rerender(); },
  editExpense: (d) => editModal('expenses', expenseFields(), +d.id, 'Ubah pengeluaran', '', normalizeExpense),
  deleteExpense: async (d) => {
    const e = store.data.expenses.find((x) => x.id === +d.id);
    if (await deleteEntity('expenses', +d.id, `Hapus "${e.name}"?`) && e.photo) db.removeNota(e.photo);
  },
  photo: (d) => { photoTarget = +d.id; const input = $('#photoInput'); input.value = ''; input.click(); },
  viewPhoto: async (d) => {
    const e = store.data.expenses.find((x) => x.id === +d.id), win = window.open('', '_blank');
    try { const url = await db.notaUrl(e.photo); win.location = url; } catch (err) { win?.close(); throw err; }
  },
};

export async function uploadPhoto(file) {
  const e = store.data.expenses.find((x) => x.id === photoTarget);
  if (!file || !e) return;
  toast('Mengunggah foto…');
  const path = `${e.id}-${Date.now()}.jpg`;
  await db.uploadNota(path, await shrinkImage(file));
  const row = await db.update('expenses', e.id, { photo: path });
  if (e.photo) db.removeNota(e.photo);
  store.data.expenses = store.data.expenses.map((x) => (x.id === e.id ? row : x));
  store.rerender(); toast('Foto nota tersimpan');
}
