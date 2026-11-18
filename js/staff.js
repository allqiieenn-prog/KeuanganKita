/* Pegawai & divisi */
import { store, refresh } from '../store.js';
import { summarize } from '../calc.js';
import { createEntity, deleteEntity, editModal } from '../crud.js';
import { fieldsHTML, readFields, table, toast } from '../ui.js';
import { esc, rp, monthLabel, $ } from '../utils.js';

export const title = 'Pegawai';

const divisionFields = [{ n: 'name', l: 'Nama divisi', req: true }];
const employeeFields = () => [
  { n: 'name', l: 'Nama pegawai', req: true },
  { n: 'division_id', l: 'Divisi', t: 'select', int: true, opts: () => store.data.divisions.map((d) => [d.id, d.name]) },
  { n: 'wage', l: 'Gaji per hari (Rp)', t: 'money', req: true },
];
const WAGE_NOTE = 'Perubahan gaji hanya berlaku untuk hari yang diinput setelahnya. Gaji pada hari yang sudah tercatat tidak berubah.';

export function render() {
  const { data, month } = store, s = summarize(data, month), stats = new Map(s.byEmp.map((e) => [e.id, e]));
  const divName = (id) => esc(data.divisions.find((d) => d.id === id)?.name || '-');
  const empRows = data.employees.map((e) => [
    `<b>${esc(e.name)}</b>`, divName(e.division_id), rp(e.wage), `${stats.get(e.id)?.days || 0} hari`, rp(stats.get(e.id)?.total || 0),
    `<button class="link" data-act="editEmployee" data-id="${e.id}">Ubah</button> <button class="link danger" data-act="deleteEmployee" data-id="${e.id}">Hapus</button>`,
  ]);
  return `<div class="two">
    <section class="card"><h3>Divisi</h3><form data-form="division" class="grid-form">${fieldsHTML(divisionFields)}<button class="btn primary">Tambah divisi</button></form>
      ${table([{ h: 'Divisi' }, { h: '' }], data.divisions.map((d) => [esc(d.name), `<button class="link" data-act="editDivision" data-id="${d.id}">Ubah</button> <button class="link danger" data-act="deleteDivision" data-id="${d.id}">Hapus</button>`]), { emptyText: 'Belum ada divisi.' })}</section>
    <section class="card"><h3>Tambah pegawai</h3><form data-form="employee" class="grid-form">${fieldsHTML(employeeFields())}<button class="btn primary">Tambah pegawai</button></form></section></div>
    <section class="card"><h3>Data pegawai</h3><p class="muted note">Hadir &amp; total gaji = ${monthLabel(month)}, dari kehadiran yang sudah diinput.</p>
      ${table([{ h: 'Nama' }, { h: 'Divisi' }, { h: 'Gaji/hari', cls: 'num' }, { h: 'Hadir', cls: 'num' }, { h: 'Total gaji', cls: 'num' }, { h: '' }], empRows, { foot: ['Total', '', '', '', rp(s.totals.wages), ''], emptyText: 'Belum ada pegawai.' })}</section>`;
}

export const forms = {
  async division(form) { await createEntity('divisions', readFields(form, divisionFields)); store.rerender(); toast('Divisi tersimpan'); },
  async employee(form) {
    const v = readFields(form, employeeFields());
    if (!v.division_id) throw new Error('Tambahkan divisi dulu.');
    await createEntity('employees', v); store.rerender(); toast('Pegawai tersimpan');
    $('[data-form=employee] [name=name]')?.focus();
  },
};

const removeAndSync = async (key, id, msg) => { if (await deleteEntity(key, id, msg)) { await refresh(); store.rerender(); } };

export const actions = {
  editDivision: (d) => editModal('divisions', divisionFields, +d.id, 'Ubah divisi'),
  deleteDivision: (d) => removeAndSync('divisions', +d.id, 'Hapus divisi beserta semua pegawai dan kehadirannya?'),
  editEmployee: (d) => editModal('employees', employeeFields(), +d.id, 'Ubah pegawai', WAGE_NOTE),
  deleteEmployee: (d) => removeAndSync('employees', +d.id, 'Hapus pegawai beserta riwayat kehadirannya?'),
};
