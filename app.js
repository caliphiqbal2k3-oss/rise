// Rise — personal app for prayers, Quran, study, languages, fitness and daily habits
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { calcTimes } from './praycalc.js';
import { AZKAR, DUAS, AZKAR_QUOTE } from './azkar-data.js';

const CFG = {
  url: 'https://xqlexvdshrkceguozfsc.supabase.co',
  key: 'sb_publishable_TKOn0esFhNFyVP_V-IRzng_9jLX0nuC',
  vapid: 'BNUbiXDUvBrCQ9jNINz3HB-l6SWbhPnO6JKPRXx0rdt_162OHddmY5YdWBjgbwhgrMbxLo58N2fykMe9_1c0r4A'
};
const APP_VERSION = '12';
const sb = createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true } });

/* ---------------- small helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const calToday = () => ymd(new Date());
// Rise's day runs from Fajr to Fajr: between midnight and Fajr it is still the previous day
let _tdCache = { k: '', v: '' };
const today = () => { const n = new Date(), c = ymd(n), k = c + ':' + n.getHours() + ':' + n.getMinutes(); if (_tdCache.k === k) return _tdCache.v; let v = c; try { if (n < adhan(c, 'fajr')) v = addDays(c, -1); } catch { } _tdCache = { k, v }; return v; };
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
const toMin = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const at = (date, time) => { const d = parseYmd(date); const m = toMin(time); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; };
const fmt12 = t => { if (!t) return ''; let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${pad(m)} ${ap}`; };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = s => { const d = parseYmd(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtDateY = s => { const d = parseYmd(s); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400); }
function countdownText(days) { return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days remaining`; }

/* ---------------- icons ---------------- */
const P = d => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
const I = {
  tasks: P('M7 4h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 4V3h6v1M8.5 11l1.5 1.5L13 9.5M8.5 17l1.5 1.5L13 15.5'),
  mosque: P('M4 21V11a8 8 0 0 1 16 0v10M2 21h20M9 21v-4a3 3 0 0 1 6 0v4M12 3V1'),
  book: P('M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14'),
  drop: P('M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z'),
  dumbbell: P('M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12'),
  moon: P('M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'),
  cap: P('M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6'),
  doc: P('M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5'),
  crescent: P('M12 3a6 6 0 0 0 0 12 6 6 0 0 1 0-12zM17 8l1 2 2 .3-1.5 1.4.4 2.3-1.9-1-1.9 1 .4-2.3L14 10.3l2-.3z'),
  bell: P('M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0'),
  home: P('M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'),
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>',
  walk: P('M13 4a1.5 1.5 0 1 0 0-.01M10 21l2-6 3 3v3M8 12l2-4 4 1 2 3 3 1M12 8l-1 5'),
  calendar: P('M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4'),
  gift: P('M4 11h16v10H4zM2 7h20v4H2zM12 7v14M12 7c-2-4-6-4-6-1s4 1 6 1zM12 7c2-4 6-4 6-1s-4 1-6 1z'),
  note: P('M5 4h14v16H5zM8 9h8M8 13h8M8 17h5'),
  hand: P('M7 11V6a1.5 1.5 0 0 1 3 0v5M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4.5a1.5 1.5 0 0 1 2.5-1.5L7 13'),
  plate: P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z'),
  settings: P('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'),
  chart: P('M4 20V10M10 20V4M16 20v-7M22 20H2'),
  body: P('M12 4a2 2 0 1 0 0-.01M6 8h12M12 8v6M9 21l3-7 3 7'),
  lang: P('M3 5h10M8 3v2M5 5c0 4 3 7 7 8M11 5c0 4-3 7-7 8M13 21l4-10 4 10M14.5 17h5'),
  plus: P('M12 5v14M5 12h14'),
  fajr: P('M3 17h18M6 13a6 6 0 0 1 12 0M12 4v2M4.5 8l1.5 1.5M19.5 8L18 9.5M8 21h8'),
  sunrise: P('M3 18h18M7 14a5 5 0 0 1 10 0M12 3v4M9 5l3-3 3 3M4 11l1.5 1M20 11l-1.5 1'),
  dhuhr: P('M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'),
  asr: P('M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4'),
  maghrib: P('M3 18h18M7 14a5 5 0 0 1 10 0M12 3v6M9 6l3 3 3-3M4 11l1.5 1M20 11l-1.5 1'),
  isha: P('M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5zM17 4l.6 1.4L19 6l-1.4.6L17 8l-.6-1.4L15 6l1.4-.6z'),
  beads: P('M12 3a2 2 0 1 0 0 .01M7 5.5a2 2 0 1 0 0 .01M17 5.5a2 2 0 1 0 0 .01M4.5 10a2 2 0 1 0 0 .01M19.5 10a2 2 0 1 0 0 .01M6 15a2 2 0 1 0 0 .01M18 15a2 2 0 1 0 0 .01M12 14v4M10 20h4l-2 2z'),
  heart: P('M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'),
  lock: P('M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3'),
  pin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#8A6A2E"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>'
};

/* ---------------- constants ---------------- */
const PR = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PN = { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
const HM = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'];
const SURAH = ['Al-Fatihah', 'Al-Baqarah', 'Al-Imran', 'An-Nisa', 'Al-Maidah', 'Al-Anam', 'Al-Araf', 'Al-Anfal', 'At-Tawbah', 'Yunus', 'Hud', 'Yusuf', 'Ar-Rad', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha', 'Al-Anbiya', 'Al-Hajj', 'Al-Muminun', 'An-Nur', 'Al-Furqan', 'Ash-Shuara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum', 'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir', 'Fussilat', 'Ash-Shura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf', 'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', 'Al-Waqiah', 'Al-Hadid', 'Al-Mujadilah', 'Al-Hashr', 'Al-Mumtahanah', 'As-Saff', 'Al-Jumuah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Maarij', 'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Naziat', 'Abasa', 'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', 'Al-Ala', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad', 'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat', 'Al-Qariah', 'At-Takathur', 'Al-Asr', 'Al-Humazah', 'Al-Fil', 'Quraysh', 'Al-Maun', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr', 'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas'];
// first page of each surah in the standard 604-page Madinah mushaf
const SURAH_PAGE = [1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312, 322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458, 467, 477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578, 580, 582, 583, 585, 586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 595, 596, 596, 597, 597, 598, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604];
const surahForPage = p => { let s = 0; for (let i = 0; i < 114; i++) if (SURAH_PAGE[i] <= p) s = i; return s; };
const TRAINED = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Abs', 'Full body'];

const DEF = {
  name: 'Khalifa', theme: 'auto', startDate: null,
  iqamah: { fajr: 25, dhuhr: 20, asr: 20, maghrib: 5, isha: 20 },
  gymDays: [0, 1, 2, 3, 4], gymTimes: { 0: '18:30', 1: '18:30', 2: '18:30', 3: '18:30', 4: '18:30' }, gymNudge: 30,
  quranGoal: 30, quranTime: '21:00', waterGoal: 3, bodyDay: 5, bodyTime: '10:00', weeklyTime: '20:00', remindTime: '09:00',
  hijriAdjust: 0, hijriAnchor: null, fastDays: [1, 4],
  reminders: { rel: true, relNeutral: true, azkar: true, custom: true, prayers: true, gym: true, quran: true, languages: true, study: true, exams: true, assignments: true, dates: true, zakat: true, body: true, import: true, weekly: true, fasts: false }
};

/* ---------------- state ---------------- */
const S = { user: null, settings: structuredClone(DEF), days: {}, items: [], times: {}, view: 'today', back: null, prayerDate: null, calMonth: null, histTab: 'week', showPast: {}, online: navigator.onLine };
const cacheKey = () => 'rise-cache-' + (S.user?.id || '');
const queueKey = () => 'rise-queue-' + (S.user?.id || '');
function saveCache() { try { localStorage.setItem(cacheKey(), JSON.stringify({ settings: S.settings, days: S.days, items: S.items, times: S.times })); } catch { } }
function loadCache() { try { const c = JSON.parse(localStorage.getItem(cacheKey()) || 'null'); if (c) { S.settings = mergeDef(c.settings); S.days = c.days || {}; S.items = c.items || []; S.times = c.times || {}; return true; } } catch { } return false; }
function mergeDef(s) { const o = { ...structuredClone(DEF), ...(s || {}) }; o.iqamah = { ...DEF.iqamah, ...(s?.iqamah || {}) }; o.reminders = { ...DEF.reminders, ...(s?.reminders || {}) }; o.gymTimes = { ...(s?.gymTimes || DEF.gymTimes) }; return o; }

/* ---------------- sync queue (works offline) ---------------- */
let queue = [];
function loadQueue() { try { queue = JSON.parse(localStorage.getItem(queueKey()) || '[]'); } catch { queue = []; } }
function saveQueue() { try { localStorage.setItem(queueKey(), JSON.stringify(queue)); } catch { } }
function enqueue(op) {
  // collapse repeated writes to the same row
  if (op.type === 'upsert') { const k = op.table + ':' + op.key; queue = queue.filter(q => q === inflight || !(q.type === 'upsert' && q.table + ':' + q.key === k)); }
  queue.push(op); saveQueue(); saveCache(); flushSoon(); scheduleReminderSync();
}
let flushTimer = null, flushing = false, inflight = null;
function flushSoon() { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 600); }
async function flush() {
  if (flushing || !queue.length || !navigator.onLine) return;
  flushing = true;
  try {
    while (queue.length) {
      const op = queue[0]; inflight = op;
      let res;
      if (op.type === 'upsert') res = await sb.from(op.table).upsert(op.row, op.onConflict ? { onConflict: op.onConflict } : undefined);
      else if (op.type === 'delete') { let q = sb.from(op.table).delete(); for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v); res = await q; }
      if (res.error) { console.warn('sync', res.error); if (res.error.code === 'PGRST301' || /JWT/.test(res.error.message)) { inflight = null; break; } }
      queue = queue.filter(q => q !== op); inflight = null;
      saveQueue();
    }
  } catch (e) { console.warn('flush failed', e); inflight = null; }
  flushing = false;
}
window.addEventListener('online', () => { S.online = true; flush(); render(); });
window.addEventListener('offline', () => { S.online = false; render(); });

/* ---------------- data operations ---------------- */
function saveSettings() { enqueue({ type: 'upsert', table: 'settings', key: 'me', row: { user_id: S.user.id, data: S.settings, updated_at: new Date().toISOString() } }); }
function day(date) { return S.days[date] || {}; }
function setDay(date, fn) {
  const d = structuredClone(day(date)); fn(d); S.days[date] = d;
  enqueue({ type: 'upsert', table: 'days', key: date, onConflict: 'user_id,day', row: { user_id: S.user.id, day: date, data: d, updated_at: new Date().toISOString() } });
}
const items = kind => S.items.filter(i => i.kind === kind);
const item = id => S.items.find(i => i.id === id);
function addItem(kind, data) { const it = { id: uid(), kind, data, created_at: new Date().toISOString() }; S.items.push(it); putItem(it); return it; }
function updItem(id, patch) { const it = item(id); if (!it) return; it.data = { ...it.data, ...patch }; putItem(it); }
function putItem(it) { enqueue({ type: 'upsert', table: 'items', key: it.id, row: { id: it.id, user_id: S.user.id, kind: it.kind, data: it.data, created_at: it.created_at, updated_at: new Date().toISOString() } }); }
function delItem(id) { S.items = S.items.filter(i => i.id !== id); enqueue({ type: 'delete', table: 'items', match: { id } }); }

async function loadAll() {
  const all = async (table, sel = '*') => { let out = [], from = 0; for (; ;) { const { data, error } = await sb.from(table).select(sel).range(from, from + 999); if (error) throw error; out = out.concat(data); if (data.length < 1000) break; from += 1000; } return out; };
  const [st, ds, its, tms] = await Promise.all([all('settings'), all('days'), all('items'), all('prayer_times')]);
  S.settings = mergeDef(st[0]?.data);
  const days = {}; for (const r of ds) days[r.day] = r.data; S.days = days;
  // keep local edits that have not reached the server yet
  for (const op of queue) { if (op.table === 'days' && op.type === 'upsert') S.days[op.row.day] = op.row.data; if (op.table === 'settings') S.settings = mergeDef(op.row.data); }
  const pendingItems = queue.filter(q => q.table === 'items' && q.type === 'upsert').map(q => q.row);
  const pendingDel = new Set(queue.filter(q => q.table === 'items' && q.type === 'delete').map(q => q.match.id));
  const map = new Map(its.map(r => [r.id, { id: r.id, kind: r.kind, data: r.data, created_at: r.created_at }]));
  for (const r of pendingItems) map.set(r.id, { id: r.id, kind: r.kind, data: r.data, created_at: r.created_at });
  S.items = [...map.values()].filter(i => !pendingDel.has(i.id)).sort((a, b) => a.created_at < b.created_at ? -1 : 1);
  const times = {}; for (const r of tms) times[r.day] = { fajr: r.fajr, sunrise: r.sunrise, dhuhr: r.dhuhr, asr: r.asr, maghrib: r.maghrib, isha: r.isha }; S.times = times;
  if (!st.length) firstRun();
  saveCache();
}
function firstRun() {
  S.settings.startDate = prayerDay();
  saveSettings();
  if (!items('language').length) addItem('language', { name: 'High Valyrian', minutes: 20, time: '20:00', icon: 'dragon', active: true });
}

/* ---------------- Hijri dates ---------------- */
const hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
function uq(s) { const p = hijriFmt.formatToParts(new Date(parseYmd(s).getTime() + 12 * 3600e3)); const g = t => +p.find(x => x.type === t).value; return { d: g('day'), m: g('month'), y: parseInt(p.find(x => x.type === 'year').value) }; }
function hijri(s) {
  const adj = S.settings.hijriAdjust || 0;
  if (adj) return uq(addDays(s, -adj));
  const a = S.settings.hijriAnchor;
  if (a && a.off) { const u = uq(s); if (u.m === a.m && u.y === a.y) { const sh = uq(addDays(s, -a.off)); if (sh.m === a.m) return sh; } }
  return uq(s);
}
const hijriText = s => { const h = hijri(s); return `${h.d} ${HM[h.m - 1]} ${h.y}`; };
function findGregorian(hd, hm, fromDate) { for (let i = 0; i < 400; i++) { const s = addDays(fromDate, i); const h = hijri(s); if (h.m === hm && h.d === hd) return s; } return null; }

