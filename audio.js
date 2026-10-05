// Rise · voice notes for language phrases
// WhatsApp shares voice notes as .opus (Ogg Opus). iPhones can play Opus inside WebM, but not always inside Ogg,
// so Ogg files are repacked into WebM here (same sound, nothing re-encoded). Other formats are kept as they are.

/* ---------- Ogg → packets ---------- */
function oggPackets(buf) {
  const u = new Uint8Array(buf), out = []; let p = 0, partial = [], serial = null;
  while (p + 27 <= u.length) {
    if (u[p] !== 0x4F || u[p + 1] !== 0x67 || u[p + 2] !== 0x67 || u[p + 3] !== 0x53) throw new Error('not ogg');
    const dv = new DataView(buf, p), sn = dv.getUint32(14, true), nseg = u[p + 26];
    const lace = u.subarray(p + 27, p + 27 + nseg); let q = p + 27 + nseg;
    if (serial === null) serial = sn;
    const mine = sn === serial;
    for (let i = 0; i < nseg; i++) {
      const seg = u.subarray(q, q + lace[i]); q += lace[i];
      if (!mine) continue;
      partial.push(seg);
      if (lace[i] < 255) { const n = partial.reduce((a, b) => a + b.length, 0), pk = new Uint8Array(n); let o = 0; for (const s of partial) { pk.set(s, o); o += s.length; } out.push(pk); partial = []; }
    }
    p = q;
  }
  return out;
}
function opusSamples(pk) { // samples at 48 kHz
  if (!pk.length) return 0;
  const toc = pk[0], cfg = toc >> 3, c = toc & 3;
  const ms = cfg < 12 ? [10, 20, 40, 60][cfg % 4] : cfg < 16 ? [10, 20][cfg % 2] : [2.5, 5, 10, 20][cfg % 4];
  const frames = c === 0 ? 1 : c < 3 ? 2 : (pk[1] & 0x3F);
  return ms * 48 * frames;
}
/* ---------- tiny WebM writer ---------- */
const cat = arrs => { const n = arrs.reduce((a, b) => a + b.length, 0), o = new Uint8Array(n); let i = 0; for (const a of arrs) { o.set(a, i); i += a.length; } return o; };
const size8 = n => { const b = new Uint8Array(8); b[0] = 1; let v = n; for (let i = 7; i >= 1; i--) { b[i] = v % 256; v = Math.floor(v / 256); } return b; };
const el = (id, ...data) => { const d = cat(data.map(x => x instanceof Uint8Array ? x : new Uint8Array(x))); return cat([new Uint8Array(id), size8(d.length), d]); };
const uint = n => { const b = []; do { b.unshift(n % 256); n = Math.floor(n / 256); } while (n > 0); return new Uint8Array(b); };
const f64 = x => { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x); return b; };
const str = s => new TextEncoder().encode(s);

export function oggToWebm(buf) {
  const pk = oggPackets(buf);
  if (pk.length < 3 || String.fromCharCode(...pk[0].subarray(0, 8)) !== 'OpusHead') throw new Error('not opus');
  const head = pk[0], channels = head[9], preskip = head[10] | (head[11] << 8);
  const audio = pk.slice(2).filter(x => x.length);
  const clusters = []; let t = 0, cl = null, clStart = 0;
  for (const a of audio) {
    const ms = t / 48;
    if (!cl || ms - clStart >= 30000) { if (cl) clusters.push(el([0x1F, 0x43, 0xB6, 0x75], ...cl)); clStart = Math.floor(ms); cl = [el([0xE7], uint(clStart))]; }
    const rel = Math.round(ms - clStart), hdr = new Uint8Array([0x81, (rel >> 8) & 0xFF, rel & 0xFF, 0x80]);
    cl.push(el([0xA3], hdr, a));
    t += opusSamples(a);
  }
  if (cl) clusters.push(el([0x1F, 0x43, 0xB6, 0x75], ...cl));
  const durMs = Math.max(0, (t - preskip) / 48);
  const ebml = el([0x1A, 0x45, 0xDF, 0xA3], el([0x42, 0x86], uint(1)), el([0x42, 0xF7], uint(1)), el([0x42, 0xF2], uint(4)), el([0x42, 0xF3], uint(8)), el([0x42, 0x82], str('webm')), el([0x42, 0x87], uint(4)), el([0x42, 0x85], uint(2)));
  const info = el([0x15, 0x49, 0xA9, 0x66], el([0x2A, 0xD7, 0xB1], uint(1000000)), el([0x4D, 0x80], str('Rise')), el([0x57, 0x41], str('Rise')), el([0x44, 0x89], f64(durMs)));
  const track = el([0x16, 0x54, 0xAE, 0x6B], el([0xAE], el([0xD7], uint(1)), el([0x73, 0xC5], uint(1)), el([0x83], uint(2)), el([0x86], str('A_OPUS')), el([0x63, 0xA2], head),
    el([0x56, 0xAA], uint(Math.round(preskip / 48000 * 1e9))), el([0x56, 0xBB], uint(80000000)), el([0xE1], el([0xB5], f64(48000)), el([0x9F], uint(channels)))));
  return { bytes: cat([ebml, el([0x18, 0x53, 0x80, 0x67], info, track, ...clusters)]), dur: durMs / 1000 };
}

