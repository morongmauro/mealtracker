// ─────────────────────────────────────────────────────────────────────────
// DASH · cómo vas en todo, en una pantalla
//
// Es la portada de la app con la visual nueva. Arriba el saludo y los atajos
// que se usan a diario (recordatorios, el reto, escribirle al coach); luego
// las DOS gráficas protagonistas, en anillo como el logo de la marca:
//
//   · Constancia en el entrenamiento — entrenos hechos contra planeados
//   · Constancia en la alimentación  — días dentro de la meta de calorías,
//                                      y cómo va cada macro
//
// Todo lo demás (12 semanas, fuerza, volumen, proteína día a día, calorías
// contra la franja, el calendario de comidas) vive un toque más adentro, en
// «Profundiza». Anillos solo en los dos protagonistas: si todo es anillo,
// ninguno destaca.
//
// Igual que el resumen de la semana: NO se pone nota ni semáforo. Se enseñan
// los números y la persona saca su conclusión.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Bell, CaretDown, Barbell, Stack, ForkKnife, Mountains, WhatsappLogo, ChatCircle, CaretRight, CaretLeft, CalendarBlank, Heartbeat, CalendarCheck, Sparkle, CheckCircle, Circle, BookOpenText, UsersThree, GearSix, Gauge, VideoCamera } from '@phosphor-icons/react';
import Comunidad, { leerComunidad, firmaComunidad } from './Comunidad.jsx';
import Configuracion from './Configuracion.jsx';
import { leerAprendizaje, marcadaLocal } from './aprendizaje.js';
import { api, hoyLocal, sumarDias, aFecha, nombreCorto, useAlVolverRed } from './entrenoDatos.js';
import { aroSemana, partesSemana, progresoEntreno } from './aros.js';
import ExplicacionAro from './ExplicacionAro.jsx';
import AvisoInstalar from './InstalarApp.jsx';
import { precargar as planDe } from './Entrenamiento.jsx';
import { Hoja, CargandoModulo } from './entrenoUI.jsx';
import { IconoEvento } from './iconosEntreno.jsx';
import { HojaMedida } from './EntrenoMedidas.jsx';
import { WHATSAPP_COACH, nombresEj } from './v2.js';
import { Pastilla, BotonCristal, TONO_ATAJOS, FilaCristal } from './PastillaV2.jsx';
import VentanaMarca, { BotonVentana } from './VentanaMarca.jsx';

const CLAVE_BIENVENIDA = 'mt:bienvenidaComunidad';
const bienvenidaVista = () => { try { return !!localStorage.getItem(CLAVE_BIENVENIDA); } catch (e) { return true; } };
const marcarBienvenida = () => { try { localStorage.setItem(CLAVE_BIENVENIDA, new Date().toISOString()); } catch (e) {} };
import Firma from './Firma.jsx';
import CabeceraHoy from './CabeceraHoy.jsx';
import { enPrueba, lote25, DESVANECIDO_BORDE, verComposicion } from './vistaApp.js';
import { etiquetaDia } from './vozCoach.js';
import { reportarRecordatorios, reportarToque } from './recordatoriosReporte.js';
import { useAncho, Tarjeta as TarjetaBase, Leyenda, Globo, Columnas, niceTope, REJILLA, AnilloMarca, rielDe } from './GraficasV2.jsx';
import {
  TEXT, TEXT_MUTED, TEXT_LIGHT,
  FONT_DISPLAY, C_PROTEIN, C_CARBS, C_FAT, SECCION, DASH_AZUL,
} from './theme.js';

const AZUL = SECCION.entreno.base;       // el entrenamiento, en todo el Dash
// Los títulos de las tarjetas del Dash, en el azul del Dash: resaltan
// «Entrenamiento», «Alimentación»… y ordenan la lectura.
const Tarjeta = (props) => <TarjetaBase colorTitulo={DASH_AZUL.base} {...props} />;
const VERDE = SECCION.comida.base;       // la alimentación
const AMBAR = '#EE8434';                  // el cuerpo (peso): naranja de marca, como en las gráficas
const GRASA = C_FAT;                      // el % de grasa: el mismo tono de las grasas
const NARANJA = SECCION.aprende.base;     // el aprendizaje
const CREMA = '#F4F1EB';                  // pastillas y bloques internos
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const fmt = (n, dec = 0) => (n == null || !Number.isFinite(Number(n)) ? '—'
  : Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: dec }));
const fechaCorta = (iso) => { const d = aFecha(iso); return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`; };
const DIA_LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

// ── Datos de comida: salen del propio teléfono ────────────────────────────
// `history[fecha]` son los totales del día que el cliente ve en su pantalla;
// no se recalcula nada, solo se agrupa.
//
// Un día CUMPLE una meta así (y así lo dice la pantalla de «Profundiza»):
//   calorías  ±10 % de la meta
//   proteína  al menos el 90 % de la meta (pasarse de proteína no es fallar)
//   carbos    ±15 %
//   grasas    ±15 %
// La ventana son los 7 días ANTERIORES a hoy: hoy aún no termina y contarlo
// castigaría a quien apenas desayunó.
export const CUMPLE = {
  kcal: (v, m) => Math.abs(v - m) <= m * 0.10,
  p:    (v, m) => v >= m * 0.90,
  c:    (v, m) => Math.abs(v - m) <= m * 0.15,
  g:    (v, m) => Math.abs(v - m) <= m * 0.15,
};

export function datosComida(history = {}, goals = {}, hoy = hoyLocal()) {
  const dia = (f) => {
    const t = history[f];
    return t && typeof t === 'object' && Number(t.kcal) > 0
      ? { kcal: Number(t.kcal) || 0, p: Number(t.p) || 0, c: Number(t.c) || 0, g: Number(t.g) || 0 } : null;
  };
  const ultimos = [];
  for (let i = 13; i >= 0; i--) {
    const f = sumarDias(hoy, -i);
    ultimos.push({ fecha: f, ...(dia(f) || { kcal: null, p: null, c: null, g: null }) });
  }
  // Semanas de lunes a domingo, las mismas 12 del entrenamiento.
  const lunes = sumarDias(hoy, -((aFecha(hoy).getDay() + 6) % 7));
  const semanas = [];
  for (let s = 11; s >= 0; s--) {
    const desde = sumarDias(lunes, -7 * s);
    let dias = 0;
    for (let k = 0; k < 7; k++) {
      const f = sumarDias(desde, k);
      if (f <= hoy && dia(f)) dias++;
    }
    const transcurridos = s === 0 ? Math.min(7, (aFecha(hoy).getDay() + 6) % 7 + 1) : 7;
    semanas.push({ desde, dias, transcurridos });
  }
  const meta = {
    kcal: Number(goals && goals.kcal) || null, p: Number(goals && goals.p) || null,
    c: Number(goals && goals.c) || null, g: Number(goals && goals.g) || null,
  };
  const conDato = ultimos.filter(d => d.kcal != null);
  const enRango = meta.kcal ? conDato.filter(d => CUMPLE.kcal(d.kcal, meta.kcal)).length : null;

  // Los 7 días antes de hoy: cuántos cumplieron cada meta.
  const siete = ultimos.filter(d => d.fecha < hoy).slice(-7);
  const cumplidos = {};
  ['kcal', 'p', 'c', 'g'].forEach(k => {
    cumplidos[k] = meta[k] ? siete.filter(d => d.kcal != null && CUMPLE[k](d[k], meta[k])).length : null;
  });
  // Promedio de los días REGISTRADOS de esos 7: cuánto de la meta se cumple
  // en promedio (en % y en números), y cuántos días quedaron cerca de la
  // meta de calorías (±10 %) y cuántos no.
  const conDato7 = siete.filter(d => d.kcal != null);
  const prom = (k) => (conDato7.length ? conDato7.reduce((a, d) => a + (d[k] || 0), 0) / conDato7.length : null);
  const promedio = {};
  ['kcal', 'p', 'c', 'g'].forEach(k => {
    const v = prom(k);
    promedio[k] = v == null ? null : { valor: Math.round(v), pct: meta[k] ? Math.round((v / meta[k]) * 100) : null };
  });
  const cerca = meta.kcal ? conDato7.filter(d => CUMPLE.kcal(d.kcal, meta.kcal)).length : null;
  const semanaActual = semanas[semanas.length - 1];
  const estaSemana = ultimos.filter(d => d.fecha >= semanaActual.desde && d.p != null);
  return {
    ultimos, semanas, meta, metaK: meta.kcal, metaP: meta.p, enRango, conDato: conDato.length,
    siete, cumplidos, registrados7: conDato7.length, promedio, cerca,
    lejos: cerca == null ? null : conDato7.length - cerca, sinRegistro: siete.length - conDato7.length,
    proteinaSemana: estaSemana.length ? Math.round(estaSemana.reduce((a, d) => a + d.p, 0) / estaSemana.length) : null,
  };
}

// ── Lo que más come, de lo que registró ───────────────────────────────────
// Sale del detalle de cada comida (`historyDetail[fecha]` → comidas →
// alimentos), de los últimos `dias`. Un alimento se agrupa por su nombre
// (sin mayúsculas ni tildes). Cada lista trae los 3 primeros.
//   repetido  el que más veces aparece (al menos 2)
//   calorico  el de más calorías en una sola porción
//   proteina / carbos / grasa / azucar (añadida) / omega3 / fibra: el que más
//             aportó en total en esos días
export function alimentosDestacados(detalle = {}, hoy = hoyLocal(), dias = 30) {
  const porNombre = new Map();
  let porciones = 0;
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(hoy, -i);
    (Array.isArray(detalle[f]) ? detalle[f] : []).forEach(en => (Array.isArray(en?.items) ? en.items : []).forEach(it => {
      const nombre = String(it?.name || '').trim();
      if (!nombre) return;
      const k = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const a = porNombre.get(k) || { nombre, veces: 0, kcal: 0, p: 0, c: 0, g: 0, sugar: 0, omega3: 0, fiber: 0, maxKcal: 0 };
      a.veces++;
      ['kcal', 'p', 'c', 'g', 'sugar', 'omega3', 'fiber'].forEach(m => { a[m] += Number(it[m]) || 0; });
      a.maxKcal = Math.max(a.maxKcal, Number(it.kcal) || 0);
      porNombre.set(k, a);
      porciones++;
    }));
  }
  const lista = [...porNombre.values()];
  const top = (fn, min = 0) => lista.filter(x => fn(x) > min).sort((a, b) => fn(b) - fn(a)).slice(0, 3);
  return {
    dias, porciones, alimentos: lista.length,
    repetido: top(x => x.veces, 1), calorico: top(x => x.maxKcal),
    proteina: top(x => x.p, 1), carbos: top(x => x.c, 1), grasa: top(x => x.g, 1),
    azucar: top(x => x.sugar, 0.5), omega3: top(x => x.omega3, 0.05), fibra: top(x => x.fiber, 0.5),
  };
}

// ── Piezas ────────────────────────────────────────────────────────────────
// Cifra compacta: la etiqueta con el número al lado, y el cambio debajo.
function Dato({ etiqueta, valor, unidad, pie, color }) {
  return (
    <div data-dato style={{ flex: 1, minWidth: 0, background: CREMA, borderRadius: 14, padding: '8px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: TEXT_MUTED, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {color && <span style={{ width: 7, height: 7, borderRadius: 99, background: color, flex: 'none' }} />}{etiqueta}
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 750, color: TEXT, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{valor}</span>
          {unidad && <span style={{ fontSize: 11.5, fontWeight: 600, color: TEXT_MUTED }}>{unidad}</span>}
        </span>
      </div>
      {pie && <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pie}</div>}
    </div>
  );
}

// Pastilla crema con ícono y texto en negrita: los atajos de arriba.

// Botón de «Profundiza»: toda la fila se toca.
function Profundiza({ children, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      // Un tono más oscuro que la crema de los bloques: se lee como botón.
      background: '#EBE6DC', border: 'none', borderRadius: 16, padding: '13px 14px 13px 16px', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 15, fontWeight: 650, color: TEXT, textAlign: 'left',
    }}>
      <span>{children}</span>
      <CaretRight size={18} weight="bold" color={color} />
    </button>
  );
}

// El anillo de la marca: trazo redondeado sobre su riel, y el punto blanco en
// la punta, como en el logo. Es el único lugar del Dash que lo usa.
// Con `alTocar`, el aro es un botón: abre qué lo compone (como los de las
// cabeceras). Todos los aros de la app se explican al tocarlos.
function Anillo({ valor, total, color, tam = 118, grosor = 11, centro, pie, alTocar }) {
  const frac = total > 0 ? valor / total : 0;
  const aro = (
    <AnilloMarca frac={frac} color={color} tam={tam} grosor={grosor} etiqueta={`${valor} de ${total}`}>
      <div style={{ fontSize: 28, fontWeight: 800, color: TEXT, lineHeight: 1, letterSpacing: '-0.02em' }}>{centro}</div>
      {pie && <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3, fontWeight: 600 }}>{pie}</div>}
    </AnilloMarca>
  );
  if (!alTocar) return aro;
  return (
    <button type="button" data-aro-tocar="1" onClick={alTocar} aria-label={`${pie || 'aro'}: ${centro}. Ver cómo se calcula`}
      style={{ border: 0, background: 'none', padding: 0, margin: 0, cursor: 'pointer', fontFamily: 'inherit', flex: 'none', display: 'block' }}>
      {aro}
    </button>
  );
}

// Una barrita por macro: cuánto de la meta se cumple en promedio, en % y en
// números. Pasarse se ve: la barra llena y el % arriba de 100.
function BarraPct({ etiqueta, pct, valor, meta, unidad = 'g', color }) {
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, fontSize: 13.5, color: TEXT }}>
        <span style={{ fontWeight: 600 }}>{etiqueta}</span>
        <span style={{ color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {pct == null ? '—' : <><b style={{ color: TEXT }}>{pct} %</b> · {fmt(valor)}/{fmt(meta)} {unidad}</>}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: rielDe(color, 0.07, CREMA), marginTop: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct == null ? 0 : Math.min(100, pct)}%`, height: '100%', borderRadius: 99, background: color }} />
      </div>
    </div>
  );
}

