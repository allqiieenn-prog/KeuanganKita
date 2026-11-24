/* Input harian: jumlah PM, pegawai yang masuk (klik nama), gaji hari itu, dan pengeluaran hari itu */
import { store } from '../store.js';
import { db } from '../db.js';
import { summarize, activeChecker, defaultActive } from '../calc.js';
import { expenseForm } from './expenses.js';
import { table, badge, toast, PALETTE } from '../ui.js';
import { esc, rp, dm, num, thousands, addDays, dateLabel, $, $$ } from '../utils.js';

export const title = 'Input harian';

export function render() {
  const { data, date } = store;
  const dayRow = data.days.find((x) => x.date === date), isAct = activeChecker(data)(date);
  const att = new Map(data.attendance.filter((a) => a.date === date).map((a) => [a.employee_id, a]));
  const day = summarize(data, date.slice(0, 7)).rows.find((r) => r.date === date) || { pm: 0, income: 0, harian: 0, mingguan: 0, bulanan: 0, wages: 0, out: 0, net: 0, pettyAlloc: 0, pettyUsed: 0, pettyLeft: 0 };
  const entries = data.expenses.filter((e) => e.date === date && !e.petty), pettyList = data.expenses.filter((e) => e.date === date && e.petty);

  const groups = data.divisions.map((v, gi) => {
    const people = data.employees.filter((e) => e.division_id === v.id);
    return `<div class="group" style="--gc:${PALETTE[gi % PALETTE.length]}"><div class="group-head"><b>${esc(v.name)}</b><button type="button" class="btn ghost sm" data-act="toggleDivision" data-id="${v.id}">Pilih semua</button></div>
      ${people.map((e) => { const a = att.get(e.id); return `<label class="staff"><input type="checkbox" name="p${e.id}" data-div="${v.id}" ${a ? 'checked' : ''}><span>${esc(e.name)}</span><input class="money" name="w${e.id}" value="${thousands(a ? a.wage : e.wage)}" title="Gaji hari ini"></label>`; }).join('') || '<p class="muted">Belum ada pegawai di divisi ini.</p>'}</div>`;
  }).join('') || '<p class="muted">Tambahkan divisi dan pegawai dulu di menu Pegawai.</p>';

  const line = (label, value) => `<div class="kv"><span>${label}</span><b>${value}</b></div>`;
  return `<div class="two">
    <form data-form="day" class="card">
      <div class="date-nav"><button type="button" class="btn icon" data-act="shiftDate" data-n="-1">‹</button>
        <input type="date" name="date" value="${date}" data-change="setDate"><button type="button" class="btn icon" data-act="shiftDate" data-n="1">›</button></div>
      <label>Jumlah PM hari ini<input name="pm" type="number" min="0" value="${dayRow?.pm ?? ''}" placeholder="0"></label>
      <label class="check"><input type="checkbox" name="active" ${isAct ? 'checked' : ''}> Hari aktif (hapus centang jika libur / nonaktif)</label>
      <h4>Pegawai yang masuk</h4><p class="muted note">Klik nama untuk menandai hadir. Gaji bisa disesuaikan per hari.</p>${groups}
      <div class="actions"><button class="btn primary">Simpan data ${dm(date)}</button><button type="button" class="btn ghost" data-act="copyPrev">Salin dari kemarin</button></div>
    </form>
    <div>
      <section class="card"><h3>${dateLabel(date)}</h3>
        ${line('Dana masuk (' + day.pm + ' PM)', rp(day.income))}${line('Pengeluaran harian', rp(day.harian))}${line('Pengeluaran mingguan', rp(day.mingguan))}${line('Pengeluaran bulanan', rp(day.bulanan))}${line('Gaji pegawai', rp(day.wages))}
        ${line('Sisa hari ini', `<span class="${day.net < 0 ? 'neg' : 'pos'}">${rp(day.net)}</span>`)}<p class="muted note">Angka ini menyesuaikan setelah data disimpan.${isAct ? '' : ' Hari ini nonaktif, jadi tidak ikut pembagian biaya mingguan/bulanan.'}</p></section>
      <section class="card"><h3>Petty cash ${dm(date)}</h3>
        ${+data.settings.petty_daily > 0 ? '' : '<p class="muted note">Petty cash harian belum diatur. Isi di Pengaturan.</p>'}
        ${line('Dialokasikan (otomatis)', rp(day.pettyAlloc))}${line('Terpakai (belanja)', rp(day.pettyUsed))}${line('Sisa petty cash', `<span class="${day.pettyLeft < 0 ? 'neg' : 'pos'}">${rp(day.pettyLeft)}</span>`)}
        <h4>Catat belanja petty cash</h4>${expenseForm(date, { petty: true })}
        ${table([{ h: 'Barang' }, { h: 'Kategori' }, { h: 'Jumlah', cls: 'num' }], pettyList.map((e) => [esc(e.name), esc(e.category), rp(e.amount)]), { emptyText: 'Belum ada belanja petty cash hari ini.' })}
        <p class="muted note">Jatah petty cash dipotong otomatis pada hari aktif yang sudah terisi.</p></section>
      <section class="card"><h3>Tambah pengeluaran ${dm(date)}</h3>${expenseForm(date)}
        ${table([{ h: 'Nama' }, { h: 'Jenis' }, { h: 'Jumlah', cls: 'num' }], entries.map((e) => [esc(e.name), badge(e.kind), rp(e.amount)]), { emptyText: 'Belum ada pengeluaran hari ini.' })}</section>
    </div></div>`;
}

