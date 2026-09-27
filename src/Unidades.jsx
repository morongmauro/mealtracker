// ─────────────────────────────────────────────────────────────────────────
// UNIDADES · una preferencia para toda la app
//
// «Si alguien configuró kg, todo en kg; si lb, todo en lb.» Se elige una vez
// (peso: kg/lb · distancia: km/m) y manda en todos los ejercicios. Cada
// ejercicio se puede seguir cambiando a mano con su botón ⇄; al cambiar la
// preferencia general, esos cambios sueltos se borran para que todo quede
// parejo.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Hoja } from './entrenoUI.jsx';
import { TEXT, TEXT_MUTED, TEXT_LIGHT, SECCION } from './theme.js';

const CLAVE = 'entreno:unidades';
const oyentes = new Set();

export function leerUnidades() {
  try {
    const u = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    return { peso: u.peso === 'lb' ? 'lb' : u.peso === 'kg' ? 'kg' : null, distancia: u.distancia === 'm' ? 'm' : 'km' };
  } catch (e) { return { peso: null, distancia: 'km' }; }
}
export function guardarUnidades(u) {
  const actual = leerUnidades();
  const nueva = { ...actual, ...u };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nueva));
    // Cambió el peso general → se olvidan los cambios por ejercicio.
    if (u.peso && u.peso !== actual.peso) {
      Object.keys(localStorage).filter(k => k.startsWith('entreno:unidad:')).forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {}
  oyentes.forEach(f => f(nueva));
  return nueva;
}
export function useUnidades() {
  const [u, setU] = useState(leerUnidades);
  React.useEffect(() => { oyentes.add(setU); return () => oyentes.delete(setU); }, []);
  return u;
}

function Opciones({ valor, opciones, alElegir, etiqueta }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: '#F2EFE8' }}>
      {opciones.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={valor === v} onClick={() => alElegir(v)} style={{
          flex: 1, height: 40, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 15, fontWeight: 700, background: valor === v ? TEXT : 'transparent', color: valor === v ? '#fff' : TEXT_MUTED,
        }}>{l}</button>
      ))}
    </div>
  );
}

export function HojaUnidades({ abierta, alCerrar }) {
  const u = useUnidades();
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Unidades" alto="60vh">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 750, color: TEXT, marginBottom: 8 }}>Peso</div>
          <Opciones etiqueta="Peso" valor={u.peso || 'kg'} opciones={[['kg', 'Kilos (kg)'], ['lb', 'Libras (lb)']]}
            alElegir={(v) => guardarUnidades({ peso: v })} />
          <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 6 }}>Todos los ejercicios pasan a esta unidad. En cada uno puedes cambiarla a mano con ⇄.</div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 750, color: TEXT, marginBottom: 8 }}>Distancia</div>
          <Opciones etiqueta="Distancia" valor={u.distancia} opciones={[['km', 'Kilómetros (km)'], ['m', 'Metros (m)']]}
            alElegir={(v) => guardarUnidades({ distancia: v })} />
          <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 6 }}>Para el cardio y los deportes que registras.</div>
        </div>
        <div style={{ fontSize: 13, color: SECCION.entreno.ink }}>Se guarda en este teléfono.</div>
      </div>
    </Hoja>
  );
}
