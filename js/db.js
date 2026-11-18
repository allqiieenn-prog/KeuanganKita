/* Satu-satunya tempat yang berbicara dengan Supabase */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { CONFIG } from './config.js';

export const configured = !CONFIG.url.includes('YOUR-');
const sb = configured ? createClient(CONFIG.url, CONFIG.key) : null;

/* nama kunci di aplikasi -> nama tabel di database */
const TABLE = {
  settings: 'kk_settings', categories: 'kk_categories', divisions: 'kk_divisions', employees: 'kk_employees',
  days: 'kk_days', attendance: 'kk_attendance', expenses: 'kk_expenses',
};
const ok = (r) => { if (r.error) throw r.error; return r.data; };

export const db = {
  async loadAll() {
    const pairs = await Promise.all(Object.entries(TABLE).map(async ([k, t]) => [k, ok(await sb.from(t).select('*'))]));
    return Object.fromEntries(pairs);
  },
  async insert(key, rows) { return ok(await sb.from(TABLE[key]).insert(rows).select()); },
  async update(key, id, patch) { return ok(await sb.from(TABLE[key]).update(patch).eq('id', id).select())[0]; },
  async remove(key, id) { ok(await sb.from(TABLE[key]).delete().eq('id', id)); },
  async upsert(key, rows, onConflict) { return ok(await sb.from(TABLE[key]).upsert(rows, { onConflict }).select()); },
  async updateWhere(key, col, val, patch) { ok(await sb.from(TABLE[key]).update(patch).eq(col, val)); },
  async removeWhere(key, col, val) { ok(await sb.from(TABLE[key]).delete().eq(col, val)); },

  /* login */
  async session() { return (await sb.auth.getSession()).data.session; },
  async signIn(email, password) { const r = await sb.auth.signInWithPassword({ email, password }); if (r.error) throw new Error('Email atau kata sandi salah.'); },
  signOut() { return sb.auth.signOut(); },

  /* foto nota (bucket privat "nota") */
  async uploadNota(path, blob) { const r = await sb.storage.from('nota').upload(path, blob, { contentType: 'image/jpeg' }); if (r.error) throw r.error; },
  async notaUrl(path) { return ok(await sb.storage.from('nota').createSignedUrl(path, 300)).signedUrl; },
  removeNota(path) { return sb.storage.from('nota').remove([path]); },
};
