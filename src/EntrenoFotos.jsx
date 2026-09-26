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
//      dos de la misma pose.
//   2. LA POSE SE GUARDA. Comparar una de frente con una de lado no enseña
//      progreso, enseña que giró. Solo se emparejan poses iguales.
//   3. LOS ENLACES CADUCAN. Lo que llega del servidor son URLs firmadas que
//      mueren a los 5 minutos. Si la pantalla lleva rato abierta hay que
//      volver a pedirlas, y por eso se recargan al volver a la pestaña.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, hoyLocal, fechaLarga } from './entrenoDatos.js';
import {
  Card, Vacio, Cargando, Fallo, Chip,
  TEXT, TEXT_MUTED, TEXT_LIGHT, SURFACE, SURFACE_2, BORDER,
  ACCENT, ACCENT_DARK, SHADOW_CARD,
} from './entrenoUI.jsx';

const POSES = [
  ['frente', 'De frente'],
  ['lado', 'De lado'],
  ['espalda', 'De espalda'],
  ['otra', 'Otra'],
];
const nombrePose = (p) => (POSES.find(x => x[0] === p) || [null, p])[1];

// El navegador manda 'image/jpg' a veces, y algunos Android mandan vacío.
const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const tipoDe = (file) => {
  const t = (file.type || '').toLowerCase();
  if (TIPOS_OK.includes(t)) return t;
  if (t === 'image/jpg') return 'image/jpeg';
  const ext = (file.name || '').toLowerCase().split('.').pop();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
           webp: 'image/webp', heic: 'image/heic' }[ext] || null;
};

export default function EntrenoFotos({ name }) {
  const [estado, setEstado] = useState('cargando');
  const [fotos, setFotos] = useState([]);
  const [vista, setVista] = useState('galeria');   // galeria | comparar
  const [pose, setPose] = useState('frente');
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState(null);
  const archivo = useRef(null);

  const cargar = useCallback(async () => {
    const r = await api.fotos(name);
    if (!r?.ok) { setEstado('error'); return; }
    setFotos(r.fotos || []);
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

  const subir = async (file) => {
    if (!file || subiendo) return;
    const tipo = tipoDe(file);
    if (!tipo) { setAviso('Esa no parece una foto. Usa JPG, PNG o HEIC.'); return; }
    if (file.size > 10 * 1024 * 1024) { setAviso('La foto pesa más de 10 MB. Hazla más pequeña o usa otra.'); return; }

    setSubiendo(true); setAviso(null);
    try {
      const permiso = await api.fotoSubir(name, { tipo, pose, fecha: hoyLocal() });
      if (!permiso?.ok) throw new Error(permiso?.motivo || 'sin_permiso');

      // El archivo va DIRECTO al storage, no a través de la API: una foto de
      // 8 MB pasando por la función serverless se come el límite de cuerpo.
      const r = await fetch(permiso.url, { method: 'PUT', headers: { 'Content-Type': tipo }, body: file });
      if (!r.ok) throw new Error('no_subio');

      const guardada = await api.fotoGuardar(name, { ruta: permiso.ruta, pose, fecha: permiso.fecha });
      if (!guardada?.ok) throw new Error(guardada?.motivo || 'no_se_guardo');
      await cargar();
    } catch (e) {
      setAviso('No pude subir la foto. Revisa la señal y prueba otra vez.');
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = '';
    }
  };

  const borrar = async (foto) => {
    if (!window.confirm(`¿Borrar la foto del ${fechaLarga(foto.fecha)}? No se puede deshacer.`)) return;
    setFotos(fs => fs.filter(f => f.id !== foto.id));   // se quita ya: esperar al servidor se siente roto
    const r = await api.fotoBorrar(name, foto.id);
    if (!r?.ok) { setAviso('No pude borrarla. Vuelve a intentarlo.'); cargar(); }
  };

  if (estado === 'cargando') return <Cargando texto="Buscando tus fotos…" />;
  if (estado === 'error') return <Fallo motivo="No pude cargar tus fotos." alReintentar={cargar} />;

  const deLaPose = fotos.filter(f => f.pose === pose);
  const puedeComparar = deLaPose.length >= 2;

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.55 }}>
          Las ve <strong style={{ color: TEXT }}>solo tu entrenador</strong>, nadie más. Puedes borrarlas
          cuando quieras. Para que sirvan, hazlas siempre con la misma luz, la misma ropa y a la misma hora.
        </div>
      </Card>

      {/* Qué pose. Va arriba porque decide tanto lo que ves como lo que subes. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {POSES.map(([id, lab]) => {
          const n = fotos.filter(f => f.pose === id).length;
          const activa = pose === id;
          return (
            <button key={id} onClick={() => setPose(id)} style={{
              border: `1px solid ${activa ? ACCENT : BORDER}`,
              background: activa ? ACCENT : 'transparent',
              color: activa ? '#fff' : TEXT_MUTED,
              borderRadius: 999, padding: '6px 13px', fontSize: 12.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{lab}{n ? ` · ${n}` : ''}</button>
          );
        })}
      </div>

      {aviso && (
        <div style={{
          background: '#FDECEA', color: '#8A2E22', borderRadius: 12,
          padding: '10px 13px', fontSize: 13, marginBottom: 12, lineHeight: 1.5,
        }}>{aviso}</div>
      )}

      {/* Añadir */}
      <input ref={archivo} type="file" accept="image/*" capture="environment"
             onChange={e => subir(e.target.files?.[0])} style={{ display: 'none' }} />
      <button onClick={() => archivo.current?.click()} disabled={subiendo} style={{
        width: '100%', padding: '14px 18px', borderRadius: 15, border: `1px dashed ${BORDER}`,
        background: SURFACE, color: subiendo ? TEXT_LIGHT : ACCENT_DARK,
        fontSize: 14.5, fontWeight: 700, cursor: subiendo ? 'default' : 'pointer',
        fontFamily: 'inherit', marginBottom: 14,
      }}>
        {subiendo ? 'Subiendo…' : `📷 Añadir foto ${nombrePose(pose).toLowerCase()}`}
      </button>

      {deLaPose.length === 0 && (
        <Vacio icono="📷" titulo={`Sin fotos ${nombrePose(pose).toLowerCase()}`}
               texto="La primera es la que vale: es contra la que vas a comparar todas las demás." />
      )}

      {puedeComparar && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['galeria', 'Todas'], ['comparar', 'Comparar']].map(([id, lab]) => (
            <button key={id} onClick={() => setVista(id)} style={{
              flex: 1, border: 0, borderRadius: 11, padding: '9px 0',
              background: vista === id ? SURFACE : 'transparent',
              boxShadow: vista === id ? SHADOW_CARD : 'none',
              color: vista === id ? TEXT : TEXT_LIGHT,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>{lab}</button>
          ))}
        </div>
      )}

      {deLaPose.length > 0 && (vista === 'comparar' && puedeComparar
        ? <Comparar fotos={deLaPose} />
        : <Galeria fotos={deLaPose} onBorrar={borrar} />)}
    </div>
  );
}

