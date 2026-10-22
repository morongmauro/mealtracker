// ─────────────────────────────────────────────────────────────────────────
// FONDO BLANCO (a prueba, ver vistaApp.js)
//
// Predomina el blanco: en cada módulo, manchas degradadas de su color que
// alternan izquierda y derecha al bajar, y un segundo color muy suave para
// que no sea monótono. Además, sin la píldora negra de arriba (la barra de
// abajo ya dice dónde estás) y con la franja curva más corta.
// Se hace con una hoja de estilos encima de lo de siempre: quitarla deja la
// app exactamente como estaba.
// ─────────────────────────────────────────────────────────────────────────
import { CSS_ESCALA } from './escalaLetra.js';
import React from 'react';
import { COLORES_MODULO } from './vistaApp.js';

const BLANCO = '#FCFCFD';
const fondo = ({ p, q }, fuerte = 1) => `radial-gradient(48% 12% at 0% 16%, rgba(${p},${(0.26 * fuerte).toFixed(2)}), rgba(${p},0) 100%), `
  + `radial-gradient(30% 8% at 100% 36%, rgba(${q},0.14), rgba(${q},0) 100%), `
  + `radial-gradient(46% 12% at 100% 66%, rgba(${p},${(0.2 * fuerte).toFixed(2)}), rgba(${p},0) 100%), ${BLANCO}`;
const capa = (sel, c, fuerte) => `${sel}{background:${fondo(c, fuerte)}!important;background-size:100% 1500px,100% 1500px,100% 1500px,auto!important;background-repeat:repeat-y!important;background-attachment:local!important}`;

const CSS = [
  `body{background:${BLANCO}!important}`,
  // El fondo de siempre (#EDECE5) pasa a blanco; sus manchas fijas se van.
  `.min-h-screen.relative[style*="rgb(237, 236, 229)"]{background:${BLANCO}!important}`,
  `.min-h-screen.relative>.fixed.inset-0.pointer-events-none[style*="radial-gradient"],.bg-stains-chat{display:none!important}`,
  // Cada módulo con su color, sobre lo que se desplaza.
  capa('[data-view="dash"]', COLORES_MODULO.dash),
  capa('[data-view="entrena"]', COLORES_MODULO.entreno, 1.15),
  capa('[data-view="aprende"]', COLORES_MODULO.aprende),
  capa('.fixed.inset-0.overflow-y-auto[style*="rgb(237, 236, 229)"]', COLORES_MODULO.comida),
  // Los desvanecidos de arriba y abajo eran del gris cálido: en blanco.
  `.fixed.pointer-events-none[style*="rgba(237, 236, 229"]{display:none!important}`,
  // Sin la píldora negra; la franja curva más corta y todo sube.
  `[data-pildora-marca]{display:none!important}`,
  `[data-banda]{height:calc(env(safe-area-inset-top, 0px) + 34px)!important}`,
  `[data-cabecera-hoy]:has(>[data-banda]){padding-top:calc(env(safe-area-inset-top, 0px) + 46px)!important}`,
].map(r => r.replace(/(^|\})\s*([^{}]+)\{/g, (m, a, sel) => `${a}${sel.split(',').map(x => `html[data-fondo-blanco] ${x.trim()}`).join(',')}{`)).join('\n');

