// ─────────────────────────────────────────────────────────────────────────
// VISTA DE LA APP · completa (la de siempre) o compacta
//
// La compacta deja abajo solo Entrenamiento, Alimentación y «Más»: para
// quien siente la app llena de cosas. La elige el cliente en Configuración
// o la pone el coach desde el CRM. Viaja a la nube en
// user_data.data.vista_app = { modo, desde, por } y, entre el teléfono y el
// CRM, gana la más reciente (`desde`).
//
// Por ahora solo para probarla: la ven y la pueden activar los nombres de
// VISTA_COMPACTA_PRUEBA. Para el resto la app sigue completa aunque el CRM
// diga otra cosa.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { esV2 } from './v2.js';

// Lo que era la «vista en prueba» ya es la app de todos (con la visual nueva):
// la completa es la nueva y la compacta es la compacta de la nueva. Para
// volver a probar cosas solo con los nombres de la lista: false.
// (`mt:pruebaTodos` = '0' lo apaga en este teléfono: solo para las pruebas
// automáticas, que siguen revisando la vista de antes.)
export const PRUEBA_TODOS = (() => { try { return localStorage.getItem('mt:pruebaTodos') !== '0'; } catch (e) { return true; } })();

export const VISTA_COMPACTA_PRUEBA = ['mauro moron', 'mauro moron2'];

const CLAVE = 'mt:vistaApp';
const EVENTO = 'mt:vista';
const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

export const puedeCompacta = (nombre) => PRUEBA_TODOS || VISTA_COMPACTA_PRUEBA.includes(normal(nombre));

// «Profundiza en tu composición» (la tabla de referencia de ISSA): ya para
// todos. Para volver a probar algo solo con estos nombres: false.
export const COMPOSICION_PRUEBA = ['mauro moron'];
export const COMPOSICION_TODOS = true;
export const verComposicion = (nombre) => COMPOSICION_TODOS || COMPOSICION_PRUEBA.includes(normal(nombre));

// La rutina más liviana EN LA VISTA NORMAL (a prueba): Ficha · Historial ·
// Nota como íconos junto a lo recetado, en una sola fila, y al terminar un
// ejercicio la pantalla baja sola al siguiente. Para todos: TODOS en true.
export const RUTINA_LIGERA_PRUEBA = ['mauro moron'];
export const RUTINA_LIGERA_TODOS = PRUEBA_TODOS;
export const rutinaLigera = (nombre) => RUTINA_LIGERA_TODOS || ((PRUEBA_TODOS || RUTINA_LIGERA_PRUEBA.includes(normal(nombre))) && enPrueba());

// Fondo blanco con el color del módulo (y un segundo color muy suave), sin
// la píldora negra de arriba y con la franja curva más corta (a prueba).
// Para todos: FONDO_BLANCO_TODOS en true.
export const FONDO_BLANCO_PRUEBA = ['mauro moron'];
// Cabecera opción 1 (2 nov): fondo de luz suave y banda con luz y vidrio al
// 85 % de transparencia. Primero a prueba en la cuenta del coach; ahora de
// todos (CABECERAS_TODOS). Aprende la tiene igual dentro del centro.
// Mi ciclo (ciclo menstrual): a prueba en estas cuentas (src/MiCiclo.jsx).
export const CICLO_PRUEBA = ['mauro moron'];
export const cicloPrueba = () => CICLO_PRUEBA.includes(normal(nombreGuardado()));
export const CABECERAS_TODOS = true;
export const CABECERAS_PRUEBA = ['mauro moron'];
export const cabecerasPrueba = () => CABECERAS_TODOS || CABECERAS_PRUEBA.includes(normal(nombreGuardado()));
export const FONDO_BLANCO_TODOS = PRUEBA_TODOS;
export function fondoBlanco() {
  return FONDO_BLANCO_TODOS || ((PRUEBA_TODOS || FONDO_BLANCO_PRUEBA.includes(normal(nombreGuardado()))) && enPrueba());
}
// Intensidad de los fondos de color de los módulos (2 nov, «intermedio
// entre A y B», luego 70 %): las manchas y degradados a 70 % de lo que eran y sus
// colores un 26 % menos saturados. Solo fondos: textos, íconos y botones
// siguen con los colores de marca.
export const INTENSIDAD_FONDO = 0.70;
const SATURACION_FONDO = 0.74;
export const desaturar = (rgb, s = SATURACION_FONDO) => {
  const [r, g, b] = rgb.split(',').map(Number);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(l + s * (c - l))))).join(',');
};
// Un «rgba(r,g,b,a)» con su transparencia y su color al nivel intermedio.
export const tinteSuave = (rgba) => rgba.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/, (m, r, g, b, a) => `rgba(${desaturar(`${r},${g},${b}`)},${+(a * INTENSIDAD_FONDO).toFixed(3)})`);
// El color de cada módulo (p) y el segundo, muy suave (q), en «r,g,b»
// (ya al nivel intermedio: estos se usan solo en fondos).
const BASE_MODULO = {
  dash:    { p: '60,123,214', q: '242,201,76' },   // azul + amarillo
  entreno: { p: '95,102,112', q: '242,201,76' },   // gris + amarillo
  comida:  { p: '70,150,90',  q: '242,201,76' },   // verde + amarillo
  aprende: { p: '238,132,52', q: '60,123,214' },   // naranja + azul
};
export const COLORES_MODULO = Object.fromEntries(Object.entries(BASE_MODULO).map(([k, v]) => [k, { p: desaturar(v.p), q: desaturar(v.q) }]));
// Un color del módulo aclarado con blanco (para las manchas, que van en hex).
export const aclarar = (rgb, cuanto) => '#' + rgb.split(',').map(Number)
  .map(c => Math.round(c * cuanto + 255 * (1 - cuanto)).toString(16).padStart(2, '0')).join('');

