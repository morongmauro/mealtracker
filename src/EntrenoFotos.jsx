// ─────────────────────────────────────────────────────────────────────────
// FOTOS DE PROGRESO
//
// Lo que de verdad hace que alguien vea que está cambiando. La báscula sube
// y baja por el agua y la comida del día anterior; la foto no.
//
// Tres decisiones que no son de adorno:
//
//   1. COMPARAR ES LA PANTALLA, no un extra. Una cuadrícula de fotos sueltas
//      no dice nada. Dos fotos de la misma pose con tres meses de diferencia,
//      lado a lado, lo dicen todo. Por eso se abre en comparar cuando ya hay
//      dos de la misma pose. La diferencia de kg sale de sus medidas.
//   2. LA POSE SE GUARDA. Comparar una de frente con una de lado no enseña
//      progreso, enseña que giró. Solo se emparejan poses iguales. Y antes de
//      abrir la cámara sale la guía de pose: misma luz, misma distancia.
//   3. LOS ENLACES CADUCAN. Lo que llega del servidor son URLs firmadas que
//      mueren a los 5 minutos. Si la pantalla lleva rato abierta hay que
//      volver a pedirlas, y por eso se recargan al volver a la pestaña.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, UploadSimple, X } from '@phosphor-icons/react';
import { api, hoyLocal, fechaLarga } from './entrenoDatos.js';
import { reportar } from './bitacora.js';
import { DESVANECIDO_BORDE } from './vistaApp.js';
import {
  Card, Vacio, Cargando, Fallo, Hoja,
  TEXT, TEXT_MUTED, TEXT_LIGHT, SURFACE_2, SHADOW_CARD,
} from './entrenoUI.jsx';

const AZUL = '#3C7BD6';
const VERDE = '#2F7A45';
const POSES = [
  ['frente', 'De frente'],
  ['lado', 'De lado'],
  ['espalda', 'De espalda'],
  ['otra', 'Otra'],
];
const nombrePose = (p) => (POSES.find(x => x[0] === p) || [null, p])[1];

// El navegador manda 'image/jpg' a veces, y algunos Android mandan vacío.
// Comprime en el teléfono antes de subir: lado mayor 1600 px, JPEG al 82 %.
// Una foto de 8 MB queda en ~300 KB y el storage no se llena. Si el teléfono
// no puede decodificarla (HEIC en Android, por ejemplo), sube la original.
const LADO_MAX = 1600;
async function comprimirFoto(file) {
  try {
    let fuente, ancho, alto;
    if (typeof createImageBitmap === 'function') {
      fuente = await createImageBitmap(file);
      ancho = fuente.width; alto = fuente.height;
    } else {
      fuente = await new Promise((ok, no) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => no(new Error('no_decodifica'));
        img.src = URL.createObjectURL(file);
      });
      ancho = fuente.naturalWidth; alto = fuente.naturalHeight;
    }
    if (!ancho || !alto) throw new Error('vacia');
    const escala = Math.min(1, LADO_MAX / Math.max(ancho, alto));
    const w = Math.round(ancho * escala), h = Math.round(alto * escala);
    const lienzo = document.createElement('canvas');
    lienzo.width = w; lienzo.height = h;
    const ctx = lienzo.getContext('2d');
    ctx.drawImage(fuente, 0, 0, w, h);
    if (fuente.close) fuente.close();
    const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/jpeg', 0.82));
    if (!blob || !blob.size) throw new Error('sin_blob');
    // Si la comprimida pesa más que la original (PNG chiquito), va la original.
    if (blob.size >= file.size && file.type !== 'image/heic') return null;
    return blob;
  } catch (e) {
    return null;
  }
}