/* ---------------- prayer times ---------------- */
function timesFor(date) { const t = S.times[date]; return t ? { ...t, est: false } : { ...calcTimes(date), est: true }; }
function adhan(date, p) { return at(date, timesFor(date)[p]); }
function prayerEnd(date, p) { const n = { fajr: ['sunrise', date], dhuhr: ['asr', date], asr: ['maghrib', date], maghrib: ['isha', date], isha: ['fajr', addDays(date, 1)] }[p]; return at(n[1], timesFor(n[1])[n[0]]); }
function prayerState(now = new Date()) {
  const t = today(), y = addDays(t, -1), tm = addDays(t, 1);
  const list = [];
  for (const d of [y, t, tm]) for (const p of PR) list.push({ p, date: d, at: adhan(d, p) });
  let cur = null, next = null;
  for (let i = 0; i < list.length; i++) { if (list[i].at <= now) cur = list[i]; else { next = list[i]; break; } }
  const iq = cur ? new Date(cur.at.getTime() + (S.settings.iqamah[cur.p] || 0) * 60e3) : null;
  return { cur, next, iqamahAt: iq, inIqamah: !!(cur && iq > now) };
}
function prayerDay() { return today(); }
function hms(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; }
function hm(ms) { const m = Math.max(0, Math.ceil(ms / 60000)); const h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m} min`; }
function isEnded(date, p, now = new Date()) { return prayerEnd(date, p) <= now; }
function prayedCount(date) { const d = day(date).prayers || {}; return PR.filter(p => d[p]).length; }

function qadaCounts() {
  const c = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, now = new Date(), t = today();
  const start = S.settings.startDate || t;
  for (let d = start; d <= t; d = addDays(d, 1)) { const pr = day(d).prayers || {}; for (const p of PR) if (!pr[p] && isEnded(d, p, now)) c[p]++; }
  for (const it of items('qada_add')) c[it.data.prayer] += +it.data.count || 0;
  for (const it of items('qada_done')) c[it.data.prayer] -= 1;
  for (const p of PR) c[p] = Math.max(0, c[p]);
  return c;
}
function prayerStreak() {
  let d = prayerDay(), n = 0; if (prayedCount(d) < 5) d = addDays(d, -1);
  while (prayedCount(d) === 5) { n++; d = addDays(d, -1); }
  return n;
}
function prayerStats(from, to) {
  let done = 0, total = 0; const now = new Date(), start = S.settings.startDate || today();
  for (let d = from < start ? start : from; d <= to && d <= today(); d = addDays(d, 1)) { const pr = day(d).prayers || {}; for (const p of PR) { if (pr[p]) { done++; total++; } else if (isEnded(d, p, now)) total++; } }
  return { done, missed: total - done, pct: total ? Math.round(done / total * 100) : 0 };
}

/* ---------------- daily checklist & score ---------------- */
const langs = () => items('language').filter(l => l.data.active !== false);
const langMinutes = (id, date) => items('langlog').filter(l => l.data.langId === id && l.data.date === date).reduce((a, l) => a + (+l.data.minutes || 0), 0);
const quranLogs = () => items('quran').sort((a, b) => (a.data.date + a.created_at < b.data.date + b.created_at ? -1 : 1));
const quranToday = date => quranLogs().filter(q => q.data.date === date);
const quranMinutes = date => quranToday(date).reduce((a, q) => a + (+q.data.minutes || 0), 0);
const quranDone = date => { const l = quranToday(date); return l.length > 0 && (quranMinutes(date) >= S.settings.quranGoal || l.some(q => !q.data.minutes)); };
const isGymDay = date => S.settings.gymDays.includes(parseYmd(date).getDay());
function tasksFor(date) { const wd = parseYmd(date).getDay(); return items('task').filter(t => t.data.repeat === 'daily' || (t.data.repeat === 'weekdays' && (t.data.weekdays || []).includes(wd)) || (t.data.repeat === 'once' && t.data.date === date)); }
function sessionsFor(date) { const wd = parseYmd(date).getDay(); return items('session').filter(s => (s.data.weekdays || []).includes(wd)).sort((a, b) => toMin(a.data.start) - toMin(b.data.start)); }
function checklist(date) {
  const d = day(date), L = [];
  const pdte = date === today() ? prayerDay() : date, pc = prayedCount(pdte);
  L.push({ key: 'prayers', icon: 'mosque', c: 'c2', title: 'Prayers', sub: `${pc} of 5 prayed${pdte !== date ? ' · ' + DOWL[parseYmd(pdte).getDay()] + ' until Fajr' : ''}`, done: pc === 5, act: 'go', arg: 'prayers' });
  if (isGymDay(date)) { const g = d.gym || {}; L.push({ key: 'gym', icon: 'dumbbell', c: 'c1', title: 'Gym', sub: g.status === 'went' ? (g.trained?.length ? g.trained.join(', ') : 'Went') : g.status === 'skipped' ? "Didn't go" : fmt12(S.settings.gymTimes[parseYmd(date).getDay()]), done: g.status === 'went', act: 'sheetGym', arg: date }); }
  const qm = quranMinutes(date), last = quranLogs().at(-1);
  L.push({ key: 'quran', icon: 'book', c: 'c3', title: `Quran · ${S.settings.quranGoal} min`, sub: quranToday(date).length ? `${qm} min today` : last ? `Continue from page ${last.data.page} · ${SURAH[last.data.surah]}` : 'Start reading', done: quranDone(date), act: 'sheetQuran', arg: date });
  for (const l of langs()) { const m = langMinutes(l.id, date); L.push({ key: 'lang' + l.id, dragon: l.data.icon === 'dragon', icon: 'lang', c: 'c5', title: `${l.data.name} · ${l.data.minutes} min`, sub: m ? `${m} min today` : `Streak ${langStreak(l)} days`, done: m >= l.data.minutes, act: 'sheetLangLog', arg: l.id }); }
  for (const s of sessionsFor(date)) L.push({ key: 'ses' + s.id, icon: 'cap', c: 'c2', title: s.data.subject, sub: `Study · ${fmt12(s.data.start)}${s.data.end ? '–' + fmt12(s.data.end) : ''}`, done: !!(d.sessions || {})[s.id], act: 'toggleSession', arg: s.id + '|' + date, tick: true });
  const cm = (d.cardio || []).reduce((a, c) => a + (+c.min || 0), 0);
  if (items('zikr').length) { const ad = day(date).azkar || {}; const isNow = date !== today() || new Date() >= adhan(date, 'maghrib');
    L.push({ key: 'azs', icon: 'beads', c: 'c3', title: 'Morning azkar', sub: ad.sabahDone ? 'Done' : 'After Fajr · ' + zikrProgress(date, 'sabah'), done: !!ad.sabahDone, act: 'goAzkar', arg: 'sabah' });
    L.push({ key: 'azm', icon: 'beads', c: 'c2', title: 'Evening azkar', sub: ad.masaDone ? 'Done' : (isNow ? 'After Maghrib · ' + zikrProgress(date, 'masa') : 'After Maghrib'), done: !!ad.masaDone, act: 'goAzkar', arg: 'masa' }); }
  L.push({ key: 'cardio', icon: 'walk', c: 'c5', title: 'Cardio', sub: cm ? `${cm} min` : 'Walk or bike', done: cm > 0, act: 'sheetCardio', arg: date });
  L.push({ key: 'sleep', icon: 'moon', c: 'c2', title: 'Sleep', sub: d.sleep != null ? `${d.sleep} hours` : 'How long did you sleep?', done: d.sleep != null, act: 'sheetSleep', arg: date });
  L.push({ key: 'water', icon: 'drop', c: 'c4', title: 'Water', sub: `${round(d.water || 0)} of ${S.settings.waterGoal} L`, done: (d.water || 0) >= S.settings.waterGoal, act: 'sheetWater', arg: date });
  for (const m of items('reminder').filter(m => m.data.date === date).sort((a, b) => toMin(a.data.time) - toMin(b.data.time))) L.push({ key: 'rem' + m.id, icon: 'bell', c: 'c6', title: m.data.title, sub: `Reminder · ${fmt12(m.data.time)}${m.data.note ? ' · ' + m.data.note : ''}`, done: !!m.data.done, act: 'toggleReminder', arg: m.id, tick: true });
  for (const t of tasksFor(date)) L.push({ key: 'task' + t.id, icon: 'tasks', c: 'c1', title: t.data.title, sub: t.data.repeat === 'once' ? 'Today' : t.data.repeat === 'daily' ? 'Every day' : (t.data.weekdays || []).map(w => DOW[w]).join(', '), done: !!(d.tasks || {})[t.id], act: 'toggleTask', arg: t.id + '|' + date, tick: true });
  return L;
}
function dailyScore(date) {
  const d = day(date); let got = 0, max = 0;
  got += prayedCount(date === today() ? prayerDay() : date) * 8; max += 40;
  max += 15; if (quranDone(date)) got += 15; else got += Math.min(15, quranMinutes(date) / S.settings.quranGoal * 15);
  if (isGymDay(date)) { max += 15; if ((d.gym || {}).status === 'went') got += 15; }
  const ls = langs(); if (ls.length) { max += 10; got += ls.reduce((a, l) => a + Math.min(1, langMinutes(l.id, date) / l.data.minutes), 0) / ls.length * 10; }
  max += 10; if (d.sleep != null) got += Math.min(1, d.sleep / 7) * 10;
  max += 10; got += Math.min(1, (d.water || 0) / S.settings.waterGoal) * 10;
  return Math.round(got / max * 100);
}
function langStreak(l) { let d = today(), n = 0; if (langMinutes(l.id, d) < l.data.minutes) d = addDays(d, -1); while (langMinutes(l.id, d) >= l.data.minutes) { n++; d = addDays(d, -1); } return n; }
function gymStreak() { let d = today(), n = 0, guard = 0; if (!((day(d).gym || {}).status === 'went')) d = addDays(d, -1); while (guard++ < 400) { if (!isGymDay(d)) { d = addDays(d, -1); continue; } if ((day(d).gym || {}).status === 'went') { n++; d = addDays(d, -1); } else break; } return n; }

/* ---------------- countdown items ---------------- */
function nextYearly(month, dayN) { const t = parseYmd(today()); let d = new Date(t.getFullYear(), month - 1, dayN); if (d < t) d = new Date(t.getFullYear() + 1, month - 1, dayN); return ymd(d); }
function zakatDates() { const z = items('zakat')[0]; if (!z) return null; const first = findGregorian(z.data.hd, z.data.hm, today()); const second = first ? findGregorian(z.data.hd, z.data.hm, addDays(first, 300)) : null; return { z, first, second }; }
function countdowns() {
  const t = today(), L = [];
  for (const e of items('exam')) if (e.data.date >= t) L.push({ days: diffDays(t, e.data.date), icon: 'cap', cls: 'g', title: `${e.data.subject} ${e.data.type}`, sub: `${e.data.chapters ? e.data.chapters + ' · ' : ''}${fmtDate(e.data.date)}`, act: 'go', arg: 'study' });
  for (const a of items('assignment')) if (!a.data.submitted && a.data.due >= t) L.push({ days: diffDays(t, a.data.due), icon: 'doc', cls: 's', title: a.data.title, sub: `${a.data.subject ? a.data.subject + ' · ' : ''}Due ${fmtDate(a.data.due)}`, act: 'go', arg: 'study' });
  for (const p of relPeople()) if (p.data.bday?.d && p.data.status !== 'Ended') { const n = nextYearly(p.data.bday.m, p.data.bday.d); L.push({ days: diffDays(t, n), icon: 'gift', cls: 'b', title: S.settings.relPin ? 'Birthday' : `${p.data.name}'s birthday`, sub: fmtDate(n), act: 'go', arg: 'rel' }); }
  for (const e of items('event')) { const n = nextYearly(e.data.month, e.data.day); L.push({ days: diffDays(t, n), icon: 'gift', cls: 'b', title: e.data.title, sub: fmtDate(n), act: 'go', arg: 'dates' }); }
  const z = zakatDates(); if (z?.first) L.push({ days: diffDays(t, z.first), icon: 'crescent', cls: 'b', title: 'Zakat date', sub: `${z.z.data.hd} ${HM[z.z.data.hm - 1]} · ${fmtDate(z.first)}`, act: 'go', arg: 'zakat' });
  return L.sort((a, b) => a.days - b.days);
}

/* ================= RENDERING ================= */
function applyTheme() {
  const m = S.settings.theme; let night;
  if (m === 'dark') night = true; else if (m === 'light') night = false;
  else { const t = today(), tt = timesFor(t), now = new Date(); night = now < at(t, tt.sunrise) || now >= at(t, tt.maghrib); }
  document.body.classList.toggle('night', night);
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = night ? '#0F1030' : '#FBF6EE';
}
const NAV = [['today', 'home', 'Today'], ['prayers', 'mosque', 'Prayers'], ['azkar', 'beads', 'Azkar'], ['study', 'cap', 'Study'], ['rel', 'heart', 'People'], ['fitness', 'dumbbell', 'Fitness'], ['more', 'more', 'More']];
const TAB_OF = { notifs: 'today', person: 'rel', azkarEdit: 'azkar', duaEdit: 'azkar', reminders: 'more', quran: 'more', summary: 'more', dates: 'more', zakat: 'more', fasts: 'more', nazr: 'more', notes: 'more', tasks: 'more', settings: 'more', importTimes: 'more', langs: 'study' };
function nav() { const cur = TAB_OF[S.view] || S.view; return `<nav class="nav">${NAV.map(([v, ic, l]) => `<button data-act="go" data-arg="${v}" class="${cur === v ? 'on' : ''}">${I[ic]}${l}</button>`).join('')}</nav>`; }
function pageTop(title, backTo) { return `<div class="ph-top">${backTo ? `<button class="back" data-act="go" data-arg="${backTo}" aria-label="Back">${I.back}</button>` : ''}<h1>${esc(title)}</h1></div>`; }
function ck(done) { return `<span class="ck ${done ? 'on' : ''}">${I.check}</span>`; }
function icon(name, c) { return `<span class="ic ${c}">${I[name]}</span>`; }

function render() {
  if (!S.user) return;
  applyTheme();
  const v = VIEWS[S.view] || VIEWS.today;
  $('#app').innerHTML = (S.online ? '' : '<div class="offline">Offline · changes will sync later</div>') + v() + nav();
  if (S.view === 'today' || S.view === 'prayers') tick();
}

