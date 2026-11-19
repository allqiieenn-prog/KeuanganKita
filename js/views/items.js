/* Data barang: nama, satuan, harga satuan, kategori. Diisi sekali, dipakai berulang di Pengeluaran. */
import { store } from '../store.js';
import { createEntity, deleteEntity, editModal } from '../crud.js';
import { fieldsHTML, readFields, table, toast } from '../ui.js';
import { esc, rp, $ } from '../utils.js';

export const title = 'Data barang';

const itemFields = () => [
  { n: 'name', l: 'Nama barang', req: true },
  { n: 'unit', l: 'Satuan (mis. kg, botol, tabung)' },
  { n: 'price', l: 'Harga satuan (Rp)', t: 'money', req: true },
  { n: 'category', l: 'Kategori', t: 'select', opts: () => store.data.categories.map((c) => [c.name, c.name]) },
];
const PRICE_NOTE = 'Harga baru hanya dipakai untuk pengeluaran berikutnya. Pengeluaran yang sudah tercatat tidak berubah.';

export function render() {
  const items = [...store.data.items].sort((a, b) => a.name.localeCompare(b.name));
  const rows = items.map((i) => [`<b>${esc(i.name)}</b>`, esc(i.unit || '-'), rp(i.price), esc(i.category),
    `<button class="link" data-act="editItem" data-id="${i.id}">Ubah</button> <button class="link danger" data-act="deleteItem" data-id="${i.id}">Hapus</button>`]);
  return `<section class="card"><h3>Tambah barang</h3><p class="muted note">Isi sekali. Saat input pengeluaran, pilih nama barang lalu isi jumlahnya; total terhitung otomatis (jumlah × harga satuan).</p>
      <form data-form="item" class="grid-form">${fieldsHTML(itemFields())}<button class="btn primary">Tambah barang</button></form></section>
    <section class="card"><h3>Daftar barang</h3>${table([{ h: 'Barang' }, { h: 'Satuan' }, { h: 'Harga satuan', cls: 'num' }, { h: 'Kategori' }, { h: '' }], rows, { emptyText: 'Belum ada data barang.' })}
      <p class="muted note">${PRICE_NOTE}</p></section>`;
}

export const forms = {
  async item(form) {
    const v = readFields(form, itemFields());
    if (store.data.items.some((i) => i.name.toLowerCase() === v.name.toLowerCase())) throw new Error('Barang dengan nama itu sudah ada.');
    await createEntity('items', { ...v, unit: v.unit || null });
    store.rerender(); toast('Barang tersimpan'); $('[data-form=item] [name=name]')?.focus();
  },
};

export const actions = {
  editItem: (d) => editModal('items', itemFields(), +d.id, 'Ubah barang', PRICE_NOTE, (v) => ({ ...v, unit: v.unit || null })),
  deleteItem: (d) => deleteEntity('items', +d.id, 'Hapus barang ini dari daftar? Pengeluaran yang sudah tercatat tidak berubah.'),
};