// Una fila de la semana de entrenamiento: ícono, qué es y cuánto.
function FilaSemana({ Icono, etiqueta, valor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: `1px solid ${CREMA}` }}>
      {/* Ícono de línea, sin círculo: con círculo parecía un botón. */}
      <span data-icono-fila style={{ width: 24, height: 24, color: DASH_AZUL.ink, display: 'grid', placeItems: 'center', flex: 'none' }}>
        <Icono size={19} weight="regular" />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.25 }}>{etiqueta}</span>
      <span style={{ fontSize: 15, fontWeight: 750, color: TEXT, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{valor}</span>
    </div>
  );
}

// Una pastillita de conteo: «5 días cerca de tu meta».
function Conteo({ n, texto, color, fondo }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: fondo, borderRadius: 14, padding: '9px 11px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{n ?? '—'}</div>
      <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 3, lineHeight: 1.25 }}>{texto}</div>
    </div>
  );
}

// La línea de una tendencia: con sus picos (tramos rectos, no suavizada), un
// punto por medición con su valor encima y el degradado debajo. Sin ejes:
// los números van sobre los puntos. Si no caben todos, se escriben cada
// tantos, siempre el último y el más alto y el más bajo.
// `extremos(p)`: el texto del primer y el último punto, que van debajo de la
// línea en sus puntas (de dónde partiste y dónde vas), sin tener que tocarla.
// `valor(p)`: el número corto que va sobre cada punto.
const ALTO_ETIQUETA = 16, ALTO_ABAJO = 14;
// Si el último punto trae `curso` (la semana que va en curso), no se dibuja su
// valor a medias, que se leía como una caída: va punteado y hueco, a la altura
// del anterior, con «va 1 de 3». La escala no cambia.
// `enDos`: en las tarjetas angostas (dos por fila) el pie va en dos líneas,
// valor arriba y fecha abajo: en una sola línea se pisaban los dos extremos.
function Linea({ puntos, color, alto = 46, textoValor, extremos, valor, enDos = false }) {
  const [ref, ancho] = useAncho();
  const [sel, setSel] = useState(null);
  const curso = puntos.length >= 2 && puntos[puntos.length - 1].curso ? puntos[puntos.length - 1].curso : null;
  const cerrados = curso ? puntos.slice(0, -1) : puntos;
  const vals = puntos.map(p => p.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const rango = max - min || 1;
  const pad = 6, padX = 14;
  const arriba = ALTO_ETIQUETA;
  const x = (i) => padX + (puntos.length === 1 ? (ancho - padX * 2) / 2 : (i / (puntos.length - 1)) * (ancho - padX * 2));
  const y = (v) => arriba + pad + (1 - (v - min) / rango) * (alto - pad * 2);
  // Con picos: tramos rectos entre medición y medición.
  const d = cerrados.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const ult = puntos.length - 1;
  const ultCerrado = cerrados.length - 1;
  const base = arriba + alto;
  const area = `${d} L${x(ultCerrado)},${base} L${x(0)},${base} Z`;
  const yCurso = curso ? y(vals[ultCerrado]) : 0;
  const texto = valor || ((p) => fmt(p.v, Number.isInteger(p.v) ? 0 : 1));
  // Qué puntos llevan número: todos si caben (≈34 px por número); si no,
  // cada tantos, más el último, el más alto y el más bajo.
  const paso = puntos.length > 1 ? (ancho - padX * 2) / (puntos.length - 1) : ancho;
  const cada = Math.max(1, Math.ceil(34 / Math.max(paso, 1)));
  const iMax = vals.indexOf(max), iMin = vals.indexOf(min);
  const conNumero = (i) => i === ult || i % cada === 0 && (ult - i) >= cada || i === iMax || i === iMin;
  const GRIS_CURSO = '#A9AFB8';
  // El número va del lado donde no pasa la línea: debajo si los vecinos
  // quedan más arriba (un valle, o el final de una bajada); si no, arriba.
  const abajo = (i) => {
    const v = vals[i], a = i > 0 ? vals[i - 1] : null, b = i < ult ? vals[i + 1] : null;
    const masAlto = (w) => w != null && w > v;
    if (a == null) return masAlto(b);
    if (b == null) return masAlto(a);
    return masAlto(a) && masAlto(b);
  };
  const tocar = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left);
    let mejor = 0;
    puntos.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(mejor) - px)) mejor = i; });
    setSel(sel === mejor ? null : mejor);
  };
  return (
    <div ref={ref} style={{ position: 'relative', paddingTop: textoValor ? 24 : 0, width: '100%', minWidth: 0, minHeight: alto }}>
      {ancho > 0 && <svg width={ancho} height={alto + arriba + ALTO_ABAJO} style={{ display: 'block', overflow: 'visible', cursor: textoValor ? 'pointer' : 'default' }}
        onClick={textoValor ? tocar : undefined}>
        <defs>
          <linearGradient id={`g-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g-${color.slice(1)})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {curso && <path data-tramo-curso d={`M${x(ultCerrado).toFixed(1)},${yCurso.toFixed(1)} L${x(ult).toFixed(1)},${yCurso.toFixed(1)}`}
          fill="none" stroke={GRIS_CURSO} strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />}
        {sel != null && <line x1={x(sel)} x2={x(sel)} y1={arriba} y2={base} stroke={REJILLA} strokeWidth="1" />}
        {puntos.map((p, i) => curso && i === ult
          ? <circle key={i} cx={x(i)} cy={yCurso} r="4.5" fill="#fff" stroke={GRIS_CURSO} strokeWidth="2" data-punto-linea data-punto-curso />
          : (i === (curso ? ultCerrado : ult) || i === sel)
          ? <circle key={i} cx={x(i)} cy={y(p.v)} r="4.5" fill={color} stroke="#fff" strokeWidth="2" data-punto-linea />
          : <circle key={i} cx={x(i)} cy={y(p.v)} r="2.8" fill="#fff" stroke={color} strokeWidth="1.8" data-punto-linea />)}
        {puntos.map((p, i) => conNumero(i) && (curso && i === ult
          ? <text key={`t${i}`} x={x(i)} y={yCurso + 18} textAnchor="end" fontSize="11.5" fontWeight="700" fill={TEXT_LIGHT}
              style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3, fontVariantNumeric: 'tabular-nums' }} data-valor-linea>{curso.texto}</text>
          : <text key={`t${i}`} x={x(i)} y={abajo(i) ? y(p.v) + 16 : y(p.v) - 8} textAnchor={i === 0 && puntos.length > 1 ? 'start' : i === ult && puntos.length > 1 ? 'end' : 'middle'}
            fontSize={i === ult ? 11.5 : 10.5} fontWeight={i === ult ? 800 : 650} fill={i === ult ? TEXT : TEXT_MUTED}
            style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3, fontVariantNumeric: 'tabular-nums' }} data-valor-linea>{texto(p)}</text>
        ))}
      </svg>}
      {textoValor && sel != null && <Globo x={x(sel)} ancho={ancho} texto={textoValor(puntos[sel])} />}
      {extremos && puntos.length >= 2 && enDos && (
        <div data-extremos style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginTop: 6, fontSize: 12.5, lineHeight: 1.25, color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>
          {[0, ult].map((i, k) => {
            const [v, f] = String(extremos(puntos[i])).split(' · ');
            return (
              <span key={i} style={{ textAlign: k ? 'right' : 'left', minWidth: 0 }}>
                <span style={{ display: 'block', whiteSpace: 'nowrap', ...(k ? { color: TEXT, fontWeight: 650 } : {}) }}>{v}</span>
                {f && <span style={{ display: 'block', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 500, color: TEXT_LIGHT }}>{f}</span>}
              </span>
            );
          })}
        </div>
      )}
      {extremos && puntos.length >= 2 && !enDos && (
        <div data-extremos style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12.5, color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>
          <span>{extremos(puntos[0])}</span>
          {curso
            ? <span data-extremo-curso style={{ color: TEXT_LIGHT, fontWeight: 600 }}>En curso · {curso.texto}</span>
            : <span style={{ color: TEXT, fontWeight: 650 }}>{extremos(puntos[ult])}</span>}
        </div>
      )}
    </div>
  );
}

const Cambio = ({ desde, hasta, unidad, bueno = 'sube' }) => {
  if (desde == null || hasta == null) return null;
  const dif = Math.round((hasta - desde) * 10) / 10;
  if (dif === 0) return <span style={{ color: TEXT_MUTED }}>igual</span>;
  const sube = dif > 0;
  const esBueno = bueno === 'sube' ? sube : bueno === 'baja' ? !sube : null;
  return (
    <span style={{ color: esBueno == null ? TEXT_MUTED : esBueno ? '#3E6B3D' : TEXT_MUTED, fontWeight: 650 }}>
      {sube ? '▲' : '▼'} {fmt(Math.abs(dif), 1)} {unidad}
    </span>
  );
};

// FUERA del componente a propósito: definido dentro, cada render de la app
// crearía un componente nuevo y se perdería lo que se tocó en las gráficas.
const Marco = React.forwardRef(({ children }, ref) => (
  <div ref={ref} style={{
    // Vista en prueba: 20 px a los lados, como Entrenamiento y Alimentación.
    position: 'relative', maxWidth: 560, margin: '0 auto', padding: enPrueba() ? '0 20px' : '0 16px',
    paddingTop: 'calc(62px + env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(104px + env(safe-area-inset-bottom, 0px))',
  }}>{children}<Firma style={{ marginTop: 28 }} /></div>
));

// ── La pantalla ───────────────────────────────────────────────────────────
// `acciones`: { recordatorios, reto, calendarioComida } — las abre la app.
// Lo último traído, por cliente: al volver al Dash se pinta al instante y se
// refresca por detrás (antes cada vuelta mostraba «Cargando…»).
const cacheDash = new Map();
const cacheAprende = new Map();

export default function Dash({ name, history, detalle = {}, goals, entrenoOn = true, alIr, racha = 0, pendientes = 0, acciones = {}, avisoPago = null, kcalHoy = 0, reinicio = 0, abrir = null }) {
  const hoy = hoyLocal();
  const [ent, setEnt] = useState(() => cacheDash.get(name) || null);
  // El plan de la semana (la rutina de hoy, para el bloque «Hoy»): el mismo
  // que precarga Entrenamiento, así no se pide dos veces.
  const [plan, setPlan] = useState(null);
  useEffect(() => { let vivo = true; if (name && entrenoOn) planDe(name).then(r => { if (vivo && r) setPlan(r); }); return () => { vivo = false; }; }, [name, entrenoOn]);
  // «¿Cómo se calcula?»: la hoja que abre el aro de la cabecera.
  const [explicar, setExplicar] = useState(false);
  const [falloEnt, setFalloEnt] = useState(false);
  const [midiendo, setMidiendo] = useState(false);
  const [vista, setVista] = useState('inicio');
  // Visual nueva: el Dash queda montado por detrás al ir a otra sección.
  // Al volver a él desde la barra (reinicio cambia) se abre en su inicio,
  // como siempre, pero sin armarse de cero ni volver a pedir los datos.
  useEffect(() => { if (reinicio) setVista('inicio'); }, [reinicio]);
  // Desde «Más» (vista compacta) se puede pedir abrir directo Configuración o
  // la Comunidad. Va DESPUÉS del de arriba: si llegan juntos, gana este.
  useEffect(() => { if (abrir && abrir.v) setVista(abrir.v); }, [abrir && abrir.n]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Qué aro se está explicando (las props de ExplicacionAro), o null.
  const [explicarAro, setExplicarAro] = useState(null);
  const [aprende, setAprende] = useState(() => (cacheAprende.has(name) ? cacheAprende.get(name) : undefined));   // undefined = cargando, null = sin datos
  // Comunidad: cuántas publicaciones no ha visto (el número en su pastilla)
  // y la firma de la más nueva (el puntito del Dash en la barra).
  const [nuevosComunidad, setNuevosComunidad] = useState(0);
  // La bienvenida a la Comunidad (la escribe el coach en el CRM): una sola
  // vez, la primera vez que entra, cuando no hay otra ventana encima.
  const [bienvenida, setBienvenida] = useState(null);
  const cerrarBienvenida = (ir) => { marcarBienvenida(); setBienvenida(null); if (ir) setVista('comunidad'); };
  // Relojes: si hay uno conectado, su tarjeta con el último día.
  const [reloj, setReloj] = useState(null);
  useEffect(() => {
    if (!name) return;
    let vivo = true;
    const q = encodeURIComponent(name);
    fetch(`/api/relojes?accion=estado&name=${q}`).then(r => r.json()).then(r => {
      if (!vivo || !r || !r.ok || !Object.keys(r.conectados || {}).length) return;
      setReloj(r);
      // Que traiga lo nuevo (el servidor lo hace como mucho cada 3 horas).
      fetch('/api/relojes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'sincronizar', name }) }).catch(() => {});
    }).catch(() => {});
    return () => { vivo = false; };
  }, [name]);
  const raizRef = useRef(null);
  useEffect(() => {
    let vivo = true;
    if (name && vista === 'inicio') leerComunidad(name).then(r => {
      if (!vivo || !r || !r.ok) return;
      setNuevosComunidad(r.posts.filter(p => !p.visto).length);
      setBienvenida(r.bienvenida && !bienvenidaVista() ? r.bienvenida : null);
      if (acciones.firmaComunidad) acciones.firmaComunidad(firmaComunidad(r));
    });
    return () => { vivo = false; };
  }, [name, vista]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let vivo = true;
    if (name) leerAprendizaje(name).then(r => {
      if (!vivo) return;
      if (r || !cacheAprende.get(name)) { cacheAprende.set(name, r); setAprende(r); }
    });
    return () => { vivo = false; };
  }, [name]);

  const cargar = async () => {
    setFalloEnt(false);
    const r = await api.dash(name);
    if (r && r.ok) { cacheDash.set(name, r); setEnt(r); }
    else if (!cacheDash.has(name)) setFalloEnt(true);
  };
  useEffect(() => { if (name) cargar(); /* eslint-disable-next-line */ }, [name]);
  useAlVolverRed(() => { if (name) cargar(); });
  // Al entrar o salir de «Profundiza» se sube al principio.
  useEffect(() => {
    const sc = raizRef.current && raizRef.current.closest('[data-view="dash"]');
    if (sc) sc.scrollTo({ top: 0 });
  }, [vista]);

  const comida = useMemo(() => datosComida(history, goals, hoy), [history, goals, hoy]);
  const destacados = useMemo(() => alimentosDestacados(detalle, hoy), [detalle, hoy]);
  const ultimaSemana = ent?.semanas?.[ent.semanas.length - 1];
  // La semana en curso, con el bono de su actividad extra (cardio, deportes…).
  // (y lo poquito que resta lo que el coach le programó y no marcó).
  const semana = ultimaSemana ? { ...ultimaSemana, bono: ent?.semana?.bono || 0, penal: ent?.semana?.penal || 0,
    // Sin deuda: lo planeado hasta hoy (ver armarDash).
    planeados_hoy: ent?.semana?.fuerza?.planeados_hoy } : ultimaSemana;
  const nombre = String(name || '').split(' ')[0];
  const wa = WHATSAPP_COACH
    ? `https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent('Hola Mau!')}`
    : null;

  if (vista === 'entreno') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <DetalleEntreno ent={ent} falloEnt={falloEnt} cargar={cargar} /></Marco>;
  if (vista === 'comida') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <DetalleComida comida={comida} destacados={destacados} alCalendario={acciones.calendarioComida} /></Marco>;
  if (vista === 'composicion') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <DetalleComposicion ent={ent} cargando={entrenoOn && !ent && !falloEnt} alMedir={() => setMidiendo(true)} />
    <HojaMedida abierta={midiendo} nombre={name} alCerrar={() => setMidiendo(false)} alGuardar={() => { setMidiendo(false); cargar(); }} /></Marco>;
  if (vista === 'aprende') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <DetalleAprende aprende={aprende} alIr={alIr} /></Marco>;
  if (vista === 'comunidad') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <Comunidad name={name} /></Marco>;
  if (vista === 'config') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <Configuracion name={name} whatsapp={wa} alRecorrido={acciones.recorrido} alPrograma={acciones.programa} alActivarPush={acciones.activarPush} alCerrarSesion={acciones.cerrarSesion} vistaApp={acciones.vista} /></Marco>;

  // Constancia del entrenamiento en las últimas 8 semanas (% de lo planeado).
  // La semana que va en curso no se pinta como un porcentaje a medias (un 33 %
  // el martes se leía como una caída): va como «va 1 de 3» (Linea › curso).
  const ochoSemanas = (ent?.semanas || []).slice(-8).filter(w => w.planeados > 0)
    .map(w => ({ v: Math.min(100, Math.round((w.hechos / w.planeados) * 100)), fecha: w.desde,
      ...(ent?.semana?.desde && w.desde === ent.semana.desde && w.hechos < w.planeados ? { curso: { texto: `va ${w.hechos} de ${w.planeados}` } } : {}) }));
  const promedio8 = ochoSemanas.length ? Math.round(ochoSemanas.reduce((a, p) => a + p.v, 0) / ochoSemanas.length) : null;
  const kcal14 = comida.ultimos.filter(d => d.kcal != null).map(d => ({ v: d.kcal, fecha: d.fecha }));

  return (
    <Marco ref={raizRef}>
      {/* Saludo: con la misma letra y la voz del coach de las cabeceras de Hoy. */}
      <CabeceraHoy tema="dash" sangria={enPrueba() ? '20px' : '16px'} arriba="calc(62px + env(safe-area-inset-top, 0px))"
        voz={{ etiqueta: etiquetaDia(hoy), a: `Hola${nombre ? `, ${nombre}` : ''}.`, b: racha >= 3 ? `${racha} días seguidos.` : 'Mira cómo vas.' }}
        aro={{ ...aroSemana(semana, history, goals, aprende, hoy), alTocar: () => setExplicar(true) }} />
      {/* Atajos: botones de cristal chicos (círculo con el símbolo y la
          palabra debajo), en una sola línea, para no quitarle el
          protagonismo a las gráficas. */}
      {/* Cuatro botones juntos (con «space-between» quedaban regados por todo el ancho). */}
      <FilaCristal data-atajos style={{ marginTop: 6, justifyContent: 'flex-start', gap: 10 }}>
        {/* Respira vive donde hace falta (el día de descanso, el cierre de la
            rutina y Ajustes); el Reto vuelve aquí cuando haya un reto. */}
        {wa && <BotonCristal tono={TONO_ATAJOS.dash} icono={enPrueba() ? WhatsappLogo : ChatCircle} color="#25A35A" ancho={54} href={wa}>Coach</BotonCristal>}
        <BotonCristal tono={TONO_ATAJOS.dash} icono={UsersThree} color="#2F6CC4" ancho={54} badge={nuevosComunidad} data-abrir-comunidad rotulo="Comunidad"
          aria-label={`Comunidad${nuevosComunidad ? ` · ${nuevosComunidad} ${nuevosComunidad === 1 ? 'nueva' : 'nuevas'}` : ''}`}
          onClick={() => setVista('comunidad')}>Comunidad</BotonCristal>
        {acciones.recordatorios && <BotonCristal tono={TONO_ATAJOS.dash} icono={Bell} color="#C95F17" ancho={54} badge={pendientes} rotulo="Avisos" onClick={acciones.recordatorios}>Recordatorios</BotonCristal>}
        <BotonCristal tono={TONO_ATAJOS.dash} icono={GearSix} color="#636366" ancho={54} data-abrir-config rotulo="Ajustes" onClick={() => setVista('config')}>Configuración</BotonCristal>
      </FilaCristal>

      {/* En el navegador del teléfono (no instalada): instalarla, primero. */}
      <AvisoInstalar />

      {/* Recordatorios a la vista: los dos primeros, y «Ver todos». La
          campanita sigue; esto es una ayudita para quien no va a buscarla. */}
      <RecordatoriosLinea name={name} hoy={hoy} aprende={aprende} medidas={ent?.medidas} cierre={ent?.cierre} cargandoMedidas={entrenoOn && !ent && !falloEnt}
        coach={acciones.recordatoriosCoach || []} alMarcarCoach={acciones.marcarRecordatorio}
        alPrograma={acciones.programa} alMedir={() => setMidiendo(true)} alAbrir={acciones.abrirAprendizaje}
        plan={entrenoOn ? plan : null} coachHoy={entrenoOn ? (ent?.semana?.hoy || []) : []} kcalHoy={kcalHoy} alIr={alIr} />

      {explicar && (
        <ExplicacionSemana semana={semana} history={history} goals={goals} hoy={hoy} alCerrar={() => setExplicar(false)} />
      )}
      {explicarAro && <ExplicacionAro {...explicarAro} alCerrar={() => setExplicarAro(null)} />}

      {reloj && <TarjetaReloj reloj={reloj} />}

      {/* Mensualidad pendiente (primeros 5 días de mora). */}
      {avisoPago}

      {bienvenida && acciones.ventanaLibre !== false && (
        <VentanaMarca data-bienvenida-comunidad simbolo={<UsersThree size={28} weight="fill" color="#2F6CC4" />} titulo={bienvenida.titulo}>
          <div style={{ fontSize: 16, color: '#3A3A3C', lineHeight: 1.5, whiteSpace: 'pre-line', textAlign: 'center' }}>{bienvenida.texto}</div>
          <BotonVentana onClick={() => cerrarBienvenida(true)}>Ver la comunidad</BotonVentana>
          <BotonVentana secundario onClick={() => cerrarBienvenida(false)}>Ahora no</BotonVentana>
        </VentanaMarca>
      )}
      <Seccion>Tu semana</Seccion>

      {/* Protagonista 1: entrenamiento */}
      {entrenoOn && (
        <Tarjeta titulo="Entrenamiento" detalle={ent?.semana ? `Esta semana · ${fechaCorta(ent.semana.desde)} al ${fechaCorta(ent.semana.hasta)}` : 'Esta semana'}>
          {falloEnt ? (
            <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>
              No pude traer tus datos. <button onClick={cargar} style={{ border: 'none', background: 'none', color: AZUL, fontWeight: 700, fontFamily: 'inherit', fontSize: 14, padding: 0, cursor: 'pointer' }}>Reintentar</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14 }}>
              {/* El progreso de la semana: rutinas hechas de las planeadas.
                  Tocarlo explica cuántas ya tocaban y se quedaron sin hacer. */}
              {(() => {
                const pe = progresoEntreno(semana);
                return <Anillo valor={pe ? pe.hechas : 0} total={pe ? pe.planeadas : 0} color={AZUL}
                  centro={pe ? `${pe.hechas}/${pe.planeadas}` : '—'} pie={pe ? 'rutinas · semana' : 'fuerza'}
                  alTocar={() => setExplicarAro({
                    titulo: 'Entrenamiento de la semana', grande: pe ? `${pe.hechas} de ${pe.planeadas}` : '—',
                    que: pe ? 'rutinas de fuerza hechas esta semana' : 'sin rutinas planeadas esta semana',
                    partes: pe ? [
                      { nombre: 'Al día', valor: pe.pendientes ? `${pe.pendientes} sin hacer` : 'Sí', detalle: pe.pendientes ? `${pe.pendientes} rutina${pe.pendientes === 1 ? '' : 's'} que ya tocaba${pe.pendientes === 1 ? '' : 'n'} y no está${pe.pendientes === 1 ? '' : 'n'} hecha${pe.pendientes === 1 ? '' : 's'}.` : 'Todo lo que ya tocaba está hecho. Lo que viene después no te resta nada.' },
                      ...(Number(semana.bono) > 0 ? [{ nombre: 'Cardio y deportes', valor: `+${semana.bono}`, detalle: 'Suman a tu adherencia en el CRM de tu coach.' }] : []),
                    ] : [],
                  })} />;
              })()}
              <div data-semana-entreno style={{ flex: 1, minWidth: 0 }}>
                <FilaSemana Icono={Heartbeat} etiqueta="Días de cardio" valor={ent?.semana ? ent.semana.cardio.dias : '—'} />
                <FilaSemana Icono={CalendarCheck} etiqueta="Lo que te puso tu coach"
                  valor={ent?.semana ? (ent.semana.coach.total ? `${ent.semana.coach.hechos}/${ent.semana.coach.total}` : '—') : '—'} />
                <FilaSemana Icono={Sparkle} etiqueta="Actividad extra" valor={ent?.semana ? `${ent.semana.extra.dias} ${ent.semana.extra.dias === 1 ? 'día' : 'días'}` : '—'} />
                <FilaSemana Icono={Gauge} etiqueta="Intensidad promedio"
                  valor={ent?.semana?.intensidad?.prom != null ? `${fmt(ent.semana.intensidad.prom, 1)}/10`
                    : <span data-sin-intensidad style={{ fontSize: 12.5, fontWeight: 600, color: TEXT_LIGHT }}>{semana && semana.hechos > 0 ? 'Sin marcar' : 'Sin entrenos aún'}</span>} />
                {(() => { const pe = progresoEntreno(semana); return pe && pe.pendientes > 0 && (
                  <div data-sin-hacer style={{ fontSize: 12.5, color: '#B4541D', fontWeight: 600, paddingTop: 7 }}>{pe.pendientes} rutina{pe.pendientes === 1 ? '' : 's'} que ya tocaba{pe.pendientes === 1 ? '' : 'n'} sin hacer</div>
                ); })()}
              </div>
            </div>
          )}
          {/* Lo que movió su performance aparte de la fuerza: el cardio y los
              deportes suman; lo del coach sin marcar resta poquito. */}
          {!falloEnt && ent?.semana && (ent.semana.bono > 0 || ent.semana.penal > 0) && (
            <div data-puntos-extra style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 10, lineHeight: 1.45 }}>
              {ent.semana.bono > 0 && <span><b style={{ color: '#2F7F45' }}>+{ent.semana.bono}</b> por cardio y deportes</span>}
              {ent.semana.bono > 0 && ent.semana.penal > 0 && ' · '}
              {ent.semana.penal > 0 && <span><b style={{ color: '#B5552B' }}>−{String(ent.semana.penal).replace('.', ',')}</b> por lo de tu coach sin marcar</span>}
            </div>
          )}
          {/* Misma forma que la tarjeta de alimentación: anillo y cifras
              arriba, la línea de tendencia a lo ancho debajo. */}
          {!falloEnt && ochoSemanas.length >= 2 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Fuerza, semana a semana{promedio8 != null ? ` · ${promedio8} % de lo planeado` : ''}</div>
              <Linea puntos={ochoSemanas} color={AZUL} alto={54} valor={(p) => `${p.v}%`}
                textoValor={(p) => p.curso ? `Esta semana: ${p.curso.texto}` : `Semana del ${fechaCorta(p.fecha)}: ${p.v} %`} extremos={(p) => `${p.v} % · ${fechaCorta(p.fecha)}`} />
            </div>
          )}
          <Profundiza color={AZUL} onClick={() => setVista('entreno')}>Profundiza en tus gráficas de entrenamiento</Profundiza>
        </Tarjeta>
      )}

      {/* Protagonista 2: alimentación */}
      <Tarjeta titulo="Alimentación" detalle="Tu promedio de los últimos 7 días registrados, contra tu meta.">
        {!comida.metaK ? (
          <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>Tu coach aún no carga tu meta. Cuando lo haga, aquí ves cómo vas con ella.</div>
        ) : !comida.registrados7 ? (
          <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>Registra tu comida y aquí ves tu promedio contra tu meta.</div>
        ) : (
          <>
            <div data-comida-promedio style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14 }}>
              <Anillo valor={Math.min(100, comida.promedio.kcal.pct || 0)} total={100} color={VERDE}
                centro={`${comida.promedio.kcal.pct} %`} pie="de tus calorías"
                alTocar={() => setExplicarAro({
                  titulo: 'Calorías de la semana', grande: `${comida.promedio.kcal.pct} %`, que: 'de tu meta diaria, en promedio',
                  partes: [
                    { nombre: 'Cómo se calcula', detalle: `El promedio de calorías de los ${comida.registrados7} día${comida.registrados7 === 1 ? '' : 's'} que registraste esta semana (${fmt(comida.promedio.kcal.valor)} kcal) contra tu meta (${fmt(comida.metaK)} kcal). Los días sin registrar no entran.` },
                    { nombre: 'Proteína, carbos y grasas', detalle: 'Las barras de al lado: cada una contra su meta, en promedio.' },
                  ],
                })} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Calorías en promedio</div>
                <div style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', marginTop: 1 }}>
                  {fmt(comida.promedio.kcal.valor)}<span style={{ fontSize: 13, fontWeight: 500, color: TEXT_MUTED }}> de {fmt(comida.metaK)} kcal</span>
                </div>
                <BarraPct etiqueta="Proteína" pct={comida.promedio.p?.pct} valor={comida.promedio.p?.valor} meta={comida.meta.p} color={C_PROTEIN} />
                <BarraPct etiqueta="Carbos" pct={comida.promedio.c?.pct} valor={comida.promedio.c?.valor} meta={comida.meta.c} color={C_CARBS} />
                <BarraPct etiqueta="Grasas" pct={comida.promedio.g?.pct} valor={comida.promedio.g?.valor} meta={comida.meta.g} color={C_FAT} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Conteo n={comida.cerca} texto={`${comida.cerca === 1 ? 'día' : 'días'} cerca de tu meta`} color={VERDE} fondo="rgba(70,150,90,0.10)" />
              <Conteo n={comida.lejos} texto={`${comida.lejos === 1 ? 'día' : 'días'} lejos de tu meta`} color={TEXT} fondo={CREMA} />
              {comida.sinRegistro > 0 && <Conteo n={comida.sinRegistro} texto="sin registrar" color={TEXT_LIGHT} fondo={CREMA} />}
            </div>
            {kcal14.length >= 2 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Tus calorías, últimos 14 días</div>
                <Linea puntos={kcal14} color={VERDE} alto={54} valor={(p) => `${(p.v / 1000).toFixed(1)}k`}
                  textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v)} kcal`} extremos={(p) => `${fmt(p.v)} kcal · ${fechaCorta(p.fecha)}`} />
              </div>
            )}
          </>
        )}
        <Profundiza color={VERDE} onClick={() => setVista('comida')}>Profundiza en tus gráficas de alimentación</Profundiza>
      </Tarjeta>

      {/* Cuerpo */}
      <Seccion>Composición corporal</Seccion>
      <Cuerpo medidas={ent?.medidas || []} cargando={entrenoOn && !ent && !falloEnt} alMedir={() => setMidiendo(true)} alProfundizar={verComposicion(name) ? () => setVista('composicion') : null} />
      <HojaMedida abierta={midiendo} nombre={name} alCerrar={() => setMidiendo(false)}
        alGuardar={() => { setMidiendo(false); cargar(); }} />

      {/* Aprendizaje: cuánto ha visto del centro de recursos */}
      <Seccion>Aprendizaje</Seccion>
      <TarjetaAprende aprende={aprende} alProfundizar={() => setVista('aprende')} />
    </Marco>
  );
}

