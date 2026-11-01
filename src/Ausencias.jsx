// ─────────────────────────────────────────────────────────────────────────
// AUSENCIAS · «Voy a estar fuera» (viaje, enfermedad, lesión, trabajo…)
//
// Debajo del calendario: las que están en curso o vienen (con «Editar») y
// el botón para avisar una nueva. Puede ser hacia adelante o algo que ya
// pasó. Esos días no cuentan en su semana (lo hace el servidor:
// api/_ausencias.js). Se le envía a su coach, que lo ve en el CRM y le
// escribe él mismo: la app no contesta nada automático.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { AirplaneTilt, FirstAidKit, Bandaids, Briefcase, CalendarX, Plus } from '@phosphor-icons/react';
import { api, hoyLocal, MESES } from './entrenoDatos.js';
import { Hoja, TEXT, TEXT_MUTED } from './entrenoUI.jsx';

export const MOTIVOS = [
  { k: 'viaje', t: 'Viaje', I: AirplaneTilt },
  { k: 'enfermedad', t: 'Enfermedad', I: FirstAidKit },
  { k: 'lesion', t: 'Lesión', I: Bandaids },
  { k: 'trabajo', t: 'Trabajo', I: Briefcase },
  { k: 'otro', t: 'Otro', I: CalendarX },
];
export const motivoTexto = (k) => (MOTIVOS.find(m => m.k === k) || { t: 'Fuera' }).t.replace(/^Otro$/, 'Fuera');
const AZUL = '#3C7BD6';
const GRAFITO = '#1F1F1F';
const GRIS = '#F2F1EC';
const DIAS_SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const corta = (f) => { const [y, m, d] = f.split('-').map(Number); return `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`; };
const conDia = (f) => { const [y, m, d] = f.split('-').map(Number); const w = new Date(y, m - 1, d).getDay(); return `${DIAS_SEM[w][0].toUpperCase()}${DIAS_SEM[w].slice(1)} ${corta(f)}`; };
export const rangoTexto = (a) => (a.desde === a.hasta ? corta(a.desde) : `${corta(a.desde)} al ${corta(a.hasta)}`);

// Las ausencias de lo que ya trajo el calendario (cada mes trae las suyas
// y las que vienen), sin repetir, en curso o por venir.
export function ausenciasVigentes(meses, hoy = hoyLocal()) {
  const vistas = new Map();
  (meses || []).forEach(m => (m && m.ausencias || []).forEach(a => { if (!vistas.has(a.id)) vistas.set(a.id, a); }));
  return [...vistas.values()].filter(a => a.hasta >= hoy).sort((a, b) => a.desde.localeCompare(b.desde));
}

const estiloCaja = { background: '#fff', borderRadius: 20, boxShadow: '0 1px 2px rgba(40,40,30,.04),0 8px 22px rgba(60,60,40,.06)' };

// Debajo del calendario: lo que tiene marcado y el botón.
export function AusenciasCalendario({ ausencias, alNueva, alEditar }) {
  return (
    <div data-ausencias style={{ marginTop: 12, display: 'grid', gap: 10 }}>
      {ausencias.map(a => {
        const M = MOTIVOS.find(m => m.k === a.motivo) || MOTIVOS[4];
        return (
          <div key={a.id} data-ausencia={a.id} style={{ ...estiloCaja, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
            <span style={{ flex: 'none', width: 38, height: 38, borderRadius: 12, background: 'rgba(60,123,214,.12)', display: 'grid', placeItems: 'center' }}><M.I size={21} weight="bold" color={AZUL} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 15.5, color: TEXT }}>{motivoTexto(a.motivo)} · {rangoTexto(a)}</b>
              <span style={{ display: 'block', fontSize: 13.5, color: '#55565B', lineHeight: 1.3, marginTop: 2 }}>Esos días no cuentan en tu semana</span>
            </span>
            <button type="button" onClick={() => alEditar(a)} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, color: GRAFITO, background: GRIS, borderRadius: 999, padding: '7px 12px' }}>Editar</button>
          </div>
        );
      })}
      <button type="button" data-ausencia-nueva onClick={alNueva} style={{ ...estiloCaja, border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', fontWeight: 700, fontSize: 15.5, color: GRAFITO, textAlign: 'left', borderRadius: 999 }}>
        <Plus size={18} weight="bold" /> Voy a estar fuera
      </button>
    </div>
  );
}

