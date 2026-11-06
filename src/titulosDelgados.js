// ─────────────────────────────────────────────────────────────────────────
// TÍTULOS UN POCO MÁS DELGADOS (6 nov, aprobado con imagen)
//
// Todos los títulos de la app (encabezado de la página, secciones y títulos
// de tarjetas) quedan en semibold (600) en vez de 700–800. Mismo tamaño,
// solo el grosor. No cambian los números grandes (31 %, 1/3, 2/7), los
// botones ni el texto chico (menos de 15 px).
//
// Los títulos llevan su grosor en estilos de cada componente; en vez de tocar
// uno por uno, aquí se mira lo que se pinta y se ajusta. Lo nuevo que aparece
// (al cambiar de sección o abrir una hoja) se ajusta al momento.
// ─────────────────────────────────────────────────────────────────────────
const NUMERO = /^[\d\s.,/%:+\-–·]+$/;
const GROSOR = '600';

function tieneTexto(el) {
  for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim().length > 1) return true;
  return false;
}
function ajustarUno(el) {
  if (el.style.getPropertyPriority('font-weight') === 'important' && el.style.getPropertyValue('font-weight') === GROSOR) return;
  if (!tieneTexto(el) || el.closest('button, [role="button"], input, textarea, select, svg')) return;
  const cs = getComputedStyle(el);
  if (parseFloat(cs.fontSize) < 15 || Number(cs.fontWeight) < 650) return;
  if (NUMERO.test(el.textContent.trim())) return;
  el.style.setProperty('font-weight', GROSOR, 'important');
}
function ajustar(raiz) {
  if (!raiz || raiz.nodeType !== 1) return;
  ajustarUno(raiz);
  raiz.querySelectorAll('*').forEach(ajustarUno);
}

export function titulosDelgados() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const pendientes = new Set(), sueltos = new Set();
  let programado = false;
  const correr = () => {
    programado = false;
    const lista = [...pendientes], solos = [...sueltos]; pendientes.clear(); sueltos.clear();
    lista.forEach(n => { if (n.isConnected) ajustar(n); });
    solos.forEach(n => { if (n.isConnected) ajustarUno(n); });
  };
  // Se corre al final de cada tanda de cambios (el observador ya las junta),
  // antes de que se pinte: el título nunca alcanza a verse grueso.
  const programar = () => { if (!programado) { programado = true; queueMicrotask(correr); } };
  const pedir = (n) => { pendientes.add(n); programar(); };
  // Si solo cambió el estilo de un elemento, se mira ese (no todo lo de adentro).
  const pedirUno = (n) => { sueltos.add(n); programar(); };
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'childList') m.addedNodes.forEach(n => { if (n.nodeType === 1) pedir(n); });
      else if (m.target.nodeType === 1) pedirUno(m.target);
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  pedir(document.body);
}