// ── Aprendizaje ───────────────────────────────────────────────────────────
function TarjetaAprende({ aprende, alProfundizar }) {
  return (
    <Tarjeta titulo="Centro de aprendizaje" detalle="Lo que has leído, visto y escuchado del material de tu programa.">
      {aprende === undefined ? (lote25() ? <div style={{ marginTop: 12 }}><CargandoModulo tono="aprende" barras={false} /></div> :
        <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 12 }}>Cargando…</div>
      ) : !aprende ? (
        <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>No pude traer tu avance ahora. Vuelve a intentarlo en un rato.</div>
      ) : (
        <div data-aprende style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14 }}>
          <Anillo valor={aprende.vistas} total={aprende.total} color={NARANJA} centro={`${aprende.pct} %`} pie="completado"
            alTocar={() => setExplicarAro({
              titulo: 'Tu aprendizaje', grande: `${aprende.pct} %`, que: `del material visto: ${aprende.vistas} de ${aprende.total} piezas`,
              partes: aprende.bloques.map(b => ({ nombre: b.titulo, valor: `${b.vistas}/${b.total}` })),
              nota: 'Es de todo el programa, no de la semana: por eso no entra en el aro de arriba.',
            })} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {aprende.bloques.map(b => (
              <div key={b.k} style={{ marginTop: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: TEXT }}>
                  <span style={{ fontWeight: 600 }}>{b.titulo}</span>
                  <span style={{ color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>{b.vistas}/{b.total}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: rielDe(NARANJA, 0.07, CREMA), marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${b.total ? (b.vistas / b.total) * 100 : 0}%`, height: '100%', borderRadius: 99, background: NARANJA }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Profundiza color={NARANJA} onClick={alProfundizar}>Profundiza en tu aprendizaje</Profundiza>
    </Tarjeta>
  );
}

// Pieza por pieza: lo que ya vio, con su check, y lo que le falta.
const SUB_APRENDE = { hub: 'onboarding', capsula: 'capsulas', guia: 'guia', podcast: 'podcast' };
function DetalleAprende({ aprende, alIr }) {
  const [abierto, setAbierto] = useState(null);
  if (aprende === undefined && lote25()) return <><Titular>Tu aprendizaje</Titular><div style={{ marginTop: 16 }}><CargandoModulo tono="aprende" /></div></>;
  if (!aprende) return <><Titular>Tu aprendizaje</Titular><div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 16 }}>{aprende === undefined ? 'Cargando…' : 'No pude traer tu avance ahora.'}</div></>;
  return (
    <>
      <Titular bajada={`Has completado ${aprende.vistas} de ${aprende.total} piezas del centro de aprendizaje.`}>Tu aprendizaje</Titular>
      {aprende.bloques.map(b => {
        const faltan = b.piezas.filter(x => !x.vista);
        const ver = abierto === b.k;
        return (
          <Tarjeta key={b.k} titulo={b.titulo} detalle={b.bajada}
            accion={<span style={{ fontSize: 15, fontWeight: 750, color: NARANJA, fontVariantNumeric: 'tabular-nums' }}>{b.vistas}/{b.total}</span>}>
            <div style={{ height: 8, borderRadius: 99, background: rielDe(NARANJA, 0.07, CREMA), marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: `${b.total ? (b.vistas / b.total) * 100 : 0}%`, height: '100%', borderRadius: 99, background: NARANJA }} />
            </div>
            <div style={{ marginTop: 10 }}>
              {(ver ? b.piezas : b.piezas.slice(0, 4)).map(x => (
                <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: `1px solid ${CREMA}` }}>
                  {x.vista ? <CheckCircle size={19} weight="fill" color={NARANJA} /> : <Circle size={19} color={TEXT_LIGHT} />}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: x.vista ? TEXT : TEXT_MUTED, lineHeight: 1.3 }}>{x.title}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {b.piezas.length > 4 && (
                <button onClick={() => setAbierto(ver ? null : b.k)} style={{ border: 'none', background: CREMA, borderRadius: 999, padding: '8px 14px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: TEXT, cursor: 'pointer' }}>
                  {ver ? 'Ver menos' : `Ver las ${b.piezas.length}`}
                </button>
              )}
              {alIr && faltan.length > 0 && (
                <button onClick={() => alIr('aprende', SUB_APRENDE[b.k] || 'home')} style={{ border: 'none', background: TEXT, borderRadius: 999, padding: '8px 14px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <BookOpenText size={15} /> Seguir aprendiendo
                </button>
              )}
            </div>
          </Tarjeta>
        );
      })}
    </>
  );
}

// Título de sección con una línea fina encima: separa lo que es de otra cosa.
// Sin línea: el título separa solo (como en Apple y Headspace), y el aire
// de arriba y de abajo va más apretado para no desperdiciar pantalla.
function Seccion({ children }) {
  return (
    <div data-seccion style={{ marginTop: 18 }}>
      <h2 style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', margin: '0 2px 0' }}>{children}</h2>
    </div>
  );
}

// El último día que trajo el reloj (el más reciente con algún dato).
function TarjetaReloj({ reloj }) {
  const d = (reloj.dias || []).find(x => x.pasos != null || x.sueno_min != null || x.fc_reposo != null || x.recuperacion != null);
  if (!d) return null;
  const marcas = { fitbit: 'Fitbit', oura: 'Oura', whoop: 'Whoop', polar: 'Polar', garmin: 'Garmin', apple: 'Apple Watch' };
  const datos = [
    d.pasos != null && ['Pasos', Number(d.pasos).toLocaleString('es-CO')],
    d.sueno_min != null && ['Sueño', `${Math.floor(d.sueno_min / 60)} h ${String(d.sueno_min % 60).padStart(2, '0')}`],
    d.fc_reposo != null && ['Pulso en reposo', `${d.fc_reposo} lpm`],
    d.recuperacion != null && ['Recuperación', `${d.recuperacion} %`],
  ].filter(Boolean);
  return (
    <div data-tarjeta-reloj style={{ marginTop: 10, background: '#FFFFFF', borderRadius: 20, padding: '14px 16px', boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15.5, fontWeight: 750, color: TEXT }}>Tu reloj · {marcas[d.proveedor] || d.proveedor}</span>
        <span style={{ fontSize: 12.5, color: TEXT_LIGHT }}>{fechaCorta(d.fecha)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(datos.length, 4)}, minmax(0, 1fr))`, gap: 8, marginTop: 10 }}>
        {datos.map(([k, v]) => (
          <div key={k}><div style={{ fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>{v}</div><div style={{ fontSize: 12, color: TEXT_MUTED }}>{k}</div></div>
        ))}
      </div>
    </div>
  );
}

function Volver({ alVolver }) {
  // Vista nueva: no hay pastilla de volver; tocar «Dash» en la barra ya
  // devuelve al inicio (reinicio) y la pastilla se pisaba con el título.
  if (enPrueba()) return null;
  return (
    <button onClick={alVolver} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, height: 38, padding: '0 14px 0 10px',
      borderRadius: 999, background: CREMA, border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 14.5, fontWeight: 650, color: TEXT, marginTop: 4,
    }}>
      <CaretLeft size={16} weight="bold" /> Dash
    </button>
  );
}

function Titular({ children, bajada }) {
  return (
    <>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, lineHeight: 1.1, margin: '14px 2px 0', color: TEXT, fontWeight: 800, letterSpacing: '-0.02em' }}>{children}</h1>
      {bajada && <div style={{ fontSize: 15, color: TEXT_MUTED, margin: '6px 2px 0', lineHeight: 1.45 }}>{bajada}</div>}
    </>
  );
}

