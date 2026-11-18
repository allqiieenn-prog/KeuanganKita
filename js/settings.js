/* Pengaturan: tarif per PM, identitas laporan, kategori */
import { store } from '../store.js';
import { db } from '../db.js';
import { createEntity, deleteEntity } from '../crud.js';
import { fieldsHTML, readFields, table, toast } from '../ui.js';
import { esc } from '../utils.js';

export const title = 'Pengaturan';

const settingFields = [
  { n: 'rate', l: 'Dana per PM per hari (Rp)', t: 'money', req: true },
  { n: 'org_name', l: 'Nama organisasi / perusahaan' },
  { n: 'sign_by', l: 'Nama pembuat laporan' },
  { n: 'sign_ok', l: 'Nama yang mengetahui' },
];
const categoryFields = [{ n: 'name', l: 'Nama kategori', req: true }];

export function render() {
  const { data } = store;
  return `<div class="two">
    <section class="card"><h3>Dana &amp; laporan</h3><form data-form="settings" class="stack">${fieldsHTML(settingFields, data.settings)}<button class="btn primary">Simpan pengaturan</button></form></section>
    <section class="card"><h3>Kategori pengeluaran</h3><form data-form="category" class="grid-form">${fieldsHTML(categoryFields)}<button class="btn primary">Tambah kategori</button></form>
      ${table([{ h: 'Kategori' }, { h: '' }], data.categories.map((c) => [esc(c.name), `<button class="link danger" data-act="deleteCategory" data-id="${c.id}">Hapus</button>`]), { emptyText: 'Belum ada kategori.' })}
      <p class="muted note">Menghapus kategori tidak mengubah pengeluaran yang sudah tercatat.</p></section></div>`;
}

export const forms = {
  async settings(form) {
    const [row] = await db.upsert('settings', [{ id: 1, ...readFields(form, settingFields) }], 'id');
    store.data.settings = row; store.rerender(); toast('Pengaturan tersimpan');
  },
  async category(form) { await createEntity('categories', readFields(form, categoryFields)); store.rerender(); toast('Kategori tersimpan'); },
};

export const actions = {
  deleteCategory: (d) => deleteEntity('categories', +d.id, 'Hapus kategori ini?'),
};
