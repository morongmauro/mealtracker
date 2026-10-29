// ─────────────────────────────────────────────────────────────────────────
// «¿NO SABES QUÉ ALMORZAR?» · la invitación al recetario en Hoy
//
// Sale solo cuando sirve: en la hora de esa comida y si todavía no la
// registró (almuerzo 11:30–14:00, cena 18:00–21:00). Trae tres recetas de
// esa comida que caben en lo que le queda del día, con su foto; al tocar una
// se abre esa receta, ya con la porción ajustada a su meta.
//
// No fastidia: «Ahora no» la esconde por el resto del día, y si la cierra 3
// veces seguidas sin abrir ninguna, no vuelve a salir en una semana.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';
import { comidaEnHora } from './DiaComidas.jsx';

const CLAVE = 'mt:invitaReceta';
const VERDE = '#2F7F45';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { return {}; } };
const guardar = (v) => { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin espacio: no pasa nada */ } };
const fechaLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const masDias = (f, n) => { const [y, m, d] = f.split('-').map(Number); return fechaLocal(new Date(y, m - 1, d + n)); };

// Qué comida toca invitar ahora (o null): por la hora y lo ya registrado.
export const comidaParaInvitar = comidaEnHora;

// ¿La escondió? Hoy para esa comida, o la semana entera tras 3 «Ahora no».
export function escondida(estado, hoy, slot) {
  if (estado.hasta && hoy < estado.hasta) return true;
  return !!(estado.cerrada && estado.cerrada[`${hoy}:${slot}`]);
}

// `dentro`: va dentro de la tarjeta de esa comida (DiaComidas, «¿Ya
// almorzaste?»): sin su propia caja ni título, con «¿Aún no?…».
export default function InvitaReceta({ entries = [], goals, consumed, alAbrir, dentro = false }) {
  const ahora = new Date();
  const hoy = fechaLocal(ahora);
  const slot = comidaParaInvitar(ahora, entries);
  const [estado, setEstado] = useState(leer);
  const [recetas, setRecetas] = useState(null);
  const visible = !!slot && !!goals && !escondida(estado, hoy, slot);
  const kcalHoy = Math.round(Number(consumed && consumed.kcal) || 0);

  // El recetario se importa al momento (va en su propio pedazo, como en el chat).
  useEffect(() => {
    if (!visible) return undefined;
    let vivo = true;
    import('./Recetario.jsx').then(m => { if (vivo) setRecetas(m.recetasQueCaben(slot, goals, consumed, 3, hoy + slot)); }).catch(() => { if (vivo) setRecetas([]); });
    return () => { vivo = false; };
  }, [visible, slot, hoy, goals && goals.kcal, goals && goals.p, kcalHoy]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || !recetas || !recetas.length) return null;

  const ahoraNo = () => {
    const seguidas = (estado.seguidas || 0) + 1;
    const nuevo = { cerrada: { [`${hoy}:${slot}`]: 1 }, seguidas: seguidas >= 3 ? 0 : seguidas, ...(seguidas >= 3 ? { hasta: masDias(hoy, 7) } : {}) };
    guardar(nuevo); setEstado(nuevo);
  };
  // Abrir una receta (o el recetario) cuenta como que le sirvió.
  const abrir = (id) => { const nuevo = { ...estado, seguidas: 0 }; guardar(nuevo); setEstado(nuevo); alAbrir && alAbrir(id, slot); };

  const cuantas = recetas.length === 1 ? 'Una' : recetas.length === 2 ? 'Dos' : 'Tres';
  return (
    <div data-invita-receta={slot} style={dentro ? { marginTop: 16 } : { marginTop: 12, background: '#FFFFFF', borderRadius: 22, padding: '16px 16px 14px', boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 8px 22px rgba(60,60,40,0.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        {dentro
          ? <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>¿Aún no? {cuantas} que {recetas.length === 1 ? 'cabe' : 'caben'} en lo que te queda</div>
          : <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: '-0.01em' }}>¿No sabes qué {slot === 'cena' ? 'cenar' : 'almorzar'}?</div>}
        <button type="button" data-invita-ahora-no onClick={ahoraNo} style={{ border: 'none', background: 'none', padding: '6px 0 6px 10px', margin: '-6px 0', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: TEXT_LIGHT, cursor: 'pointer', flex: 'none' }}>Ahora no</button>
      </div>
      {!dentro && <div style={{ fontSize: 13.5, color: TEXT_MUTED, marginTop: 3, lineHeight: 1.35 }}>
        {cuantas === 'Una' ? 'Una receta que cabe' : `${cuantas} recetas que caben`} en lo que te queda hoy. La porción ya viene ajustada a tu meta.
      </div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {recetas.map(r => (
          <button type="button" key={r.id} data-invita-abrir={r.id} onClick={() => abrir(r.id)}
            style={{ flex: '0 0 calc((100% - 20px) / 3)', minWidth: 0, border: 'none', background: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 14, overflow: 'hidden', background: '#EFE9DF' }}>
              <img src={`/recetas/plato/${r.id}.jpg`} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.3)' }} />
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, marginTop: 6, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.nombre}</div>
            <div className="num" style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 1 }}>{r.kcal} kcal · {r.tiempo}</div>
          </button>
        ))}
      </div>
      <button type="button" data-invita-recetario onClick={() => abrir(null)} style={{ border: 'none', background: 'none', padding: '8px 0 2px', marginTop: 4, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: VERDE, cursor: 'pointer' }}>Ver el recetario →</button>
    </div>
  );
}