// ── Profundiza: entrenamiento ─────────────────────────────────────────────
// Progreso de pesos: los ejercicios más representativos primero (los que más
// sesiones tienen y, a igualdad, los más pesados); el resto se despliega con
// «Ver todos» para que no sea una lista sin fin.
const PESOS_VISIBLES = 4;
export const ordenPesos = (pesos) => pesos
  .map((e, i) => ({ e, i }))
  .sort((a, b) => (b.e.puntos.length - a.e.puntos.length) || ((b.e.actual || 0) - (a.e.actual || 0)) || (a.i - b.i))
  .map(x => x.e);
function ProgresoPesos({ pesos }) {
  const [todos, setTodos] = useState(false);
  const orden = ordenPesos(pesos);
  const ver = todos ? orden : orden.slice(0, PESOS_VISIBLES);
  const resto = orden.length - PESOS_VISIBLES;
  return (
    <Tarjeta titulo="Progreso de pesos" detalle="Lo más pesado que moviste en cada sesión, en los ejercicios de tu programa.">
      <div data-progreso-pesos-dash style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
        {ver.map(e => {
          const ult = e.puntos[e.puntos.length - 1];
          return (
            <div key={e.id} data-peso-ej={e.alias || e.nombre} style={{ background: CREMA, borderRadius: 18, padding: '12px 13px 8px', minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombresEj(e).grande}</div>
              {nombresEj(e).chico && (
                <div style={{ fontSize: 11.5, color: TEXT_LIGHT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombresEj(e).chico}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em' }}>{fmt(e.actual, 1)}</span>
                <span style={{ fontSize: 12.5, color: TEXT_MUTED }}>kg{ult.reps ? ` × ${ult.reps}` : ''}</span>
              </div>
              {e.puntos.length >= 2 ? (<>
                <div style={{ fontSize: 12, marginTop: 1 }}>
                  <Cambio desde={e.inicio} hasta={e.actual} unidad="kg" />
                  <span style={{ color: TEXT_LIGHT }}> desde {fechaCorta(e.puntos[0].fecha)}</span>
                </div>
                <Linea puntos={e.puntos.map(p => ({ v: p.kg, fecha: p.fecha }))} color={AZUL}
                  textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} kg`} extremos={(p) => `${fmt(p.v, 1)} kg · ${fechaCorta(p.fecha)}`} enDos />
              </>) : (
                <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 1, paddingBottom: 4 }}>Una sesión ({fechaCorta(ult.fecha)}). La línea sale con la segunda.</div>
              )}
            </div>
          );
        })}
      </div>
      {resto > 0 && (
        <button data-pesos-ver-mas onClick={() => setTodos(t => !t)} aria-expanded={todos} style={{
          marginTop: 12, width: '100%', border: 'none', background: CREMA, borderRadius: 999, padding: '10px 16px',
          fontFamily: 'inherit', fontWeight: 700, fontSize: 14, color: TEXT, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {todos ? 'Ver menos' : `Ver todos (${resto} más)`}
          <CaretDown size={15} weight="bold" style={{ transform: todos ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
      )}
    </Tarjeta>
  );
}

function DetalleEntreno({ ent, falloEnt, cargar }) {
  if (falloEnt) {
    return (<><Titular>Tus gráficas de entrenamiento</Titular>
      <Tarjeta titulo="Sin señal" detalle="No pude traer tus datos de entrenamiento. Inténtalo en un momento.">
        <button onClick={cargar} style={{ marginTop: 10, border: 'none', background: CREMA, borderRadius: 999, padding: '9px 16px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, color: TEXT, cursor: 'pointer' }}>Reintentar</button>
      </Tarjeta></>);
  }
  if (!ent) return <><Titular>Tus gráficas de entrenamiento</Titular>{lote25() ? <div style={{ marginTop: 16 }}><CargandoModulo tono="entreno" /></div> : <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 16 }}>Cargando…</div>}</>;
  return (
    <>
      <Titular bajada="Las últimas 12 semanas de tu entrenamiento.">Tus gráficas de entrenamiento</Titular>

      <Tarjeta titulo="Constancia" detalle="Entrenos hechos por semana, contra los que tenías planeados.">
        <Columnas
          datos={ent.semanas.map(w => ({ ...w, valor: w.hechos }))}
          color={AZUL}
          marca={(w) => w.planeados}
          etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
          textoValor={(w) => `${fechaCorta(w.desde)}: ${w.hechos}${w.planeados ? ` de ${w.planeados}` : ''}`}
        />
        <Leyenda items={[{ label: 'Hechos', color: AZUL }, { label: 'Planeados', color: 'rgba(31,31,31,0.55)', tipo: 'linea' }]} />
      </Tarjeta>

      {/* Intensidad: lo duro que se sintió cada entreno (1 a 10), en promedio
          y acumulado (la suma) del día, la semana y el mes. */}
      {ent.intensidad && (
        <Tarjeta titulo="Intensidad" detalle="Qué tan duro se sintió cada entreno, del 1 al 10 (lo marcas al terminar). Promedio y acumulado.">
          <div data-intensidad style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>
            {[['Esta semana', ent.intensidad.semana], ['Este mes', ent.intensidad.mes]].map(([t, r]) => (
              <div key={t} style={{ background: CREMA, borderRadius: 18, padding: '12px 13px' }}>
                <div style={{ fontSize: 13, color: TEXT_MUTED }}>{t}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 24, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em' }}>{r.prom != null ? fmt(r.prom, 1) : '—'}</span>
                  {r.prom != null && <span style={{ fontSize: 12.5, color: TEXT_MUTED }}>/10 promedio</span>}
                </div>
                <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 1 }}>
                  {r.n ? `Acumulado ${r.suma} · ${r.n} ${r.n === 1 ? 'entreno' : 'entrenos'}` : 'Sin entrenos todavía'}
                </div>
              </div>
            ))}
          </div>
          {ent.semanas.some(w => w.rpe_n > 0) && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Promedio por semana</div>
              <Columnas
                datos={ent.semanas.map(w => ({ ...w, valor: w.rpe_prom || 0 }))}
                color={AZUL} tope={10}
                etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
                textoValor={(w) => `${fechaCorta(w.desde)}: ${w.rpe_prom != null ? `${fmt(w.rpe_prom, 1)}/10 · acumulado ${w.rpe_suma}` : 'sin entrenos'}`}
              />
            </div>
          )}
          {ent.intensidad.dias.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Día a día · últimos 28 días</div>
              <Columnas
                datos={ent.intensidad.dias.map(d => ({ ...d, valor: d.prom }))}
                color={AZUL} tope={10}
                etiquetaX={(d, i, todos) => (i === 0 || i === ent.intensidad.dias.length - 1 ? fechaCorta(d.fecha) : '')}
                textoValor={(d) => `${fechaCorta(d.fecha)}: ${fmt(d.prom, 1)}/10${d.n > 1 ? ` · acumulado ${d.suma} en ${d.n} entrenos` : ''}`}
              />
            </div>
          )}
        </Tarjeta>
      )}

      <Tarjeta titulo="Fuerza · tu 1RM estimado"
        detalle="El 1RM es el peso máximo que podrías levantar UNA sola vez. No tienes que probarlo: lo calculamos con tu mejor serie de cada día. Por ejemplo, 60 kg × 10 reps ≈ 80 kg de 1RM. Si la línea sube, te estás haciendo más fuerte, aunque cambies el peso o las reps.">
        {ent.ejercicios.length === 0 ? (
          <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 12 }}>Aparece cuando repitas un mismo ejercicio en dos sesiones.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
            {ent.ejercicios.map(e => (
              <div key={e.id} style={{ background: CREMA, borderRadius: 18, padding: '12px 13px 8px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombresEj(e).grande}</div>
                {nombresEj(e).chico && (
                  <div style={{ fontSize: 11.5, color: TEXT_LIGHT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombresEj(e).chico}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em' }}>{fmt(e.actual, 1)}</span>
                  <span style={{ fontSize: 12.5, color: TEXT_MUTED }}>kg</span>
                </div>
                <div style={{ fontSize: 12, marginTop: 1 }}>
                  <Cambio desde={e.inicio} hasta={e.actual} unidad="kg" />
                  <span style={{ color: TEXT_LIGHT }}> desde {fechaCorta(e.puntos[0].fecha)}</span>
                </div>
                <Linea puntos={e.puntos.map(p => ({ v: p.e1rm, fecha: p.fecha }))} color={AZUL}
                  textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} kg`} extremos={(p) => `${fmt(p.v, 1)} kg · ${fechaCorta(p.fecha)}`} enDos />
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      {/* Progreso de pesos: cada ejercicio de su programa, con lo más pesado
          que movió en cada sesión (el peso de verdad, no un estimado). Primero
          los más representativos; el resto, al tocar «Ver todos». */}
      {(ent.pesos || []).length > 0 && <ProgresoPesos pesos={ent.pesos} />}

      {ent.semanas.some(w => w.volumen_kg > 0) && (
        <Tarjeta titulo="Volumen" detalle="Kilos movidos por semana: peso × repeticiones de todas tus series.">
          <Columnas
            datos={ent.semanas.map(w => ({ ...w, valor: w.volumen_kg }))}
            color={AZUL}
            etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
            textoValor={(w) => `${fechaCorta(w.desde)}: ${fmt(w.volumen_kg)} kg`}
          />
        </Tarjeta>
      )}
    </>
  );
}

// ── Profundiza: alimentación ──────────────────────────────────────────────
function DetalleComida({ comida, destacados, alCalendario }) {
  return (
    <>
      <Titular bajada="Tus metas de calorías y macros, día a día.">Tus gráficas de alimentación</Titular>

      {/* Qué tan cerca de cada meta: el promedio de los días registrados y
          cuántos de los 7 cumplieron. */}
      {comida.metaK && comida.registrados7 > 0 && (
        <Tarjeta titulo="Qué tan cerca estuviste" detalle={`Promedio de los ${comida.registrados7} días que registraste de los últimos 7.`}>
          <div data-cercania style={{ marginTop: 6 }}>
            {[
              { k: 'kcal', nombre: 'Calorías', color: VERDE, u: 'kcal' },
              { k: 'p', nombre: 'Proteína', color: C_PROTEIN, u: 'g' },
              { k: 'c', nombre: 'Carbohidratos', color: C_CARBS, u: 'g' },
              { k: 'g', nombre: 'Grasas', color: C_FAT, u: 'g' },
            ].filter(m => comida.meta[m.k] && comida.promedio[m.k]).map(m => {
              const pr = comida.promedio[m.k];
              return (
                <div key={m.k} style={{ padding: '10px 0', borderTop: `1px solid ${CREMA}` }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: TEXT }}>{m.nombre}</span>
                    <span style={{ fontSize: 13.5, color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>
                      <b style={{ color: TEXT }}>{fmt(pr.valor)}</b> / {fmt(comida.meta[m.k])} {m.u} · <b style={{ color: m.color }}>{pr.pct} %</b>
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 8, borderRadius: 99, background: rielDe(m.color, 0.07, CREMA), marginTop: 7, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (pr.pct / 130) * 100)}%`, height: '100%', borderRadius: 99, background: m.color }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(100 / 130) * 100}%`, width: 2, background: TEXT, opacity: 0.55 }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 5 }}>
                    {comida.cumplidos[m.k]} de {comida.registrados7} días en meta
                  </div>
                </div>
              );
            })}
          </div>
        </Tarjeta>
      )}

      {comida.metaK && comida.conDato > 0 && (
        <Tarjeta titulo="Calorías" detalle={`Últimos 14 días. La franja es tu meta de ${fmt(comida.metaK)} kcal, ±10 %.`}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 30, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1 }}>{comida.enRango}</span>
            <span style={{ fontSize: 14, color: TEXT_MUTED }}>de {comida.conDato} días registrados dentro de la franja</span>
          </div>
          <Alineacion dias={comida.ultimos} meta={comida.metaK} />
          <Leyenda items={[{ label: 'Tus calorías', color: VERDE }, { label: 'Meta ±10 %', color: 'rgba(70,150,90,0.16)', tipo: 'banda' }]} />
        </Tarjeta>
      )}

      <Tarjeta titulo="Proteína"
        detalle={comida.metaP ? `Últimos 14 días. La raya es tu meta de ${fmt(comida.metaP)} g.` : 'Últimos 14 días.'}>
        {comida.conDato === 0 ? (
          <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 12 }}>Registra tu comida en el chat y aquí ves tu proteína día a día.</div>
        ) : (
          <Columnas
            datos={comida.ultimos.map(d => ({ ...d, valor: d.p }))}
            color={C_PROTEIN}
            marca={() => comida.metaP}
            etiquetaX={(d) => DIA_LETRA[aFecha(d.fecha).getDay()]}
            textoValor={(d) => (d.p == null ? `${fechaCorta(d.fecha)}: sin registro` : `${fechaCorta(d.fecha)}: ${fmt(d.p)} g`)}
          />
        )}
      </Tarjeta>

      {[
        { k: 'c', titulo: 'Carbohidratos', color: C_CARBS, meta: comida.meta.c },
        { k: 'g', titulo: 'Grasas', color: C_FAT, meta: comida.meta.g },
      ].filter(() => comida.conDato > 0).map(m => (
        <Tarjeta key={m.k} titulo={m.titulo} detalle={m.meta ? `Últimos 14 días. La raya es tu meta de ${fmt(m.meta)} g.` : 'Últimos 14 días.'}>
          <Columnas
            datos={comida.ultimos.map(d => ({ ...d, valor: d[m.k] }))}
            color={m.color}
            marca={() => m.meta}
            etiquetaX={(d) => DIA_LETRA[aFecha(d.fecha).getDay()]}
            textoValor={(d) => (d[m.k] == null ? `${fechaCorta(d.fecha)}: sin registro` : `${fechaCorta(d.fecha)}: ${fmt(d[m.k])} g`)}
          />
        </Tarjeta>
      ))}

      {destacados && destacados.porciones > 0 && <TusAlimentos d={destacados} />}

      <Tarjeta titulo="Días registrados" detalle="Días de cada semana con tu comida registrada.">
        <Columnas
          datos={comida.semanas.map(w => ({ ...w, valor: w.dias }))}
          color={VERDE} alto={110} tope={7}
          marca={(w) => w.transcurridos}
          etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
          textoValor={(w) => `${fechaCorta(w.desde)}: ${w.dias} de ${w.transcurridos} días`}
        />
      </Tarjeta>

      <Tarjeta titulo="Cómo se cuenta"
        detalle="Un día cumple calorías si queda a ±10 % de tu meta; proteína, si llegas al menos al 90 %; carbohidratos y grasas, a ±15 %. Hoy no cuenta hasta que termine." />

      {alCalendario && (
        <Profundiza color={VERDE} onClick={alCalendario}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><CalendarBlank size={18} /> Tu calendario de comidas: mes, semana y día</span>
        </Profundiza>
      )}
    </>
  );
}

