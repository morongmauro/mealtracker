// ─────────────────────────────────────────────────────────────────────────
// LOS PITIDOS DEL DESCANSO
//
// Al empezar el descanso (al marcar la serie) suena una nota corta, y al
// acabar, una ALARMA corta (bip-bip-bip-bip, dos veces, como la de un reloj
// deportivo) y vibra, para quien no está mirando la pantalla. Dos notas
// suaves no se oían en el gimnasio.
//
// Va por dos caminos a la vez, porque el iPhone pone trabas:
//  · Web Audio: el pitido del final se deja PROGRAMADO en el reloj del audio
//    en el mismo toque de marcar, así suena a su hora aunque la página vaya
//    lenta. Con `navigator.audioSession.type = 'playback'` (iPhone con iOS
//    17 o más) suena también con el interruptor de silencio puesto.
//  · Un <audio> con un WAV generado aquí: el respaldo cuando Web Audio no
//    está disponible o el teléfono lo dejó dormido.
// El iPhone solo deja sonar lo que arrancó con un toque: por eso todo se
// «desbloquea» en `prepararSonido()`, que se llama al marcar la serie.
// Antes el desbloqueo bajaba el volumen a 0, pero en el iPhone el volumen
// no se puede cambiar desde la página y el pitido del final no llegaba.
// ─────────────────────────────────────────────────────────────────────────

let audio = null;
let listo = false;

// La alarma del final: dos tandas de cuatro bips cortos y agudos (~1,2 s).
// Agudo (2 kHz) y con onda cuadrada: es lo que mejor se oye por el altavoz
// del teléfono, aunque haya música o ruido alrededor.
const F_ALARMA = 2093;
const BIP = 0.07, ENTRE_BIPS = 0.05, ENTRE_TANDAS = 0.24;
const BIPS_ALARMA = (() => {
  const t = []; let a = 0;
  for (let g = 0; g < 2; g++) {
    for (let k = 0; k < 4; k++) { t.push(a); a += BIP + ENTRE_BIPS; }
    a += ENTRE_TANDAS - ENTRE_BIPS;
  }
  return t;
})();

// La misma alarma en WAV, 22 kHz, mono, 16 bits (el respaldo <audio>).
function wavDataUri() {
  const sr = 22050;
  const notas = [];
  BIPS_ALARMA.forEach((t, i) => {
    const antes = i ? t - (BIPS_ALARMA[i - 1] + BIP) : 0;
    if (antes > 0) notas.push([0, antes]);
    notas.push([F_ALARMA, BIP]);
  });
  const total = Math.round(sr * notas.reduce((a, n) => a + n[1], 0));
  const datos = new Int16Array(total);
  let i = 0;
  for (const [f, dur] of notas) {
    const n = Math.round(sr * dur);
    for (let k = 0; k < n; k++, i++) {
      if (!f) { datos[i] = 0; continue; }
      const t = k / sr;
      const env = Math.min(1, k / (sr * 0.004), (n - k) / (sr * 0.012));
      // Cuadrada suavizada (fundamental + 3.º y 5.º armónicos): suena a alarma.
      const w = 2 * Math.PI * f * t;
      const onda = Math.sin(w) + Math.sin(3 * w) / 3 + Math.sin(5 * w) / 5;
      datos[i] = Math.round(onda * 0.5 * env * 32767);
    }
  }
  const buf = new ArrayBuffer(44 + datos.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + datos.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, datos.length * 2, true);
  new Int16Array(buf, 44).set(datos);
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
  return 'data:audio/wav;base64,' + btoa(bin);
}

function elemento() {
  if (audio) return audio;
  if (typeof Audio === 'undefined') return null;
  try {
    audio = new Audio(wavDataUri());
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
  } catch (e) { audio = null; }
  return audio;
}

// ── Web Audio ──
let ctx = null;
function contexto() {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { ctx = null; }
  return ctx;
}
const vivo = () => !!ctx && ctx.state === 'running';

// Una nota con ataque y caída suaves, a la hora `t` del reloj del audio.
function nota(c, f, t, dur, vol = 0.32, tipo = 'sine') {
  const o = c.createOscillator(), g = c.createGain();
  o.type = tipo; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (tipo === 'sine' ? 0.012 : 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
  return o;
}

// Se llama dentro de un toque (marcar una serie): deja el audio listo para
// sonar solo más tarde.
export function prepararSonido() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  const c = contexto();
  if (c) {
    try {
      if (c.state !== 'running') c.resume();
      // Un instante de silencio: en el iPhone es lo que «abre» el audio.
      const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
    } catch (e) {}
  }
  const a = elemento();
  if (!a || listo) return;
  try {
    // Desbloquear el <audio> sin que se oiga: en silencio (muted), no con
    // volumen 0 (el iPhone no deja cambiar el volumen).
    a.muted = true;
    const p = a.play();
    const fin = () => { try { a.pause(); a.currentTime = 0; } catch (e) {} a.muted = false; listo = true; };
    if (p && typeof p.then === 'function') p.then(fin).catch(() => { a.muted = false; });
    else fin();
  } catch (e) { /* sin audio: solo vibra */ }
}

// Al empezar el descanso: una nota corta y suave (va dentro del toque).
export function sonarInicioDescanso() {
  const c = contexto();
  if (!c) return false;
  try { nota(c, 659.3, c.currentTime + 0.02, 0.16, 0.22); return true; } catch (e) { return false; }
}

// El pitido del final, programado ya: suena en `seg` segundos aunque la
// página vaya lenta. Devuelve con qué cancelarlo (saltar, +15 s) o null si
// no se pudo programar (entonces suena el respaldo al llegar a cero).
export function programarFinDescanso(seg) {
  const c = contexto();
  if (!c || !(seg > 0)) return null;
  try {
    const t = c.currentTime + seg;
    const nodos = BIPS_ALARMA.map(d => nota(c, F_ALARMA, t + d, BIP, 0.2, 'square'));
    return { cancelar: () => nodos.forEach(o => { try { o.stop(); } catch (e) {} }), vivo: vivo() };
  } catch (e) { return null; }
}

// Una nota sola programada (por lado: «cambia de lado» a la mitad).
export function programarAviso(seg) {
  const c = contexto();
  if (!c || !(seg > 0)) return null;
  try {
    const o = nota(c, 880, c.currentTime + seg, 0.18);
    return { cancelar: () => { try { o.stop(); } catch (e) {} }, vivo: vivo() };
  } catch (e) { return null; }
}

// Al acabar el descanso: vibra y, si el pitido no quedó programado, suena
// el respaldo.
export function sonarFinDescanso({ yaProgramado = false } = {}) {
  try { navigator.vibrate && navigator.vibrate([120, 80, 120, 80, 220]); } catch (e) {}
  if (yaProgramado) return true;
  const a = elemento();
  if (!a) return false;
  try {
    a.muted = false;
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    return true;
  } catch (e) { return false; }
}
