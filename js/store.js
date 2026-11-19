/* State aplikasi: data dari database + bulan/tanggal yang sedang dibuka */
import { db } from './db.js';
import { today, monthOf } from './utils.js';

function emptyData() {
  return { settings: { id: 1, rate: 3000 }, categories: [], divisions: [], employees: [], days: [], attendance: [], expenses: [], items: [] };
}

export const store = {
  month: monthOf(today()),
  date: today(),
  data: emptyData(),
  rerender: () => {}, // diisi main.js
};

export async function refresh() {
  const d = await db.loadAll();
  d.settings = d.settings[0] || emptyData().settings;
  store.data = d;
}