// Lo que más come y lo que más le aporta, de lo que registró. Cada fila: qué
// mide, el alimento que encabeza y los dos que le siguen.
function TusAlimentos({ d }) {
  const g = (v) => `${fmt(Math.round(v))} g`;
  const filas = [
    { id: 'repetido', titulo: 'El que más repites', color: VERDE, lista: d.repetido, valor: (x) => `${x.veces} veces` },
    { id: 'calorico', titulo: 'El más calórico por porción', color: '#C95F17', lista: d.calorico, valor: (x) => `${fmt(Math.round(x.maxKcal))} kcal` },
    { id: 'proteina', titulo: 'El que más proteína te dio', color: C_PROTEIN, lista: d.proteina, valor: (x) => g(x.p) },
    { id: 'carbos', titulo: 'El que más carbohidratos te dio', color: C_CARBS, lista: d.carbos, valor: (x) => g(x.c) },
    { id: 'grasa', titulo: 'El que más grasa te dio', color: C_FAT, lista: d.grasa, valor: (x) => g(x.g) },
    { id: 'omega3', titulo: 'Grasa buena (omega-3)', color: '#178A8F', lista: d.omega3, valor: (x) => `${fmt(Math.round(x.omega3 * 10) / 10)} g` },
    { id: 'fibra', titulo: 'El que más fibra te dio', color: '#2F7F45', lista: d.fibra, valor: (x) => g(x.fiber) },
    { id: 'azucar', titulo: 'El de más azúcar añadida', color: '#C2413B', lista: d.azucar, valor: (x) => g(x.sugar) },
  ].filter(f => f.lista.length);
  return (
    <Tarjeta titulo="Tus alimentos" detalle={`Lo que registraste en los últimos ${d.dias} días: ${d.alimentos} alimentos distintos.`}>
      <div data-tus-alimentos style={{ marginTop: 6 }}>
        {filas.map(f => {
          const [uno, ...resto] = f.lista;
          return (
            <div key={f.id} data-alimento={f.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: `1px solid ${CREMA}` }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: f.color, marginTop: 6, flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT_MUTED }}>{f.titulo}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 1 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 750, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uno.nombre}</span>
                  <span style={{ fontSize: 14, fontWeight: 750, color: f.color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{f.valor(uno)}</span>
                </div>
                {resto.length > 0 && (
                  <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 2 }}>
                    Le siguen: {resto.map(x => `${x.nombre} (${f.valor(x)})`).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Tarjeta>
  );
}

// Puntos de calorías sobre la franja de la meta. Puntos y no barras: lo que
// se lee es la distancia a la franja, no el tamaño.
function Alineacion({ dias, meta }) {
  const [ref, ancho] = useAncho();
  const [sel, setSel] = useState(null);
  const alto = 104, arriba = 14, abajo = 20, izq = 34;
  const vals = dias.filter(d => d.kcal != null).map(d => d.kcal);
  const min = Math.min(meta * 0.7, ...vals), max = Math.max(meta * 1.3, ...vals);
  const y = (v) => arriba + (1 - (v - min) / (max - min)) * (alto - arriba - abajo);
  const paso = (ancho - izq) / dias.length;
  const cx = (i) => izq + paso * i + paso / 2;
  return (
    <div ref={ref} style={{ position: 'relative', marginTop: 8, width: '100%', minWidth: 0, minHeight: alto }}>
      {ancho > 0 && <svg width={ancho} height={alto} style={{ display: 'block', overflow: 'visible' }}>
        <rect x={izq} width={ancho - izq} y={y(meta * 1.1)} height={y(meta * 0.9) - y(meta * 1.1)} fill="rgba(70,150,90,0.12)" rx="6" />
        <line x1={izq} x2={ancho} y1={y(meta)} y2={y(meta)} stroke="rgba(70,150,90,0.35)" strokeWidth="1" />
        <text x={izq - 6} y={y(meta) + 3.5} textAnchor="end" fontSize="10" fill={TEXT_LIGHT}>{fmt(meta)}</text>
        {dias.map((d, i) => (
          <g key={d.fecha} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }}>
            <rect x={cx(i) - paso / 2} y={0} width={paso} height={alto - abajo} fill="transparent" />
            {d.kcal != null && (
              <>
                <line x1={cx(i)} x2={cx(i)} y1={y(meta)} y2={y(d.kcal)} stroke={VERDE} strokeWidth="2" opacity="0.35" />
                <circle cx={cx(i)} cy={y(d.kcal)} r={sel === i ? 5.5 : 4.5} fill={VERDE} />
              </>
            )}
            <text x={cx(i)} y={alto - 5} textAnchor="middle" fontSize="10" fill={TEXT_LIGHT}>{DIA_LETRA[aFecha(d.fecha).getDay()]}</text>
          </g>
        ))}
      </svg>}
      {sel != null && (
        <Globo x={cx(sel)} ancho={ancho}
          texto={dias[sel].kcal == null ? `${fechaCorta(dias[sel].fecha)}: sin registro`
            : `${fechaCorta(dias[sel].fecha)}: ${fmt(dias[sel].kcal)} kcal`} />
      )}
    </div>
  );
}


function Cuerpo({ medidas, cargando, alMedir, alProfundizar = null }) {
  const conPeso = medidas.filter(m => m.peso != null);
  const conGrasa = medidas.filter(m => m.grasa_pct != null);
  const ultPeso = conPeso[conPeso.length - 1];
  const ultGrasa = conGrasa[conGrasa.length - 1];
  return (
    <Tarjeta titulo="Peso y % de grasa"
      accion={<button onClick={alMedir} style={{ border: 'none', background: 'transparent', padding: '11px 8px', margin: '-11px -8px', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: AMBAR, cursor: 'pointer' }}>+ Registrar</button>}>
      {cargando ? (lote25() ? <div style={{ marginTop: 12 }}><CargandoModulo tono="dash" /></div> :
        <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 12 }}>Cargando…</div>
      ) : !medidas.length ? (
        <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 6, lineHeight: 1.5 }}>Registra tu peso y tu % de grasa cuando te midas, y aquí ves cómo cambian.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Dato etiqueta="Peso" color={AMBAR} valor={ultPeso ? fmt(ultPeso.peso, 1) : '—'} unidad="kg"
              pie={ultPeso ? <><Cambio desde={conPeso[0].peso} hasta={ultPeso.peso} unidad="kg" bueno={null} /> <span>· {fechaCorta(ultPeso.fecha)}</span></> : null} />
            <Dato etiqueta="% grasa" color={GRASA} valor={ultGrasa ? fmt(ultGrasa.grasa_pct, 1) : '—'} unidad="%"
              pie={ultGrasa ? <><Cambio desde={conGrasa[0].grasa_pct} hasta={ultGrasa.grasa_pct} unidad="pts" bueno="baja" /> <span>· {fechaCorta(ultGrasa.fecha)}</span></> : null} />
          </div>
          {/* Dos líneas, una por medida: tienen unidades distintas y juntas
              en un mismo eje una aplastaría a la otra. */}
          {conPeso.length >= 2 && (
            <div data-linea-peso style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: TEXT_MUTED }}>Peso desde el {fechaCorta(conPeso[0].fecha)}</div>
              <Linea puntos={conPeso.map(m => ({ v: m.peso, fecha: m.fecha }))} color={AMBAR} alto={52}
                textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} kg`} extremos={(p) => `${fmt(p.v, 1)} kg · ${fechaCorta(p.fecha)}`} />
            </div>
          )}
          {conGrasa.length >= 2 && (
            <div data-linea-grasa style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, color: TEXT_MUTED }}>% de grasa desde el {fechaCorta(conGrasa[0].fecha)}</div>
              <Linea puntos={conGrasa.map(m => ({ v: m.grasa_pct, fecha: m.fecha }))} color={GRASA} alto={52} valor={(p) => `${fmt(p.v, 1)}%`}
                textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} %`} extremos={(p) => `${fmt(p.v, 1)} % · ${fechaCorta(p.fecha)}`} />
            </div>
          )}
        </>
      )}
      {alProfundizar && <Profundiza color={AMBAR} onClick={alProfundizar}>Profundiza en tu composición</Profundiza>}
    </Tarjeta>
  );
}

