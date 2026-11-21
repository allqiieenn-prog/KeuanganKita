/* Pengaturan: dana per PM, identitas laporan, kategori (bisa diubah) */
import { store } from '../store.js';
import { db } from '../db.js';
import { createEntity, updateEntity, deleteEntity } from '../crud.js';
import { fieldsHTML, readFields, table, toast, modal, calendar } from '../ui.js';
import { activeChecker, defaultActive, DEFAULT_WORK_DAYS } from '../calc.js';
import { CLUSTER_NAMES, DEFAULT_CLUSTER } from '../clusters.js';
import { esc, dm, monthLabel, monthDays } from '../utils.js';

export const title = 'Pengaturan';

const settingFields = [
  { n: 'rate', l: 'Dana per PM per hari (Rp)', t: 'money', req: true },
  { n: 'org_name', l: 'Nama organisasi / perusahaan' },
  { n: 'sign_by', l: 'Nama pembuat laporan' },
  { n: 'sign_ok', l: 'Nama yang mengetahui' },
];
const WEEK = [[1, 'Sen'], [2, 'Sel'], [3, 'Rab'], [4, 'Kam'], [5, 'Jum'], [6, 'Sab'], [0, 'Min']];

/* hari kerja rutin + kalender untuk menandai tanggal aktif / nonaktif */
function activeDaysCard() {
  const { data, month } = store, isActive = activeChecker(data), work = data.settings.work_days || DEFAULT_WORK_DAYS;
  const inactive = new Set(monthDays(month).filter((d) => !isActive(d)));
  return `<div class="two">
    <section class="card"><h3>Hari kerja rutin</h3><p class="muted note">Hari yang dicentang dianggap aktif setiap minggu. Dipakai untuk membagi biaya mingguan dan bulanan.</p>
      <form data-form="workdays" class="stack"><div class="chips">${WEEK.map(([v, l]) => `<label class="check chip-check"><input type="checkbox" name="wd" value="${v}" ${work.includes(v) ? 'checked' : ''}> ${l}</label>`).join('')}</div><button class="btn primary">Simpan hari kerja</button></form></section>
    <section class="card"><div class="card-head"><h3>Kalender ${monthLabel(month)}</h3><small class="muted">Klik tanggal untuk aktif / nonaktif</small></div>
      ${calendar({ month, selected: null, inactive, action: 'toggleActive' })}<p class="legend-note">Tanggal yang dicoret = nonaktif (libur). Pengecualian per tanggal mengalahkan hari kerja rutin.</p></section></div>`;
}

const categoryFields = () => [
  { n: 'name', l: 'Nama kategori', req: true },
  { n: 'cluster', l: 'Klaster laporan', t: 'select', opts: CLUSTER_NAMES.map((n) => [n, n]) },
];

export function render() {
  const { data } = store;
  const rows = data.categories.map((c) => [esc(c.name), esc(c.cluster || DEFAULT_CLUSTER),
    `<button class="link" data-act="editCategory" data-id="${c.id}">Ubah</button> <button class="link danger" data-act="deleteCategory" data-id="${c.id}">Hapus</button>`]);
  return `<div class="two">
    <section class="card"><h3>Dana &amp; laporan</h3><form data-form="settings" class="stack">${fieldsHTML(settingFields, data.settings)}<button class="btn primary">Simpan pengaturan</button></form></section>
    <section class="card"><h3>Kategori pengeluaran</h3><form data-form="category" class="grid-form">${fieldsHTML(categoryFields(), { cluster: DEFAULT_CLUSTER })}<button class="btn primary">Tambah kategori</button></form>
      ${table([{ h: 'Kategori' }, { h: 'Klaster laporan' }, { h: '' }], rows, { emptyText: 'Belum ada kategori.' })}
      <p class="muted note">Klaster dipakai di halaman Laporan untuk mengelompokkan biaya. Mengganti nama kategori ikut mengubah nama pada pengeluaran yang sudah tercatat. Menghapus kategori tidak mengubah pengeluaran yang sudah tercatat.</p></section></div>
    ${activeDaysCard()}`;
}

export const forms = {
  async settings(form) {
    const [row] = await db.upsert('settings', [{ id: 1, ...readFields(form, settingFields) }], 'id');
    store.data.settings = row; store.rerender(); toast('Pengaturan tersimpan');
  },
  async workdays(form) {
    const days = [...form.querySelectorAll('[name=wd]:checked')].map((x) => +x.value);
    if (!days.length) throw new Error('Pilih minimal satu hari kerja.');
    const [row] = await db.upsert('settings', [{ id: 1, work_days: days }], 'id');
    store.data.settings = row; store.rerender(); toast('Hari kerja tersimpan');
  },
  async category(form) { await createEntity('categories', readFields(form, categoryFields())); store.rerender(); toast('Kategori tersimpan'); },
};

export const actions = {
  async toggleActive(d) {
    const { data } = store, date = d.date, want = !activeChecker(data)(date), override = want === defaultActive(data, date) ? null : want;
    const [row] = await db.upsert('days', [{ date, active: override }], 'date');
    data.days = [...data.days.filter((x) => x.date !== date), row];
    store.rerender(); toast(`${dm(date)} ${want ? 'diaktifkan' : 'dinonaktifkan'}`);
  },
  editCategory(d) {
    const cat = store.data.categories.find((c) => c.id === +d.id);
    modal({
      title: 'Ubah kategori',
      body: fieldsHTML(categoryFields(), cat) + '<p class="muted note">Mengganti nama juga mengubah nama pada pengeluaran yang sudah tercatat.</p>',
      onSubmit: async (form) => {
        const v = readFields(form, categoryFields());
        await updateEntity('categories', cat.id, v);
        if (v.name !== cat.name) { // samakan nama pada pengeluaran lama
          await db.updateWhere('expenses', 'category', cat.name, { category: v.name });
          store.data.expenses = store.data.expenses.map((e) => (e.category === cat.name ? { ...e, category: v.name } : e));
        }
        store.rerender(); toast('Kategori diperbarui');
      },
    });
  },
  deleteCategory: (d) => deleteEntity('categories', +d.id, 'Hapus kategori ini?'),
};
