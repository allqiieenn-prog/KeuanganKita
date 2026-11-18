/* Pengeluaran: harian, mingguan, bulanan. Semua dicatat manual pada tanggalnya masing-masing. */
import { store } from '../store.js';
import { db } from '../db.js';
import { createEntity, deleteEntity, editModal } from '../crud.js';
import { fieldsHTML, readFields, table, badge, toast } from '../ui.js';
import { esc, rp, dm, sum, shrinkImage, $, thousands } from '../utils.js';

export const title = 'Pengeluaran';
export const KINDS = [['harian', 'Harian'], ['mingguan', 'Mingguan'], ['bulanan', 'Bulanan']];

export const expenseFields = () => [
  { n: 'date', l: 'Tanggal', t: 'date', req: true },
  { n: 'name', l: 'Nama pengeluaran', req: true, list: 'names', af: true },
  { n: 'category', l: 'Kategori', t: 'select', opts: () => store.data.categories.map((c) => [c.name, c.name]) },
  { n: 'kind', l: 'Jenis', t: 'select', opts: KINDS },
  { n: 'amount', l: 'Jumlah (Rp)', t: 'money', req: true },
  { n: 'note', l: 'Catatan (opsional)' },
];

/* daftar nama yang pernah dipakai, untuk saran saat mengetik */
export const namesList = () => [...new Set(store.data.expenses.map((e) => e.name))].map((n) => `<option value="${esc(n)}">`).join('');

export const expenseForm = (date) => `<form data-form="expense" class="grid-form">${fieldsHTML(expenseFields(), { date, kind: 'harian' })}<button class="btn primary">Tambah pengeluaran</button></form>`;

/* Pilih nama yang pernah dipakai -> kategori, jenis, dan jumlah terisi otomatis */
export function autofill(form) {
  const name = form.elements.name.value.trim().toLowerCase();
  const last = [...store.data.expenses].reverse().find((e) => e.name.toLowerCase() === name);
  if (!last) return;
  form.elements.category.value = last.category;
  form.elements.kind.value = last.kind;
  if (!form.elements.amount.value) form.elements.amount.value = thousands(last.amount);
}

let filter = 'all';
let photoTarget = null;

export function render() {
  const { data, month } = store;
  const list = data.expenses.filter((e) => e.date.startsWith(month) && (filter === 'all' || e.kind === filter)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const photoBtns = (e) => (e.photo
    ? `<button class="link" data-act="viewPhoto" data-id="${e.id}">Lihat</button> <button class="link muted" data-act="photo" data-id="${e.id}">Ganti</button>`
    : `<button class="link" data-act="photo" data-id="${e.id}">+ Foto</button>`);
  const rows = list.map((e) => [
    dm(e.date), `<b>${esc(e.name)}</b>${e.note ? `<br><small class="muted">${esc(e.note)}</small>` : ''}`, esc(e.category), badge(e.kind), rp(e.amount), photoBtns(e),
    `<button class="link" data-act="editExpense" data-id="${e.id}">Ubah</button> <button class="link danger" data-act="deleteExpense" data-id="${e.id}">Hapus</button>`,
  ]);
  const cols = [{ h: 'Tanggal' }, { h: 'Nama' }, { h: 'Kategori' }, { h: 'Jenis' }, { h: 'Jumlah', cls: 'num' }, { h: 'Nota' }, { h: '' }];
  return `<section class="card"><h3>Tambah pengeluaran</h3>${expenseForm(store.date)}</section>
    <section class="card"><div class="card-head"><h3>Daftar pengeluaran</h3>
      <div class="chips">${[['all', 'Semua'], ...KINDS].map(([k, l]) => `<button class="chip ${filter === k ? 'on' : ''}" data-act="setFilter" data-k="${k}">${l}</button>`).join('')}</div></div>
      ${table(cols, rows, { foot: ['Total', '', '', '', rp(sum(list, (e) => e.amount)), '', ''], emptyText: 'Belum ada pengeluaran pada filter ini.' })}</section>`;
}

export const forms = {
  async expense(form) {
    const v = readFields(form, expenseFields());
    if (!v.amount) throw new Error('Isi jumlah pengeluaran.');
    await createEntity('expenses', v);
    store.date = v.date; store.month = v.date.slice(0, 7);
    store.rerender(); toast('Pengeluaran tersimpan');
    $('[data-form=expense] [name=name]')?.focus();
  },
};

export const actions = {
  setFilter: (d) => { filter = d.k; store.rerender(); },
  editExpense: (d) => editModal('expenses', expenseFields(), +d.id, 'Ubah pengeluaran'),
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