/* ---------- WAV fallback (older iPhones) ---------- */
function toWav(ab) {
  const rate = Math.min(ab.sampleRate, 22050), ratio = ab.sampleRate / rate, n = Math.floor(ab.length / ratio), ch0 = ab.getChannelData(0), ch1 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : null;
  const b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const j = Math.floor(i * ratio); let x = ch1 ? (ch0[j] + ch1[j]) / 2 : ch0[j]; x = Math.max(-1, Math.min(1, x)); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
  return new Blob([b], { type: 'audio/wav' });
}
async function decodeToWav(buf) {
  const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
  try { const ab = await new Promise((ok, no) => { const r = ctx.decodeAudioData(buf.slice(0), ok, no); if (r && r.then) r.then(ok, no); }); return { blob: toWav(ab), dur: ab.duration }; } finally { ctx.close?.(); }
}
const canPlay = t => { try { return !!document.createElement('audio').canPlayType(t); } catch { return false; } };
function blobDuration(blob) {
  return new Promise(res => { const a = document.createElement('audio'), u = URL.createObjectURL(blob); let done = false; const fin = d => { if (done) return; done = true; URL.revokeObjectURL(u); res(isFinite(d) ? d : 0); };
    a.preload = 'metadata'; a.onloadedmetadata = () => fin(a.duration); a.onerror = () => fin(0); setTimeout(() => fin(0), 4000); a.src = u; });
}

/* Turn any picked file into something this phone can play. Returns { blob, type, ext, dur } */
export async function prepareAudio(file) {
  const buf = await file.arrayBuffer(), u = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  const isOgg = u[0] === 0x4F && u[1] === 0x67 && u[2] === 0x67 && u[3] === 0x53;
  if (isOgg) {
    if (canPlay('audio/webm; codecs="opus"')) { try { const r = oggToWebm(buf); return { blob: new Blob([r.bytes], { type: 'audio/webm' }), type: 'audio/webm', ext: 'webm', dur: r.dur }; } catch (e) { console.warn('remux', e); } }
    const w = await decodeToWav(buf); return { blob: w.blob, type: 'audio/wav', ext: 'wav', dur: w.dur };
  }
  const type = file.type || 'audio/mp4', ext = (file.name.split('.').pop() || 'm4a').toLowerCase().slice(0, 5);
  return { blob: new Blob([buf], { type }), type, ext, dur: await blobDuration(file) };
}

/* ---------- recording ---------- */
let rec = null;
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mt = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac'].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '';
  const mr = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined), chunks = [];
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec = { mr, stream, chunks, t0: Date.now() }; mr.start(250); return rec;
}
export function stopRecording() {
  return new Promise(res => {
    if (!rec) return res(null); const r = rec; rec = null;
    r.mr.onstop = () => { r.stream.getTracks().forEach(t => t.stop()); const type = (r.mr.mimeType || 'audio/mp4').split(';')[0]; res({ blob: new Blob(r.chunks, { type }), type, ext: type.includes('webm') ? 'webm' : 'm4a', dur: (Date.now() - r.t0) / 1000 }); };
    r.mr.stop();
  });
}
export const isRecording = () => !!rec;

/* ---------- playback with offline cache ---------- */
const urls = {}; let player = null, playingKey = null;
export async function audioUrl(sb, path) {
  if (urls[path]) return urls[path];
  let blob = null; const key = 'https://rise.local/audio/' + path;
  try { const c = await caches.open('rise-audio'), hit = await c.match(key); if (hit) blob = await hit.blob(); } catch {}
  if (!blob) { const { data, error } = await sb.storage.from('rise-audio').download(path); if (error) throw error; blob = data; try { const c = await caches.open('rise-audio'); await c.put(key, new Response(blob, { headers: { 'content-type': blob.type || 'audio/mp4' } })); } catch {} }
  return (urls[path] = URL.createObjectURL(blob));
}
export function playUrl(url, key, onEnd) {
  if (player && playingKey === key) { player.pause(); player = null; playingKey = null; onEnd?.(); return false; }
  if (player) player.pause();
  player = new Audio(url); playingKey = key; player.onended = player.onerror = () => { player = null; playingKey = null; onEnd?.(); };
  player.play().catch(() => { player = null; playingKey = null; onEnd?.(); }); return true;
}
export const stopPlayback = () => { if (player) player.pause(); player = null; playingKey = null; };
