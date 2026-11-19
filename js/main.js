/* Titik masuk: login, kerangka halaman, router, dan penghubung semua event */
import { $, $$, monthLabel, shiftMonth, dateLabel } from './utils.js';
import { configured, db } from './db.js';
import { store, refresh } from './store.js';
import { toast, icon } from './ui.js';
import { formatMoneyInput } from './money.js';
import * as dashboard from './views/dashboard.js';
import * as daily from './views/daily.js';
import * as expenses from './views/expenses.js';
import * as items from './views/items.js';
import * as staff from './views/staff.js';
import * as report from './views/report.js';
import * as settings from './views/settings.js';

/* id halaman -> modul + ikon di menu samping */
const ROUTES = {
  dashboard: { view: dashboard, icon: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z' },
  daily: { view: daily, icon: 'M7 3v4M17 3v4M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
  expenses: { view: expenses, icon: 'M3 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h3' },
  items: { view: items, icon: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8' },
  staff: { view: staff, icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
  report: { view: report, icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  settings: { view: settings, icon: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M14 4v4M8 10v4M16 16v4' },
};
const LOGOUT = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9';

/* penangan aksi (data-act) dan formulir (data-form) dikumpulkan dari semua halaman */
const actions = {
  month: (d) => { store.month = shiftMonth(store.month, +d.n); store.rerender(); },
  logout: async () => { await db.signOut(); showLogin(); },
  ...Object.assign({}, ...Object.values(ROUTES).map((r) => r.view.actions || {})),
};
const forms = {
  login: async (f) => { await db.signIn(f.elements.email.value, f.elements.password.value); await boot(); },
  ...Object.assign({}, ...Object.values(ROUTES).map((r) => r.view.forms || {})),
};

/* ---------- tampilan kerangka ---------- */
function showMessage(html) { $('#app').innerHTML = `<div class="login card">${html}</div>`; }

function showLogin() {
  showMessage(`<h2>💚 Keuangan Kita</h2><p class="muted">Masuk untuk mengelola keuangan.</p>
    <form data-form="login" class="stack"><label>Email<input name="email" type="email" required></label><label>Kata sandi<input name="password" type="password" required></label><button class="btn primary">Masuk</button></form>`);
}

function shell() {
  $('#app').innerHTML = `<div class="shell">
    <nav class="rail"><div class="brand">KK</div>
      ${Object.entries(ROUTES).map(([id, r]) => `<a href="#/${id}" class="rail-link" data-route="${id}" title="${r.view.title}">${icon(r.icon)}</a>`).join('')}
      <button class="rail-link out" data-act="logout" title="Keluar">${icon(LOGOUT)}</button></nav>
    <main class="main"><header class="top"><div><h1 id="title"></h1><p class="muted" id="subtitle"></p></div>
      <div class="top-actions"><div class="month-nav"><button class="btn icon" data-act="month" data-n="-1">‹</button><b id="monthLabel"></b><button class="btn icon" data-act="month" data-n="1">›</button></div>
      <a class="btn primary" href="#/expenses">+ Pengeluaran</a></div></header>
      <div id="view"></div></main></div>`;
}

const currentRoute = () => { const id = location.hash.replace('#/', ''); return ROUTES[id] ? id : 'dashboard'; };

function render() {
  if (!$('#view')) return;
  const id = currentRoute(), view = ROUTES[id].view;
  $$('.rail-link[data-route]').forEach((a) => a.classList.toggle('on', a.dataset.route === id));
  $('#title').textContent = view.title;
  $('#subtitle').textContent = id === 'daily' ? dateLabel(store.date) : 'Hanya menampilkan data dari hari yang sudah diinput';
  $('#monthLabel').textContent = monthLabel(store.month);
  $('#view').innerHTML = view.render();
  $('#names').innerHTML = expenses.namesList();
}

async function boot() {
  try { await refresh(); } catch (e) { return showMessage(`<h2>Gagal memuat data</h2><p class="muted">${e.message}</p><p class="muted">Pastikan <code>sql/schema.sql</code> (instalasi baru) atau <code>sql/update-v3.sql</code> (pembaruan) sudah dijalankan di Supabase.</p>`); }
  store.rerender = render;
  shell(); render();
}

/* ---------- event ---------- */
const guard = async (fn) => { try { await fn(); } catch (err) { console.error(err); toast(err.message || 'Terjadi kesalahan'); } };

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el) guard(() => actions[el.dataset.act]?.(el.dataset, el, e));
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (form) { e.preventDefault(); guard(() => forms[form.dataset.form]?.(form)); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.change) guard(() => actions[t.dataset.change]?.(t.dataset, t, e));
  else if (t.matches('[data-autofill]')) expenses.autofill(t.form);
  else if (t.id === 'photoInput' && t.files[0]) guard(() => expenses.uploadPhoto(t.files[0]));
});
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('money')) formatMoneyInput(e.target);
  if (e.target.matches('[data-calc]')) expenses.calcAmount(e.target.form); // total = qty × harga
});
window.addEventListener('hashchange', render);

(async () => {
  if (!configured) return showMessage('<h2>Atur Supabase dulu</h2><p class="muted">Isi <code>url</code> dan <code>key</code> di <code>js/config.js</code>, lalu muat ulang halaman.</p>');
  (await db.session()) ? boot() : showLogin();
})();
