// ─────────────────────────────────────────────────────────────────────────
// LETRA LEGIBLE (16 nov, aprobado con imagen: Dash, Hoy y un ejercicio)
//
// Más de la mitad del texto de la app iba en 12–13,5 px: tamaño de «pie de
// foto» (Apple), no de frase. Se lee entrenando, con el teléfono en el banco:
// la letra chica cuesta. La regla:
//   · FRASES (3 palabras o más): menos de 14 px → 15; de 14 a 15,5 → 16.
//   · Etiquetas cortas (1–2 palabras: «Reps», «Hoy», fechas): igual, nunca
//     por debajo de 12.
//   · Campos donde se escriben las series (reps, peso): 18.
//   · Títulos, números grandes y botones de ícono: igual.
//
// Cada componente lleva su tamaño en sus estilos; en vez de tocar ~1.000
// estilos uno por uno, aquí se mira lo que se pinta y se ajusta antes de que
// se vea (igual que titulosDelgados.js). Lo nuevo que aparece se ajusta al
// momento. `data-letra-fija` en un elemento lo deja como está (y a lo de
// adentro). Apagador de pruebas: localStorage mt:letraVieja = 1.
// ─────────────────────────────────────────────────────────────────────────
// Lo que tiene que caber en un espacio fijo no se agranda: los nombres en las
// casillas del calendario del mes y el aviso «+kcal» (una sola línea).
const FIJO = '[data-letra-fija], svg, [data-vista="mes"] [data-chip], [data-aviso-suma]';
const CAMPO = /^(text|number|tel|search|email|)$/;

// Lo que define el tamaño «de antes» de un elemento: el suyo, o el del
// elemento del que lo hereda (si ese ya se agrandó, su tamaño original).
function tamOriginal(el) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    if (e.dataset.letraOrig) return parseFloat(e.dataset.letraOrig);
    const propio = e.style.fontSize;
    if (propio && propio.endsWith('px')) return parseFloat(propio);
    if (propio || /\btext-(xs|sm|base|lg|xl|\[)/.test(typeof e.className === 'string' ? e.className : '')) return parseFloat(getComputedStyle(e).fontSize);
  }
  return parseFloat(getComputedStyle(el).fontSize);
}
function palabras(el) {
  let t = '';
  for (const n of el.childNodes) if (n.nodeType === 3) t += ' ' + n.textContent;
  t = t.trim();
  return t ? t.split(/\s+/).length : 0;
}
export function tamNuevo(px, n) {
  if (n >= 3 && px < 14) return 15;
  if (n >= 3 && px < 16) return 16;
  if (n > 0 && px < 12) return 12;
  return null;
}

function ajustarUno(el) {
  if (el.closest(FIJO)) return;
  // React cambió el tamaño (otro estado del componente): ese es el nuevo original.
  if (el.dataset.letraOrig && el.style.fontSize !== el.dataset.letraPuesto) { delete el.dataset.letraOrig; delete el.dataset.letraPuesto; }
  let objetivo;
  if (el.tagName === 'INPUT') {
    if (!CAMPO.test(el.type || '')) return;
    const px = tamOriginal(el);
    objetivo = px < 18 && px >= 13 ? 18 : null;
  } else {
    const n = palabras(el);
    if (!n) return;
    objetivo = tamNuevo(tamOriginal(el), n);
    // Texto hecho para ir en UNA línea (con «…» si no cabe): agrandarlo lo
    // cortaría. Se deja.
    if (objetivo) { const cs = getComputedStyle(el); if (cs.whiteSpace === 'nowrap' || cs.textOverflow === 'ellipsis') return; }
  }
  if (!objetivo) return;
  const puesto = objetivo + 'px';
  if (el.style.fontSize === puesto) return;
  if (!el.dataset.letraOrig) el.dataset.letraOrig = String(tamOriginal(el));
  el.dataset.letraPuesto = puesto;
  el.style.fontSize = puesto;
}
function ajustar(raiz) {
  if (!raiz || raiz.nodeType !== 1) return;
  ajustarUno(raiz);
  raiz.querySelectorAll('*').forEach(ajustarUno);
}

export function letraLegible() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  try { if (localStorage.getItem('mt:letraVieja') === '1') return; } catch (e) { /* sin almacenamiento: va igual */ }
  const pendientes = new Set(), sueltos = new Set();
  let programado = false;
  const correr = () => {
    programado = false;
    const lista = [...pendientes], solos = [...sueltos]; pendientes.clear(); sueltos.clear();
    lista.forEach(n => { if (n.isConnected) ajustar(n); });
    solos.forEach(n => { if (n.isConnected) ajustarUno(n); });
  };
  // Al final de cada tanda de cambios, antes de que se pinte: el texto nunca
  // alcanza a verse chico.
  const programar = () => { if (!programado) { programado = true; queueMicrotask(correr); } };
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => { if (n.nodeType === 1) pendientes.add(n); else if (n.parentElement) sueltos.add(n.parentElement); });
        if (m.target.nodeType === 1) sueltos.add(m.target);
      } else if (m.type === 'characterData') { if (m.target.parentElement) sueltos.add(m.target.parentElement); }
      else if (m.target.nodeType === 1) sueltos.add(m.target);
    }
    programar();
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style'] });
  pendientes.add(document.body); programar();
}