// ── Profundiza en tu composición ──────────────────────────────────────────
// La tabla de referencia del % de grasa de la International Sports Sciences
// Association (ISSA) —Table 7.1 Bodyfat Percentage Norms—, por sexo (el de su ficha en el CRM), con dónde está él
// según su última medición; debajo, sus gráficas de peso y % de grasa.
// Las categorías y los rangos van tal cual en la tabla de ISSA, en inglés
// (decisión del coach). Un valor entre dos rangos (16,5 %) cuenta en el de abajo.
const GRASA_ISSA = {
  F: [
    { k: 'essential', nombre: 'Low / Essential', rango: '10–12 %', desde: 10, color: '#9AA3AE' },
    { k: 'athletic', nombre: 'Athletic', rango: '13–20 %', desde: 13, color: '#3C7BD6' },
    { k: 'fit', nombre: 'Fit', rango: '21–24 %', desde: 21, color: '#46965A' },
    { k: 'average', nombre: 'Average', rango: '25–31 %', desde: 25, color: '#F2C94C' },
    { k: 'high', nombre: 'High / Overweight', rango: '32 % o más', desde: 32, color: '#EE8434' },
  ],
  M: [
    { k: 'essential', nombre: 'Low / Essential', rango: '4–6 %', desde: 4, color: '#9AA3AE' },
    { k: 'athletic', nombre: 'Athletic', rango: '7–10 %', desde: 7, color: '#3C7BD6' },
    { k: 'fit', nombre: 'Fit', rango: '11–16 %', desde: 11, color: '#46965A' },
    { k: 'average', nombre: 'Average', rango: '17–25 %', desde: 17, color: '#F2C94C' },
    { k: 'high', nombre: 'High / Overweight', rango: '26 % o más', desde: 26, color: '#EE8434' },
  ],
};
const TOPE_ISSA = { F: 40, M: 34 };   // dónde termina la barra (la última franja no tiene techo)
const categoriaIssa = (filas, v) => {
  let c = -1;
  filas.forEach((f, i) => { if (v >= f.desde) c = i; });
  return Math.max(0, c);
};
// Dónde va la marca: dentro de su franja, en proporción (las franjas se
// dibujan del mismo ancho para que se lean todas).
const posIssa = (filas, tope, v) => {
  const i = categoriaIssa(filas, v);
  const ini = filas[i].desde, fin = filas[i + 1] ? filas[i + 1].desde : tope;
  const dentro = Math.min(1, Math.max(0, (v - ini) / Math.max(1, fin - ini)));
  return ((i + (v < filas[0].desde ? 0 : dentro)) / filas.length) * 100;
};

