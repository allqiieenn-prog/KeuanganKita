/* Operasi tambah / ubah / hapus yang dipakai semua halaman */
import { db } from './db.js';
import { store } from './store.js';
import { modal, fieldsHTML, readFields, toast } from './ui.js';

export async function createEntity(key, values) {
  const [row] = await db.insert(key, values);
  store.data[key].push(row);
  return row;
}

export async function updateEntity(key, id, values) {
  const row = await db.update(key, id, values);
  store.data[key] = store.data[key].map((x) => (x.id === id ? row : x));
  return row;
}

export async function deleteEntity(key, id, message = 'Hapus data ini?') {
  if (!confirm(message)) return false;
  await db.remove(key, id);
  store.data[key] = store.data[key].filter((x) => x.id !== id);
  store.rerender();
  return true;
}

/* Jendela ubah data berdasarkan definisi kolom */
export function editModal(key, fields, id, title, note = '') {
  const item = store.data[key].find((x) => x.id === id);
  modal({
    title, body: fieldsHTML(fields, item) + (note ? `<p class="muted note">${note}</p>` : ''),
    onSubmit: async (form) => { await updateEntity(key, id, readFields(form, fields)); store.rerender(); toast('Perubahan tersimpan'); },
  });
}