// La vista en prueba, además: la paleta solo con los colores de la marca, los
// atajos en una cápsula de vidrio arriba a la derecha y campos blancos.
const AZUL = '#3C7BD6';
const CSS_PRUEBA = [
  // Lo que era morado (peso, fotos, medición) pasa al azul de la marca.
  `[color="#6D4FC2"],[color="#8E5BD8"],[style*="color: rgb(109, 79, 194)"],[style*="color: rgb(142, 91, 216)"]{color:${AZUL}!important}`,
  `[style*="background: rgb(238, 233, 251)"]{background:rgba(60,123,214,.10)!important}`,
  // «Profundiza»: de la crema a blanco con sombra suave.
  `[style*="background: rgb(235, 230, 220)"]{background:#fff!important;box-shadow:0 1px 2px rgba(20,20,30,.04),0 6px 16px rgba(20,30,60,.07)!important}`,
  // Campos de la rutina: se quedan en su gris suave (se pidió volver a él).
  // Atajos (A3): los botones en una sola barrita de vidrio, debajo de la
  // frase, a la izquierda (sin palabras).
  `[data-cabecera-hoy]~[data-fila-cristal],[data-cabecera-hoy] [data-fila-cristal]{display:inline-flex!important;width:fit-content;margin:10px 0 16px!important;gap:2px!important;padding:3px;border-radius:999px;position:relative;background:linear-gradient(160deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.12) 100%);-webkit-backdrop-filter:blur(36px) saturate(2) contrast(1.05);backdrop-filter:blur(36px) saturate(2) contrast(1.05);box-shadow:inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(255,255,255,0.35), inset 0 0 0 0.8px rgba(255,255,255,0.28), inset 0 0 14px rgba(255,255,255,0.35), inset 0 -8px 12px rgba(30,30,40,0.10), 0 0 0 0.5px rgba(30,30,40,0.045), 0 1px 2px rgba(30,30,40,0.06), 0 10px 22px rgba(40,44,30,0.14)}`,
  // Liquid Glass (opción B) en la barrita: la misma receta que la barra de
  // navegación y los blobs; el reflejo arriba‑izquierda va en ::before y los
  // círculos de adentro quedan lisos (sin su propio brillo).
  `[data-cabecera-hoy]~[data-fila-cristal]::before,[data-cabecera-hoy] [data-fila-cristal]::before{content:'';position:absolute;inset:0;border-radius:999px;pointer-events:none;background:radial-gradient(55% 55% at 16% 10%, rgba(255,255,255,0.8), rgba(255,255,255,0) 68%), radial-gradient(40% 40% at 86% 92%, rgba(255,255,255,0.4), rgba(255,255,255,0) 70%)}`,
  `[data-fila-cristal] [data-brillo]{display:none}`,
  `[data-fila-cristal] [data-boton-cristal]{width:auto!important;gap:0!important}`,
  `[data-fila-cristal] [data-boton-cristal]>span:last-child{display:none}`,
  `[data-fila-cristal] [data-circulo]{width:36px!important;height:36px!important;background:transparent!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}`,
  `[data-fila-cristal] [data-badge]{top:-1px!important;right:-1px!important;min-width:16px!important;height:16px!important;font-size:10px!important}`,
  // La franja curva cubre siempre todo el ancho de la pantalla, sea cual sea
  // el teléfono (centrada en la pantalla, no en la columna del contenido).
  `[data-cabecera-hoy]>[data-banda]{left:calc(50% - 50vw)!important;right:auto!important;width:100vw!important}`,
  `[data-capa-v2]{overflow-x:hidden}`,
  // Sin rebote arriba ni abajo: la franja curva se queda pegada al borde y
  // no se asoma lo de atrás. Y si un teléfono viejo rebota igual, la franja
  // sigue hacia arriba con su mismo color (nunca se ve un hueco).
  `[data-capa-v2],.overflow-y-auto{overscroll-behavior-y:none!important}`,
  `[data-cabecera-hoy]>[data-banda]{top:-100vh!important;border-top:100vh solid var(--banda-tope);box-sizing:content-box}`,
  // Calendario, Galería, Recetas y el calendario de comida (cabeceras sin
  // franja): sin la píldora de arriba sobraba un hueco; empiezan más arriba.
  `[data-cabecera-hoy]:not(:has(>[data-banda])){margin-top:-46px!important}`,
  // Y arriba, detrás del título, un degradado suave del color de la sección
  // (con un toque del segundo color a un lado): la página no queda plana.
  `[data-cabecera-hoy]:not(:has(>[data-banda]))::before{content:'';position:absolute;z-index:-1;pointer-events:none;left:calc(50% - 50vw);width:100vw;top:-60vh;height:calc(60vh + 260px);background:radial-gradient(55% 200px at 100% 60vh,rgba(var(--deg-p),.16),transparent 72%),radial-gradient(40% 150px at 0% calc(60vh + 40px),rgba(var(--deg-q),.12),transparent 72%)}`,
  `[data-cabecera-hoy="dash"]{--deg-p:60,123,214;--deg-q:242,201,76}`,
  `[data-cabecera-hoy="entreno"]{--deg-p:95,102,112;--deg-q:242,201,76}`,
  `[data-cabecera-hoy="comida"]{--deg-p:70,150,90;--deg-q:242,201,76}`,
  `[data-cabecera-hoy="aprende"]{--deg-p:238,132,52;--deg-q:60,123,214}`,
  // Entreno: «Hoy te toca» más grande, con el botón de ancho completo.
  `[data-hoy-rutina]{padding:20px!important;border-radius:28px!important}`,
  `[data-hoy-rutina]>div:nth-child(2){font-size:30px!important;letter-spacing:-0.03em!important}`,
  `[data-hoy-empezar]{display:flex!important;justify-content:center;height:50px;margin-top:16px!important}`,
].map(r => r.replace(/(^|\})\s*([^{}]+)\{/g, (m, a, sel) => `${a}${sel.split(',').map(x => `html[data-vista-prueba] ${x.trim()}`).join(',')}{`)).join('\n');

