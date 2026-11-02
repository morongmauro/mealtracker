// ─────────────────────────────────────────────────────────────────────────
// MI CICLO · registro del ciclo menstrual (opcional y privado)
//
// · Se activa en Configuración › «Mi ciclo» (HojaMiCiclo).
// · Activado: en el Dash sale «¿Cómo te sientes hoy?» hasta que registra el
//   día (TarjetaCiclo): período sí/no, energía y molestias, 10 segundos.
// · En el calendario del mes: los días de período en rosa suave y un punto
//   los días de energía baja (EntrenoMes › CeldaCal, con useMiCiclo).
// No cambia la rutina sola. Lo ven ella y su coach. Datos: api/_ciclo.js.
// Por ahora a prueba (vistaApp.js › cicloPrueba).
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { api, hoyLocal, sumarDias } from './entrenoDatos.js';
import { Hoja, TEXT, TEXT_MUTED } from './entrenoUI.jsx';
import { enVerComo } from './verComo.js';
import { cicloPrueba } from './vistaApp.js';

export const ROSA = '#D9779A';
export const ROSA_SUAVE = '#FBE7EE';
const ROSA_TINTA = '#8E3A5C';
const GRAFITO = '#1F1F1F';
const GRIS = '#F2F1EC';
const SOMBRA = '0 1px 2px rgba(40,40,30,.04), 0 8px 22px rgba(60,60,40,.06)';
export const MOLESTIAS = [
  { k: 'colicos', t: 'Cólicos' }, { k: 'lumbar', t: 'Dolor lumbar' }, { k: 'hinchazon', t: 'Hinchazón' },
  { k: 'cabeza', t: 'Dolor de cabeza' }, { k: 'durmio_mal', t: 'Dormí mal' },
];
const ENERGIAS = [{ k: 'baja', t: 'Baja' }, { k: 'normal', t: 'Normal' }, { k: 'alta', t: 'Alta' }];

// ── El estado compartido (Dash, Configuración y calendario lo leen igual) ──
let estado = { cargado: false, ok: true, activo: false, registros: {}, motivo: null };
const oyentes = new Set();
const avisar = () => oyentes.forEach(f => f({ ...estado }));
let pidiendo = null;
export function cargarCiclo(name, forzar = false) {
  if (!name || !cicloPrueba()) return Promise.resolve(estado);
  if (pidiendo && !forzar) return pidiendo;
  const hoy = hoyLocal();
  pidiendo = api.ciclo(name, sumarDias(hoy, -150), hoy).then(r => {
    const registros = {};
    ((r && r.registros) || []).forEach(x => { registros[x.fecha] = x; });
    estado = { cargado: true, ok: !!(r && r.ok), activo: !!(r && r.activo), registros, motivo: r && r.motivo };
    avisar();
    return estado;
  }).catch(() => { estado = { ...estado, cargado: true, ok: false }; avisar(); return estado; }).finally(() => { pidiendo = null; });
  return pidiendo;
}
export function useMiCiclo(name) {
  const [e, setE] = useState(estado);
  useEffect(() => {
    oyentes.add(setE);
    if (!estado.cargado) cargarCiclo(name);
    return () => { oyentes.delete(setE); };
  }, [name]);
  return e;
}

const errorTexto = (m) => ({
  sin_tabla: 'Esto aún no está listo. Avísale a tu coach.',
  futuro: 'No se puede registrar un día que no ha llegado.',
}[m] || 'No se guardó. Inténtalo en un momento.');

// ── Configuración › Mi ciclo ──
export function HojaMiCiclo({ abierta, alCerrar, name, Interruptor }) {
  const c = useMiCiclo(name);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const cambiar = async (v) => {
    setEnviando(true); setError(null);
    const r = await api.cicloActivar(name, v).catch(() => null);
    setEnviando(false);
    if (r && r.ok) { estado = { ...estado, activo: v }; avisar(); }
    else setError(errorTexto(r && r.motivo));
  };
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Configuración · Mi ciclo" alto="72vh" tono="dash">
      <div data-hoja-ciclo>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: SOMBRA, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, color: TEXT }}>Registrar mi ciclo</span>
            <span style={{ display: 'block', fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>{c.activo ? 'Activado' : 'Apagado'}</span>
          </span>
          <span style={{ opacity: enviando ? 0.5 : 1 }}><Interruptor id="ciclo" etiqueta="Registrar mi ciclo" encendido={c.activo} alCambiar={enviando ? () => {} : cambiar} /></span>
        </div>
        {error && <div role="alert" style={{ marginTop: 10, fontSize: 13.5, color: '#8A3A2C' }}>{error}</div>}
        <div style={{ fontSize: 14.5, color: '#55565B', lineHeight: 1.5, marginTop: 14 }}>
          <p style={{ margin: '0 0 8px' }}>Cada día que quieras, en 10 segundos: si tienes el período, cómo está tu energía y si tienes alguna molestia.</p>
          <p style={{ margin: '0 0 8px' }}>Lo ves en tu calendario y le sirve a tu coach para entender tus semanas y ajustar contigo. No cambia tu rutina sola.</p>
          <p style={{ margin: 0 }}>Solo lo ven tú y tu coach. Puedes apagarlo cuando quieras.</p>
        </div>
      </div>
    </Hoja>
  );
}

