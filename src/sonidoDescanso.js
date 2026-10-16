// ─────────────────────────────────────────────────────────────────────────
// EL PITIDO DEL DESCANSO
//
// Al acabar el descanso entre series suena un aviso corto (dos notas) y
// vibra, para quien no está mirando la pantalla. Es un <audio> con un WAV
// generado aquí mismo, no Web Audio: en el iPhone, Web Audio se calla con
// el interruptor de silencio, y el <audio> (que el sistema trata como
// música) sí se oye. El iPhone solo deja sonar lo que arrancó con un toque:
// por eso `prepararSonido()` se llama al marcar la serie (un toque) y deja
// el audio «desbloqueado» para que `sonarFinDescanso()` suene solo después.
// ─────────────────────────────────────────────────────────────────────────

let audio = null;
let listo = false;

// Dos notas (La5 y Re6), 44,1 kHz, mono, 16 bits, con ataque y caída suaves.
function wavDataUri() {
  const sr = 22050;
  const notas = [[880, 0.14], [0, 0.07], [1174.7, 0.2]];
  const total = Math.round(sr * notas.reduce((a, n) => a + n[1], 0));
  const datos = new Int16Array(total);
  let i = 0;
  for (const [f, dur] of notas) {
    const n = Math.round(sr * dur);
    for (let k = 0; k < n; k++, i++) {
      if (!f) { datos[i] = 0; continue; }
      const t = k / sr;
      const env = Math.min(1, k / (sr * 0.012), (n - k) / (sr * 0.04));
      datos[i] = Math.round(Math.sin(2 * Math.PI * f * t) * 0.55 * env * 32767);
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

// Se llama dentro de un toque (marcar una serie): deja el audio listo para
// sonar solo más tarde. Suena en silencio (volumen 0) y se corta.
export function prepararSonido() {
  const a = elemento();
  if (!a || listo) return;
  try {
    a.volume = 0;
    const p = a.play();
    const fin = () => { try { a.pause(); a.currentTime = 0; } catch (e) {} a.volume = 1; listo = true; };
    if (p && typeof p.then === 'function') p.then(fin).catch(() => { a.volume = 1; });
    else fin();
  } catch (e) { /* sin audio: solo vibra */ }
}

// Al acabar el descanso: suena (si el teléfono lo deja) y vibra.
export function sonarFinDescanso() {
  try { navigator.vibrate && navigator.vibrate([120, 80, 120, 80, 220]); } catch (e) {}
  const a = elemento();
  if (!a) return false;
  try {
    a.volume = 1;
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    return true;
  } catch (e) { return false; }
}