// Cambio de sección (vista en prueba): la franja curva y la cabecera quedan
// en el mismo sitio en todas, así que el cambio es directo, en el mismo
// cuadro: la que entra ya está pintada y la que sale se va a la vez. Con el
// fundido, por un instante se veían las dos páginas mezcladas (los textos
// encima de otros, todo más pálido) y eso se leía como un pestañeo.
const CSS_CAMBIO = `
html[data-vista-prueba], html[data-vista-prueba] body { overscroll-behavior: none; }
html[data-vista-prueba] [data-capa-v2][data-activa] { animation: none !important; }
html[data-vista-prueba] [data-capa-v2],
html[data-vista-prueba] [data-capa-v2]:not([data-activa]) iframe,
html[data-vista-prueba] [data-capa-v2]:not([data-activa]) video { transition: none !important; }`;

// Lote 25 (a prueba, solo Mauro) · al cambiar de sección, el CONTENIDO de la
// que entra aparece subiendo 8 px en 180 ms. Solo el contenido: el fondo de la
// capa ya está pintado desde el primer cuadro, así que nunca se ve la página
// de atrás mezclada (eso era el pestañeo). La barra de abajo no se mueve.
const CSS_L25 = `
@keyframes l25entra { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
html[data-lote25] [data-capa-v2][data-activa] > *:not([data-velo-arriba]) { animation: l25entra .18s cubic-bezier(.2,.8,.2,1) backwards; }
@media (prefers-reduced-motion: reduce) { html[data-lote25] [data-capa-v2][data-activa] > * { animation: none; } }`;

export function entrarContenido(el) {
  if (!el || typeof el.animate !== 'function' || !document.documentElement.hasAttribute('data-lote25')) return;
  try { el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }); } catch (e) { /* sin animación */ }
}

export default function EstiloFondoBlanco({ activo, prueba = false, l25 = false }) {
  React.useEffect(() => {
    const h = document.documentElement;
    if (activo) h.setAttribute('data-fondo-blanco', ''); else h.removeAttribute('data-fondo-blanco');
    if (prueba) h.setAttribute('data-vista-prueba', ''); else h.removeAttribute('data-vista-prueba');
    if (prueba && l25) h.setAttribute('data-lote25', ''); else h.removeAttribute('data-lote25');
    return () => { h.removeAttribute('data-fondo-blanco'); h.removeAttribute('data-vista-prueba'); h.removeAttribute('data-lote25'); };
  }, [activo, prueba, l25]);
  return activo ? <style data-estilo-fondo-blanco>{CSS}{prueba ? '\n' + CSS_PRUEBA + CSS_CAMBIO + (l25 ? CSS_L25 + '\n' + CSS_ESCALA : '') : ''}</style> : null;
}