function ReferenciaGrasa({ sexo, grasa, fecha }) {
  const tablas = sexo === 'F' || sexo === 'M' ? [sexo] : ['F', 'M'];
  return (
    <Tarjeta titulo="Tu % de grasa, en referencia" detalle={grasa != null ? `Tu última medición: ${fmt(grasa, 1)} % · ${fechaCorta(fecha)}` : 'Registra tu % de grasa y aquí ves dónde estás.'}>
      <div data-referencia-grasa>
        {tablas.map(sx => {
          const filas = GRASA_ISSA[sx];
          const i = grasa != null ? categoriaIssa(filas, grasa) : -1;
          return (
            <div key={sx} data-tabla-issa={sx} style={{ marginTop: 14 }}>
              {tablas.length > 1 && <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_MUTED, marginBottom: 6 }}>{sx === 'F' ? 'Mujeres' : 'Hombres'}</div>}
              {grasa != null && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{fmt(grasa, 1)}<span style={{ fontSize: 17, fontWeight: 700 }}> %</span></span>
                  <span data-categoria-issa style={{ fontSize: 13.5, fontWeight: 750, color: TEXT, background: filas[i].color + '33', borderRadius: 999, padding: '4px 10px' }}>{filas[i].nombre}</span>
                </div>
              )}
              {/* La barra: una franja por categoría y la marca de dónde está. */}
              <div style={{ position: 'relative', paddingTop: grasa != null ? 22 : 0 }}>
                {grasa != null && (
                  <div data-marca-issa style={{ position: 'absolute', top: 0, left: `${posIssa(filas, TOPE_ISSA[sx], grasa)}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: TEXT, lineHeight: 1 }}>Tú</span>
                    <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${TEXT}`, marginTop: 3 }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 3, height: 12 }}>
                  {filas.map((f, k) => <div key={f.k} style={{ flex: 1, background: f.color, borderRadius: k === 0 ? '99px 4px 4px 99px' : k === filas.length - 1 ? '4px 99px 99px 4px' : 4, opacity: i < 0 || k === i ? 1 : 0.45 }} />)}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                {filas.map((f, k) => (
                  <div key={f.k} data-fila-issa={f.k} data-tu-fila={k === i ? '1' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: k === i ? CREMA : 'transparent' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: f.color, flex: 'none' }} />
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: k === i ? 750 : 500, color: TEXT }}>{f.nombre}{k === i ? ' · tú' : ''}</span>
                    <span style={{ fontSize: 14, color: k === i ? TEXT : TEXT_MUTED, fontWeight: k === i ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>{f.rango}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div data-fuente-issa style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 12, lineHeight: 1.4 }}>Fuente: International Sports Sciences Association (ISSA).</div>
      </div>
    </Tarjeta>
  );
}

function DetalleComposicion({ ent, cargando, alMedir }) {
  const medidas = ent?.medidas || [];
  const ult = medidas.filter(m => m.grasa_pct != null).slice(-1)[0] || null;
  return (
    <>
      <Titular bajada="Dónde está tu % de grasa según la tabla de referencia, y cómo cambian tu peso y tu grasa.">Tu composición</Titular>
      <ReferenciaGrasa sexo={ent?.sexo || null} grasa={ult ? ult.grasa_pct : null} fecha={ult ? ult.fecha : null} />
      <Cuerpo medidas={medidas} cargando={cargando} alMedir={alMedir} />
    </>
  );
}

// ── Recordatorios del Dash ────────────────────────────────────────────────
// Una línea por recordatorio, dos a la vista y el resto con «Ver todos».
// Además de los que pone el coach, la app recuerda sola:
//   · leer «Sobre el programa», hasta que lo haya visto;
//   · registrar el peso y la composición del mes, hasta que haya una medida
//     este mes (o la marque como hecha);
//   · leer las cápsulas y ver los videos, mientras falte alguno.
// El círculo de la izquierda marca como hecho (los del coach y el del
// mes); tocar la línea lleva a donde se hace.
const CLAVE_MES = (ym) => `mt:medidaMes:${ym}`;
// Primero LO DE HOY (la rutina, lo que puso el coach para hoy, registrar la
// comida), con «N de M» como performance del día; lo demás (recordatorios
// del coach, cierre de ciclo, medida del mes, cápsulas y videos) se despliega
// con «Ver todo». Un recordatorio de leer no tapa el entreno de hoy.
function RecordatoriosLinea({ name, hoy, aprende, medidas, cierre = null, cargandoMedidas, coach, alMarcarCoach, alPrograma, alMedir, alAbrir,
  plan = null, coachHoy = [], kcalHoy = 0, alIr = null }) {
  const [todos, setTodos] = useState(false);
  const hoyItems = [];
  const d = plan && Array.isArray(plan.dias) ? plan.dias.find(x => x.es_hoy || x.fecha === hoy) : null;
  if (d && d.rutina) hoyItems.push({ id: 'hoy-rutina', texto: d.hecha ? `Entrenaste ${nombreCorto(d.rutina.nombre)}` : `Entrenar: ${nombreCorto(d.rutina.nombre)}${d.rutina.minutos ? ` · ~${d.rutina.minutos} min` : ''}`, hecho: !!d.hecha, ir: alIr ? () => alIr('entreno', 'hoy') : null, Icono: Barbell, color: AZUL });
  (d?.complementarias || []).forEach(c => hoyItems.push({ id: `hoy-b-${c.id}`, texto: c.hecha ? `Hiciste ${c.nombre}` : c.nombre, hecho: !!c.hecha, ir: alIr ? () => alIr('entreno', 'hoy') : null, Icono: Stack, color: AZUL }));
  // El video que pidió el coach: en Hoy si ese ejercicio toca hoy; si no, en
  // «Ver todo». Se va solo cuando el coach lo marca como llegado.
  const videos = plan && Array.isArray(plan.videos) ? plan.videos : [];
  videos.filter(v => v.hoy).forEach(v => hoyItems.push({ id: `hoy-v-${v.id}`, texto: `Grabar video: ${v.nombre}`, hecho: false, ir: alIr ? () => alIr('entreno', 'hoy') : null, Icono: VideoCamera, color: '#C9672B' }));
  coachHoy.forEach(ev => {
    const texto = ev.tipo === 'actividad' ? `${ev.titulo}${ev.duracion_min ? ` · ${ev.duracion_min} min` : ''}`
      : ev.tipo === 'peso' ? 'Registrar tu peso' : ev.tipo === 'fotos' ? 'Enviar tus fotos' : 'Tu medición corporal';
    // Lo atrasado (de días pasados, sin hacer) dice desde cuándo.
    const desde = ev.atrasado && ev.fecha ? ` · desde el ${new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }).replace('.', '')}` : '';
    hoyItems.push({ id: `hoy-e-${ev.id}`, texto: texto + desde, hecho: !!ev.hecho, ir: alIr ? () => alIr('entreno', 'hoy') : null, Icono: (p) => <IconoEvento tipo={ev.tipo} {...p} />, color: ev.tipo === 'actividad' ? AZUL : '#8E5BD8' });
  });
  const comida = Number(kcalHoy) > 0;
  hoyItems.push({ id: 'hoy-comida', texto: comida ? `Comida registrada · ${Math.round(kcalHoy).toLocaleString('es-CO')} kcal` : 'Registrar lo que comiste', hecho: comida, ir: alIr ? () => alIr('comida', 'chat') : null, Icono: ForkKnife, color: '#46965A' });
  const hoyHechos = hoyItems.filter(i => i.hecho).length;
  const [mesHecho, setMesHecho] = useState(() => { try { return localStorage.getItem(CLAVE_MES(hoy.slice(0, 7))) === '1'; } catch (e) { return false; } });
  const ym = hoy.slice(0, 7);
  const bloque = (k) => (aprende && aprende.bloques ? aprende.bloques.find(b => b.k === k) : null);
  const items = [];
  // Sobre el programa (para quien empieza).
  const hub = bloque('hub');
  const programaVisto = (hub && hub.piezas.some(p => p.id === 'programa' && p.vista)) || marcadaLocal(name, 'hub', 'programa');
  if (aprende !== undefined && !programaVisto) items.push({ id: 'programa', texto: 'Lee «Sobre el programa»: cómo funciona tu proceso', ir: alPrograma, Icono: BookOpenText, color: '#C95F17' });
  // Fin de ciclo: composición corporal y fotos. Va primero y se queda hasta
  // que registre su composición (no se puede descartar con el circulito).
  const cierrePendiente = !!(cierre && !cierre.composicion);
  if (cierrePendiente) items.push({ id: 'cierre', texto: `Fin de ciclo: actualiza tu composición corporal${cierre.fotos ? '' : ' y tus fotos'}`, ir: alMedir, Icono: Heartbeat, color: AMBAR });
  // Peso y composición del mes.
  const medidaMes = (medidas || []).some(m => String(m.fecha || '').slice(0, 7) === ym);
  if (!cierrePendiente && !cargandoMedidas && medidas && !medidaMes && !mesHecho) items.push({ id: 'medida', texto: 'Registra tu peso y composición de este mes', ir: alMedir, marcar: () => {
    try { localStorage.setItem(CLAVE_MES(ym), '1'); } catch (e) { /* sin almacenamiento */ }
    setMesHecho(true);
  }, Icono: Heartbeat, color: AMBAR });
  // Los del coach, pendientes.
  coach.filter(r => !r.done_at).forEach(r => items.push({ id: 'c-' + r.id, texto: r.text, marcar: alMarcarCoach ? () => alMarcarCoach(r.id) : null, Icono: Bell, color: '#E0A21A', coach: true }));
  videos.filter(v => !v.hoy).forEach(v => items.push({ id: `v-${v.id}`, texto: `Video pedido: ${v.nombre}`, ir: alIr ? () => alIr('entreno', 'hoy') : null, Icono: VideoCamera, color: '#C9672B', coach: true }));
  // Cápsulas y videos que faltan: el siguiente de cada uno.
  const cap = bloque('capsula'), pod = bloque('podcast');
  const sigCap = cap && cap.piezas.find(p => !p.vista);
  const sigPod = pod && pod.piezas.find(p => !p.vista);
  if (sigCap) items.push({ id: 'cap', rid: `cap:${sigCap.id}`, texto: `Lee una cápsula: «${sigCap.title}»`, ir: alAbrir ? () => alAbrir(`cap:${sigCap.id}`) : null, Icono: BookOpenText, color: '#C95F17' });
  if (sigPod) items.push({ id: 'pod', rid: `pod:${sigPod.id}`, texto: `Mira un video: «${sigPod.title}»`, ir: alAbrir ? () => alAbrir(`pod:${sigPod.id}`) : null, Icono: Sparkle, color: '#C95F17' });
  // Para el coach: cada toque se le cuenta (ver recordatoriosReporte.js).
  const conToque = (it, tipo) => {
    const rid = it.rid || it.id;
    const avisar = (f) => (f ? () => { reportarToque(hoy, rid, tipo); f(); } : null);
    return { ...it, rid, tipoRep: tipo, ir: avisar(it.ir), marcar: avisar(it.marcar) };
  };
  for (let k = 0; k < hoyItems.length; k++) hoyItems[k] = conToque(hoyItems[k], 'hoy');
  for (let k = 0; k < items.length; k++) items[k] = conToque(items[k], items[k].coach ? 'coach' : 'app');
  // Pendientes primero; lo hecho, al final y en gris con su chulo.
  const deHoy = [...hoyItems.filter(i => !i.hecho), ...hoyItems.filter(i => i.hecho)];
  const visibles = todos ? [...deHoy, ...items] : deHoy;
  const todoHecho = hoyItems.length > 0 && hoyHechos === hoyItems.length;
  const fila = (it, i, hecho = false) => (
    <div key={it.id} data-recordatorio={it.id} data-hecho={hecho ? '1' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, borderTop: i ? '1px solid #F0EDE6' : 0, opacity: hecho ? 0.6 : 1 }}>
      {hecho ? (
        <span aria-hidden="true" style={{ width: 22, height: 22, flex: 'none', borderRadius: 99, background: TEXT, color: '#F2C94C', display: 'grid', placeItems: 'center' }}><CheckCircle size={14} weight="bold" /></span>
      ) : it.marcar ? (
        <button onClick={it.marcar} aria-label="Marcar como hecho" data-marcar style={{ width: 22, height: 22, flex: 'none', borderRadius: 99, border: `2px solid ${it.color}`, background: 'transparent', cursor: 'pointer', padding: 0 }} />
      ) : (
        // Ícono de línea, sin círculo de fondo: con círculo parecía un botón.
        <span aria-hidden="true" data-icono-hoy style={{ width: 22, height: 22, flex: 'none', color: it.color, display: 'grid', placeItems: 'center' }}><it.Icono size={19} weight="regular" /></span>
      )}
      <button onClick={it.ir || it.marcar || undefined} style={{ flex: 1, minWidth: 0, minHeight: 40, display: 'flex', alignItems: 'center', gap: 6, border: 0, background: 'none', padding: '6px 4px 6px 0', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        {/* Peso normal (no negrita en cada renglón) y hasta dos líneas: el
            texto completo, sin «…» a la mitad. */}
        <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 500, color: TEXT, lineHeight: 1.3, letterSpacing: '-0.005em', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textDecoration: hecho ? 'line-through' : 'none' }}>{it.texto}</span>
        {it.ir && !hecho && <CaretRight size={16} color={TEXT_LIGHT} style={{ flex: 'none' }} />}
      </button>
    </div>
  );
  // Vista en prueba: lo primero que falta hoy es la protagonista (grande y
  // con su botón); lo demás de hoy, en chips chicos debajo.
  const pendHoy = hoyItems.filter(i => !i.hecho);
  // Qué le sale y qué de eso está en pantalla (lo demás queda en «Ver todo»):
  // se le cuenta al coach cuando cambia, con un respiro mientras carga.
  const enPantalla = new Set((enPrueba() && pendHoy.length && !todos ? pendHoy : visibles).map(i => i.id));
  const reporte = [
    ...hoyItems.map(i => ({ id: i.rid, texto: i.texto, hecho: !!i.hecho, visible: enPantalla.has(i.id), tipo: 'hoy' })),
    ...items.map(i => ({ id: i.rid, texto: i.texto, hecho: false, visible: enPantalla.has(i.id), tipo: i.tipoRep })),
  ];
  const firmaReporte = JSON.stringify(reporte);
  useEffect(() => {
    const t = setTimeout(() => reportarRecordatorios(hoy, JSON.parse(firmaReporte)), 2000);
    return () => clearTimeout(t);
  }, [firmaReporte, hoy]);
  if (enPrueba() && pendHoy.length && !todos) {
    const [p0, ...resto] = pendHoy;
    return (
      // Compacta: AHORA, la cuenta y «Ver todo» en una línea; lo que toca y
      // su botón en otra; lo demás de hoy en una fila de chips que se desliza.
      <section data-recordatorios-dash data-prota-dash data-hoy-hechos={`${hoyHechos}/${hoyItems.length}`} style={{ marginTop: 12, background: '#FFFFFF', borderRadius: 24, padding: '12px 14px 12px 16px',
        boxShadow: '0 2px 4px rgba(20,20,30,.04), 0 14px 32px rgba(20,30,60,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.09em', color: '#3C7BD6' }}>AHORA <span style={{ color: TEXT_MUTED, fontWeight: 600, letterSpacing: 0 }}>· {hoyHechos} de {hoyItems.length} hoy</span></span>
          {/* Nada se pierde: «Ver todo» abre la lista completa de siempre. */}
          <button data-ver-recordatorios onClick={() => setTodos(true)} style={{ border: 0, background: 'none', padding: '10px 6px', margin: '-10px -6px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: TEXT_MUTED, cursor: 'pointer' }}>
            Ver todo{items.length + hoyItems.length - 1 > 0 ? ` (${items.length + hoyItems.length - 1})` : ''}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <div data-prota-texto style={{ flex: 1, minWidth: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: TEXT, lineHeight: 1.18 }}>{p0.texto}</div>
          {(p0.ir || p0.marcar) && (
            <button data-prota-ir onClick={p0.ir || p0.marcar} style={{ flex: 'none', height: 40, padding: '0 16px', border: 'none', borderRadius: 999, background: TEXT, color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Ir ahora</button>
          )}
        </div>
        {resto.length > 0 && (
          <div data-chips-hoy style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', scrollbarWidth: 'none', margin: '10px -14px 0 -16px', padding: '0 14px 0 16px', ...(lote25() ? DESVANECIDO_BORDE : {}) }}>
            {resto.map(it => (
              <button key={it.id} data-recordatorio={it.id} onClick={it.ir || it.marcar || undefined} style={{ flex: 'none', border: 'none', borderRadius: 99, padding: '6px 11px', background: '#F2F3F5', color: '#5B5B61',
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.texto}</button>
            ))}
          </div>
        )}
      </section>
    );
  }
  return (
    <section data-recordatorios-dash data-hoy-hechos={`${hoyHechos}/${hoyItems.length}`} style={{ marginTop: 10, background: '#FFFFFF', borderRadius: 18, boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)', padding: '7px 6px 3px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 0 0', minHeight: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: TEXT_MUTED }}>
          HOY{hoyItems.length ? <span style={{ color: todoHecho ? '#2F7F45' : TEXT }}> · {todoHecho ? 'todo listo ✓' : `${hoyHechos} de ${hoyItems.length}`}</span> : null}
        </span>
        {items.length > 0 && (
          <button data-ver-recordatorios onClick={() => setTodos(t => !t)} style={{ border: 0, background: 'none', padding: '12px 8px', margin: '-12px -4px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: TEXT, cursor: 'pointer' }}>
            {todos ? 'Ver menos' : `Ver todo (${items.length})`}
          </button>
        )}
      </div>
      {visibles.map((it, i) => fila(it, i, !!it.hecho))}
    </section>
  );
}

// ¿Cómo se calcula el aro de la cabecera? Lo abre el aro mismo: el % de la
// semana completada y sus dos partes, con lo que se quedó atrás.
function ExplicacionSemana({ semana, history, goals, hoy, alCerrar }) {
  const partes = partesSemana(semana, history, goals, hoy);
  const pct = (f) => (f == null ? '—' : `${Math.round(f * 100)}%`);
  const con = partes.map(p => p.frac).filter(x => x != null);
  const total = con.length ? con.reduce((a, x) => a + x, 0) / con.length : null;
  const atras = partes.reduce((a, p) => a + (p.pendientes || 0), 0);
  return (
    <ExplicacionAro titulo="Tu semana" grande={pct(total)} alCerrar={alCerrar}
      que={`de la semana completada · ${atras ? `${atras} cosa${atras === 1 ? '' : 's'} sin hacer` : 'vas al día'}`}
      partes={partes.map(p => ({ nombre: p.nombre, valor: pct(p.frac), detalle: p.detalle, atras: p.atras }))}
      nota="El aro se llena con la semana (rutinas hechas y días de comida registrados). «Al día» es que nada de lo que ya tocaba se quedó sin hacer. El aprendizaje no entra: es de todo el programa y lo ves abajo, en su tarjeta." />
  );
}