// El blob de vidrio en las cabeceras (a prueba). Para todos: TODOS en true.
export const BLOB_VIDRIO_PRUEBA = ['mauro moron'];
export const BLOB_VIDRIO_TODOS = PRUEBA_TODOS;
export function blobVidrio() {
  return BLOB_VIDRIO_TODOS || ((PRUEBA_TODOS || BLOB_VIDRIO_PRUEBA.includes(normal(nombreGuardado()))) && enPrueba());
}

// Go para todos (23 oct): todo lo que estaba a prueba en la vista de Mauro
// (fondo blanco, blob de vidrio, lote 25-28, rutina ligera) es de todos. Los
// «TODOS» siguen a PRUEBA_TODOS para que las pruebas automáticas, que lo
// apagan con mt:pruebaTodos = '0', sigan revisando la vista de antes.
// Lote 25 (a prueba, solo Mauro): hojas con la marca arriba compacta,
// carga/vacíos con el color del módulo, transición fundido y sube, vibración
// con jerarquía y escala de letra Apple. Para todos: LOTE25_TODOS en true.
export const LOTE25_PRUEBA = ['mauro moron', 'mauro moron2'];
export const LOTE25_TODOS = PRUEBA_TODOS;
export function lote25() {
  return enPrueba() && (LOTE25_TODOS || LOTE25_PRUEBA.includes(normal(nombreGuardado())));
}

// Tres vistas: «completa» (la de siempre, la que ven los clientes),
// «compacta» y «prueba» (la vista en prueba: lo nuevo junto, para compararla
// con las otras dos antes de dársela a nadie).
const MODOS = ['completa', 'compacta', 'prueba'];
const valida = (v) => !!v && typeof v === 'object' && MODOS.includes(v.modo) && typeof v.desde === 'string';
const nombreGuardado = () => { try { return JSON.parse(localStorage.getItem('mt:name') || '""'); } catch (e) { return ''; } };
// ¿Está puesta la vista en prueba? (solo para quien puede probarla). La
// compacta también lleva todo lo de la prueba (fondo blanco, blobs, barra,
// rutina): es la misma app en prueba, con menos cosas a la vista.
export function enPrueba() {
  // Para todos: la nueva va con la visual nueva (la dirección nueva); en la
  // vieja, quien no la tiene sigue con la de siempre.
  if (PRUEBA_TODOS) return esV2(nombreGuardado());
  const v = leerVista();
  return !!v && (v.modo === 'prueba' || v.modo === 'compacta') && puedeCompacta(nombreGuardado());
}

export function leerVista() {
  try { const v = JSON.parse(localStorage.getItem(CLAVE) || 'null'); return valida(v) ? v : null; } catch (e) { return null; }
}

function escribir(v) {
  try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: vale mientras esté abierta */ }
  try { window.dispatchEvent(new CustomEvent(EVENTO, { detail: v })); } catch (e) { /* nada */ }
}

// El cliente la cambia desde la app.
export function guardarVista(modo) {
  const v = { modo, desde: new Date().toISOString(), por: 'cliente' };
  escribir(v);
  return v;
}

// Lo que llega de la nube (puede ser lo que puso el coach): solo si es más
// nuevo que lo de este teléfono.
export function adoptarVistaNube(v) {
  if (!valida(v)) return;
  const aqui = leerVista();
  if (!aqui || String(v.desde) > String(aqui.desde)) escribir(v);
}

// ¿Esta persona ve la app compacta?
export function useVistaCompacta(nombre) {
  const [v, setV] = useState(leerVista);
  useEffect(() => {
    const alCambiar = () => setV(leerVista());
    window.addEventListener(EVENTO, alCambiar);
    window.addEventListener('storage', alCambiar);
    return () => { window.removeEventListener(EVENTO, alCambiar); window.removeEventListener('storage', alCambiar); };
  }, []);
  return puedeCompacta(nombre) && !!v && v.modo === 'compacta';
}

// La vista que se ve ahora: 'completa' | 'compacta' | 'prueba'.
export function useModoVista(nombre) {
  const [v, setV] = useState(leerVista);
  useEffect(() => {
    const alCambiar = () => setV(leerVista());
    window.addEventListener(EVENTO, alCambiar);
    window.addEventListener('storage', alCambiar);
    return () => { window.removeEventListener(EVENTO, alCambiar); window.removeEventListener('storage', alCambiar); };
  }, []);
  // Para todos, «completa» y «prueba» son la misma: la nueva.
  if (PRUEBA_TODOS) return v && v.modo === 'compacta' ? 'compacta' : 'prueba';
  return puedeCompacta(nombre) && v && v.modo !== 'completa' ? v.modo : 'completa';
}

// Filas que se deslizan de lado (chips, filtros): un desvanecido en el borde
// derecho dice «hay más» sin cortar palabras a la mitad. Lote 25.
export const DESVANECIDO_BORDE = {
  WebkitMaskImage: 'linear-gradient(90deg, #000 0, #000 calc(100% - 36px), transparent 100%)',
  maskImage: 'linear-gradient(90deg, #000 0, #000 calc(100% - 36px), transparent 100%)',
};