/* ---------- Today ---------- */
function vToday() {
  const t = today(), d = parseYmd(t), dd = day(t);
  const L = checklist(t), done = L.filter(x => x.done).length;
  const pdT = prayerDay(), pc = prayedCount(pdT), qc = qadaCounts(), qadaTotal = PR.reduce((a, p) => a + qc[p], 0);
  const last = quranLogs().at(-1), page = currentPage();
  const water = round(dd.water || 0), wg = S.settings.waterGoal;
  const score = dailyScore(t), ps = prayerState();
  const gymT = isGymDay(t) ? `Gym at ${fmt12(S.settings.gymTimes[d.getDay()])} today` : 'Rest day from the gym';
  const cds = countdowns();
  return `<div class="page">
  <div class="hero"><div class="top"><div class="logo">RISE</div><button class="circ" data-act="go" data-arg="notifs" aria-label="Notifications">${I.bell.replace('<svg', '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"')}${hasDueToday() ? '<span class="badge"></span>' : ''}</button></div>
  <div class="greet"><span class="chip">${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${esc(hijriText(t))}</span><h1>Rise today,<br><span>${esc(S.settings.name)}</span></h1></div></div>
  <div class="wrap">
   <button class="prayer" data-act="go" data-arg="prayers"><small id="pc-label">${ps.inIqamah ? 'Iqamah in' : 'Next prayer'}</small><div class="n" id="pc-name">${ps.inIqamah ? PN[ps.cur.p] + ' · Adhan ' + fmt12(timesFor(ps.cur.date)[ps.cur.p]) : PN[ps.next.p] + ' · ' + fmt12(timesFor(ps.next.date)[ps.next.p])}</div><div class="cd" id="pc-cd">--:--:--</div>
    <div class="pills">${PR.map(p => { const nxt = (ps.inIqamah ? ps.cur.p : ps.next.p) === p; const dn = (day(pdT).prayers || {})[p]; return `<span class="${nxt ? 'on' : dn ? 'done' : ''}">${PN[p]}</span>`; }).join('')}</div></button>
   <div class="grid">
    <div class="card">${icon('tasks', 'c1')}<div class="pct">${Math.round(done / L.length * 100)}%</div><div class="lbl">Today's tasks</div><div class="big">${done} <span>/${L.length}</span></div><div class="bar"><i style="width:${done / L.length * 100}%;background:#4E7A4F"></i></div></div>
    <button class="card" data-act="go" data-arg="prayers">${icon('mosque', 'c2')}<div class="pct v">${pc * 20}%</div><div class="lbl">Prayers</div><div class="big">${pc} <span>/5</span></div><div class="bar"><i style="width:${pc * 20}%;background:#7B4FE0"></i></div></button>
    <button class="card" data-act="go" data-arg="quran">${icon('book', 'c3')}<div class="pct">${Math.round(page / 604 * 100)}%</div><div class="lbl">Quran pages</div><div class="big">${page} <span>/604</span></div><div class="bar"><i style="width:${page / 604 * 100}%;background:#F0A43A"></i></div></button>
    <button class="card" data-act="sheetWater" data-arg="${t}">${icon('drop', 'c4')}<div class="pct b">${Math.min(100, Math.round(water / wg * 100))}%</div><div class="lbl">Water today</div><div class="big">${water} <span>L</span></div><div class="bar"><i style="width:${Math.min(100, water / wg * 100)}%;background:#3B82E8"></i></div></button>
   </div>
   <button class="score" data-act="go" data-arg="summary">${ring(score)}<div><h3>Daily score</h3><p>${prayerStreak()}-day prayer streak · ${qadaTotal} qada left<br>${gymT}</p></div></button>
   <div class="panel"><div class="panel-h"><h2>Today's checklist</h2><span><button class="link" data-act="sheetReminder" style="margin-right:14px">+ Reminder</button><button class="link" data-act="go" data-arg="tasks">Edit</button></span></div>
    ${L.map(x => `<button class="it" data-act="${x.act}" data-arg="${esc(x.arg)}">${x.dragon ? '<span class="dr"></span>' : icon(x.icon, x.c)}<span class="t"><b>${esc(x.title)}</b><span>${esc(x.sub)}</span></span>${ck(x.done)}</button>`).join('')}
   </div>
   <div class="sec"><h2>Countdowns</h2><button class="link" data-act="go" data-arg="study">See all</button></div>
   ${cds.length ? `<div class="cds">${cds.map(c => `<button class="cdc ${c.cls}" data-act="${c.act}" data-arg="${c.arg}"><div class="d">${I[c.icon]}${c.days}<small>${c.days === 1 ? 'day' : 'days'}</small></div><b>${esc(c.title)}</b><span>${esc(c.sub)}</span></button>`).join('')}</div>` : `<div class="list"><div class="empty">Add exams, assignments, important dates or your zakat date to see countdowns here.</div></div>`}
   <div class="panel"><div class="panel-h"><h2>Notes for today</h2></div><textarea class="note-box" data-on="dayNote" data-arg="${t}" placeholder="Anything about today…">${esc(dd.note || '')}</textarea></div>
  </div></div>`;
}
function ring(score, size = 82) {
  const r = 34, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 82 82"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C99A45"/><stop offset="1" stop-color="#1F4D3A"/></linearGradient></defs><circle cx="41" cy="41" r="${r}" fill="none" stroke="rgba(120,100,80,.15)" stroke-width="8"/><circle cx="41" cy="41" r="${r}" fill="none" stroke="url(#sg)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}" transform="rotate(-90 41 41)"/><text x="41" y="48" text-anchor="middle" font-size="22" font-weight="600" font-family="Inter,sans-serif" fill="currentColor">${score}</text></svg>`;
}

/* ---------- live countdown ---------- */
let tickTimer = null, lastState = '';
function tick() {
  clearInterval(tickTimer);
  const run = () => {
    const ps = prayerState(), now = new Date();
    const key = (ps.inIqamah ? 'i' + ps.cur.p : 'n' + ps.next.p) + today();
    if (lastState && key !== lastState) { lastState = key; render(); return; }
    lastState = key;
    const target = ps.inIqamah ? ps.iqamahAt : ps.next.at;
    const ms = target - now;
    const el = $('#pc-cd'); if (el) el.textContent = hms(ms);
    const d = $('#disc-cd'); if (d) d.textContent = hms(ms);
    const arc = $('#arc-dot');
    if (arc) {
      const from = ps.inIqamah ? ps.cur.at : (ps.cur ? (ps.cur.at) : new Date(ps.next.at - 6 * 3600e3)), to = target;
      // like Awqaf: the dot sits at the share of time remaining and slides left toward the start as the time gets closer
      let f = (to - now) / (to - from); f = Math.max(0, Math.min(1, f));
      const ang = (-210 + f * 240) * Math.PI / 180, R = 132, cx = 150, cy = 150;
      arc.setAttribute('cx', cx + R * Math.cos(ang)); arc.setAttribute('cy', cy + R * Math.sin(ang));
      const pr = $('#arc-prog'); if (pr) { const L = +pr.dataset.len; pr.setAttribute('stroke-dasharray', `0 ${L * f} ${L * (1 - f)} ${L}`); }
    }
  };
  run(); tickTimer = setInterval(run, 1000);
}

/* ---------- Prayers (Awqaf style) ---------- */
function vPrayers() {
  const ps = prayerState(), date = S.prayerDate, tt = timesFor(date), hd = hijri(date), d = parseYmd(date);
  const nextP = date === today() ? (ps.inIqamah ? ps.cur.p : (ps.next.date === date ? ps.next.p : null)) : null;
  const dp = day(date).prayers || {}, now = new Date();
  const qc = qadaCounts(), qt = PR.reduce((a, p) => a + qc[p], 0);
  const R = 132, len = (240 / 360) * 2 * Math.PI * R;
  const arcPath = (() => { const a1 = -210 * Math.PI / 180, a2 = 30 * Math.PI / 180; return `M ${150 + R * Math.cos(a1)} ${150 + R * Math.sin(a1)} A ${R} ${R} 0 1 1 ${150 + R * Math.cos(a2)} ${150 + R * Math.sin(a2)}`; })();
  const order = ['fajr', 'asr', 'sunrise', 'maghrib', 'dhuhr', 'isha'];
  const icons = { fajr: 'fajr', sunrise: 'sunrise', dhuhr: 'dhuhr', asr: 'asr', maghrib: 'maghrib', isha: 'isha' };
  return `<div class="pscreen"><div class="page" style="padding-bottom:0">${pageTop('Prayers')}
  <div class="arcwrap"><svg viewBox="0 0 300 300"><path d="${arcPath}" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="10" stroke-linecap="round"/><path id="arc-prog" data-len="${len}" d="${arcPath}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="0 ${len}"/><circle id="arc-dot" cx="0" cy="0" r="11" fill="#fff" style="filter:drop-shadow(0 0 8px rgba(255,255,255,.9))"/></svg>
   <div class="disc"><div class="s1">${ps.inIqamah ? 'Iqamah' : 'Next salah'}</div><div class="s2">${PN[ps.inIqamah ? ps.cur.p : ps.next.p]}</div><div class="s3">${fmt12(ps.inIqamah ? new Date(ps.iqamahAt).toTimeString().slice(0, 5) : timesFor(ps.next.date)[ps.next.p])}</div><div class="s4">${ps.inIqamah ? 'Time until iqamah' : 'Time until Adhan'}</div><div class="s5" id="disc-cd">--:--:--</div></div></div>
  <div class="wrap">
   <div class="glass loc">${I.pin}<b style="flex:1;font-weight:500">Sharjah · ${tt.est ? 'estimated times' : 'Awqaf times'}</b>${tt.est ? '<button class="btn sm" data-act="go" data-arg="importTimes">Import</button>' : ''}</div>
   <div class="glass"><div class="dnav"><button data-act="pDay" data-arg="-1" aria-label="Previous day">‹</button><div><b>${DOWL[d.getDay()]}${date === today() ? ' · Today' : date === prayerDay() ? ' · until Fajr' : ''}</b><span>${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} | ${hd.d} ${HM[hd.m - 1]} ${hd.y}</span></div><button data-act="pDay" data-arg="1" aria-label="Next day">›</button></div>
    <div class="ptimes mt">${order.map(p => `<div class="pt ${p === nextP ? 'next' : ''}">${I[icons[p]]}<b>${PN[p]}</b><span>${fmt12(tt[p])}</span></div>`).join('')}</div></div>
   <div class="glass"><h3>${date === today() ? "Today's prayers" : date === prayerDay() ? DOWL[parseYmd(date).getDay()] + "'s prayers · Isha until Fajr" : 'Prayers on ' + fmtDate(date)} · ${prayedCount(date)} of 5</h3>
    <div class="ptick">${PR.map(p => { const on = dp[p], miss = !on && isEnded(date, p, now) && date >= (S.settings.startDate || today()); return `<button class="${on ? 'on' : miss ? 'miss' : ''}" data-act="togglePrayer" data-arg="${p}"><span class="bx">${I.check}</span>${PN[p]}</button>`; }).join('')}</div>
    <p class="small" style="color:#5a5070;margin-top:8px">Tap to tick. Use the arrows above to correct any past day.</p></div>
   <div class="glass"><div class="hstack" style="justify-content:space-between"><h3 style="margin:0">Qada to make up · ${qt}</h3><button class="btn sm" data-act="sheetQadaAdd">Add older</button></div>
    <div class="mt">${PR.map(p => `<div class="qrow"><b>${PN[p]}</b><span class="n">${qc[p]}</span><button class="btn sm ${qc[p] ? '' : 'sec2'}" data-act="qadaDone" data-arg="${p}" ${qc[p] ? '' : 'disabled style="opacity:.5"'}>Prayed qada</button></div>`).join('')}</div></div>
   ${historyCard()}
   ${calendarCard()}
  </div></div></div>`;
}
function historyCard() {
  const t = today(), tab = S.histTab, d = parseYmd(t);
  const ranges = { week: [addDays(t, -6), t], month: [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), t], year: [`${d.getFullYear()}-01-01`, t], all: [S.settings.startDate || t, t] };
  const s = prayerStats(...ranges[tab]);
  const per = PR.map(p => { let done = 0, tot = 0; const now = new Date(), start = S.settings.startDate || t; for (let x = ranges[tab][0] < start ? start : ranges[tab][0]; x <= t; x = addDays(x, 1)) { if ((day(x).prayers || {})[p]) { done++; tot++; } else if (isEnded(x, p, now)) tot++; } return { p, pct: tot ? Math.round(done / tot * 100) : null }; });
  return `<div class="glass"><h3>History</h3><div class="tabs">${['week', 'month', 'year', 'all'].map(k => `<button class="${tab === k ? 'on' : ''}" data-act="histTab" data-arg="${k}">${k === 'all' ? 'All time' : k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
  <div class="stat"><div><b>${s.pct}%</b><span>prayed</span></div><div><b>${s.done}</b><span>on record</span></div><div><b>${s.missed}</b><span>missed</span></div><div><b>${prayerStreak()}</b><span>day streak</span></div></div>
  <div class="mt">${per.map(x => `<div class="prog"><span style="width:62px;font-size:13px">${PN[x.p]}</span><div class="bar"><i style="width:${x.pct || 0}%;background:#7B4FE0"></i></div><span style="width:38px;text-align:right;font-size:13px">${x.pct == null ? '–' : x.pct + '%'}</span></div>`).join('')}</div></div>`;
}
function calendarCard() {
  const t = parseYmd(today()); const cm = S.calMonth || [t.getFullYear(), t.getMonth()];
  const first = new Date(cm[0], cm[1], 1), dim = new Date(cm[0], cm[1] + 1, 0).getDate(), start = S.settings.startDate || today();
  let cells = ''; for (let i = 0; i < first.getDay(); i++) cells += '<div></div>';
  for (let i = 1; i <= dim; i++) { const s = ymd(new Date(cm[0], cm[1], i)); const pc0 = prayedCount(s); const c = s > today() || s < start || (s === today() && !pc0) ? 'lvx' : 'lv' + pc0; cells += `<button class="c ${c}" data-act="pGoDate" data-arg="${s}">${i}</button>`; }
  return `<div class="glass"><div class="dnav"><button data-act="calMove" data-arg="-1">‹</button><b>${MONL[cm[1]]} ${cm[0]}</b><button data-act="calMove" data-arg="1">›</button></div>
  <div class="cal mt">${DOW.map(x => `<div class="h">${x[0]}</div>`).join('')}${cells}</div>
  <p class="small" style="color:#5a5070;margin-top:8px">Green = all 5 prayed, red = none. Tap a day to see or correct it.</p></div>`;
}

/* ---------- Study ---------- */
function vStudy() {
  const t = today();
  const exams = items('exam').sort((a, b) => a.data.date < b.data.date ? -1 : 1), up = exams.filter(e => e.data.date >= t), past = exams.filter(e => e.data.date < t);
  const asg = items('assignment').sort((a, b) => a.data.due < b.data.due ? -1 : 1), aOpen = asg.filter(a => !a.data.submitted && a.data.due >= t), aOther = asg.filter(a => a.data.submitted || a.data.due < t);
  const ses = items('session');
  const tagFor = n => n <= 3 ? 'red' : n <= 7 ? '' : 'green';
  return `<div class="page">${pageTop('Study')}<div class="wrap">
  <div class="h2">Exams</div><div class="list">${up.length ? up.map(e => { const n = diffDays(t, e.data.date); return `<button class="row" data-act="sheetExam" data-arg="${e.id}">${icon('cap', 'c5')}<span class="t"><b>${esc(e.data.subject)} · ${esc(e.data.type)}</b><span>${fmtDate(e.data.date)}${e.data.time ? ' · ' + fmt12(e.data.time) : ''}${e.data.chapters ? ' · ' + esc(e.data.chapters) : ''}</span></span><span class="tag ${tagFor(n)}">${countdownText(n)}</span></button>`; }).join('') : '<div class="empty">No upcoming exams</div>'}</div>
  ${past.length ? `<button class="link mt" style="margin-left:6px" data-act="togglePast" data-arg="exam">${S.showPast.exam ? 'Hide' : 'Show'} past exams (${past.length})</button>${S.showPast.exam ? `<div class="list">${past.reverse().map(e => `<button class="row" data-act="sheetExam" data-arg="${e.id}"><span class="t"><b>${esc(e.data.subject)} · ${esc(e.data.type)}</b><span>${fmtDateY(e.data.date)}</span></span></button>`).join('')}</div>` : ''}` : ''}
  <button class="btn sec2 add" data-act="sheetExam">${I.plus.replace('<svg', '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"')} Add exam</button>

  <div class="h2">Assignments</div><div class="list">${aOpen.length ? aOpen.map(a => { const n = diffDays(t, a.data.due); return `<div class="row"><button class="ck" data-act="submitAsg" data-arg="${a.id}">${I.check}</button><button class="t" style="text-align:left" data-act="sheetAsg" data-arg="${a.id}"><b>${esc(a.data.title)}</b><span>${a.data.subject ? esc(a.data.subject) + ' · ' : ''}Due ${fmtDate(a.data.due)}${a.data.time ? ' · ' + fmt12(a.data.time) : ''}</span></button><span class="tag ${tagFor(n)}">${countdownText(n)}</span></div>`; }).join('') : '<div class="empty">No open assignments</div>'}</div>
  ${aOther.length ? `<button class="link mt" style="margin-left:6px" data-act="togglePast" data-arg="asg">${S.showPast.asg ? 'Hide' : 'Show'} submitted and past (${aOther.length})</button>${S.showPast.asg ? `<div class="list">${aOther.reverse().map(a => `<div class="row"><button class="ck ${a.data.submitted ? 'on' : ''}" data-act="submitAsg" data-arg="${a.id}">${I.check}</button><button class="t" style="text-align:left" data-act="sheetAsg" data-arg="${a.id}"><b>${esc(a.data.title)}</b><span>${a.data.submitted ? 'Submitted' : 'Not submitted'} · ${fmtDateY(a.data.due)}</span></button></div>`).join('')}</div>` : ''}` : ''}
  <button class="btn sec2 add" data-act="sheetAsg">${I.plus.replace('<svg', '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"')} Add assignment</button>

  <div class="h2">Study schedule</div><div class="list">${[0, 1, 2, 3, 4, 5, 6].map(w => { const L = ses.filter(s => (s.data.weekdays || []).includes(w)).sort((a, b) => toMin(a.data.start) - toMin(b.data.start)); return L.length ? `<div class="row" style="align-items:flex-start"><span style="width:44px;font-weight:600;color:var(--gold);padding-top:2px">${DOW[w]}</span><span class="t">${L.map(s => `<button style="display:block;text-align:left;padding:2px 0" data-act="sheetSession" data-arg="${s.id}"><b>${esc(s.data.subject)}</b><span>${fmt12(s.data.start)}${s.data.end ? '–' + fmt12(s.data.end) : ''}</span></button>`).join('')}</span></div>` : ''; }).join('') || '<div class="empty">Plan which subject to study on which days</div>'}</div>
  <button class="btn sec2 add" data-act="sheetSession">${I.plus.replace('<svg', '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"')} Add study session</button>

  <div class="h2">Languages</div><div class="list">${items('language').length ? items('language').map(l => { const wk = [0, 1, 2, 3, 4, 5, 6].reduce((a, i) => a + langMinutes(l.id, addDays(t, -i)), 0); return `<button class="row" data-act="sheetLangLog" data-arg="${l.id}">${l.data.icon === 'dragon' ? '<span class="dr"></span>' : icon('lang', 'c5')}<span class="t"><b>${esc(l.data.name)}${l.data.active === false ? ' · paused' : ''}</b><span>${l.data.minutes} min a day · reminder ${fmt12(l.data.time)} · ${wk} min this week</span></span><span class="tag">${langStreak(l)}-day streak</span></button>`; }).join('') : '<div class="empty">No languages yet</div>'}</div>
  <div class="two"><button class="btn sec2 add" data-act="sheetLang">Add language</button>${items('language').length ? '<button class="btn sec2 add" data-act="go" data-arg="langs">Edit languages</button>' : ''}</div>
  </div></div>`;
}
function vLangs() {
  return `<div class="page">${pageTop('Languages', 'study')}<div class="wrap"><div class="list">${items('language').map(l => `<button class="row" data-act="sheetLang" data-arg="${l.id}">${l.data.icon === 'dragon' ? '<span class="dr"></span>' : icon('lang', 'c5')}<span class="t"><b>${esc(l.data.name)}</b><span>${l.data.minutes} min a day · reminder ${fmt12(l.data.time)}${l.data.active === false ? ' · paused' : ''}</span></span>${I.chev}</button>`).join('') || '<div class="empty">No languages</div>'}</div>
  <button class="btn sec2 add" data-act="sheetLang">Add language</button></div></div>`;
}

/* ---------- Fitness ---------- */
function vFitness() {
  const t = today(), dd = day(t), wd = parseYmd(t).getDay();
  const sun = addDays(t, -wd);
  const week = [0, 1, 2, 3, 4, 5, 6].map(i => { const d = addDays(sun, i); const g = (day(d).gym || {}).status; const gd = isGymDay(d); return `<div>${DOW[i]}<i class="${!gd ? 'rest' : g === 'went' ? 'ok' : g === 'skipped' ? 'no' : ''}">${!gd ? '–' : g === 'went' ? '✓' : g === 'skipped' ? '✕' : parseYmd(d).getDate()}</i></div>`; }).join('');
  const cw = [0, 1, 2, 3, 4, 5, 6].reduce((a, i) => a + (day(addDays(sun, i)).cardio || []).reduce((b, c) => b + (+c.min || 0), 0), 0);
  const body = items('body').sort((a, b) => a.data.date < b.data.date ? -1 : 1), lb = body.at(-1), pb = body.at(-2);
  const delta = (k, u) => lb && pb && lb.data[k] != null && pb.data[k] != null ? ` <span class="small muted">(${round(lb.data[k] - pb.data[k], 1) > 0 ? '+' : ''}${round(lb.data[k] - pb.data[k], 1)} ${u})</span>` : '';
  const g = dd.gym || {};
  const last7 = [6, 5, 4, 3, 2, 1, 0].map(i => addDays(t, -i));
  return `<div class="page">${pageTop('Fitness')}<div class="wrap">
  <div class="h2">Gym</div><div class="list" style="padding:14px">
   <div class="hstack" style="justify-content:space-between"><div><b style="font-size:17px">${isGymDay(t) ? 'Today · ' + fmt12(S.settings.gymTimes[wd]) : 'Rest day'}</b><div class="small muted">${gymStreak()}-day gym streak</div></div>${isGymDay(t) ? `<button class="btn sm ${g.status ? 'sec2' : ''}" data-act="sheetGym" data-arg="${t}">${g.status === 'went' ? 'Went ✓' : g.status === 'skipped' ? "Didn't go" : 'Check in'}</button>` : ''}</div>
   <div class="weekstrip mt">${week}</div>
   <button class="link mt" data-act="sheetGymTimes">Change gym days and times</button></div>

  <div class="h2">Cardio</div><div class="list" style="padding:14px"><div class="hstack" style="justify-content:space-between"><div><b style="font-size:17px">${cw} min this week</b><div class="small muted">Today: ${(dd.cardio || []).map(c => `${c.type} ${c.min} min${c.incline ? ' · incline ' + c.incline : ''}`).join(', ') || 'nothing yet'}</div></div><button class="btn sm" data-act="sheetCardio" data-arg="${t}">Add</button></div></div>

  <div class="h2">Body · weekly</div><div class="list" style="padding:14px">
   ${lb ? `<div class="three center"><div><div class="small muted">Weight</div><b style="font-size:18px">${lb.data.weight ?? '–'} kg</b>${delta('weight', 'kg')}</div><div><div class="small muted">Navel</div><b style="font-size:18px">${lb.data.navel ?? '–'} cm</b>${delta('navel', 'cm')}</div><div><div class="small muted">Lower belly</div><b style="font-size:18px">${lb.data.belly ?? '–'} cm</b>${delta('belly', 'cm')}</div></div><div class="small muted center mt">Last measured ${fmtDateY(lb.data.date)}</div>
   ${body.length > 1 ? lineChart(body, 'weight', 'Weight (kg)', '#A87A2A') + lineChart(body, 'navel', 'Waist at navel (cm)', '#7B4FE0') + lineChart(body, 'belly', 'Lower belly (cm)', '#3B82E8') : ''}` : '<div class="empty">No measurements yet</div>'}
   <button class="btn full mt" data-act="sheetBody">Add measurement</button>${body.length ? '<button class="link mt" data-act="sheetBodyList">See all measurements</button>' : ''}</div>

  <div class="h2">Sleep and water · last 7 days</div><div class="list" style="padding:14px">
   ${miniBars(last7.map(d => day(d).sleep || 0), last7, 10, '#7B4FE0', 'Sleep (hours)')}
   ${miniBars(last7.map(d => day(d).water || 0), last7, Math.max(S.settings.waterGoal, 4), '#3B82E8', 'Water (litres)')}
   <div class="two mt"><button class="btn sec2" data-act="sheetSleep" data-arg="${t}">Sleep today</button><button class="btn sec2" data-act="sheetWater" data-arg="${t}">Water today</button></div></div>
  </div></div>`;
}
function lineChart(rows, key, label, color) {
  const pts = rows.filter(r => r.data[key] != null && r.data[key] !== '').map(r => ({ d: r.data.date, v: +r.data[key] }));
  if (pts.length < 2) return '';
  const W = 320, H = 110, pd = 22, min = Math.min(...pts.map(p => p.v)), max = Math.max(...pts.map(p => p.v)), span = max - min || 1;
  const x = i => pd + i * (W - pd * 2) / (pts.length - 1), y = v => H - 20 - (v - min) / span * (H - 40);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ');
  return `<div class="mt"><div class="small muted">${label}</div><svg class="chart" viewBox="0 0 ${W} ${H}"><path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="3.5" fill="${color}"/>`).join('')}<text x="${x(0)}" y="${H - 4}" font-size="10" fill="currentColor" opacity=".6">${fmtDate(pts[0].d)}</text><text x="${x(pts.length - 1)}" y="${H - 4}" font-size="10" text-anchor="end" fill="currentColor" opacity=".6">${fmtDate(pts.at(-1).d)}</text><text x="${x(pts.length - 1)}" y="${y(pts.at(-1).v) - 8}" font-size="11" font-weight="600" text-anchor="end" fill="currentColor">${pts.at(-1).v}</text></svg></div>`;
}
function miniBars(vals, dates, max, color, label) {
  return `<div class="small muted">${label}</div><div style="display:flex;gap:6px;align-items:flex-end;height:80px;margin:6px 0 12px">${vals.map((v, i) => `<div style="flex:1;text-align:center"><div style="font-size:10px;margin-bottom:2px">${v ? round(v, 1) : ''}</div><div style="height:${Math.max(3, v / max * 56)}px;background:${color};border-radius:6px;opacity:${v ? 1 : .2}"></div><div style="font-size:10px;color:var(--sub);margin-top:3px">${DOW[parseYmd(dates[i]).getDay()][0]}</div></div>`).join('')}</div>`;
}

/* ---------- More ---------- */
function vMore() {
  const rows = [['quran', 'book', 'c3', 'Quran', `Page ${currentPage()} of 604`], ['summary', 'chart', 'c2', 'Weekly summary', 'This week at a glance'], ['dates', 'gift', 'c6', 'Important dates', `${items('event').length} saved`], ['zakat', 'crescent', 'c1', 'Zakat', items('zakat').length ? 'Date set' : 'No date set'], ['fasts', 'plate', 'c5', 'Fasts to make up', `${items('fast').reduce((a, f) => a + Math.max(0, f.data.total - f.data.done), 0)} remaining`], ['nazr', 'hand', 'c4', 'Nazr', `${items('nazr').filter(n => n.data.done < n.data.total).length} open`], ['notes', 'note', 'c3', 'Notes', `${items('note').length} notes`], ['reminders', 'bell', 'c6', 'My reminders', `${items('reminder').filter(m => !m.data.done && m.data.date >= today()).length} upcoming`], ['tasks', 'tasks', 'c1', 'My tasks', 'Add or remove daily tasks'], ['settings', 'settings', 'c2', 'Settings', 'Reminders, times, backup']];
  return `<div class="page">${pageTop('More')}<div class="wrap"><div class="list">${rows.map(r => `<button class="row" data-act="go" data-arg="${r[0]}">${icon(r[1], r[2])}<span class="t"><b>${r[3]}</b><span>${r[4]}</span></span>${I.chev}</button>`).join('')}</div></div></div>`;
}

/* ---------- Quran ---------- */
function roundStart() { const k = items('khatam').sort((a, b) => a.created_at < b.created_at ? -1 : 1).at(-1); return k ? k.created_at : ''; }
function currentPage() { const rs = roundStart(); const L = quranLogs().filter(q => q.created_at > rs); return L.length ? Math.max(...L.map(q => +q.data.page || 0)) : 0; }
function vQuran() {
  const rs = roundStart(), L = quranLogs().filter(q => q.created_at > rs), page = currentPage(), last = L.at(-1);
  let est = '';
  if (L.length > 1) { const first = L[0].data.date, days = diffDays(first, today()), read = page - (+L[0].data.page || 0); if (days >= 3 && read > 0 && page < 604) est = fmtDateY(addDays(today(), Math.ceil((604 - page) / (read / days)))); }
  const wk = [0, 1, 2, 3, 4, 5, 6].reduce((a, i) => a + quranMinutes(addDays(today(), -i)), 0);
  return `<div class="page">${pageTop('Quran', 'more')}<div class="wrap">
  <div class="list" style="padding:18px"><div class="small muted">You stopped at</div><div style="font-size:22px;font-weight:600;margin-top:4px">${last ? `Page ${last.data.page} · ${SURAH[last.data.surah]}${last.data.ayah ? ' · Ayah ' + last.data.ayah : ''}` : 'Not started yet'}</div>
   <div class="prog mt"><div class="bar" style="height:10px"><i style="width:${page / 604 * 100}%;background:#F0A43A"></i></div><b>${Math.round(page / 604 * 100)}%</b></div>
   <div class="three center mt"><div><b style="font-size:20px">${page}</b><div class="small muted">pages read</div></div><div><b style="font-size:20px">${604 - page}</b><div class="small muted">remaining</div></div><div><b style="font-size:20px">${wk}</b><div class="small muted">min this week</div></div></div>
   ${est ? `<p class="small muted center mt">At your current pace you will finish around <b>${est}</b>.</p>` : page < 604 ? '<p class="small muted center mt">Your estimated finish date appears after a few days of reading.</p>' : ''}
   <button class="btn full mt" data-act="sheetQuran" data-arg="${today()}">Log reading</button></div>
  <div class="list" style="padding:14px"><div class="hstack" style="justify-content:space-between"><div><b>Daily goal</b><div class="small muted">${S.settings.quranGoal} min · reminder at ${fmt12(S.settings.quranTime)}</div></div><button class="btn sm sec2" data-act="sheetQuranGoal">Change</button></div></div>
  ${page >= 604 ? '<button class="btn full mt" data-act="khatam">Completed the Quran · start a new round</button>' : ''}
  <div class="h2">Reading log</div><div class="list">${L.length ? L.slice().reverse().slice(0, 40).map(q => `<button class="row" data-act="sheetQuran" data-arg="${q.data.date}|${q.id}"><span class="t"><b>Page ${q.data.page} · ${SURAH[q.data.surah]}${q.data.ayah ? ' · Ayah ' + q.data.ayah : ''}</b><span>${fmtDateY(q.data.date)}${q.data.minutes ? ' · ' + q.data.minutes + ' min' : ''}</span></span></button>`).join('') : '<div class="empty">Your readings will appear here</div>'}</div>
  ${items('khatam').length ? `<p class="small muted center mt">Completed the Quran ${plural(items('khatam').length, 'time')} with Rise.</p>` : ''}
  </div></div>`;
}

/* ---------- Weekly summary ---------- */
function vSummary() {
  const t = today(), from = addDays(t, -6), ds = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(from, i));
  const ps = prayerStats(from, t), qc = qadaCounts();
  const qmin = ds.reduce((a, d) => a + quranMinutes(d), 0), gd = ds.filter(isGymDay), gw = gd.filter(d => (day(d).gym || {}).status === 'went').length;
  const cm = ds.reduce((a, d) => a + (day(d).cardio || []).reduce((b, c) => b + (+c.min || 0), 0), 0);
  const sl = ds.map(d => day(d).sleep).filter(x => x != null), wt = ds.map(d => day(d).water || 0);
  const avg = a => a.length ? round(a.reduce((x, y) => x + y, 0) / a.length, 1) : 0;
  const sc = avg(ds.map(dailyScore));
  const rows = [['Prayers prayed', `${ps.done} (${ps.pct}%)`], ['Prayers missed', ps.missed], ['Qada remaining', PR.reduce((a, p) => a + qc[p], 0)], ['Quran', `${qmin} min · now on page ${currentPage()}`], ['Gym', `${gw} of ${gd.length} days`], ['Cardio', `${cm} min`], ...langs().map(l => [l.data.name, `${ds.reduce((a, d) => a + langMinutes(l.id, d), 0)} min`]), ['Average sleep', sl.length ? `${avg(sl)} hours` : '–'], ['Average water', `${avg(wt)} L`]];
  return `<div class="page">${pageTop('This week', 'more')}<div class="wrap"><p class="muted" style="margin:0 6px">${fmtDate(from)} – ${fmtDate(t)}</p>
  <div class="score" style="margin-top:12px">${ring(Math.round(sc))}<div><h3>Average daily score</h3><p>Best day: ${fmtDate(ds.reduce((a, d) => dailyScore(d) > dailyScore(a) ? d : a, ds[0]))}</p></div></div>
  <div class="list">${rows.map(r => `<div class="row"><span class="t"><b>${esc(r[0])}</b></span><span class="r" style="color:var(--ink);font-weight:600">${esc(r[1])}</span></div>`).join('')}</div></div></div>`;
}

/* ---------- Dates, zakat, fasts, nazr, notes, tasks ---------- */
function vDates() {
  const L = items('event').map(e => ({ e, n: nextYearly(e.data.month, e.data.day) })).sort((a, b) => a.n < b.n ? -1 : 1);
  return `<div class="page">${pageTop('Important dates', 'more')}<div class="wrap"><div class="list">${L.length ? L.map(({ e, n }) => { const k = diffDays(today(), n); return `<button class="row" data-act="sheetEvent" data-arg="${e.id}">${icon('gift', 'c6')}<span class="t"><b>${esc(e.data.title)}</b><span>${e.data.day} ${MONL[e.data.month - 1]} · every year</span></span><span class="tag ${k <= 7 ? 'red' : ''}">${k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : k + ' days'}</span></button>`; }).join('') : '<div class="empty">Birthdays and other yearly dates</div>'}</div>
  <button class="btn sec2 add" data-act="sheetEvent">Add date</button><p class="small muted center mt">Reminders 2 weeks and 1 week before.</p></div></div>`;
}
function vZakat() {
  const z = zakatDates();
  return `<div class="page">${pageTop('Zakat', 'more')}<div class="wrap">${z?.first ? `<div class="list" style="padding:18px"><div class="small muted">Your zakat date</div><div style="font-size:24px;font-weight:600;margin-top:4px">${z.z.data.hd} ${HM[z.z.data.hm - 1]}</div>
   <div class="mt"><div class="row"><span class="t"><b>Next</b><span>${hijriText(z.first)}</span></span><span class="r" style="color:var(--ink)"><b>${fmtDateY(z.first)}</b>${diffDays(today(), z.first)} days</span></div>
   ${z.second ? `<div class="row"><span class="t"><b>The year after</b><span>${hijriText(z.second)}</span></span><span class="r" style="color:var(--ink)"><b>${fmtDateY(z.second)}</b></span></div>` : ''}</div>
   <p class="small muted mt">Reminders 1 month and 1 week before. The Islamic date is calculated, so it can be one day off from the UAE moon sighting; you can adjust it in Settings.</p>
   <div class="two mt"><button class="btn sec2" data-act="sheetZakat">Change date</button><button class="btn danger" data-act="delZakat">Remove date</button></div></div>`
    : `<div class="list" style="padding:18px"><p>Set the Islamic date your zakat is due, and Rise will show the matching Gregorian date for this year and next year, with reminders.</p><button class="btn full mt" data-act="sheetZakat">Set zakat date</button></div>`}</div></div>`;
}
function vFasts() {
  const L = items('fast');
  return `<div class="page">${pageTop('Fasts to make up', 'more')}<div class="wrap"><div class="list">${L.length ? L.map(f => `<div class="row"><span class="t"><b>${esc(f.data.title)}</b><span>${f.data.done} of ${f.data.total} done · ${Math.max(0, f.data.total - f.data.done)} remaining</span></span>${f.data.done < f.data.total ? `<button class="btn sm" data-act="fastDone" data-arg="${f.id}">Made up 1</button>` : '<span class="tag green">Done</span>'}<button class="link" style="margin-left:6px" data-act="sheetFast" data-arg="${f.id}">Edit</button></div>`).join('') : '<div class="empty">No fasts to make up</div>'}</div>
  <button class="btn sec2 add" data-act="sheetFast">Add fasts owed</button>
  <div class="list" style="padding:14px"><div class="hstack" style="justify-content:space-between"><div><b>Reminders</b><div class="small muted">The evening before ${S.settings.fastDays.map(d => DOWL[d]).join(' and ')}</div></div><button class="toggle ${S.settings.reminders.fasts ? 'on' : ''}" data-act="toggleRem" data-arg="fasts" aria-label="Fast reminders"></button></div></div></div></div>`;
}
function vNazr() {
  const open = items('nazr').filter(n => n.data.done < n.data.total), closed = items('nazr').filter(n => n.data.done >= n.data.total);
  const row = n => `<div class="row"><span class="t"><b>${esc(n.data.title)}</b><span>${n.data.done} of ${n.data.total} done${n.data.done < n.data.total ? ' · ' + (n.data.total - n.data.done) + ' remaining' : ' · fulfilled ' + (n.data.doneAt ? fmtDateY(n.data.doneAt) : '')}${n.data.note ? ' · ' + esc(n.data.note) : ''}</span></span>${n.data.done < n.data.total ? `<button class="btn sm" data-act="nazrDone" data-arg="${n.id}">+1 done</button>` : ''}<button class="link" style="margin-left:6px" data-act="sheetNazr" data-arg="${n.id}">Edit</button></div>`;
  return `<div class="page">${pageTop('Nazr', 'more')}<div class="wrap"><div class="list">${open.length ? open.map(row).join('') : '<div class="empty">No open vows</div>'}</div>
  <button class="btn sec2 add" data-act="sheetNazr">Add nazr</button>${closed.length ? `<div class="h2">Fulfilled</div><div class="list">${closed.map(row).join('')}</div>` : ''}</div></div>`;
}
function vNotes() {
  const L = items('note').sort((a, b) => (b.data.updated || '') > (a.data.updated || '') ? 1 : -1);
  return `<div class="page">${pageTop('Notes', 'more')}<div class="wrap"><div class="list">${L.length ? L.map(n => `<button class="row" data-act="sheetNote" data-arg="${n.id}">${icon('note', 'c3')}<span class="t"><b>${esc(n.data.title || 'Untitled')}</b><span>${esc((n.data.body || '').slice(0, 80))}</span></span></button>`).join('') : '<div class="empty">Write anything you want to keep</div>'}</div><button class="btn sec2 add" data-act="sheetNote">New note</button></div></div>`;
}
function vReminders() {
  const t = today(), all = items('reminder').sort((a, b) => (a.data.date + a.data.time < b.data.date + b.data.time ? -1 : 1));
  const up = all.filter(m => !m.data.done && m.data.date >= t), rest = all.filter(m => m.data.done || m.data.date < t).reverse();
  const row = m => { const n = diffDays(t, m.data.date); return `<div class="row"><button class="ck ${m.data.done ? 'on' : ''}" data-act="toggleReminder" data-arg="${m.id}">${I.check}</button><button class="t" style="text-align:left" data-act="sheetReminder" data-arg="${m.id}"><b>${esc(m.data.title)}</b><span>${fmtDate(m.data.date)} · ${fmt12(m.data.time)}${m.data.note ? ' · ' + esc(m.data.note) : ''}</span></button>${!m.data.done && n >= 0 ? `<span class="tag ${n <= 1 ? 'red' : ''}">${n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n + ' days'}</span>` : ''}</div>`; };
  return `<div class="page">${pageTop('My reminders', 'more')}<div class="wrap"><div class="list">${up.length ? up.map(row).join('') : '<div class="empty">Add something you want to be reminded about</div>'}</div>
  <button class="btn add" data-act="sheetReminder">Add reminder</button>
  ${rest.length ? `<div class="h2">Done and past</div><div class="list">${rest.slice(0, 30).map(row).join('')}</div>` : ''}</div></div>`;
}
/* ---------- Azkar ---------- */
const zikrs = () => items('zikr').sort((a, b) => a.data.order - b.data.order);
const duasList = () => items('dua').sort((a, b) => a.data.order - b.data.order);
function zikrProgress(date, part) { const c = ((day(date).azkar || {})[part] || {}); const L = zikrs(); return `${L.filter(z => (c[z.id] || 0) >= z.data.count).length} of ${L.length}`; }
function vAzkar() {
  const tab = S.azTab || (new Date() >= adhan(today(), 'maghrib') ? 'masa' : 'sabah');
  S.azTab = tab;
  const head = `<div class="page">${pageTop('Azkar')}<div class="wrap"><div class="tabs az-tabs">${[['sabah', 'Sabah · الصباح'], ['masa', 'Masa · المساء'], ['duas', "Du'as · الأدعية"]].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="azTab" data-arg="${k}">${l}</button>`).join('')}</div>`;
  if (tab === 'duas') {
    const L = duasList();
    return head + `<div class="hstack" style="justify-content:space-between;margin:2px 4px 10px"><span class="small muted">${L.length} du'as · tap a page to enlarge</span><button class="link" data-act="go" data-arg="duaEdit">Edit</button></div>
    ${L.map(d => d.data.img ? `<button class="dua-img" data-act="viewDua" data-arg="${d.id}"><img loading="lazy" src="${esc(d.data.img)}" ${d.data.w ? `width="${d.data.w}" height="${d.data.h}"` : ''} alt="Du'a"></button>` : `<div class="dua-text" dir="rtl">${esc(d.data.text || '')}</div>`).join('') || '<div class="list"><div class="empty">No du\'as yet</div></div>'}
    <button class="btn sec2 add" data-act="sheetDuaAdd">Add du'a</button></div></div>`;
  }
  const t = today(), ad = day(t).azkar || {}, c = ad[tab] || {}, L = zikrs(), doneN = L.filter(z => (c[z.id] || 0) >= z.data.count).length, isDone = ad[tab + 'Done'];
  return head + `<p class="az-quote" dir="rtl">${esc(AZKAR_QUOTE)}</p>
  <div class="list az-prog"><div class="hstack" style="justify-content:space-between"><b>${tab === 'sabah' ? 'Morning' : 'Evening'} azkar · ${doneN} of ${L.length}</b>${isDone ? '<span class="tag green">Done ✓</span>' : `<button class="btn sm" data-act="azFinish" data-arg="${tab}">Mark all done</button>`}</div><div class="bar mt"><i style="width:${L.length ? doneN / L.length * 100 : 0}%;background:#C99A45"></i></div></div>
  ${L.map((z, i) => { const n = c[z.id] || 0, full = n >= z.data.count; const txt = tab === 'masa' && z.data.masa ? z.data.masa : z.data.text;
    return `<button class="zk ${full ? 'full' : ''}" data-act="zikrTap" data-arg="${z.id}">${z.data.title ? `<div class="zk-t" dir="rtl">${esc(z.data.title)}</div>` : ''}<div class="zk-x" dir="rtl">${esc(txt)}</div>
    <div class="zk-f"><span class="zk-n">${i + 1}</span><span class="zk-c">${full ? '✓ ' : ''}${Math.min(n, z.data.count)} / ${z.data.count}</span></div><i class="zk-bar" style="width:${Math.min(1, n / z.data.count) * 100}%"></i></button>`; }).join('')}
  <div class="two mt"><button class="btn sec2" data-act="azReset" data-arg="${tab}">Reset counters</button><button class="btn sec2" data-act="go" data-arg="azkarEdit">Edit azkar</button></div>
  <button class="link mt" style="display:block;margin:14px auto" data-act="viewSheet">View the original sheet</button></div></div>`;
}
function vAzkarEdit() {
  const L = zikrs();
  return `<div class="page">${pageTop('Edit azkar', 'azkar')}<div class="wrap"><p class="small muted" style="margin:0 6px">The same list is used for morning and evening. Use the arrows to change the order.</p><div class="list">${L.map((z, i) => `<div class="row"><div class="mv"><button data-act="mvZikr" data-arg="${z.id}|-1" ${i ? '' : 'disabled'}>▲</button><button data-act="mvZikr" data-arg="${z.id}|1" ${i < L.length - 1 ? '' : 'disabled'}>▼</button></div><button class="t" style="text-align:right" dir="rtl" data-act="sheetZikr" data-arg="${z.id}"><b>${esc(z.data.title || z.data.text.slice(0, 60))}${z.data.title || z.data.text.length <= 60 ? '' : '…'}</b><span>×${z.data.count}${z.data.masa ? ' · different evening wording' : ''}</span></button></div>`).join('')}</div>
  <button class="btn sec2 add" data-act="sheetZikr">Add zikr</button></div></div>`;
}
function vDuaEdit() {
  const L = duasList();
  return `<div class="page">${pageTop("Edit du'as", 'azkar')}<div class="wrap"><p class="small muted" style="margin:0 6px">Move pages up or down, or delete ones you don't need.</p><div class="list">${L.map((d, i) => `<div class="row"><div class="mv"><button data-act="mvDua" data-arg="${d.id}|-1" ${i ? '' : 'disabled'}>▲</button><button data-act="mvDua" data-arg="${d.id}|1" ${i < L.length - 1 ? '' : 'disabled'}>▼</button></div>${d.data.img ? `<img class="dua-thumb" loading="lazy" src="${esc(d.data.img)}" alt="">` : `<span class="t" dir="rtl" style="text-align:right">${esc((d.data.text || '').slice(0, 70))}</span>`}<span style="flex:1"></span><span class="small muted">${i + 1}</span><button class="link" style="color:var(--danger);margin-left:10px" data-act="delDua" data-arg="${d.id}">Delete</button></div>`).join('')}</div>
  <button class="btn sec2 add" data-act="sheetDuaAdd">Add du'a</button></div></div>`;
}
/* ---------- Relationships ---------- */
const REL_STATUS = ['Talking', 'Dating', 'Paused', 'Ended'];
const REL_INFO = [['met', 'How we met'], ['from', 'Where she is from'], ['work', 'Studies or work'], ['family', 'Family'], ['likes', 'Likes'], ['dislikes', 'Dislikes']];
const relPeople = () => items('person');
function since(dateStr) {
  if (!dateStr) return '';
  const n = diffDays(dateStr, today()); if (n < 0) return 'starts ' + fmtDate(dateStr);
  if (n < 14) return plural(n, 'day'); if (n < 60) return plural(Math.floor(n / 7), 'week');
  const m = Math.floor(n / 30.44); return m < 24 ? plural(m, 'month') : `${Math.floor(m / 12)} years ${m % 12 ? plural(m % 12, 'month') : ''}`.trim();
}
const agoText = d => { if (!d) return 'not logged'; const n = diffDays(d, today()); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; };
async function pinHash(pin) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('rise:' + S.user.id + ':' + pin)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
function relLocked() { return S.settings.relPin && !S.relOpen; }
function vRelLock() {
  return `<div class="page">${pageTop('Relationships')}<div class="wrap"><div class="list center" style="padding:26px 18px"><div style="font-size:34px">🔒</div><p class="mt">Enter your PIN</p>
  <input id="rel-pin" class="inp mt center" type="password" inputmode="numeric" maxlength="8" autocomplete="off" style="font-size:24px;letter-spacing:8px">
  <button class="btn full mt" data-act="relUnlock">Unlock</button><p class="small muted mt">Forgot it? Go to Settings → Relationships PIN → Remove, then sign in again.</p></div></div></div>`;
}
function vRel() {
  if (relLocked()) return vRelLock();
  const all = relPeople(), act = all.filter(p => p.data.status !== 'Ended').sort((a, b) => (b.data.lastTalked || '') > (a.data.lastTalked || '') ? 1 : -1), arch = all.filter(p => p.data.status === 'Ended');
  const fu = []; for (const p of act) for (const f of p.data.followups || []) if (!f.done) fu.push({ p, f }); fu.sort((a, b) => (a.f.date + (a.f.time || '')) < (b.f.date + (b.f.time || '')) ? -1 : 1);
  const tag = s => s === 'Dating' ? 'green' : s === 'Paused' ? 'violet' : s === 'Ended' ? 'red' : '';
  const row = p => { const lt = p.data.lastTalked ? diffDays(p.data.lastTalked, today()) : null; return `<button class="row" data-act="openPerson" data-arg="${p.id}"><span class="av-c">${esc((p.data.name || '?')[0].toUpperCase())}</span><span class="t"><b>${esc(p.data.name)}</b><span>${p.data.since ? 'Since ' + fmtDateY(p.data.since) + ' · ' + since(p.data.since) : 'Start date not set'}</span><span style="${lt != null && lt >= 5 ? 'color:var(--danger)' : ''}">Last talked ${agoText(p.data.lastTalked)}</span></span><span class="tag ${tag(p.data.status)}">${p.data.status}</span></button>`; };
  return `<div class="page">${pageTop('Relationships')}<div class="wrap">
  ${fu.length ? `<div class="h2">Follow-ups</div><div class="list">${fu.slice(0, 6).map(({ p, f }) => { const n = diffDays(today(), f.date); return `<div class="row"><button class="ck" data-act="relFuDone" data-arg="${p.id}|${f.id}">${I.check}</button><button class="t" style="text-align:left" data-act="openPerson" data-arg="${p.id}"><b>${esc(f.text)}</b><span>${esc(p.data.name)} · ${fmtDate(f.date)}${f.time ? ' · ' + fmt12(f.time) : ''}</span></button><span class="tag ${n < 0 ? 'red' : n <= 1 ? '' : 'green'}">${n < 0 ? 'Overdue' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n + ' days'}</span></div>`; }).join('')}</div>` : ''}
  <div class="h2">People</div><div class="list">${act.length ? act.map(row).join('') : '<div class="empty">Add someone to start</div>'}</div>
  <button class="btn add" data-act="sheetPerson">Add person</button>
  ${arch.length ? `<button class="link mt" style="margin-left:6px" data-act="togglePast" data-arg="rel">${S.showPast.rel ? 'Hide' : 'Show'} archive (${arch.length})</button>${S.showPast.rel ? `<div class="list">${arch.map(row).join('')}</div>` : ''}` : ''}
  <p class="small muted center mt2">${S.settings.relPin ? 'Locked with your PIN when you leave the app.' : 'Tip: set a PIN in Settings to lock this section.'}</p></div></div>`;
}
function vPerson() {
  if (relLocked()) return vRelLock();
  const p = item(S.personId); if (!p) { S.view = 'rel'; return vRel(); }
  const d = p.data, ev = (d.events || []).slice().sort((a, b) => a.date < b.date ? 1 : -1), fu = (d.followups || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const bdayNext = d.bday?.d ? nextYearly(d.bday.m, d.bday.d) : null;
  return `<div class="page">${pageTop(d.name, 'rel')}<div class="wrap">
  <div class="list" style="padding:16px"><div class="hstack" style="justify-content:space-between"><span class="tag">${d.status}</span><button class="link" data-act="sheetPerson" data-arg="${p.id}">Edit</button></div>
   <div class="two mt"><div><div class="small muted">Talking since</div><b>${d.since ? fmtDateY(d.since) : '–'}</b><div class="small muted">${since(d.since)}</div></div><div><div class="small muted">Last talked</div><b>${agoText(d.lastTalked)}</b><div><button class="link small" data-act="relTalked" data-arg="${p.id}">Talked today</button></div></div></div>
   ${bdayNext ? `<div class="mt"><div class="small muted">Birthday</div><b>${d.bday.d} ${MONL[d.bday.m - 1]}</b> <span class="small muted">· in ${plural(diffDays(today(), bdayNext), 'day')}</span></div>` : ''}</div>
  <div class="h2">Key info</div><div class="list">${REL_INFO.filter(([k]) => d.info?.[k]).map(([k, l]) => `<div class="row"><span class="t"><span>${l}</span><b style="white-space:pre-wrap">${esc(d.info[k])}</b></span></div>`).join('') || '<div class="empty">Nothing yet · tap Edit to add</div>'}</div>
  <div class="h2">Follow-ups</div><div class="list">${fu.length ? fu.map(f => `<div class="row"><button class="ck ${f.done ? 'on' : ''}" data-act="relFuDone" data-arg="${p.id}|${f.id}">${I.check}</button><span class="t"><b>${esc(f.text)}</b><span>${fmtDate(f.date)}${f.time ? ' · ' + fmt12(f.time) : ''}</span></span><button class="link" style="color:var(--danger)" data-act="relFuDel" data-arg="${p.id}|${f.id}">Delete</button></div>`).join('') : '<div class="empty">e.g. "Ask how her exam went" on Tuesday</div>'}</div>
  <button class="btn sec2 add" data-act="sheetRelFu" data-arg="${p.id}">Add follow-up</button>
  <div class="h2">Timeline</div><div class="list">${ev.length ? ev.map(e => `<button class="row" data-act="sheetRelEvent" data-arg="${p.id}|${e.id}"><span class="t"><b>${esc(e.text)}</b><span>${fmtDateY(e.date)}</span></span>${I.chev}</button>`).join('') : '<div class="empty">First call, first meeting, important talks…</div>'}</div>
  <button class="btn sec2 add" data-act="sheetRelEvent" data-arg="${p.id}">Add event</button>
  <div class="h2">Notes</div><div class="list" style="padding:8px"><textarea class="note-box" data-on="relNote" data-arg="${p.id}" placeholder="Anything she told you that you want to remember…">${esc(d.notes || '')}</textarea></div>
  <button class="btn danger full mt2" data-act="relDelete" data-arg="${p.id}">Delete ${esc(d.name)}</button></div></div>`;
}
/* ---------- Notifications ---------- */
function hasDueToday() {
  const t = today();
  if (items('reminder').some(m => !m.data.done && m.data.date === t)) return true;
  if (items('assignment').some(a => !a.data.submitted && a.data.due === t)) return true;
  if (items('exam').some(e => e.data.date === t)) return true;
  if (relPeople().some(p => (p.data.followups || []).some(f => !f.done && f.date <= t))) return true;
  return false;
}
function vNotifs() {
  const list = buildReminders().sort((a, b) => a.at < b.at ? -1 : 1), now = new Date(), t = today();
  const groups = {}; for (const x of list) { const d = new Date(x.at); const k = ymd(d); (groups[k] = groups[k] || []).push(x); }
  const keys = Object.keys(groups).sort().slice(0, 4);
  const lbl = k => { const n = diffDays(ymd(now), k); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : fmtDate(k); };
  const perm = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  return `<div class="page">${pageTop('Notifications', 'today')}<div class="wrap">
  ${perm !== 'granted' ? '<div class="list" style="padding:14px"><p class="small">Notifications are off on this phone. Turn them on in More → Settings.</p></div>' : ''}
  ${keys.length ? keys.map(k => `<div class="h2">${lbl(k)}</div><div class="list">${groups[k].map(x => { const d = new Date(x.at); return `<div class="row"><span style="width:62px;font-weight:600;color:var(--gold);font-size:13px">${fmt12(pad(d.getHours()) + ':' + pad(d.getMinutes()))}</span><span class="t"><b>${esc(x.title)}</b><span>${esc(x.body || '')}</span></span></div>`; }).join('')}</div>`).join('') : '<div class="list"><div class="empty">Nothing coming up</div></div>'}
  <p class="small muted center mt2">Choose which notifications you get in More → Settings.</p></div></div>`;
}
function vTasks() {
  return `<div class="page">${pageTop('My tasks', 'more')}<div class="wrap"><p class="muted small" style="margin:0 6px">Prayers, gym, Quran, languages, cardio, sleep and water are always on your checklist. Add your own tasks here.</p>
  <div class="list">${items('task').length ? items('task').map(t => `<button class="row" data-act="sheetTask" data-arg="${t.id}">${icon('tasks', 'c1')}<span class="t"><b>${esc(t.data.title)}</b><span>${t.data.repeat === 'daily' ? 'Every day' : t.data.repeat === 'once' ? 'Once · ' + fmtDateY(t.data.date) : (t.data.weekdays || []).map(w => DOW[w]).join(', ')}</span></span>${I.chev}</button>`).join('') : '<div class="empty">No extra tasks yet</div>'}</div>
  <button class="btn sec2 add" data-act="sheetTask">Add task</button></div></div>`;
}

/* ---------- Settings ---------- */
function vSettings() {
  const st = S.settings, r = st.reminders, dates = Object.keys(S.times).sort(), lastT = dates.at(-1);
  const remRows = [['rel', 'Relationships (birthdays and follow-ups)'], ['relNeutral', 'Relationship notifications say only "Reminder"'], ['azkar', 'Morning azkar (after Fajr) and evening azkar (after Maghrib)'], ['custom', 'My reminders'], ['prayers', 'Prayer times (Adhan)'], ['gym', 'Gym'], ['quran', 'Quran'], ['languages', 'Languages'], ['study', 'Study sessions'], ['exams', 'Exams (3, 2 and 1 day before)'], ['assignments', 'Assignments (1 week and 5 days before)'], ['dates', 'Important dates (2 weeks and 1 week before)'], ['zakat', 'Zakat (1 month and 1 week before)'], ['body', 'Weekly body measurements'], ['import', 'Import next month of prayer times'], ['weekly', 'Friday weekly summary'], ['fasts', 'Fasts to make up']];
  const perm = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  return `<div class="page">${pageTop('Settings', 'more')}<div class="wrap">
  <div class="h2">You</div><div class="list">
   <button class="row" data-act="sheetName"><span class="t"><b>Name</b><span>${esc(st.name)}</span></span>${I.chev}</button>
   <div class="row"><span class="t"><b>Look</b><span>Automatic switches to night after Maghrib</span></span></div>
   <div class="wrapchips" style="padding:0 0 12px">${[['auto', 'Automatic'], ['light', 'Day'], ['dark', 'Night']].map(([k, l]) => `<button class="pick ${st.theme === k ? 'on' : ''}" data-act="theme" data-arg="${k}">${l}</button>`).join('')}</div></div>
  <div class="h2">Prayers</div><div class="list">
   <button class="row" data-act="go" data-arg="importTimes"><span class="t"><b>Import prayer times</b><span>${lastT ? 'Awqaf times saved until ' + fmtDateY(lastT) : 'No Awqaf times yet · using estimated times'}</span></span>${I.chev}</button>
   <button class="row" data-act="sheetIqamah"><span class="t"><b>Iqamah times</b><span>${PR.map(p => `${PN[p]} ${st.iqamah[p]}`).join(' · ')} min</span></span>${I.chev}</button>
   <div class="row"><span class="t"><b>Hijri date adjustment</b><span>${hijriText(today())}</span></span><div class="stepper"><button data-act="hijriAdj" data-arg="-1">−</button><b style="min-width:30px;font-size:16px">${st.hijriAdjust > 0 ? '+' : ''}${st.hijriAdjust}</b><button data-act="hijriAdj" data-arg="1">+</button></div></div>
   <button class="row" data-act="sheetRelPin"><span class="t"><b>Relationships PIN</b><span>${S.settings.relPin ? 'On' : 'Off'}</span></span>${I.chev}</button>
   <button class="row" data-act="sheetStart"><span class="t"><b>Count missed prayers from</b><span>${st.startDate ? fmtDateY(st.startDate) : '–'}</span></span>${I.chev}</button></div>
  <div class="h2">Goals and times</div><div class="list">
   <button class="row" data-act="sheetGymTimes"><span class="t"><b>Gym days and times</b><span>${st.gymDays.map(d => `${DOW[d]} ${fmt12(st.gymTimes[d])}`).join(' · ')}</span></span>${I.chev}</button>
   <button class="row" data-act="sheetQuranGoal"><span class="t"><b>Quran</b><span>${st.quranGoal} min a day · reminder ${fmt12(st.quranTime)}</span></span>${I.chev}</button>
   <button class="row" data-act="go" data-arg="langs"><span class="t"><b>Languages</b><span>${langs().map(l => l.data.name).join(', ') || 'None'}</span></span>${I.chev}</button>
   <button class="row" data-act="sheetWaterGoal"><span class="t"><b>Water goal</b><span>${st.waterGoal} L a day</span></span>${I.chev}</button>
   <button class="row" data-act="sheetBodyRem"><span class="t"><b>Body measurements reminder</b><span>${DOWL[st.bodyDay]} at ${fmt12(st.bodyTime)}</span></span>${I.chev}</button>
   <button class="row" data-act="sheetRemTime"><span class="t"><b>Morning reminder time</b><span>${fmt12(st.remindTime)} · for exams, assignments, dates and zakat</span></span>${I.chev}</button></div>
  <div class="h2">Notifications</div><div class="list" style="padding:12px">
   ${perm === 'granted' ? '<p class="small"><b>Notifications are on</b> for this phone.</p>' : perm === 'unsupported' ? '<p class="small">To get notifications on iPhone, open Rise from your Home Screen (Share → Add to Home Screen), then come back here.</p>' : '<button class="btn full" data-act="enablePush">Turn on notifications</button>'}
   ${perm === 'granted' ? '<button class="link mt" data-act="testPush">Send a test notification</button>' : ''}
   <div class="mt">${remRows.map(([k, l]) => `<div class="row"><span class="t"><b style="font-weight:400">${l}</b></span><button class="toggle ${r[k] ? 'on' : ''}" data-act="toggleRem" data-arg="${k}" aria-label="${l}"></button></div>`).join('')}</div></div>
  <div class="h2">App</div><div class="list">
   <button class="row" data-act="updateApp"><span class="t"><b>Check for updates</b><span>Version ${APP_VERSION} · get the newest version of Rise</span></span>${I.chev}</button></div>
  <div class="h2">Your data</div><div class="list">
   <button class="row" data-act="backup"><span class="t"><b>Backup</b><span>Save all your data to a file</span></span>${I.chev}</button>
   <button class="row" data-act="signOut"><span class="t"><b style="color:var(--danger)">Sign out</b><span>${esc(S.user.email)}</span></span></button></div>
  <p class="small muted center mt2">Rise · made for ${esc(st.name)}</p>
  </div></div>`;
}

/* ---------- Import prayer times ---------- */
let importPreview = null;
function parseImport(text) {
  const rows = [], errors = []; let anchor = null;
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim(); if (!line) continue;
    const hm = line.match(/hijri[:\s]+(\d{1,2})\s+([A-Za-z\- ']+?)\s+(\d{4})/i);
    if (hm) { const name = hm[2].trim().toLowerCase().replace(/[^a-z]/g, ''); const idx = HM.findIndex(m => m.toLowerCase().replace(/[^a-z]/g, '') === name); if (idx >= 0) anchor = { d: +hm[1], m: idx + 1, y: +hm[3] }; continue; }
    let date = null, m;
    if ((m = line.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) date = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    else if ((m = line.match(/^(\d{1,2})[\s\/.\-]+(\d{1,2})[\s\/.\-]+(\d{4})/))) date = `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    const rest = m ? line.slice(m.index + m[0].length) : line;
    const ts = [...rest.matchAll(/(\d{1,2}):(\d{2})/g)].map(x => `${pad(x[1])}:${x[2]}`);
    if (!date || ts.length < 6) { errors.push(line); continue; }
    let [fajr, sunrise, dhuhr, asr, maghrib, isha] = ts;
    const fix = (t, minH) => { let [h, mm] = t.split(':').map(Number); if (h < minH) h += 12; return `${pad(h)}:${pad(mm)}`; };
    dhuhr = fix(dhuhr, 10); asr = fix(asr, 12); maghrib = fix(maghrib, 12); isha = fix(isha, 12);
    const ok = toMin(fajr) < toMin(sunrise) && toMin(sunrise) < toMin(dhuhr) && toMin(dhuhr) < toMin(asr) && toMin(asr) < toMin(maghrib) && toMin(maghrib) < toMin(isha);
    if (!ok || isNaN(parseYmd(date))) { errors.push(line); continue; }
    rows.push({ day: date, fajr, sunrise, dhuhr, asr, maghrib, isha });
  }
  rows.sort((a, b) => a.day < b.day ? -1 : 1);
  return { rows, errors, anchor };
}
function vImport() {
  const pv = importPreview;
  return `<div class="page">${pageTop('Import prayer times', 'settings')}<div class="wrap">
  <div class="list" style="padding:14px"><p class="small">1. Send Claude a screenshot of the Awqaf monthly table (Sharjah).<br>2. Copy the text Claude sends back.<br>3. Paste it below, tap <b>Check</b>, then <b>Save</b>.</p>
   <textarea class="inp mt" id="imp-text" rows="8" placeholder="03 10 2026 04:54 06:08 12:10 15:31 18:06 19:19">${esc(pv?.text || '')}</textarea>
   <button class="btn full mt" data-act="impCheck">Check</button></div>
  ${pv ? `<div class="list" style="padding:12px">${pv.rows.length ? `<p class="small"><b>${pv.rows.length} days</b> from ${fmtDateY(pv.rows[0].day)} to ${fmtDateY(pv.rows.at(-1).day)}${pv.anchor ? ` · Hijri: ${pv.anchor.d} ${HM[pv.anchor.m - 1]} ${pv.anchor.y}` : ''}</p>
   <table class="imp"><tr><th>Day</th><th>Fajr</th><th>Sunrise</th><th>Dhuhr</th><th>Asr</th><th>Maghrib</th><th>Isha</th></tr>${pv.rows.map(r => `<tr><td>${parseYmd(r.day).getDate()} ${MON[parseYmd(r.day).getMonth()]}</td><td>${r.fajr}</td><td>${r.sunrise}</td><td>${r.dhuhr}</td><td>${r.asr}</td><td>${r.maghrib}</td><td>${r.isha}</td></tr>`).join('')}</table>` : ''}
   ${pv.errors.length ? `<p class="err">${plural(pv.errors.length, 'line')} could not be read: ${esc(pv.errors.slice(0, 3).join(' | '))}</p>` : ''}
   ${pv.rows.length ? '<button class="btn full mt" data-act="impSave">Save these times</button>' : ''}</div>` : ''}
  </div></div>`;
}

/* ================= SHEETS ================= */
function openSheet(html) { $('#sheet-root').innerHTML = `<div class="sheet-bg" data-act="closeBg"><div class="sheet" role="dialog"><div class="grab"></div>${html}</div></div>`; }
function closeSheet() { $('#sheet-root').innerHTML = ''; }
const val = n => { const el = $(`#sheet-root [name="${n}"]`); return el ? el.value.trim() : ''; };
const num = n => { const v = val(n); return v === '' ? null : +v; };
const picked = n => $$(`#sheet-root [data-pick="${n}"].on`).map(b => b.dataset.v);
const fld = (label, inner) => `<label class="f"><span>${label}</span>${inner}</label>`;
const inp = (name, value = '', type = 'text', extra = '') => `<input name="${name}" type="${type}" value="${esc(value ?? '')}" ${extra}>`;
const picks = (name, opts, sel, multi = true) => `<div class="wrapchips">${opts.map(([v, l]) => `<button type="button" class="pick ${sel.includes(String(v)) ? 'on' : ''}" data-pick="${name}" data-multi="${multi ? 1 : 0}" data-v="${v}">${l}</button>`).join('')}</div>`;
const saveBtns = (act, arg = '', delAct = '') => `<div class="actions">${delAct ? `<button class="btn danger" data-act="${delAct}" data-arg="${arg}">Delete</button>` : ''}<button class="btn" data-act="${act}" data-arg="${arg}">Save</button></div>`;
const weekdayOpts = [0, 1, 2, 3, 4, 5, 6].map(i => [i, DOW[i]]);

const SHEETS = {
  sheetGym(date) {
    const g = day(date).gym || {};
    openSheet(`<h2>Gym · ${fmtDate(date)}</h2>${picks('status', [['went', 'Went'], ['skipped', "Didn't go"]], [g.status || ''], false)}
    ${fld('What did you train?', picks('trained', TRAINED.map(x => [x, x]), g.trained || []))}${fld('Note', inp('note', g.note, 'text', 'placeholder="Optional"'))}${saveBtns('saveGym', date)}`);
  },
  sheetQuran(arg) {
    const [date, id] = arg.split('|'); const q = id ? item(id) : null, last = quranLogs().at(-1);
    const page = q ? q.data.page : last ? last.data.page : '', sur = q ? q.data.surah : last ? last.data.surah : 0;
    openSheet(`<h2>${q ? 'Edit reading' : 'Log Quran reading'}</h2><p class="small muted">Where did you stop?</p>
    <div class="two">${fld('Page', inp('page', page, 'number', 'min="1" max="604" inputmode="numeric" data-on="pageSurah"'))}${fld('Ayah', inp('ayah', q?.data.ayah ?? '', 'number', 'min="1" inputmode="numeric"'))}</div>
    ${fld('Surah', `<select name="surah">${SURAH.map((s, i) => `<option value="${i}" ${i === +sur ? 'selected' : ''}>${i + 1}. ${s}</option>`).join('')}</select>`)}
    <div class="two">${fld('Minutes read', inp('minutes', q?.data.minutes ?? '', 'number', 'inputmode="numeric" placeholder="Optional"'))}${fld('Date', inp('date', q?.data.date || date, 'date'))}</div>
    ${saveBtns('saveQuran', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetQuranGoal() { openSheet(`<h2>Quran goal</h2><div class="two">${fld('Minutes a day', inp('goal', S.settings.quranGoal, 'number', 'inputmode="numeric"'))}${fld('Reminder', inp('time', S.settings.quranTime, 'time'))}</div>${saveBtns('saveQuranGoal')}`); },
  sheetLangLog(id) {
    const l = item(id); if (!l) return; const m = langMinutes(id, today());
    const logs = items('langlog').filter(x => x.data.langId === id).slice(-5).reverse();
    openSheet(`<h2>${esc(l.data.name)}</h2><p class="small muted">${m} of ${l.data.minutes} min today · ${langStreak(l)}-day streak</p>
    <div class="two">${fld('Minutes', inp('minutes', l.data.minutes, 'number', 'inputmode="numeric"'))}${fld('Date', inp('date', today(), 'date'))}</div>${fld('Note', inp('note', '', 'text', 'placeholder="e.g. Lesson 12, 10 new words"'))}
    ${saveBtns('saveLangLog', id)}${logs.length ? `<div class="h2">Recent</div><div class="list">${logs.map(x => `<div class="row"><span class="t"><b>${x.data.minutes} min</b><span>${fmtDateY(x.data.date)}${x.data.note ? ' · ' + esc(x.data.note) : ''}</span></span><button class="link" data-act="delItemAct" data-arg="${x.id}">Delete</button></div>`).join('')}</div>` : ''}
    <button class="link mt" data-act="sheetLang" data-arg="${id}">Change daily time or reminder</button>`);
  },
  sheetLang(id) {
    const l = id ? item(id) : null;
    openSheet(`<h2>${l ? 'Edit language' : 'Add language'}</h2>${fld('Language', inp('name', l?.data.name || '', 'text', 'placeholder="e.g. High Valyrian"'))}
    <div class="two">${fld('Daily time (min)', inp('minutes', l?.data.minutes || 20, 'number', 'inputmode="numeric"'))}${fld('Reminder', inp('time', l?.data.time || '20:00', 'time'))}</div>
    ${fld('Icon', picks('icon', [['dragon', 'Dragon'], ['lang', 'Letters']], [l?.data.icon || 'lang'], false))}
    ${l ? fld('Status', picks('active', [['1', 'Active'], ['0', 'Paused']], [l.data.active === false ? '0' : '1'], false)) : ''}
    ${saveBtns('saveLang', id || '', id ? 'delLang' : '')}`);
  },
  sheetCardio(date) {
    const L = day(date).cardio || [];
    openSheet(`<h2>Cardio · ${fmtDate(date)}</h2>${fld('Type', picks('type', [['Walk', 'Walk'], ['Bike', 'Bike'], ['Other', 'Other']], ['Walk'], false))}
    <div class="two">${fld('Minutes', inp('min', '', 'number', 'inputmode="numeric"'))}${fld('Incline', inp('incline', '', 'number', 'inputmode="decimal" placeholder="Optional"'))}</div>${saveBtns('saveCardio', date)}
    ${L.length ? `<div class="h2">Today</div><div class="list">${L.map((c, i) => `<div class="row"><span class="t"><b>${c.type} · ${c.min} min</b><span>${c.incline ? 'Incline ' + c.incline : ''}</span></span><button class="link" data-act="delCardio" data-arg="${date}|${i}">Delete</button></div>`).join('')}</div>` : ''}`);
  },
  sheetSleep(date) { const s = day(date).sleep; openSheet(`<h2>Sleep · ${fmtDate(date)}</h2>${fld('Hours slept', inp('sleep', s ?? '', 'number', 'step="0.5" inputmode="decimal" placeholder="e.g. 7.5"'))}${saveBtns('saveSleep', date)}`); },
  sheetWater(date) {
    const w = round(day(date).water || 0);
    openSheet(`<h2>Water · ${fmtDate(date)}</h2><div class="center"><div class="big-num">${w} L</div><p class="muted">Goal ${S.settings.waterGoal} L</p></div>
    <div class="three mt">${[0.25, 0.5, 1].map(x => `<button class="btn sec2" data-act="addWater" data-arg="${date}|${x}">+${x} L</button>`).join('')}</div>
    <div class="two mt"><button class="btn sec2" data-act="addWater" data-arg="${date}|-0.25">−0.25 L</button><button class="btn sec2" data-act="addWater" data-arg="${date}|reset">Reset</button></div>`);
  },
  sheetExam(id) {
    const e = id ? item(id) : null;
    openSheet(`<h2>${e ? 'Edit exam' : 'Add exam'}</h2>${fld('Subject', inp('subject', e?.data.subject || ''))}${fld('Type', picks('type', [['Quiz', 'Quiz'], ['Midterm', 'Midterm'], ['Final', 'Final']], [e?.data.type || 'Quiz'], false))}
    <div class="two">${fld('Date', inp('date', e?.data.date || '', 'date'))}${fld('Time', inp('time', e?.data.time || '', 'time'))}</div>${fld('Chapters included', inp('chapters', e?.data.chapters || '', 'text', 'placeholder="e.g. Ch. 1–5"'))}
    ${saveBtns('saveExam', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetAsg(id) {
    const a = id ? item(id) : null;
    openSheet(`<h2>${a ? 'Edit assignment' : 'Add assignment'}</h2>${fld('Title', inp('title', a?.data.title || ''))}${fld('Subject', inp('subject', a?.data.subject || ''))}
    <div class="two">${fld('Deadline', inp('due', a?.data.due || '', 'date'))}${fld('Time', inp('time', a?.data.time || '', 'time'))}</div>${saveBtns('saveAsg', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetSession(id) {
    const s = id ? item(id) : null;
    openSheet(`<h2>${s ? 'Edit study session' : 'Add study session'}</h2>${fld('Subject', inp('subject', s?.data.subject || ''))}${fld('Days', picks('weekdays', weekdayOpts, (s?.data.weekdays || []).map(String)))}
    <div class="two">${fld('Start', inp('start', s?.data.start || '20:00', 'time'))}${fld('End', inp('end', s?.data.end || '', 'time'))}</div>${saveBtns('saveSession', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetGymTimes() {
    const st = S.settings;
    openSheet(`<h2>Gym days and times</h2><p class="small muted">These stay until you change them.</p>${[0, 1, 2, 3, 4, 5, 6].map(i => `<div class="row"><button type="button" class="pick ${st.gymDays.includes(i) ? 'on' : ''}" data-pick="gdays" data-multi="1" data-v="${i}" style="width:64px">${DOW[i]}</button><input class="inp" name="gt${i}" type="time" value="${st.gymTimes[i] || '18:30'}" style="flex:1"></div>`).join('')}
    ${fld('Second reminder if not checked in after (min)', inp('nudge', st.gymNudge, 'number', 'inputmode="numeric"'))}${saveBtns('saveGymTimes')}`);
  },
  sheetBody(id) {
    const b = id ? item(id) : null;
    openSheet(`<h2>${b ? 'Edit measurement' : 'Body measurement'}</h2>${fld('Date', inp('date', b?.data.date || today(), 'date'))}${fld('Weight (kg)', inp('weight', b?.data.weight ?? '', 'number', 'step="0.1" inputmode="decimal"'))}
    <div class="two">${fld('Waist at navel (cm)', inp('navel', b?.data.navel ?? '', 'number', 'step="0.1" inputmode="decimal"'))}${fld('Lower belly (cm)', inp('belly', b?.data.belly ?? '', 'number', 'step="0.1" inputmode="decimal"'))}</div>${saveBtns('saveBody', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetBodyList() { const L = items('body').sort((a, b) => a.data.date < b.data.date ? 1 : -1); openSheet(`<h2>All measurements</h2><div class="list">${L.map(b => `<button class="row" data-act="sheetBody" data-arg="${b.id}"><span class="t"><b>${fmtDateY(b.data.date)}</b><span>${b.data.weight ?? '–'} kg · navel ${b.data.navel ?? '–'} cm · lower belly ${b.data.belly ?? '–'} cm</span></span>${I.chev}</button>`).join('')}</div>`); },
  sheetEvent(id) {
    const e = id ? item(id) : null;
    openSheet(`<h2>${e ? 'Edit date' : 'Add important date'}</h2>${fld('What is it?', inp('title', e?.data.title || '', 'text', 'placeholder="e.g. Ali\'s birthday"'))}
    <div class="two">${fld('Day', inp('day', e?.data.day || '', 'number', 'min="1" max="31" inputmode="numeric"'))}${fld('Month', `<select name="month">${MONL.map((m, i) => `<option value="${i + 1}" ${e?.data.month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>`)}</div>
    ${fld('Note', inp('note', e?.data.note || '', 'text', 'placeholder="Optional"'))}${saveBtns('saveEvent', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetZakat() {
    const z = items('zakat')[0];
    openSheet(`<h2>Zakat date</h2><p class="small muted">Choose the Islamic date your zakat is due.</p><div class="two">${fld('Day', inp('hd', z?.data.hd || '', 'number', 'min="1" max="30" inputmode="numeric"'))}${fld('Islamic month', `<select name="hm">${HM.map((m, i) => `<option value="${i + 1}" ${z?.data.hm === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>`)}</div>${saveBtns('saveZakat')}`);
  },
  sheetFast(id) {
    const f = id ? item(id) : null;
    openSheet(`<h2>${f ? 'Edit fasts' : 'Fasts owed'}</h2>${fld('Which fasts?', inp('title', f?.data.title || '', 'text', 'placeholder="e.g. Ramadan 1448"'))}<div class="two">${fld('How many', inp('total', f?.data.total || '', 'number', 'inputmode="numeric"'))}${fld('Already made up', inp('done', f?.data.done || 0, 'number', 'inputmode="numeric"'))}</div>${saveBtns('saveFast', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetNazr(id) {
    const n = id ? item(id) : null;
    openSheet(`<h2>${n ? 'Edit nazr' : 'Add nazr'}</h2>${fld('What did you promise?', inp('title', n?.data.title || '', 'text', 'placeholder="e.g. Fast 3 days"'))}<div class="two">${fld('How many times', inp('total', n?.data.total || 1, 'number', 'inputmode="numeric"'))}${fld('Done so far', inp('done', n?.data.done || 0, 'number', 'inputmode="numeric"'))}</div>${fld('Note', inp('note', n?.data.note || '', 'text', 'placeholder="When or why (optional)"'))}${saveBtns('saveNazr', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetNote(id) {
    const n = id ? item(id) : null;
    openSheet(`<h2>${n ? 'Note' : 'New note'}</h2>${fld('Title', inp('title', n?.data.title || ''))}${fld('Note', `<textarea name="body" rows="8">${esc(n?.data.body || '')}</textarea>`)}${saveBtns('saveNote', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetTask(id) {
    const t = id ? item(id) : null, rep = t?.data.repeat || 'daily';
    openSheet(`<h2>${t ? 'Edit task' : 'Add task'}</h2>${fld('Task', inp('title', t?.data.title || ''))}${fld('Repeat', picks('repeat', [['daily', 'Every day'], ['weekdays', 'Chosen days'], ['once', 'Once']], [rep], false))}
    ${fld('Days (for chosen days)', picks('weekdays', weekdayOpts, (t?.data.weekdays || []).map(String)))}${fld('Date (for once)', inp('date', t?.data.date || today(), 'date'))}${saveBtns('saveTask', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetReminder(id) {
    const m = id ? item(id) : null, now = new Date(); const later = new Date(now.getTime() + 3600e3);
    openSheet(`<h2>${m ? 'Edit reminder' : 'New reminder'}</h2>${fld('Remind me to', inp('title', m?.data.title || '', 'text', 'placeholder="e.g. Call the bank"'))}
    <div class="two">${fld('Date', inp('date', m?.data.date || today(), 'date'))}${fld('Time', inp('time', m?.data.time || `${pad(later.getHours())}:00`, 'time'))}</div>
    ${fld('Note', inp('note', m?.data.note || '', 'text', 'placeholder="Optional"'))}${saveBtns('saveReminder', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetZikr(id) {
    const z = id ? item(id) : null;
    openSheet(`<h2>${z ? 'Edit zikr' : 'Add zikr'}</h2>${fld('Title (optional)', inp('title', z?.data.title || '', 'text', 'dir="rtl" placeholder="e.g. آية الكرسي"'))}
    ${fld('Zikr', `<textarea name="text" dir="rtl" rows="5">${esc(z?.data.text || '')}</textarea>`)}
    ${fld('Evening wording (only if different)', `<textarea name="masa" dir="rtl" rows="3" placeholder="Leave empty if the same">${esc(z?.data.masa || '')}</textarea>`)}
    ${fld('How many times', inp('count', z?.data.count || 1, 'number', 'inputmode="numeric"'))}${saveBtns('saveZikr', id || '', id ? 'delItemAct' : '')}`);
  },
  sheetDuaAdd() {
    openSheet(`<h2>Add du'a</h2><p class="small muted">Choose a photo of the du'a, or type it.</p>${fld('Photo', '<input name="photo" type="file" accept="image/*">')}
    ${fld('Or type it', '<textarea name="text" dir="rtl" rows="5"></textarea>')}<div class="actions"><button class="btn" data-act="saveDuaPhoto">Add</button></div>`);
  },
  sheetPerson(id) {
    const p = id ? item(id) : null, d = p?.data || {};
    openSheet(`<h2>${p ? 'Edit' : 'Add person'}</h2>${fld('Name', inp('name', d.name || ''))}${fld('Status', picks('status', REL_STATUS.map(s => [s, s]), [d.status || 'Talking'], false))}
    ${fld('Talking since', inp('since', d.since || today(), 'date'))}
    <div class="two">${fld('Birthday day', inp('bd', d.bday?.d || '', 'number', 'min="1" max="31" inputmode="numeric" placeholder="Optional"'))}${fld('Birthday month', `<select name="bm"><option value="">–</option>${MONL.map((m, i) => `<option value="${i + 1}" ${d.bday?.m === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>`)}</div>
    ${REL_INFO.map(([k, l]) => fld(l, `<textarea name="i_${k}" rows="2">${esc(d.info?.[k] || '')}</textarea>`)).join('')}${saveBtns('savePerson', id || '')}`);
  },
  sheetRelEvent(arg) {
    const [pid, eid] = arg.split('|'); const e = eid ? (item(pid).data.events || []).find(x => x.id === eid) : null;
    openSheet(`<h2>${e ? 'Edit event' : 'Add event'}</h2>${fld('What happened', `<textarea name="text" rows="3">${esc(e?.text || '')}</textarea>`)}${fld('Date', inp('date', e?.date || today(), 'date'))}${saveBtns('saveRelEvent', arg, e ? 'relEventDel' : '')}`);
  },
  sheetRelFu(pid) {
    const tm = addDays(today(), 1);
    openSheet(`<h2>Add follow-up</h2>${fld('Remind me to', inp('text', '', 'text', 'placeholder="e.g. Ask how her exam went"'))}<div class="two">${fld('Date', inp('date', tm, 'date'))}${fld('Time', inp('time', '19:00', 'time'))}</div>${saveBtns('saveRelFu', pid)}`);
  },
  sheetRelPin() {
    openSheet(`<h2>Relationships PIN</h2><p class="small muted">${S.settings.relPin ? 'Change or remove the PIN that locks the Relationships section.' : 'Choose a 4 to 8 digit PIN. You will need it each time you open Relationships.'}</p>
    ${fld('New PIN', '<input name="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off">')}${fld('Repeat PIN', '<input name="pin2" type="password" inputmode="numeric" maxlength="8" autocomplete="off">')}
    <div class="actions">${S.settings.relPin ? '<button class="btn danger" data-act="relPinRemove">Remove PIN</button>' : ''}<button class="btn" data-act="saveRelPin">Save</button></div>`);
  },
  sheetQadaAdd() { openSheet(`<h2>Add older missed prayers</h2><p class="small muted">For prayers missed before you started using Rise.</p>${fld('Prayer', picks('prayer', PR.map(p => [p, PN[p]]), ['fajr'], false))}${fld('How many', inp('count', '', 'number', 'inputmode="numeric"'))}${saveBtns('saveQadaAdd')}`); },
  sheetIqamah() { openSheet(`<h2>Iqamah after Adhan</h2><p class="small muted">Minutes after the Adhan.</p>${PR.map(p => `<div class="row"><span class="t"><b>${PN[p]}</b></span><input class="inp" name="iq_${p}" type="number" inputmode="numeric" value="${S.settings.iqamah[p]}" style="width:90px"></div>`).join('')}${saveBtns('saveIqamah')}`); },
  sheetName() { openSheet(`<h2>Your name</h2>${fld('Name', inp('name', S.settings.name))}${saveBtns('saveName')}`); },
  sheetWaterGoal() { openSheet(`<h2>Water goal</h2>${fld('Litres a day', inp('goal', S.settings.waterGoal, 'number', 'step="0.25" inputmode="decimal"'))}${saveBtns('saveWaterGoal')}`); },
  sheetBodyRem() { openSheet(`<h2>Body reminder</h2>${fld('Day', `<select name="day">${DOWL.map((d, i) => `<option value="${i}" ${S.settings.bodyDay === i ? 'selected' : ''}>${d}</option>`).join('')}</select>`)}${fld('Time', inp('time', S.settings.bodyTime, 'time'))}${saveBtns('saveBodyRem')}`); },
  sheetRemTime() { openSheet(`<h2>Morning reminder time</h2><p class="small muted">Used for exams, assignments, important dates and zakat.</p>${fld('Time', inp('time', S.settings.remindTime, 'time'))}${saveBtns('saveRemTime')}`); },
  sheetStart() { openSheet(`<h2>Count missed prayers from</h2><p class="small muted">Unticked prayers from this date onward count as qada. Add older ones with "Add older".</p>${fld('Date', inp('date', S.settings.startDate || today(), 'date'))}${saveBtns('saveStart')}`); }
};

/* ================= ACTIONS ================= */
function done(msg) { closeSheet(); render(); if (msg) toast(msg); }
const need = (v, msg) => { if (v === '' || v == null || (typeof v === 'number' && isNaN(v))) { toast(msg); return false; } return true; };
const ACT = {
  go(v) { S.view = v; if (v === 'prayers') S.prayerDate = prayerDay(); if (v === 'importTimes') importPreview = null; closeSheet(); render(); window.scrollTo(0, 0); },
  closeBg(_, e) { if (e.target.classList.contains('sheet-bg')) closeSheet(); },
  pDay(n) { S.prayerDate = addDays(S.prayerDate, +n); render(); },
  pGoDate(d) { S.prayerDate = d; render(); window.scrollTo({ top: 300, behavior: 'smooth' }); },
  calMove(n) { const t = parseYmd(today()); const cm = S.calMonth || [t.getFullYear(), t.getMonth()]; const d = new Date(cm[0], cm[1] + +n, 1); S.calMonth = [d.getFullYear(), d.getMonth()]; render(); },
  histTab(k) { S.histTab = k; render(); },
  togglePrayer(p) { const d = S.prayerDate; if (d > today()) return toast("You can't tick a future day"); setDay(d, x => { x.prayers = x.prayers || {}; x.prayers[p] = !x.prayers[p]; }); render(); },
  qadaDone(p) { addItem('qada_done', { prayer: p, date: today() }); render(); toast(`${PN[p]} qada recorded`); },
  saveQadaAdd() { const c = num('count'); const p = picked('prayer')[0]; if (!need(c, 'Enter how many')) return; addItem('qada_add', { prayer: p, count: c }); done(`Added ${c} ${PN[p]}`); },
  saveGym(date) { const st = picked('status')[0]; if (!st) return toast('Choose Went or Didn\'t go'); setDay(date, x => { x.gym = { status: st, trained: st === 'went' ? picked('trained') : [], note: val('note') }; }); done('Gym saved'); },
  saveQuran(id) {
    const page = num('page'); if (!need(page, 'Enter the page')) return; if (page < 1 || page > 604) return toast('Page must be 1 to 604');
    const data = { page, surah: +val('surah'), ayah: num('ayah'), minutes: num('minutes'), date: val('date') || today() };
    if (id) updItem(id, data); else addItem('quran', data); done('Reading saved');
  },
  saveQuranGoal() { const g = num('goal'); if (!need(g, 'Enter minutes')) return; S.settings.quranGoal = g; S.settings.quranTime = val('time') || S.settings.quranTime; saveSettings(); done('Saved'); },
  khatam() { if (!confirm('Mark the Quran as completed and start a new round?')) return; addItem('khatam', { date: today() }); render(); toast('Alhamdulillah! New round started'); },
  saveLangLog(id) { const m = num('minutes'); if (!need(m, 'Enter minutes')) return; addItem('langlog', { langId: id, date: val('date') || today(), minutes: m, note: val('note') }); done('Session saved'); },
  saveLang(id) {
    const name = val('name'); if (!need(name, 'Enter the language')) return;
    const data = { name, minutes: num('minutes') || 20, time: val('time') || '20:00', icon: picked('icon')[0] || 'lang' };
    if (id) { data.active = (picked('active')[0] ?? '1') === '1'; updItem(id, data); } else addItem('language', { ...data, active: true });
    done('Saved');
  },
  delLang(id) { if (!confirm('Remove this language? Choose OK to remove it. Its history is kept unless you also delete the sessions.')) return; delItem(id); done('Language removed'); },
  toggleSession(arg) { const [id, date] = arg.split('|'); setDay(date, x => { x.sessions = x.sessions || {}; x.sessions[id] = !x.sessions[id]; }); render(); },
  toggleTask(arg) { const [id, date] = arg.split('|'); setDay(date, x => { x.tasks = x.tasks || {}; x.tasks[id] = !x.tasks[id]; }); render(); },
  saveCardio(date) { const m = num('min'); if (!need(m, 'Enter minutes')) return; setDay(date, x => { x.cardio = x.cardio || []; x.cardio.push({ type: picked('type')[0] || 'Walk', min: m, incline: num('incline') }); }); done('Cardio saved'); },
  delCardio(arg) { const [date, i] = arg.split('|'); setDay(date, x => { x.cardio.splice(+i, 1); }); SHEETS.sheetCardio(date); render(); },
  saveSleep(date) { const s = num('sleep'); setDay(date, x => { if (s == null) delete x.sleep; else x.sleep = s; }); done('Saved'); },
  addWater(arg) { const [date, a] = arg.split('|'); setDay(date, x => { x.water = a === 'reset' ? 0 : Math.max(0, round((x.water || 0) + +a)); }); SHEETS.sheetWater(date); render(); },
  saveExam(id) { const data = { subject: val('subject'), type: picked('type')[0] || 'Quiz', date: val('date'), time: val('time'), chapters: val('chapters') }; if (!need(data.subject, 'Enter the subject') || !need(data.date, 'Pick the date')) return; id ? updItem(id, data) : addItem('exam', data); done('Exam saved'); },
  saveAsg(id) { const data = { title: val('title'), subject: val('subject'), due: val('due'), time: val('time') }; if (!need(data.title, 'Enter the title') || !need(data.due, 'Pick the deadline')) return; id ? updItem(id, data) : addItem('assignment', { ...data, submitted: false }); done('Assignment saved'); },
  submitAsg(id) { const a = item(id); updItem(id, { submitted: !a.data.submitted }); render(); toast(a.data.submitted ? 'Marked as submitted' : 'Marked as not submitted'); },
  saveSession(id) { const data = { subject: val('subject'), weekdays: picked('weekdays').map(Number), start: val('start'), end: val('end') }; if (!need(data.subject, 'Enter the subject') || !data.weekdays.length) return toast('Choose at least one day'); id ? updItem(id, data) : addItem('session', data); done('Saved'); },
  togglePast(k) { S.showPast[k] = !S.showPast[k]; render(); },
  saveGymTimes() { const st = S.settings; st.gymDays = picked('gdays').map(Number).sort(); for (let i = 0; i < 7; i++) st.gymTimes[i] = val('gt' + i) || st.gymTimes[i] || '18:30'; st.gymNudge = num('nudge') ?? 30; saveSettings(); done('Gym times saved'); },
  saveBody(id) { const data = { date: val('date') || today(), weight: num('weight'), navel: num('navel'), belly: num('belly') }; if (data.weight == null && data.navel == null && data.belly == null) return toast('Enter at least one measurement'); id ? updItem(id, data) : addItem('body', data); done('Measurement saved'); },
  saveEvent(id) { const data = { title: val('title'), day: num('day'), month: +val('month'), note: val('note') }; if (!need(data.title, 'Enter what it is') || !need(data.day, 'Enter the day')) return; id ? updItem(id, data) : addItem('event', data); done('Date saved'); },
  saveZakat() { const hd = num('hd'), hm = +val('hm'); if (!need(hd, 'Enter the day')) return; const z = items('zakat')[0]; z ? updItem(z.id, { hd, hm }) : addItem('zakat', { hd, hm }); done('Zakat date saved'); },
  delZakat() { if (!confirm('Remove your zakat date?')) return; const z = items('zakat')[0]; if (z) delItem(z.id); render(); },
  saveFast(id) { const data = { title: val('title'), total: num('total'), done: num('done') || 0 }; if (!need(data.title, 'Enter which fasts') || !need(data.total, 'Enter how many')) return; id ? updItem(id, data) : addItem('fast', data); done('Saved'); },
  fastDone(id) { const f = item(id); updItem(id, { done: Math.min(f.data.total, f.data.done + 1) }); render(); toast('Fast recorded'); },
  saveNazr(id) { const data = { title: val('title'), total: num('total') || 1, done: num('done') || 0, note: val('note') }; if (!need(data.title, 'Enter what you promised')) return; if (data.done >= data.total) data.doneAt = item(id)?.data.doneAt || today(); id ? updItem(id, data) : addItem('nazr', data); done('Saved'); },
  nazrDone(id) { const n = item(id); const d = Math.min(n.data.total, n.data.done + 1); updItem(id, { done: d, ...(d >= n.data.total ? { doneAt: today() } : {}) }); render(); toast(d >= n.data.total ? 'Nazr fulfilled' : 'Recorded'); },
  saveNote(id) { const data = { title: val('title'), body: val('body'), updated: new Date().toISOString() }; if (!data.title && !data.body) return closeSheet(); id ? updItem(id, data) : addItem('note', data); done('Note saved'); },
  saveTask(id) { const data = { title: val('title'), repeat: picked('repeat')[0] || 'daily', weekdays: picked('weekdays').map(Number), date: val('date') }; if (!need(data.title, 'Enter the task')) return; if (data.repeat === 'weekdays' && !data.weekdays.length) return toast('Choose at least one day'); id ? updItem(id, data) : addItem('task', data); done('Task saved'); },
  saveReminder(id) {
    const data = { title: val('title'), date: val('date'), time: val('time'), note: val('note') };
    if (!need(data.title, 'Enter what to remind you about') || !need(data.date, 'Pick a date') || !need(data.time, 'Pick a time')) return;
    if (at(data.date, data.time) < new Date()) return toast('That time has already passed');
    if (id) updItem(id, { ...data, done: false }); else addItem('reminder', { ...data, done: false });
    done(`Reminder set for ${fmtDate(data.date)} at ${fmt12(data.time)}`);
  },
  toggleReminder(id) { const m = item(id); updItem(id, { done: !m.data.done }); render(); },
  goAzkar(t) { S.azTab = t; ACT.go('azkar'); },
  azTab(t) { S.azTab = t; render(); window.scrollTo(0, 0); },
  zikrTap(id) {
    const tab = S.azTab, z = item(id), t = today();
    setDay(t, x => { x.azkar = x.azkar || {}; const c = x.azkar[tab] = x.azkar[tab] || {}; c[id] = (c[id] || 0) >= z.data.count ? 0 : (c[id] || 0) + 1;
      const all = zikrs().every(q => (c[q.id] || 0) >= q.data.count); x.azkar[tab + 'Done'] = all; });
    if (navigator.vibrate) navigator.vibrate(12);
    const y = window.scrollY; render(); window.scrollTo(0, y);
    if ((day(t).azkar || {})[tab + 'Done']) toast(tab === 'sabah' ? 'Morning azkar complete · تقبل الله' : 'Evening azkar complete · تقبل الله');
  },
  azFinish(tab) { setDay(today(), x => { x.azkar = x.azkar || {}; const c = x.azkar[tab] = {}; for (const z of zikrs()) c[z.id] = z.data.count; x.azkar[tab + 'Done'] = true; }); render(); toast('تقبل الله'); },
  azReset(tab) { if (!confirm('Reset the counters for this list today?')) return; setDay(today(), x => { x.azkar = x.azkar || {}; x.azkar[tab] = {}; x.azkar[tab + 'Done'] = false; }); render(); },
  viewSheet() { openViewer('assets/duas/azkar-sheet.jpg'); },
  viewDua(id) { const d = item(id); if (d?.data.img) openViewer(d.data.img); },
  mvZikr(arg) { const [id, dir] = arg.split('|'); swapOrder(zikrs(), id, +dir); render(); },
  mvDua(arg) { const [id, dir] = arg.split('|'); const y = window.scrollY; swapOrder(duasList(), id, +dir); render(); window.scrollTo(0, y); },
  delDua(id) { if (!confirm("Delete this du'a?")) return; const y = window.scrollY; delItem(id); render(); window.scrollTo(0, y); },
  saveZikr(id) {
    const data = { title: val('title') || null, text: val('text'), masa: val('masa') || null, count: num('count') || 1 };
    if (!need(data.text, 'Enter the zikr text')) return;
    if (id) updItem(id, data); else addItem('zikr', { ...data, order: (zikrs().at(-1)?.data.order || 0) + 1 });
    done('Saved');
  },
  async saveDuaPhoto() {
    const f = $('#sheet-root [name=photo]')?.files?.[0]; const text = val('text');
    if (!f && !text) return toast('Choose a photo or type the du\'a');
    const order = (duasList().at(-1)?.data.order || 0) + 1;
    if (f) { toast('Adding…'); const img = await shrinkImage(f); addItem('dua', { img: img.src, w: img.w, h: img.h, order }); }
    else addItem('dua', { text, order });
    done("Du'a added at the end");
  },
  openPerson(id) { S.personId = id; ACT.go('person'); },
  async relUnlock() { const v = $('#rel-pin').value; if (!v) return; if (await pinHash(v) === S.settings.relPin) { S.relOpen = true; render(); } else { toast('Wrong PIN'); $('#rel-pin').value = ''; } },
  savePerson(id) {
    const name = val('name'); if (!need(name, 'Enter a name')) return;
    const bd = num('bd'), bm = +val('bm') || null, info = {}; for (const [k] of REL_INFO) { const v = val('i_' + k); if (v) info[k] = v; }
    const data = { name, status: picked('status')[0] || 'Talking', since: val('since') || null, bday: bd && bm ? { d: bd, m: bm } : null, info };
    if (id) updItem(id, data); else { const it = addItem('person', { ...data, events: [], followups: [], notes: '', lastTalked: today() }); S.personId = it.id; S.view = 'person'; }
    done('Saved');
  },
  relTalked(id) { updItem(id, { lastTalked: today() }); render(); toast('Noted'); },
  saveRelEvent(arg) {
    const [pid, eid] = arg.split('|'), p = item(pid), text = val('text'), date = val('date') || today(); if (!need(text, 'Write what happened')) return;
    const ev = (p.data.events || []).slice(); if (eid) { const e = ev.find(x => x.id === eid); e.text = text; e.date = date; } else ev.push({ id: uid(), text, date });
    updItem(pid, { events: ev }); done('Saved');
  },
  relEventDel(arg) { const [pid, eid] = arg.split('|'); if (!confirm('Delete this event?')) return; updItem(pid, { events: item(pid).data.events.filter(e => e.id !== eid) }); done('Deleted'); },
  saveRelFu(pid) { const text = val('text'), date = val('date'), time = val('time'); if (!need(text, 'Enter what to remember') || !need(date, 'Pick a date')) return; updItem(pid, { followups: [...(item(pid).data.followups || []), { id: uid(), text, date, time, done: false }] }); done(`Follow-up set for ${fmtDate(date)}`); },
  relFuDone(arg) { const [pid, fid] = arg.split('|'); updItem(pid, { followups: item(pid).data.followups.map(f => f.id === fid ? { ...f, done: !f.done } : f) }); render(); },
  relFuDel(arg) { const [pid, fid] = arg.split('|'); updItem(pid, { followups: item(pid).data.followups.filter(f => f.id !== fid) }); render(); },
  relDelete(id) { if (!confirm('Delete this person and everything saved about her? To keep the history, set the status to Ended instead.')) return; delItem(id); S.view = 'rel'; render(); toast('Deleted'); },
  async saveRelPin() { const a = val('pin'), b = val('pin2'); if (!/^\d{4,8}$/.test(a)) return toast('Use 4 to 8 digits'); if (a !== b) return toast("PINs don't match"); S.settings.relPin = await pinHash(a); S.relOpen = true; saveSettings(); done('PIN saved'); },
  relPinRemove() { if (!confirm('Remove the PIN?')) return; S.settings.relPin = null; saveSettings(); done('PIN removed'); },
  delItemAct(id) { if (!confirm('Delete this?')) return; delItem(id); done('Deleted'); },
  theme(k) { S.settings.theme = k; saveSettings(); render(); },
  toggleRem(k) { S.settings.reminders[k] = !S.settings.reminders[k]; saveSettings(); render(); },
  hijriAdj(n) { S.settings.hijriAdjust = Math.max(-2, Math.min(2, (S.settings.hijriAdjust || 0) + +n)); saveSettings(); render(); },
  saveIqamah() { for (const p of PR) { const v = num('iq_' + p); if (v != null) S.settings.iqamah[p] = v; } saveSettings(); done('Iqamah times saved'); },
  saveName() { const n = val('name'); if (!need(n, 'Enter your name')) return; S.settings.name = n; saveSettings(); done('Saved'); },
  saveWaterGoal() { const g = num('goal'); if (!need(g, 'Enter litres')) return; S.settings.waterGoal = g; saveSettings(); done('Saved'); },
  saveBodyRem() { S.settings.bodyDay = +val('day'); S.settings.bodyTime = val('time') || S.settings.bodyTime; saveSettings(); done('Saved'); },
  saveRemTime() { S.settings.remindTime = val('time') || S.settings.remindTime; saveSettings(); done('Saved'); },
  saveStart() { const d = val('date'); if (!need(d, 'Pick a date')) return; S.settings.startDate = d; saveSettings(); done('Saved'); },
  impCheck() { const text = $('#imp-text').value; importPreview = { text, ...parseImport(text) }; render(); },
  async impSave() {
    const pv = importPreview; if (!pv?.rows.length) return;
    for (const r of pv.rows) S.times[r.day] = { fajr: r.fajr, sunrise: r.sunrise, dhuhr: r.dhuhr, asr: r.asr, maghrib: r.maghrib, isha: r.isha };
    enqueue({ type: 'upsert', table: 'prayer_times', key: 'import-' + pv.rows[0].day + '-' + pv.rows.length, onConflict: 'user_id,day', row: pv.rows.map(r => ({ user_id: S.user.id, ...r })) });
    if (pv.anchor) { const first = pv.rows[0].day; for (let off = -2; off <= 2; off++) { const u = uq(addDays(first, -off)); if (u.d === pv.anchor.d && u.m === pv.anchor.m && u.y === pv.anchor.y) { S.settings.hijriAnchor = { m: pv.anchor.m, y: pv.anchor.y, off }; S.settings.hijriAdjust = 0; saveSettings(); break; } } }
    importPreview = null; _tdCache.k = ''; S.view = 'prayers'; render(); toast(`Saved ${pv.rows.length} days of Awqaf times`);
  },
  backup() {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), settings: S.settings, days: S.days, items: S.items, prayer_times: S.times }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `rise-backup-${today()}.json`; document.body.appendChild(a); a.click(); a.remove();
  },
  async signOut() { if (!confirm('Sign out of Rise on this phone?')) return; try { localStorage.removeItem(cacheKey()); localStorage.removeItem(queueKey()); } catch { } await sb.auth.signOut(); location.reload(); },
  updateApp() { updateApp(true); },
  enablePush, testPush,
  authMode(m) { authMode = m; renderAuth(); },
  doAuth
};
Object.assign(ACT, SHEETS);
const ON = {
  relNote(el) { const id = el.dataset.arg; clearTimeout(ON._r); ON._r = setTimeout(() => updItem(id, { notes: el.value }), 700); },
  dayNote(el) { const d = el.dataset.arg; clearTimeout(ON._n); ON._n = setTimeout(() => setDay(d, x => { x.note = el.value; }), 700); },
  pageSurah(el) { const p = +el.value; if (p >= 1 && p <= 604) { const s = $('#sheet-root [name=surah]'); if (s) s.value = surahForPage(p); } }
};
document.addEventListener('click', e => {
  const pk = e.target.closest('[data-pick]');
  if (pk) { if (pk.dataset.multi === '0') $$(`[data-pick="${pk.dataset.pick}"]`, pk.parentElement).forEach(b => b.classList.toggle('on', b === pk)); else pk.classList.toggle('on'); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = ACT[el.dataset.act]; if (!f) return;
  if (el.dataset.act === 'closeBg' && el !== e.target) return;
  e.preventDefault(); f(el.dataset.arg ?? '', e);
});
document.addEventListener('input', e => { const el = e.target.closest('[data-on]'); if (el && ON[el.dataset.on]) ON[el.dataset.on](el); });

const VIEWS = { today: vToday, prayers: vPrayers, study: vStudy, langs: vLangs, fitness: vFitness, more: vMore, quran: vQuran, summary: vSummary, dates: vDates, zakat: vZakat, fasts: vFasts, nazr: vNazr, notes: vNotes, tasks: vTasks, reminders: vReminders, notifs: vNotifs, rel: vRel, person: vPerson, azkar: vAzkar, azkarEdit: vAzkarEdit, duaEdit: vDuaEdit, settings: vSettings, importTimes: vImport };

/* ================= REMINDERS ================= */
// Rise works out the reminders for the next 7 days and stores them; a small service on Supabase sends them on time.
function buildReminders() {
  const st = S.settings, r = st.reminders, now = new Date(), t = today(), out = [];
  const push = (when, title, body, tag, url = './') => { if (when > now) out.push({ at: when.toISOString(), title, body, tag, url }); };
  if (r.azkar) for (let i = 0; i < 7; i++) { const d = addDays(t, i), ad = day(d).azkar || {}; if (!ad.sabahDone) push(new Date(adhan(d, 'fajr').getTime() + 30 * 60e3), 'Morning azkar', 'أذكار الصباح · tap to start', `az-s-${d}`, './?v=azkar&t=sabah'); if (!ad.masaDone) push(new Date(adhan(d, 'maghrib').getTime() + 15 * 60e3), 'Evening azkar', 'أذكار المساء · tap to start', `az-m-${d}`, './?v=azkar&t=masa'); }
  if (r.rel) for (const p of relPeople()) for (const f of (p.data.followups || [])) if (!f.done && diffDays(t, f.date) >= 0 && diffDays(t, f.date) <= 60) push(at(f.date, f.time || '10:00'), r.relNeutral ? 'Reminder' : `${p.data.name}: follow up`, r.relNeutral ? 'Open Rise for details' : f.text, `rf-${p.id}-${f.id}`, './?v=rel');
  if (r.custom) for (const m of items('reminder')) if (!m.data.done && diffDays(t, m.data.date) <= 60) push(at(m.data.date, m.data.time), m.data.title, m.data.note || 'Your reminder from Rise', `rm-${m.id}`, './?v=reminders');
  for (let i = 0; i < 7; i++) {
    const d = addDays(t, i), wd = parseYmd(d).getDay(), dd = day(d);
    if (r.prayers) for (const p of PR) push(adhan(d, p), PN[p], `It's time for ${PN[p]} · iqamah in ${st.iqamah[p]} min`, `pr-${d}-${p}`, './?v=prayers');
    if (r.gym && isGymDay(d) && !(dd.gym || {}).status) { const g = at(d, st.gymTimes[wd]); push(g, 'Gym time', "Time to train. Tap to check in when you're there.", `gym-${d}`); push(new Date(g.getTime() + st.gymNudge * 60e3), 'Did you go to the gym?', "You haven't checked in yet.", `gym2-${d}`); }
    if (r.quran && !quranDone(d)) push(at(d, st.quranTime), 'Quran', `Your ${st.quranGoal} minutes of Quran today${currentPage() ? ' · continue from page ' + currentPage() : ''}`, `qr-${d}`);
    if (r.languages) for (const l of langs()) if (langMinutes(l.id, d) < l.data.minutes) push(at(d, l.data.time), l.data.name, `${l.data.minutes} minutes of ${l.data.name} today`, `lg-${d}-${l.id}`);
    if (r.study) for (const s of sessionsFor(d)) if (!(dd.sessions || {})[s.id]) push(at(d, s.data.start), `Study: ${s.data.subject}`, `Your study session starts now${s.data.end ? ' until ' + fmt12(s.data.end) : ''}`, `ss-${d}-${s.id}`);
    const morning = at(d, st.remindTime);
    if (r.exams) for (const e of items('exam')) { const n = diffDays(d, e.data.date); if ([3, 2, 1].includes(n)) push(morning, `${e.data.subject} ${e.data.type} ${n === 1 ? 'tomorrow' : 'in ' + n + ' days'}`, e.data.chapters ? `Chapters: ${e.data.chapters}` : 'Time to revise', `ex-${d}-${e.id}`, './?v=study'); }
    if (r.assignments) for (const a of items('assignment')) { if (a.data.submitted) continue; const n = diffDays(d, a.data.due); if ([7, 5].includes(n)) push(morning, `${a.data.title} due in ${n} days`, `Deadline ${fmtDate(a.data.due)}`, `as-${d}-${a.id}`, './?v=study'); }
    if (r.rel) for (const p of relPeople()) { if (p.data.status === 'Ended') continue; const nt = r.relNeutral;
      if (p.data.bday?.d) { const n = diffDays(d, nextYearly(p.data.bday.m, p.data.bday.d)); if ([14, 7, 0].includes(n)) push(morning, nt ? 'Reminder' : `${p.data.name}'s birthday ${n ? 'in ' + (n === 7 ? '1 week' : '2 weeks') : 'is today'}`, nt ? 'Open Rise for details' : `${p.data.bday.d} ${MONL[p.data.bday.m - 1]}`, `rb-${d}-${p.id}`, './?v=rel'); } }
    if (r.dates) for (const e of items('event')) { const n = diffDays(d, nextYearly(e.data.month, e.data.day)); if ([14, 7].includes(n)) push(morning, `${e.data.title} in ${n === 7 ? '1 week' : '2 weeks'}`, `${e.data.day} ${MONL[e.data.month - 1]}`, `ev-${d}-${e.id}`); }
    if (r.zakat) { const z = zakatDates(); if (z?.first) { const n = diffDays(d, z.first); if (n === 30 || n === 7) push(morning, `Zakat due in ${n === 30 ? '1 month' : '1 week'}`, `${z.z.data.hd} ${HM[z.z.data.hm - 1]} · ${fmtDateY(z.first)}`, `zk-${d}`); } }
    if (r.body && wd === st.bodyDay) push(at(d, st.bodyTime), 'Weekly measurements', 'Weight, waist at the navel and lower belly', `bd-${d}`, './?v=fitness');
    if (r.weekly && wd === 5) push(at(d, st.weeklyTime), 'Your week in Rise', 'Your weekly summary is ready', `wk-${d}`, './?v=summary');
    if (r.import) { const last = Object.keys(S.times).sort().at(-1); const left = last ? diffDays(d, last) : -1; if (last && left <= 3 && left >= -3) push(at(d, '10:00'), 'Prayer times', left >= 0 ? `Awqaf times run out on ${fmtDate(last)}. Send Claude the next monthly table and import it.` : 'Rise is using estimated prayer times. Import the new Awqaf table.', `im-${d}`, './?v=importTimes'); }
    if (r.fasts && items('fast').some(f => f.data.done < f.data.total) && st.fastDays.includes((wd + 1) % 7)) push(at(d, '21:00'), 'Make up a fast?', `Tomorrow is ${DOWL[(wd + 1) % 7]}, a good day to make up a fast.`, `fs-${d}`);
  }
  return out;
}
let remTimer = null;
function scheduleReminderSync() { clearTimeout(remTimer); remTimer = setTimeout(syncReminders, 4000); }
async function syncReminders() {
  if (!S.user || !navigator.onLine) return;
  try {
    const list = buildReminders();
    const del = await sb.from('reminders').delete().eq('user_id', S.user.id).eq('sent', false);
    if (del.error) return; // reminder service not set up yet
    if (list.length) await sb.from('reminders').insert(list.map(x => ({ user_id: S.user.id, at: x.at, title: x.title, body: x.body, tag: x.tag, url: x.url })));
  } catch (e) { console.warn('reminders', e); }
}
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
async function enablePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return toast('Open Rise from your Home Screen first');
    const perm = await Notification.requestPermission(); if (perm !== 'granted') return toast('Notifications were not allowed');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(CFG.vapid) });
    const j = sub.toJSON();
    const { error } = await sb.from('push_subs').upsert({ user_id: S.user.id, endpoint: j.endpoint, keys: j.keys }, { onConflict: 'endpoint' });
    if (error) throw error;
    syncReminders(); render(); toast('Notifications are on');
  } catch (e) { console.warn(e); toast('Could not turn on notifications'); }
}
async function testPush() {
  const { error } = await sb.from('reminders').insert({ user_id: S.user.id, at: new Date().toISOString(), title: 'Rise', body: 'Notifications are working. 🌙', tag: 'test-' + Date.now(), url: './' });
  toast(error ? 'The reminder service is not set up yet' : 'Test sent · it arrives within a minute');
}

function swapOrder(list, id, dir) {
  const i = list.findIndex(x => x.id === id), j = i + dir; if (i < 0 || j < 0 || j >= list.length) return;
  const a = list[i], b = list[j], oa = a.data.order, ob = b.data.order;
  updItem(a.id, { order: ob === oa ? ob + dir : ob }); updItem(b.id, { order: oa });
}
function openViewer(src) {
  const el = document.createElement('div'); el.className = 'viewer';
  el.innerHTML = `<button class="viewer-x" aria-label="Close">✕</button><div class="viewer-in"><img src="${esc(src)}" alt=""></div><p class="viewer-h">Pinch or double-tap to zoom</p>`;
  el.querySelector('.viewer-x').onclick = () => el.remove();
  const img = el.querySelector('img'); img.ondblclick = () => img.classList.toggle('zoom');
  document.body.appendChild(el);
}
function shrinkImage(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => {
    const w = Math.min(900, im.width), h = Math.round(im.height * w / im.width); const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(im, 0, 0, w, h); res({ src: c.toDataURL('image/jpeg', 0.78), w, h }); }; im.onerror = rej; im.src = r.result; }; r.onerror = rej; r.readAsDataURL(file); });
}

/* ================= UPDATES ================= */
async function latestVersion() { try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); return (await r.json()).version; } catch { return null; } }
async function updateApp(manual) {
  if (manual) toast('Checking for updates…');
  const v = await latestVersion();
  if (manual && v && v === APP_VERSION) return toast('You have the newest version');
  if (!v && manual) return toast('Could not check. Are you online?');
  try { const regs = await navigator.serviceWorker?.getRegistrations?.() || []; for (const r of regs) await r.update().catch(() => { }); } catch { }
  try { for (const k of await caches.keys()) await caches.delete(k); } catch { }
  location.reload();
}
async function checkForUpdate() {
  const v = await latestVersion();
  if (v && v !== APP_VERSION && !$('#upd')) {
    const b = document.createElement('button'); b.id = 'upd'; b.className = 'updbar'; b.textContent = 'A new version of Rise is ready · tap to update';
    b.onclick = () => updateApp(false); document.body.appendChild(b);
  }
}

/* ================= SIGN IN ================= */
let authMode = 'in';
function renderAuth(msg = '', err = '') {
  applyTheme();
  $('#app').innerHTML = `<div class="auth"><div class="hero"><div class="top"><div class="logo">RISE</div></div><div class="greet"><h1>Rise,<br><span>every day</span></h1></div></div>
  <div class="box"><h2 class="serif" style="font-size:24px">${authMode === 'in' ? 'Welcome back' : 'Create your account'}</h2>
  <label class="f"><span>Email</span><input id="au-email" type="email" autocomplete="username" inputmode="email"></label>
  <label class="f"><span>Password</span><input id="au-pass" type="password" autocomplete="${authMode === 'in' ? 'current-password' : 'new-password'}" placeholder="${authMode === 'in' ? '' : 'At least 8 characters'}"></label>
  ${err ? `<p class="err">${esc(err)}</p>` : ''}${msg ? `<p class="small mt" style="color:var(--green)">${esc(msg)}</p>` : ''}
  <button class="btn full mt2" data-act="doAuth">${authMode === 'in' ? 'Sign in' : 'Create account'}</button>
  <button class="link mt" style="display:block;margin:14px auto 0" data-act="authMode" data-arg="${authMode === 'in' ? 'up' : 'in'}">${authMode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></div></div>`;
}
async function doAuth() {
  const email = $('#au-email').value.trim(), password = $('#au-pass').value;
  if (!email || !password) return renderAuth('', 'Enter your email and password');
  if (authMode === 'up') {
    if (password.length < 8) return renderAuth('', 'Use at least 8 characters for the password');
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) return renderAuth('', error.message);
    if (!data.session) { authMode = 'in'; return renderAuth('Account created. Check your email and tap the confirmation link, then sign in here.'); }
  } else {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return renderAuth('', error.message === 'Email not confirmed' ? 'Please confirm your email first (check your inbox).' : 'Wrong email or password');
  }
}

/* ================= START ================= */
async function startFor(user) {
  S.user = user; loadQueue();
  const qs = new URLSearchParams(location.search), v = qs.get('v'); if (v && VIEWS[v]) S.view = v; if (qs.get('t')) S.azTab = qs.get('t');
  if (loadCache()) render();
  try { await loadAll(); seedAzkar(); migrateDuaOrder(); } catch (e) { console.warn('load', e); if (!S.items.length && !Object.keys(S.days).length) toast('Could not load your data. Check your connection.'); }
  S.prayerDate = prayerDay(); render(); flush(); scheduleReminderSync();
}
function migrateDuaOrder() {
  if ((S.settings.duaOrderV || 1) >= 2 || !S.settings.azkarSeeded) return;
  const pos = new Map(DUAS.map((d, i) => [d.img, i + 1])); let extra = 1000;
  for (const d of duasList()) updItem(d.id, { order: d.data.img && pos.has(d.data.img) ? pos.get(d.data.img) : extra++ });
  S.settings.duaOrderV = 2; saveSettings();
}
function seedAzkar() {
  if (S.settings.azkarSeeded || items('zikr').length) return;
  AZKAR.forEach((z, i) => addItem('zikr', { ...z, order: i + 1 }));
  DUAS.forEach((d, i) => addItem('dua', { img: d.img, w: d.w, h: d.h, order: i + 1 }));
  S.settings.azkarSeeded = true; S.settings.duaOrderV = 2; saveSettings();
}
sb.auth.onAuthStateChange((ev, session) => {
  if (session?.user && (!S.user || S.user.id !== session.user.id)) startFor(session.user);
  if (ev === 'SIGNED_OUT') { S.user = null; renderAuth(); }
});
(async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  const { data } = await sb.auth.getSession();
  if (!data.session) renderAuth();
})();
let _lastY = 0;
window.addEventListener('scroll', () => { const y = window.scrollY, n = document.querySelector('.nav'); if (!n) return; if (y > _lastY + 6 && y > 120) n.classList.add('hide'); else if (y < _lastY - 6 || y < 120) n.classList.remove('hide'); _lastY = y; }, { passive: true });
window.__rise = { buildReminders: () => buildReminders() };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { S.relOpen = false; if (S.view === 'person' && S.settings.relPin) { S.view = 'rel'; render(); } else if (S.view === 'rel') render(); } if (document.visibilityState === 'visible') { checkForUpdate(); if (S.user) { render(); flush(); scheduleReminderSync(); } } });
setTimeout(checkForUpdate, 3000);
setInterval(() => { if (S.user && !$('#sheet-root').innerHTML && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') { const night = document.body.classList.contains('night'); applyTheme(); if (night !== document.body.classList.contains('night')) render(); } }, 60000);