// ── Todas, en cuadrícula ────────────────────────────────────────────────
function Galeria({ fotos, onBorrar }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
      {fotos.map(f => (
        <div key={f.id} style={{
          background: SURFACE, borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW_CARD,
        }}>
          <img src={f.url} alt={`${nombrePose(f.pose)} · ${fechaLarga(f.fecha)}`} loading="lazy"
               style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', display: 'block', background: SURFACE_2 }} />
          <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT }}>{fechaLarga(f.fecha)}</div>
              {f.peso_kg && <div style={{ fontSize: 11.5, color: TEXT_LIGHT }}>{f.peso_kg} kg</div>}
            </div>
            <button onClick={() => onBorrar(f)} aria-label="Borrar foto" style={{
              border: 0, background: 'transparent', color: TEXT_LIGHT,
              fontSize: 15, cursor: 'pointer', padding: 2, lineHeight: 1,
            }}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dos, lado a lado ────────────────────────────────────────────────────
// Arranca con la más vieja contra la más nueva, que es la comparación que
// alguien quiere ver. Las dos se pueden cambiar.
function Comparar({ fotos }) {
  const orden = [...fotos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const [izq, setIzq] = useState(orden[0].id);
  const [der, setDer] = useState(orden[orden.length - 1].id);

  useEffect(() => {
    if (!orden.some(f => f.id === izq)) setIzq(orden[0].id);
    if (!orden.some(f => f.id === der)) setDer(orden[orden.length - 1].id);
  }, [fotos]); // eslint-disable-line react-hooks/exhaustive-deps

  const a = orden.find(f => f.id === izq) || orden[0];
  const b = orden.find(f => f.id === der) || orden[orden.length - 1];
  const dias = Math.round((new Date(b.fecha) - new Date(a.fecha)) / 86400000);

  const selector = (valor, set) => (
    <select value={valor} onChange={e => set(e.target.value)} style={{
      width: '100%', marginTop: 6, padding: '7px 8px', borderRadius: 10,
      border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT,
      fontSize: 12.5, fontFamily: 'inherit', fontWeight: 600,
    }}>
      {orden.map(f => <option key={f.id} value={f.id}>{fechaLarga(f.fecha)}{f.peso_kg ? ` · ${f.peso_kg} kg` : ''}</option>)}
    </select>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[[a, izq, setIzq], [b, der, setDer]].map(([f, v, set], i) => (
          <div key={i}>
            <img src={f.url} alt={fechaLarga(f.fecha)}
                 style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', display: 'block',
                          borderRadius: 14, background: SURFACE_2 }} />
            {selector(v, set)}
          </div>
        ))}
      </div>
      {dias > 0 && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: TEXT_MUTED }}>
          <Chip tono="marca">
            {dias >= 60 ? `${Math.round(dias / 30)} meses` : `${dias} días`} de diferencia
          </Chip>
          {a.peso_kg && b.peso_kg && (
            <span style={{ marginLeft: 8 }}>
              {b.peso_kg > a.peso_kg ? '+' : ''}{(b.peso_kg - a.peso_kg).toFixed(1)} kg
            </span>
          )}
        </div>
      )}
    </div>
  );
}