const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const tipoDe = (file) => {
  const t = (file.type || '').toLowerCase();
  if (TIPOS_OK.includes(t)) return t;
  if (t === 'image/jpg') return 'image/jpeg';
  const ext = (file.name || '').toLowerCase().split('.').pop();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
           webp: 'image/webp', heic: 'image/heic' }[ext] || null;
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (iso) => { const [y, m, d] = String(iso || '').split('-').map(Number); return d && m ? `${d} ${MESES[m - 1]}` : ''; };
const kg = (n) => `${Number(n).toFixed(1).replace(/\.0$/, '').replace('.', ',')} kg`;
const dif = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1).replace('.', ',')} kg`;
const dias = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
const tiempo = (d) => d >= 14 ? `${Math.round(d / 7)} semanas` : d === 1 ? '1 día' : `${d} días`;

export default function EntrenoFotos({ name }) {
  const [estado, setEstado] = useState('cargando');
  const [fotos, setFotos] = useState([]);
  const [medidas, setMedidas] = useState([]);
  const [vista, setVista] = useState(null);      // null = la que toque | comparar | galeria
  const [pose, setPose] = useState('frente');
  const [izq, setIzq] = useState(null);           // id de la foto de la izquierda del comparador
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [guia, setGuia] = useState(false);
  const camara = useRef(null);
  const archivo = useRef(null);

  const cargar = useCallback(async () => {
    const [r, m] = await Promise.all([api.fotos(name), api.medidas(name).catch(() => null)]);
    if (!r?.ok) { setEstado('error'); return; }
    setFotos(r.fotos || []);
    setMedidas(m && m.ok ? (m.medidas || []) : []);
    setEstado('listo');
  }, [name]);

  useEffect(() => { cargar(); }, [cargar]);

  // Los enlaces caducan a los 5 minutos. Si el teléfono estuvo en el bolsillo
  // y vuelve, las imágenes ya no abren: se piden otra vez.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [cargar]);

  // El peso de una foto: el que trae; si no, la medición más cercana (14 días).
  const pesoDe = (f) => {
    if (f.peso_kg != null) return Number(f.peso_kg);
    const t = Date.parse(`${f.fecha}T12:00:00Z`);
    let mejor = null, dist = 15 * 86400000;
    for (const m of medidas) {
      if (m.peso == null || !m.fecha) continue;
      const d = Math.abs(Date.parse(`${m.fecha}T12:00:00Z`) - t);
      if (d < dist) { dist = d; mejor = Number(m.peso); }
    }
    return mejor;
  };

  const subir = async (file) => {
    if (!file || subiendo) return;
    let tipo = tipoDe(file);
    if (!tipo) { setAviso('Esa no parece una foto. Usa JPG, PNG o HEIC.'); return; }

    setSubiendo(true); setAviso(null);
    let paso = 'comprimir';
    try {
      const chica = await comprimirFoto(file);
      let cuerpo = file;
      if (chica) { cuerpo = chica; tipo = 'image/jpeg'; }
      if (cuerpo.size > 10 * 1024 * 1024) { setAviso('La foto pesa más de 10 MB. Hazla más pequeña o usa otra.'); return; }
      const hoy = hoyLocal();
      paso = 'permiso';
      const permiso = await api.fotoSubir(name, { tipo, pose, fecha: hoy });
      if (!permiso?.ok) throw new Error(permiso?.motivo || 'sin_permiso');

      // El archivo va DIRECTO al storage, no a través de la API: una foto de
      // 8 MB pasando por la función serverless se come el límite de cuerpo.
      paso = 'archivo';
      const r = await fetch(permiso.url, { method: 'PUT', headers: { 'Content-Type': tipo }, body: cuerpo });
      if (!r.ok) throw new Error(`no_subio ${r.status}`);
      paso = 'guardar';

      // El peso de hoy (si lo registró) queda pegado a la foto.
      const pesoHoy = medidas.find(m => m.fecha === hoy && m.peso != null);
      const guardada = await api.fotoGuardar(name, { ruta: permiso.ruta, pose, fecha: permiso.fecha, peso_kg: pesoHoy ? pesoHoy.peso : undefined });
      if (!guardada?.ok) throw new Error(guardada?.motivo || 'no_se_guardo');
      await cargar();
      setVista(null);
    } catch (e) {
      const motivo = String((e && e.message) || e || '');
      // Queda en la bitácora del CRM (ficha del cliente) para saber qué paso falló.
      reportar('foto', `No subió la foto (${paso}): ${motivo}`.slice(0, 400), `pose=${pose}`);
      const sinRed = typeof navigator !== 'undefined' && navigator.onLine === false || /sin_red|Failed to fetch|Load failed|NetworkError/i.test(motivo);
      setAviso(sinRed
        ? 'No pude subir la foto. Revisa la señal y prueba otra vez.'
        : 'No pude subir la foto. Prueba otra vez en un momento; si sigue, avísale a tu coach.');
    } finally {
      setSubiendo(false);
      if (camara.current) camara.current.value = '';
      if (archivo.current) archivo.current.value = '';
    }
  };

  const quitar = async (foto) => {
    if (!window.confirm(`¿Quitar la foto del ${fechaLarga(foto.fecha)}? No se puede deshacer.`)) return;
    setFotos(fs => fs.filter(f => f.id !== foto.id));   // se quita ya: esperar al servidor se siente roto
    const r = await api.fotoBorrar(name, foto.id);
    if (!r?.ok) { setAviso('No pude quitarla. Vuelve a intentarlo.'); cargar(); }
  };

  if (estado === 'cargando') return <Cargando texto="Buscando tus fotos…" />;
  if (estado === 'error') return <Fallo motivo="No pude cargar tus fotos." alReintentar={cargar} />;

  const deLaPose = fotos.filter(f => f.pose === pose).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const puedeComparar = deLaPose.length >= 2;
  const vistaReal = vista || (puedeComparar ? 'comparar' : 'galeria');

  const pill = (activo) => ({
    border: 0, borderRadius: 999, padding: '8px 14px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: activo ? TEXT : '#F1EFE9', color: activo ? '#fff' : TEXT_MUTED, transition: 'background .15s, color .15s', flex: 'none',
  });

  return (
    <div data-fotos>
      {/* Qué pose. Va arriba porque decide tanto lo que ves como lo que subes. */}
      <div data-poses style={{ display: 'flex', gap: 6, overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 12, paddingRight: 36, scrollbarWidth: 'none', ...DESVANECIDO_BORDE }}>
        {POSES.map(([id, lab]) => {
          const n = fotos.filter(f => f.pose === id).length;
          return <button key={id} data-pose={id} aria-pressed={pose === id} onClick={() => { setPose(id); setIzq(null); setVista(null); }} style={pill(pose === id)}>{lab}{n ? ` · ${n}` : ''}</button>;
        })}
      </div>

      {puedeComparar && (
        <div role="radiogroup" aria-label="Vista" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: '#F2EFE8', marginBottom: 12 }}>
          {[['comparar', 'Comparar'], ['galeria', 'Galería']].map(([id, lab]) => (
            <button key={id} role="radio" aria-checked={vistaReal === id} data-vista-fotos={id} onClick={() => setVista(id)} style={{
              flex: 1, height: 38, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700,
              background: vistaReal === id ? '#fff' : 'transparent', color: vistaReal === id ? TEXT : TEXT_MUTED, boxShadow: vistaReal === id ? SHADOW_CARD : 'none',
            }}>{lab}</button>
          ))}
        </div>
      )}

      {aviso && (
        <div style={{ background: '#FDECEA', color: '#8A2E22', borderRadius: 14, padding: '10px 13px', fontSize: 13.5, marginBottom: 12, lineHeight: 1.5 }}>{aviso}</div>
      )}

      {deLaPose.length === 0 && (
        <Vacio Icono={Camera} titulo={`Sin fotos ${nombrePose(pose).toLowerCase()}`}
               texto="La primera es la que vale: es contra la que vas a comparar todas las demás." />
      )}

      {deLaPose.length > 0 && (vistaReal === 'comparar' && puedeComparar
        ? <Comparar fotos={deLaPose} izq={izq} setIzq={setIzq} pesoDe={pesoDe} />
        : <Galeria fotos={deLaPose} pesoDe={pesoDe} alElegir={puedeComparar ? (f) => { setIzq(f.id); setVista('comparar'); } : null} alQuitar={quitar} />)}

      {/* Añadir: la cámara pasa por la guía de pose; subir una que ya tienes, directo. */}
      <input ref={camara} type="file" accept="image/*" capture="environment" onChange={e => subir(e.target.files?.[0])} style={{ display: 'none' }} />
      <input ref={archivo} type="file" accept="image/*" onChange={e => subir(e.target.files?.[0])} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button data-tomar-foto disabled={subiendo} onClick={() => setGuia(true)} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 0, borderRadius: 999, padding: '14px 18px',
          background: TEXT, color: '#fff', fontSize: 15, fontWeight: 750, fontFamily: 'inherit', cursor: 'pointer', opacity: subiendo ? .5 : 1,
        }}><Camera size={18} weight="bold" />{subiendo ? 'Subiendo…' : 'Tomar foto de hoy'}</button>
        <button data-subir-foto disabled={subiendo} onClick={() => archivo.current?.click()} style={{
          display: 'flex', alignItems: 'center', gap: 6, border: 0, borderRadius: 999, padding: '14px 18px', background: '#F1EFE9', color: TEXT,
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: subiendo ? .5 : 1,
        }}><UploadSimple size={18} weight="bold" />Subir</button>
      </div>
      <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 10, lineHeight: 1.45 }}>
        Solo las ves tú y tu coach. Puedes quitar cualquiera.
      </div>

      <GuiaPose abierta={guia} pose={pose} alCerrar={() => setGuia(false)} alAbrirCamara={() => { setGuia(false); camara.current?.click(); }} />
    </div>
  );
}

// ── Etiqueta de fecha · kg sobre la foto ────────────────────────────────
function Etiqueta({ f, peso, nueva }) {
  return (
    <span style={{
      position: 'absolute', left: 8, top: 8, borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 750, color: '#fff',
      background: nueva ? AZUL : 'rgba(31,31,31,.78)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    }}>{nueva && f.fecha === hoyLocal() ? 'Hoy' : fechaCorta(f.fecha)}{peso != null ? ` · ${kg(peso)}` : ''}</span>
  );
}

// ── Dos, lado a lado ────────────────────────────────────────────────────
// La más vieja contra la más nueva. Tocar la de la izquierda pasa a la
// siguiente fecha; desde la galería también se elige cuál va ahí.
function Comparar({ fotos, izq, setIzq, pesoDe }) {
  const b = fotos[fotos.length - 1];
  const candidatas = fotos.slice(0, -1);
  const a = candidatas.find(f => f.id === izq) || candidatas[0];
  const pa = pesoDe(a), pb = pesoDe(b);
  const d = dias(a.fecha, b.fecha);
  const siguiente = () => { const i = candidatas.findIndex(f => f.id === a.id); setIzq(candidatas[(i + 1) % candidatas.length].id); };
  const img = (f, peso, nueva, onClick) => (
    <div onClick={onClick} data-comparar-lado={nueva ? 'ahora' : 'antes'} style={{ position: 'relative', cursor: onClick ? 'pointer' : 'default' }}>
      <img src={f.url} alt={fechaLarga(f.fecha)} style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', display: 'block', borderRadius: 18, background: SURFACE_2 }} />
      <Etiqueta f={f} peso={peso} nueva={nueva} />
    </div>
  );
  return (
    <div data-comparar>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {img(a, pa, false, candidatas.length > 1 ? siguiente : null)}
        {img(b, pb, true, null)}
      </div>
      <div data-comparar-datos style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10, background: '#F6F6F8', borderRadius: 16, padding: '11px 14px' }}>
        <div><div style={{ fontSize: 12, color: TEXT_MUTED }}>Diferencia</div><div style={{ fontSize: 16, fontWeight: 800, color: pa != null && pb != null ? VERDE : TEXT_LIGHT }}>{pa != null && pb != null ? dif(pb - pa) : 'sin peso'}</div></div>
        <div><div style={{ fontSize: 12, color: TEXT_MUTED }}>Tiempo</div><div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{tiempo(d)}</div></div>
        <div><div style={{ fontSize: 12, color: TEXT_MUTED }}>Fotos</div><div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{fotos.length}</div></div>
      </div>
      {candidatas.length > 1 && <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 8 }}>Toca la de la izquierda para cambiar la fecha.</div>}
    </div>
  );
}

// ── Todas, en cuadrícula ────────────────────────────────────────────────
function Galeria({ fotos, pesoDe, alElegir, alQuitar }) {
  const orden = fotos.slice().reverse();   // la más nueva primero
  return (
    <div data-galeria-fotos style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {orden.map((f, i) => (
        <div key={f.id} style={{ position: 'relative' }}>
          <div onClick={alElegir ? () => alElegir(f) : undefined} style={{ position: 'relative', cursor: alElegir ? 'pointer' : 'default' }}>
            <img src={f.url} alt={fechaLarga(f.fecha)} loading="lazy" style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', display: 'block', borderRadius: 16, background: SURFACE_2 }} />
            <Etiqueta f={f} peso={pesoDe(f)} nueva={i === 0} />
          </div>
          <button onClick={() => alQuitar(f)} aria-label={`Quitar foto del ${fechaLarga(f.fecha)}`} data-quitar-foto style={{
            position: 'absolute', right: 6, bottom: 6, width: 28, height: 28, borderRadius: 99, border: 0, cursor: 'pointer',
            background: 'rgba(255,255,255,.9)', color: TEXT, display: 'grid', placeItems: 'center',
          }}><X size={14} weight="bold" /></button>
        </div>
      ))}
    </div>
  );
}

// ── La guía de pose, antes de abrir la cámara ───────────────────────────
// Para que todas queden iguales y comparables: misma luz, misma distancia,
// misma ropa. La silueta dice dónde pararse.
function GuiaPose({ abierta, pose, alCerrar, alAbrirCamara }) {
  const consejo = { frente: 'Brazos sueltos, pies al ancho de los hombros.', lado: 'Perfil completo, mirada al frente.', espalda: 'De espaldas, brazos sueltos.', otra: 'La misma pose que la vez anterior.' }[pose] || '';
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Fotos · Guía de pose" alto="78vh">
      <div data-guia-pose>
        <div style={{ position: 'relative', background: '#1F1F1F', borderRadius: 22, aspectRatio: '3 / 4', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>{nombrePose(pose)} · misma luz, misma distancia</div>
          <svg viewBox="0 0 120 220" width="46%" style={{ display: 'block' }} aria-hidden="true">
            <g fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="60" cy="24" r="15" />
              <path d="M44 44 C30 48 24 60 22 84 L18 128 L26 130 L32 92 L34 120 L36 214 L48 214 L54 140 L60 120 L66 140 L72 214 L84 214 L86 120 L88 92 L94 130 L102 128 L98 84 C96 60 90 48 76 44 Z" />
            </g>
          </svg>
          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,.8)', fontSize: 13 }}>{consejo}</div>
        </div>
        <div style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.5, marginTop: 12 }}>
          Misma hora del día, misma ropa y el teléfono a la misma distancia que la vez anterior. Así la comparación dice la verdad.
        </div>
        <button data-abrir-camara onClick={alAbrirCamara} style={{
          width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 0, borderRadius: 999, padding: '14px 18px',
          background: TEXT, color: '#fff', fontSize: 15, fontWeight: 750, fontFamily: 'inherit', cursor: 'pointer',
        }}><Camera size={18} weight="bold" />Abrir la cámara</button>
      </div>
    </Hoja>
  );
}
