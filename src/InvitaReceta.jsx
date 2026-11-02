// ─────────────────────────────────────────────────────────────────────────
// «¿NO SABES QUÉ ALMORZAR?» · la invitación al recetario en Hoy
//
// Siempre visible, con la comida que toca por la hora: desayuno antes de
// las 10:30, almuerzo hasta las 15:30, snack hasta las 18:00 y cena desde
// las 18:00. Si esa ya la registró, la que sigue («Para tu cena»); si ya
// registró todo, «Para mañana: desayuno». Trae tres recetas que caben en
// lo que le queda del día (si ninguna cabe, tres de esa comida), con su
// foto; al tocar una se abre esa receta, ya con la porción ajustada a su meta.
//
// No fastidia: «Ahora no» la esconde por el resto del día, y si la cierra 3
// veces seguidas sin abrir ninguna, no vuelve a salir en una semana.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';
import { momentoDe, comidaDeHora, ORDEN_DIA } from './DiaComidas.jsx';

const CLAVE = 'mt:invitaReceta';
const VERDE = '#2F7F45';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { return {}; } };
const guardar = (v) => { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin espacio: no pasa nada */ } };
const fechaLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const masDias = (f, n) => { const [y, m, d] = f.split('-').map(Number); return fechaLocal(new Date(y, m - 1, d + n)); };

// Qué comida sugerir ahora: { slot, cual } — cual: 'ahora' (la de esta
// hora), 'siguiente' (la de esta hora ya está; la que sigue) o 'manana'.
const ORDEN = ORDEN_DIA;
export function comidaParaInvitar(ahora, entries = []) {
  const deHora = comidaDeHora(ahora);
  const hecho = (k) => entries.some(e => momentoDe(e.meal) === k);
  if (!hecho(deHora)) return { slot: deHora, cual: 'ahora' };
  const sigue = ORDEN.slice(ORDEN.indexOf(deHora) + 1).find(k => !hecho(k));
  return sigue ? { slot: sigue, cual: 'siguiente' } : { slot: 'desayuno', cual: 'manana' };
}

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
  const { slot, cual } = comidaParaInvitar(ahora, entries);
  const manana = cual === 'manana';
  // «Ahora no» vale para esa comida ese día (la de mañana, por su día).
  const llaveSlot = manana ? 'manana' : slot;
  const [estado, setEstado] = useState(leer);
  const [lote, setLote] = useState(null);       // { recetas, caben }
  const visible = !!goals && !escondida(estado, hoy, llaveSlot);
  const kcalHoy = Math.round(Number(consumed && consumed.kcal) || 0);

  // El recetario se importa al momento (va en su propio pedazo, como en el chat).
  useEffect(() => {
    if (!visible) return undefined;
    let vivo = true;
    const semilla = (manana ? masDias(hoy, 1) : hoy) + slot;
    import('./Recetario.jsx').then(m => {
      if (!vivo) return;
      // Mañana empieza de cero; hoy, lo que le queda. Si nada cabe, igual tres de esa comida.
      const caben = m.recetasQueCaben(slot, goals, manana ? { kcal: 0 } : consumed, 3, semilla);
      setLote(caben.length || manana ? { recetas: caben, caben: !manana } : { recetas: m.recetasQueCaben(slot, goals, { kcal: 0 }, 3, semilla), caben: false });
    }).catch(() => { if (vivo) setLote({ recetas: [], caben: false }); });
    return () => { vivo = false; };
  }, [visible, slot, manana, hoy, goals && goals.kcal, goals && goals.p, kcalHoy]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || !lote || !lote.recetas.length) return null;
  const recetas = lote.recetas;

  const ahoraNo = () => {
    const seguidas = (estado.seguidas || 0) + 1;
    const nuevo = { cerrada: { [`${hoy}:${llaveSlot}`]: 1 }, seguidas: seguidas >= 3 ? 0 : seguidas, ...(seguidas >= 3 ? { hasta: masDias(hoy, 7) } : {}) };
    guardar(nuevo); setEstado(nuevo);
  };
  // Abrir una receta (o el recetario) cuenta como que le sirvió.
  const abrir = (id) => { const nuevo = { ...estado, seguidas: 0 }; guardar(nuevo); setEstado(nuevo); alAbrir && alAbrir(id, slot); };

  const cuantas = recetas.length === 1 ? 'Una' : recetas.length === 2 ? 'Dos' : 'Tres';
  const NOMBRE = { desayuno: 'desayuno', almuerzo: 'almuerzo', snack: 'snack', cena: 'cena' };
  const VERBO = { desayuno: '¿No sabes qué desayunar?', almuerzo: '¿No sabes qué almorzar?', snack: '¿Algo entre comidas?', cena: '¿No sabes qué cenar?' };
  const titulo = manana ? 'Para mañana: desayuno' : cual === 'siguiente' ? `Para tu ${NOMBRE[slot]}` : VERBO[slot];
  const sub = lote.caben
    ? `${cuantas === 'Una' ? 'Una receta que cabe' : `${cuantas} recetas que caben`} en lo que te queda hoy. La porción ya viene ajustada a tu meta.`
    : `${cuantas === 'Una' ? 'Una receta' : `${cuantas} recetas`} para tu ${NOMBRE[slot]}. La porción ya viene ajustada a tu meta.`;
  return (
    <div data-invita-receta={slot} style={dentro ? { marginTop: 16 } : { marginTop: 12, background: '#FFFFFF', borderRadius: 22, padding: '16px 16px 14px', boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 8px 22px rgba(60,60,40,0.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        {dentro
          ? <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>¿Aún no? {lote.caben ? `${cuantas} que ${recetas.length === 1 ? 'cabe' : 'caben'} en lo que te queda` : `${cuantas} para tu ${NOMBRE[slot]}`}</div>
          : <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: '-0.01em' }}>{titulo}</div>}
        <button type="button" data-invita-ahora-no onClick={ahoraNo} style={{ border: 'none', background: 'none', padding: '6px 0 6px 10px', margin: '-6px 0', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: TEXT_LIGHT, cursor: 'pointer', flex: 'none' }}>Ahora no</button>
      </div>
      {!dentro && <div style={{ fontSize: 13.5, color: TEXT_MUTED, marginTop: 3, lineHeight: 1.35 }}>{sub}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {recetas.map(r => (
          <button type="button" key={r.id} data-invita-abrir={r.id} onClick={() => abrir(r.id)}
            style={{ flex: '0 0 calc((100% - 20px) / 3)', minWidth: 0, border: 'none', background: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 14, overflow: 'hidden', background: '#EFE9DF' }}>
              <img src={`/recetas/plato/${r.id}.jpg`} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.3)' }} />
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, marginTop: 6, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.nombre}</div>
            <div className="num" style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 1, whiteSpace: 'nowrap' }}>{r.kcal} kcal · {r.tiempo}</div>
          </button>
        ))}
      </div>
      <button type="button" data-invita-recetario onClick={() => abrir(null)} style={{ border: 'none', background: 'none', padding: '8px 0 2px', marginTop: 4, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: VERDE, cursor: 'pointer' }}>Ver el recetario →</button>
    </div>
  );
}