export const forms = {
  async day(form) {
    const date = form.elements.date.value, pm = form.elements.pm.value, { data } = store;
    const want = form.elements.active.checked, override = want === defaultActive(data, date) ? null : want; // null = ikut hari kerja rutin
    const [dayRow] = await db.upsert('days', [{ date, pm: pm === '' ? null : +pm, active: override }], 'date');
    const present = data.employees.filter((e) => form.elements['p' + e.id]?.checked).map((e) => ({ date, employee_id: e.id, wage: num(form.elements['w' + e.id].value) }));
    await db.removeWhere('attendance', 'date', date);
    const saved = present.length ? await db.insert('attendance', present) : [];
    data.days = [...data.days.filter((x) => x.date !== date), dayRow];
    data.attendance = [...data.attendance.filter((a) => a.date !== date), ...saved];
    toast(`Data ${dm(date)} tersimpan`); store.rerender();
  },
};

export const actions = {
  setDate: (d, el) => { if (el.value) { store.date = el.value; store.month = el.value.slice(0, 7); store.rerender(); } },
  shiftDate: (d) => { store.date = addDays(store.date, +d.n); store.month = store.date.slice(0, 7); store.rerender(); },
  toggleDivision: (d) => {
    const boxes = $$(`input[data-div="${d.id}"]`), all = boxes.every((b) => b.checked);
    boxes.forEach((b) => { b.checked = !all; });
  },
  /* isi formulir dari data kemarin (belum tersimpan sampai tombol Simpan ditekan) */
  copyPrev: () => {
    const prev = addDays(store.date, -1), { data } = store;
    const yDay = data.days.find((x) => x.date === prev), yAtt = new Map(data.attendance.filter((a) => a.date === prev).map((a) => [a.employee_id, a]));
    if (!yDay && !yAtt.size) throw new Error(`Data ${dm(prev)} masih kosong.`);
    $('[name=pm]').value = yDay?.pm ?? '';
    data.employees.forEach((e) => {
      const a = yAtt.get(e.id);
      $(`[name=p${e.id}]`).checked = !!a;
      if (a) $(`[name=w${e.id}]`).value = thousands(a.wage);
    });
    toast(`Terisi dari ${dm(prev)}. Cek lalu simpan.`);
  },
};
