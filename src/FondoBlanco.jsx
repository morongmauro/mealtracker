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

export default function EstiloFondoBlanco({ activo }) {
  React.useEffect(() => {
    const h = document.documentElement;
    if (activo) h.setAttribute('data-fondo-blanco', ''); else h.removeAttribute('data-fondo-blanco');
    return () => h.removeAttribute('data-fondo-blanco');
  }, [activo]);
  return activo ? <style data-estilo-fondo-blanco>{CSS}</style> : null;
}
