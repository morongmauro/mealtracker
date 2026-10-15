// ─────────────────────────────────────────────────────────────────────────
// EL OBJETO DE CADA SECCIÓN, EN 3D (visual nueva)
//
// La kettlebell (entrenamiento), el aguacate (alimentación), el libro
// (aprendizaje) y la brújula (Dash): modelados y animados en 3D, con la misma
// luz de estudio y su sombra en el piso. Cada animación es un WebP animado que
// suena una sola vez al entrar (cae, rebota, se abre…) y se queda en su último
// cuadro; después flota muy suave.
//
// Para que la animación vuelva a empezar cada vez que se entra a la sección,
// el archivo se trae una sola vez y cada entrada lo pinta con una URL nueva
// (un WebP animado solo arranca de cero con una URL distinta).
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import animEntreno from './assets/cabecera/entreno.webp';
import animComida from './assets/cabecera/comida.webp';
import animAprende from './assets/cabecera/aprende.webp';
import animDash from './assets/cabecera/dash.webp';
import finEntreno from './assets/cabecera/entreno-fin.webp';
import finComida from './assets/cabecera/comida-fin.webp';
import finAprende from './assets/cabecera/aprende-fin.webp';
import finDash from './assets/cabecera/dash-fin.webp';
// Los mismos objetos a tres tonos (blanco, gris y un tono claro del módulo),
// sin sombra de piso: para ir dentro del aro, sobre el blob de la cabecera.
import tresEntreno from './assets/cabecera/entreno-tres.webp';
import tresComida from './assets/cabecera/comida-tres.webp';
import tresAprende from './assets/cabecera/aprende-tres.webp';
import tresDash from './assets/cabecera/dash-tres.webp';
import tresFinEntreno from './assets/cabecera/entreno-tres-fin.webp';
import tresFinComida from './assets/cabecera/comida-tres-fin.webp';
import tresFinAprende from './assets/cabecera/aprende-tres-fin.webp';
import tresFinDash from './assets/cabecera/dash-tres-fin.webp';

const ANIM = {
  color: { entreno: animEntreno, comida: animComida, aprende: animAprende, dash: animDash },
  tres: { entreno: tresEntreno, comida: tresComida, aprende: tresAprende, dash: tresDash },
};
const FIN = {
  color: { entreno: finEntreno, comida: finComida, aprende: finAprende, dash: finDash },
  tres: { entreno: tresFinEntreno, comida: tresFinComida, aprende: tresFinAprende, dash: tresFinDash },
};
// Cuánto dura cada animación (ms), para empezar a flotar al terminar.
const DURA = { entreno: 2200, comida: 2400, aprende: 2600, dash: 2400 };
// Lo dibujado dentro del cuadro (sin el aire transparente), en fracciones
// del lado: izquierda, arriba, derecha, abajo. Para ubicar el aro y la frase.
export const CAJA = {
  // El objeto sin su sombra (la sombra sale hacia la derecha y abajo).
  entreno: [0.2, 0.148, 0.644, 0.785],
  comida: [0.239, 0.376, 0.676, 0.767],   // el aguacate
  aprende: [0.129, 0.31, 0.79, 0.69],
  dash: [0.181, 0.285, 0.819, 0.781],
};

const CSS = `
@keyframes obj-flota { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-2.5px) } }
[data-objeto-cabecera].flota { animation: obj-flota 4.5s ease-in-out infinite; }
@keyframes obj-aparece { from { opacity: 0 } to { opacity: 1 } }
[data-objeto-cabecera] img { animation: obj-aparece .18s ease-out both; }
@media (prefers-reduced-motion: reduce) { [data-objeto-cabecera].flota { animation: none; } }`;

const archivos = new Map();   // "tono:tema" → Promise<Blob>
const traer = (tema, tono) => {
  const k = `${tono}:${tema}`;
  if (!archivos.has(k)) archivos.set(k, fetch(ANIM[tono][tema]).then(r => { if (!r.ok) throw new Error('sin archivo'); return r.blob(); }));
  return archivos.get(k);
};
const quieto = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

// La animación arranca cuando el objeto de verdad se ve: después de la
// pantalla de entrada (si no, corre escondida detrás) y cada vez que su
// sección queda al frente (`activo`). Alimentación vive por debajo de las
// otras secciones: sin esto el plato se animaba sin que nadie lo viera.
const entradaLista = () => typeof document === 'undefined' || document.body.classList.contains('app-ready');
const esperarEntrada = (fn) => {
  if (entradaLista()) { fn(); return () => {}; }
  // La entrada se desvanece en ~0,3 s después de marcar «lista».
  let t = null;
  const ob = new MutationObserver(() => { if (entradaLista()) { ob.disconnect(); t = setTimeout(fn, 280); } });
  ob.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  return () => { ob.disconnect(); clearTimeout(t); };
};

// `tono`: 'color' (el objeto a todo color, con su sombra de piso) o 'tres'
// (blanco, gris y un tono claro del módulo, para ir dentro del aro).
export default function ObjetoCabecera({ tema, activo = true, tono = 'color', style }) {
  const [src, setSrc] = useState(null);
  const [flota, setFlota] = useState(false);
  useEffect(() => {
    if (!ANIM[tono][tema]) return undefined;
    // Sin ver la sección: el último cuadro, quieto (así no hay hueco).
    if (!activo || quieto()) { setSrc(FIN[tono][tema]); setFlota(!activo ? false : true); return undefined; }
    let vivo = true, url = null, reloj = null;
    setFlota(false);
    const soltar = esperarEntrada(() => {
      traer(tema, tono).then(blob => {
        if (!vivo) return;
        url = URL.createObjectURL(blob); setSrc(url);
        reloj = setTimeout(() => vivo && setFlota(true), DURA[tema]);
      }).catch(() => { if (vivo) { setSrc(FIN[tono][tema]); setFlota(true); } });
    });
    return () => { vivo = false; soltar(); clearTimeout(reloj); if (url) setTimeout(() => URL.revokeObjectURL(url), 0); };
  }, [tema, activo, tono]);
  if (!ANIM[tono][tema]) return null;
  return (
    <div data-objeto-cabecera={tema} data-tono={tono} data-caja={CAJA[tema].join(',')} className={flota ? 'flota' : undefined} style={{ width: '100%', height: '100%', ...style }}>
      <style>{CSS}</style>
      {src && <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block' }} />}
    </div>
  );
}
