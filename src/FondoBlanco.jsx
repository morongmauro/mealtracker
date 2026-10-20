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

// La vista en prueba, además: la paleta solo con los colores de la marca, los
// atajos en una cápsula de vidrio arriba a la derecha y campos blancos.
const AZUL = '#3C7BD6';
const CSS_PRUEBA = [
  // Lo que era morado (peso, fotos, medición) pasa al azul de la marca.
  `[color="#6D4FC2"],[color="#8E5BD8"],[style*="color: rgb(109, 79, 194)"],[style*="color: rgb(142, 91, 216)"]{color:${AZUL}!important}`,
  `[style*="background: rgb(238, 233, 251)"]{background:rgba(60,123,214,.10)!important}`,
  // «Profundiza»: de la crema a blanco con sombra suave.
  `[style*="background: rgb(235, 230, 220)"]{background:#fff!important;box-shadow:0 1px 2px rgba(20,20,30,.04),0 6px 16px rgba(20,30,60,.07)!important}`,
  // Campos de la rutina: blancos con un relieve suave (no grises).
  `[data-ejercicio] input,[data-ejercicio-circuito] input{background:#fff!important;box-shadow:inset 0 0 0 1px rgba(20,20,40,.07),inset 0 2px 4px rgba(20,20,40,.04)!important}`,
  // Atajos: una cápsula de vidrio chica arriba a la derecha (sin palabras).
  `:has(>[data-cabecera-hoy]){position:relative}`,
  `[data-cabecera-hoy]~[data-fila-cristal],[data-cabecera-hoy] [data-fila-cristal]{position:absolute!important;z-index:3;top:calc(env(safe-area-inset-top, 0px) + 36px);right:16px;margin:0!important;gap:2px!important;padding:3px;border-radius:999px;background:rgba(255,255,255,.62);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 4px 14px rgba(20,30,60,.08)}`,
  `[data-fila-cristal] [data-boton-cristal]{width:auto!important;gap:0!important}`,
  `[data-fila-cristal] [data-boton-cristal]>span:last-child{display:none}`,
  `[data-fila-cristal] [data-circulo]{width:36px!important;height:36px!important;background:transparent!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}`,
  `[data-fila-cristal] [data-badge]{top:-1px!important;right:-1px!important;min-width:16px!important;height:16px!important;font-size:10px!important}`,
  // Entreno: «Hoy te toca» más grande, con el botón de ancho completo.
  `[data-hoy-rutina]{padding:20px!important;border-radius:28px!important}`,
  `[data-hoy-rutina]>div:nth-child(2){font-size:30px!important;letter-spacing:-0.03em!important}`,
  `[data-hoy-empezar]{display:flex!important;justify-content:center;height:50px;margin-top:16px!important}`,
  // La etiqueta de arriba deja sitio a la cápsula.
  `[data-cabecera-hoy] [data-etiqueta]{padding-right:150px}`,
].map(r => r.replace(/(^|\})\s*([^{}]+)\{/g, (m, a, sel) => `${a}${sel.split(',').map(x => `html[data-vista-prueba] ${x.trim()}`).join(',')}{`)).join('\n');

export default function EstiloFondoBlanco({ activo, prueba = false }) {
  React.useEffect(() => {
    const h = document.documentElement;
    if (activo) h.setAttribute('data-fondo-blanco', ''); else h.removeAttribute('data-fondo-blanco');
    if (prueba) h.setAttribute('data-vista-prueba', ''); else h.removeAttribute('data-vista-prueba');
    return () => { h.removeAttribute('data-fondo-blanco'); h.removeAttribute('data-vista-prueba'); };
  }, [activo, prueba]);
  return activo ? <style data-estilo-fondo-blanco>{CSS}{prueba ? '\n' + CSS_PRUEBA : ''}</style> : null;
}
