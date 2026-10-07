// ─────────────────────────────────────────────────────────────────────────
// DESLIZAR ENTRE PÁGINAS · visual nueva
//
// Un deslizamiento horizontal claro (rápido, largo y más horizontal que
// vertical) llama a `pasar(+1)` hacia la izquierda y `pasar(-1)` hacia la
// derecha. No cuenta si empieza:
//   · en algo que ya usa el dedo de lado: campos de texto, barritas de
//     video, carruseles con scroll horizontal, rutinas que se arrastran en
//     el calendario, o lo marcado con data-sin-deslizar;
//   · dentro de una ventana encima de la página (hojas, detalle de receta,
//     ficha de ejercicio…): cualquier capa fija que no sea la página misma
//     (las páginas llevan data-capa-v2).
// ─────────────────────────────────────────────────────────────────────────

const MIN_X = 70;          // px de recorrido horizontal
const MAX_MS = 700;        // un gesto, no un arrastre lento
const PROPORCION = 1.8;    // |dx| frente a |dy|

const NO = 'input, textarea, select, [contenteditable="true"], [data-sin-deslizar], [data-chip], [data-video-limpio], [draggable="true"], iframe';

export function puedeDeslizarDesde(el, win = window) {
  if (!el || !el.closest) return false;
  if (el.closest(NO)) return false;
  for (let n = el; n && n.nodeType === 1 && n !== win.document.body; n = n.parentElement) {
    const cs = win.getComputedStyle(n);
    // Un carrusel o tabla que se mueve de lado: el dedo es suyo.
    if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 4) return false;
    if (cs.position === 'fixed') return n.hasAttribute('data-capa-v2');
  }
  return true;
}

export function escucharDeslizar(doc, pasar, win = window) {
  let ini = null;
  const empieza = (e) => {
    if (e.touches.length !== 1) { ini = null; return; }
    const t = e.touches[0];
    ini = puedeDeslizarDesde(e.target, win) ? { x: t.clientX, y: t.clientY, ms: Date.now() } : null;
  };
  const termina = (e) => {
    if (!ini) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - ini.x, dy = t.clientY - ini.y, ms = Date.now() - ini.ms;
    ini = null;
    if (ms > MAX_MS || Math.abs(dx) < MIN_X || Math.abs(dx) < PROPORCION * Math.abs(dy)) return;
    // Si quedó texto seleccionado, era una selección, no un gesto.
    try { if (String(win.getSelection && win.getSelection()).length) return; } catch (err) { /* nada */ }
    pasar(dx < 0 ? 1 : -1);
  };
  const cancela = () => { ini = null; };
  doc.addEventListener('touchstart', empieza, { passive: true });
  doc.addEventListener('touchend', termina, { passive: true });
  doc.addEventListener('touchcancel', cancela, { passive: true });
  return () => {
    doc.removeEventListener('touchstart', empieza);
    doc.removeEventListener('touchend', termina);
    doc.removeEventListener('touchcancel', cancela);
  };
}