// La hoja: motivo, desde, hasta y, si quiere, algo para su coach.
export function HojaAusencia({ abierta, nombre, ausencia = null, alCerrar, alGuardar }) {
  const hoy = hoyLocal();
  const [motivo, setMotivo] = useState('viaje');
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [nota, setNota] = useState('');
  const [estado, setEstado] = useState(null);
  useEffect(() => {
    if (!abierta) return;
    setMotivo(ausencia ? ausencia.motivo : 'viaje');
    setDesde(ausencia ? ausencia.desde : hoy);
    setHasta(ausencia ? ausencia.hasta : hoy);
    setNota(ausencia ? ausencia.nota || '' : '');
    setEstado(null);
  }, [abierta, ausencia && ausencia.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const error = (m) => ({
    orden: '«Hasta» no puede ser antes de «Desde».', muy_larga: 'Como mucho 120 días seguidos.',
    muy_atras: 'Solo puedes marcar algo de los últimos 60 días.', fechas: 'Revisa las fechas.',
    sin_tabla: 'Esto aún no está listo. Avísale a tu coach por WhatsApp.', sin_red: 'Sin conexión. Inténtalo cuando tengas señal.',
  }[m] || 'No se guardó. Inténtalo en un momento.');
  const guardar = async () => {
    if (hasta < desde) return setEstado(error('orden'));
    setEstado('enviando');
    const r = await api.ausenciaGuardar(nombre, { id: ausencia ? ausencia.id : undefined, motivo, desde, hasta, nota: nota.trim() });
    if (r && r.ok) { alGuardar(r.ausencia || { desde, hasta }, ausencia ? 'editada' : 'nueva'); return; }
    setEstado(error(r && r.motivo));
  };
  const quitar = async () => {
    setEstado('enviando');
    const r = await api.ausenciaQuitar(nombre, ausencia.id);
    if (r && r.ok) { alGuardar(ausencia, 'quitada'); return; }
    setEstado(error(r && r.motivo));
  };
  const campo = { flex: 1, minWidth: 0, background: GRIS, borderRadius: 16, padding: '10px 14px', display: 'block' };
  const input = { width: '100%', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 16.5, fontWeight: 800, color: GRAFITO, padding: 0, marginTop: 2, outline: 'none', minHeight: 24, WebkitAppearance: 'none', appearance: 'none' };
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={ausencia ? 'Editar · Voy a estar fuera' : 'Avísale a tu coach · Voy a estar fuera'} alto="82vh">
      <div data-hoja-ausencia>
        <div style={{ fontSize: 14.5, color: '#6B6B6B', lineHeight: 1.35 }}>Esos días no cuentan en tu semana. Puede ser hacia adelante o algo que ya pasó.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {MOTIVOS.map(m => (
            <button key={m.k} type="button" data-motivo={m.k} aria-pressed={motivo === m.k} onClick={() => setMotivo(m.k)} style={{
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '10px 15px', borderRadius: 999, fontWeight: 700, fontSize: 15,
              background: motivo === m.k ? GRAFITO : GRIS, color: motivo === m.k ? '#fff' : GRAFITO,
            }}>{m.t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <label style={campo}><span style={{ fontSize: 12.5, color: '#737373', fontWeight: 700 }}>Desde</span>
            <input type="date" data-desde value={desde} onChange={e => { const v = e.target.value; if (!v) return; setDesde(v); if (hasta < v) setHasta(v); }} style={input} aria-label={`Desde, ${conDia(desde)}`} /></label>
          <label style={campo}><span style={{ fontSize: 12.5, color: '#737373', fontWeight: 700 }}>Hasta</span>
            <input type="date" data-hasta value={hasta} min={desde} onChange={e => e.target.value && setHasta(e.target.value)} style={input} aria-label={`Hasta, ${conDia(hasta)}`} /></label>
        </div>
        <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Algo que quieras contarle (opcional)" style={{
          width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '12px 14px', borderRadius: 16, border: 'none', background: GRIS,
          fontSize: 16, color: TEXT, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.4,
        }} />
        {estado && estado !== 'enviando' && <div role="alert" style={{ marginTop: 10, fontSize: 13.5, color: '#8A3A2C' }}>{estado}</div>}
        <button type="button" data-ausencia-enviar disabled={estado === 'enviando'} onClick={guardar} style={{
          width: '100%', marginTop: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 14, borderRadius: 999,
          background: GRAFITO, color: '#fff', fontWeight: 800, fontSize: 16, opacity: estado === 'enviando' ? 0.6 : 1,
        }}>{estado === 'enviando' ? 'Enviando…' : ausencia ? 'Guardar cambios' : 'Avisar a mi coach'}</button>
        {ausencia && (
          <button type="button" data-ausencia-quitar disabled={estado === 'enviando'} onClick={quitar} style={{
            width: '100%', marginTop: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 12, borderRadius: 999,
            background: 'transparent', color: TEXT_MUTED, fontWeight: 700, fontSize: 15,
          }}>Ya no voy a estar fuera: quitarla</button>
        )}
      </div>
    </Hoja>
  );
}