// ── Dash · «¿Cómo te sientes hoy?» ──
export function TarjetaCiclo({ name }) {
  const c = useMiCiclo(name);
  const hoy = hoyLocal();
  const ya = c.registros[hoy];
  const [periodo, setPeriodo] = useState(false);
  const [energia, setEnergia] = useState(null);
  const [molestias, setMolestias] = useState([]);
  const [envio, setEnvio] = useState(null);   // null | 'enviando' | 'ok' | texto de error
  if (!cicloPrueba() || enVerComo() || !c.activo || (ya && envio !== 'ok')) return null;
  const tocar = (k) => setMolestias(m => m.includes(k) ? m.filter(x => x !== k) : [...m.filter(x => x !== 'ninguna'), k]);
  const guardar = async () => {
    setEnvio('enviando');
    const r = await api.cicloGuardar(name, { fecha: hoy, periodo, energia, molestias }).catch(() => null);
    if (r && r.ok) {
      setEnvio('ok');
      setTimeout(() => { estado = { ...estado, registros: { ...estado.registros, [hoy]: r.registro } }; avisar(); }, 1600);
      return;
    }
    setEnvio(errorTexto(r && r.motivo));
  };
  const chip = (on, extra = {}) => ({ border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '8px 12px', borderRadius: 999, fontWeight: 700, fontSize: 13.5,
    background: on ? ROSA_SUAVE : GRIS, color: on ? ROSA_TINTA : GRAFITO, ...extra });
  return (
    <section data-tarjeta-ciclo style={{ background: '#fff', borderRadius: 24, padding: '16px 16px 14px', margin: '14px 0 4px', boxShadow: SOMBRA }}>
      {envio === 'ok' ? (
        <div data-ciclo-ok style={{ textAlign: 'center', padding: '10px 0', fontWeight: 800, fontSize: 18, color: TEXT }}>Guardado. Gracias.</div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: ROSA_TINTA }}>Mi ciclo · hoy</div>
          <div style={{ fontWeight: 800, fontSize: 21, color: TEXT, letterSpacing: '-.02em', marginTop: 2 }}>¿Cómo te sientes hoy?</div>
          <button type="button" data-ciclo-periodo role="switch" aria-checked={periodo} onClick={() => setPeriodo(v => !v)} style={{
            width: '100%', marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            padding: '11px 12px', borderRadius: 16, background: periodo ? ROSA_SUAVE : GRIS, color: periodo ? ROSA_TINTA : GRAFITO, fontWeight: 700, fontSize: 14.5,
          }}>
            Hoy tengo el período
            <span style={{ width: 44, height: 26, borderRadius: 999, background: periodo ? ROSA : '#D9D6CE', position: 'relative', flex: 'none', transition: 'background .18s' }}>
              <span style={{ position: 'absolute', top: 3, left: periodo ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: '#fff', transition: 'left .18s' }} />
            </span>
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: '14px 2px 6px' }}>Energía</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ENERGIAS.map(x => (
              <button key={x.k} type="button" data-ciclo-energia={x.k} aria-pressed={energia === x.k} onClick={() => setEnergia(x.k)} style={{
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '10px 4px', borderRadius: 14, fontWeight: 700, fontSize: 14,
                background: energia === x.k ? GRAFITO : GRIS, color: energia === x.k ? '#fff' : GRAFITO,
              }}>{x.t}</button>
            ))}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: '14px 2px 6px' }}>Molestias</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MOLESTIAS.map(x => <button key={x.k} type="button" data-ciclo-molestia={x.k} aria-pressed={molestias.includes(x.k)} onClick={() => tocar(x.k)} style={chip(molestias.includes(x.k))}>{x.t}</button>)}
            <button type="button" data-ciclo-molestia="ninguna" aria-pressed={molestias.length === 0} onClick={() => setMolestias([])} style={chip(molestias.length === 0, molestias.length === 0 ? { background: GRAFITO, color: '#fff' } : {})}>Ninguna</button>
          </div>
          {envio && envio !== 'enviando' && <div role="alert" style={{ marginTop: 10, fontSize: 13.5, color: '#8A3A2C' }}>{envio}</div>}
          <button type="button" data-ciclo-guardar disabled={!energia || envio === 'enviando'} onClick={guardar} style={{
            width: '100%', marginTop: 14, border: 'none', cursor: energia ? 'pointer' : 'default', fontFamily: 'inherit', padding: 13, borderRadius: 999,
            background: GRAFITO, color: '#fff', fontWeight: 800, fontSize: 15.5, opacity: energia ? 1 : 0.35,
          }}>{envio === 'enviando' ? 'Guardando…' : 'Guardar'}</button>
          <div style={{ fontSize: 12, color: '#8A8F98', textAlign: 'center', marginTop: 8 }}>Solo lo ven tú y tu coach</div>
        </>
      )}
    </section>
  );
}
