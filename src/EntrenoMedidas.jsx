// ─────────────────────────────────────────────────────────────────────────
// MIS MEDIDAS · peso y % de grasa
//
// En Trainerize era «Body Stats» y los clientes lo usaban cada mes: sin esto
// la migración les quitaba algo. Las fotos NO van aquí a propósito (por ahora
// llegan por WhatsApp).
//
// Lo que se registra llega al CRM (Composición, con su gráfica) y al coach
// como alerta. Nunca cambia la meta sola: eso lo decide el coach.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useCallback } from 'react';
import { api, hoyLocal, fechaLarga, numero } from './entrenoDatos.js';
import { Card, Boton, Hoja, Seccion, TEXT, TEXT_MUTED, TEXT_LIGHT, BORDER, SURFACE, ACCENT_DARK } from './entrenoUI.jsx';

const MOTIVOS = {
  vacia: 'Escribe al menos el peso o el % de grasa.',
  peso_fuera_de_rango: 'Ese peso no parece correcto. Revísalo (en kg).',
  grasa_fuera_de_rango: 'Ese % de grasa no parece correcto. Revísalo.',
  fecha_futura: 'La fecha no puede ser en el futuro.',
  sin_red: 'Sin conexión. Inténtalo cuando tengas señal.',
};

export function MisMedidas({ nombre }) {
  const [lista, setLista] = useState(null);
  const [abierta, setAbierta] = useState(false);
  const cargar = useCallback(async () => {
    const r = await api.medidas(nombre);
    setLista(r && r.ok ? r.medidas : []);
  }, [nombre]);
  useEffect(() => { cargar(); }, [cargar]);

  const [ultima, anterior] = lista || [];
  const dif = (a, b) => (a != null && b != null ? Number(a) - Number(b) : null);
  const dPeso = ultima && anterior ? dif(ultima.peso, anterior.peso) : null;
  const dGrasa = ultima && anterior ? dif(ultima.grasa_pct, anterior.grasa_pct) : null;
  const es = (n) => Number(n).toLocaleString('es', { maximumFractionDigits: 1 });
  const signo = (n) => (n > 0 ? '+' : '') + es(Number(n.toFixed(1)));

  return (
    <>
      <Seccion accion={
        <button onClick={() => setAbierta(true)} style={enlace}>+ Registrar</button>
      }>Mis medidas</Seccion>
      <Card>
        {!lista ? (
          <div style={{ fontSize: 13, color: TEXT_LIGHT }}>Cargando…</div>
        ) : !ultima ? (
          <div>
            <div style={{ fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.5 }}>
              Registra tu peso y tu % de grasa cuando te toque medirte. Tu coach lo recibe al instante.
            </div>
            <Boton chico variante="suave" style={{ marginTop: 12 }} onClick={() => setAbierta(true)}>Registrar mi medida</Boton>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 22, alignItems: 'baseline', flexWrap: 'wrap' }}>
              {ultima.peso != null && (
                <Dato valor={`${es(ultima.peso)} kg`} pie={dPeso != null ? `${signo(dPeso)} kg` : 'peso'} />
              )}
              {ultima.grasa_pct != null && (
                <Dato valor={`${es(ultima.grasa_pct)}%`} pie={dGrasa != null ? `${signo(dGrasa)} pts` : 'grasa'} />
              )}
            </div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 8 }}>
              Última: {fechaLarga(ultima.fecha)}{anterior ? ` · antes: ${fechaLarga(anterior.fecha)}` : ''}
            </div>
          </div>
        )}
      </Card>
      <HojaMedida abierta={abierta} nombre={nombre} alCerrar={() => setAbierta(false)}
        alGuardar={() => { setAbierta(false); cargar(); }} />
    </>
  );
}

function Dato({ valor, pie }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: TEXT, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3 }}>{pie}</div>
    </div>
  );
}

export function HojaMedida({ abierta, nombre, alCerrar, alGuardar }) {
  const [peso, setPeso] = useState('');
  const [grasa, setGrasa] = useState('');
  const [fecha, setFecha] = useState(hoyLocal());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [hecho, setHecho] = useState(false);

  useEffect(() => { if (abierta) { setPeso(''); setGrasa(''); setFecha(hoyLocal()); setError(null); setHecho(false); } }, [abierta]);

  const guardar = async () => {
    setError(null);
    const p = numero(peso), g = numero(grasa);
    if (p == null && g == null) { setError(MOTIVOS.vacia); return; }
    setGuardando(true);
    const r = await api.medida(nombre, { peso: p, grasa_pct: g, fecha });
    setGuardando(false);
    if (!r || !r.ok) { setError(MOTIVOS[r && r.motivo] || 'No se pudo guardar. Inténtalo otra vez.'); return; }
    setHecho(true);
    setTimeout(() => alGuardar && alGuardar(), 900);
  };

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Registrar mi medida" alto="80vh">
      <div style={{ display: 'flex', gap: 12 }}>
        <Campo etiqueta="Peso (kg)" valor={peso} cambiar={setPeso} placeholder="72,5" />
        <Campo etiqueta="% de grasa" valor={grasa} cambiar={setGrasa} placeholder="18" opcional />
      </div>
      <label style={{ display: 'block', marginTop: 14, fontSize: 12.5, fontWeight: 700, color: TEXT_MUTED }}>
        Fecha
        <input type="date" value={fecha} max={hoyLocal()} onChange={e => setFecha(e.target.value)}
          style={{ ...campo, marginTop: 6, textAlign: 'left' }} />
      </label>
      <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 10, lineHeight: 1.5 }}>
        Mídete en las mismas condiciones cada vez: en ayunas y después de ir al baño. Si prefieres, mándale el pantallazo a tu coach por WhatsApp.
      </div>
      {error && <div role="alert" style={{ marginTop: 12, fontSize: 13, color: '#8A3A2C' }}>{error}</div>}
      <Boton ancho variante="principal" style={{ marginTop: 16 }} disabled={guardando || hecho} onClick={guardar}>
        {hecho ? 'Enviado a tu coach ✓' : guardando ? 'Guardando…' : 'Guardar y enviar a mi coach'}
      </Boton>
    </Hoja>
  );
}

function Campo({ etiqueta, valor, cambiar, placeholder, opcional }) {
  return (
    <label style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: TEXT_MUTED }}>
      {etiqueta}{opcional && <span style={{ fontWeight: 500, color: TEXT_LIGHT }}> · opcional</span>}
      <input inputMode="decimal" value={valor} placeholder={placeholder}
        onChange={e => cambiar(e.target.value)} style={{ ...campo, marginTop: 6 }} />
    </label>
  );
}

const campo = {
  width: '100%', padding: '12px 12px', borderRadius: 12, border: `1px solid ${BORDER}`,
  background: SURFACE, fontSize: 17, fontWeight: 700, color: TEXT, textAlign: 'center',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const enlace = {
  border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
  fontSize: 12.5, fontWeight: 700, color: ACCENT_DARK, fontFamily: 'inherit',
};
