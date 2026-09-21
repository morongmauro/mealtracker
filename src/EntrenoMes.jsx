// ─────────────────────────────────────────────────────────────────────────
// EL MES
//
// Para ver de un golpe si está cumpliendo. Un mes dice lo que una semana no:
// que llevas tres lunes seguidos sin entrenar, o que el plan empieza el 5.
//
// LA JERARQUÍA, OTRA VEZ
// ----------------------
// En cada casilla la rutina de fuerza es un bloque OLIVA con el nombre. El
// cardio, los deportes y los eventos son PUNTOS de color, sin texto. Se ven,
// dicen que ese día pasó algo, y no compiten.
//
// El texto aparece al tocar el día, en la hoja de abajo: ahí sí caben los
// nombres, los minutos y el botón para registrar.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import { api, hoyLocal, MESES, DIAS_CORTO, fechaLarga, CATALOGO_MINIMO } from './entrenoDatos.js';
import Actividad, { ChipActividad } from './EntrenoActividad.jsx';
import { Card, Boton, Chip, Titulo, Hoja, Cargando, Fallo, Marca, MARCAS,
         ACCENT, ACCENT_DARK, ACCENT_LIGHT, SURFACE, SURFACE_2, BORDER, BORDER_SOFT,
         TEXT, TEXT_MUTED, TEXT_LIGHT } from './entrenoUI.jsx';

export default function Mes({ nombre, alEntrenar }) {
  const [ym, setYm] = useState(hoyLocal().slice(0, 7));
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);     // el día cuya hoja está abierta
  const [registrando, setRegistrando] = useState(null);
  const [catalogo, setCatalogo] = useState(null);

  const cargar = async (mes = ym) => {
    setError(null); setDatos(null);
    const r = await api.mes(nombre, mes);
    if (!r.ok) { setError(r.motivo || 'error'); return; }
    setDatos(r);
  };
  useEffect(() => { cargar(ym); /* eslint-disable-next-line */ }, [ym, nombre]);
  useEffect(() => {
    api.catalogo(nombre).then(r => setCatalogo(r.ok && r.catalogo?.length ? r.catalogo : CATALOGO_MINIMO));
  }, [nombre]);

  const mover = (delta) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // La rejilla arranca el lunes de la semana del día 1 para que el mes
  // siempre sean filas completas de siete.
  const celdas = useMemo(() => {
    if (!datos) return [];
    const dias = datos.dias;
    if (!dias.length) return [];
    const primera = new Date(dias[0].fecha + 'T00:00:00');
    const huecos = (primera.getDay() + 6) % 7;
    return [...Array.from({ length: huecos }, () => null), ...dias];
  }, [datos]);

  const [y, m] = ym.split('-').map(Number);

  return (
    <div>
      <Titulo>Tu mes</Titulo>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        margin: '10px 0 14px',
      }}>
        <button onClick={() => mover(-1)} aria-label="Mes anterior" style={flecha}>‹</button>
        <div style={{ fontWeight: 800, fontSize: 15, textTransform: 'capitalize' }}>
          {MESES[m - 1]} {y}
        </div>
        <button onClick={() => mover(1)} aria-label="Mes siguiente" style={flecha}>›</button>
      </div>

      {error && <Fallo motivo={error} alReintentar={() => cargar(ym)} />}
      {!datos && !error && <Cargando />}

      {datos && (
        <>
          {datos.fase && (
            <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginBottom: 10, textAlign: 'center' }}>
              <b>{datos.fase.nombre}</b> · {fechaLarga(datos.fase.desde)} a {fechaLarga(datos.fase.hasta)}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 5 }}>
            {DIAS_CORTO.map(d => (
              <div key={d} style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
                color: TEXT_LIGHT, textAlign: 'center',
              }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {celdas.map((d, i) => d
              ? <Celda key={d.fecha} dia={d} alTocar={() => setAbierto(d)} />
              : <div key={`h${i}`} />)}
          </div>

          <Leyenda />
        </>
      )}

      <HojaDia
        dia={abierto}
        catalogo={catalogo}
        alCerrar={() => setAbierto(null)}
        alEntrenar={(id) => { setAbierto(null); alEntrenar(id); }}
        alRegistrar={(fecha) => { setAbierto(null); setRegistrando(fecha); }}
      />

      <Actividad
        abierta={!!registrando}
        nombre={nombre}
        fecha={registrando}
        alCerrar={() => setRegistrando(null)}
        alGuardar={() => { setRegistrando(null); cargar(ym); }}
      />
    </div>
  );
}

// ── Una casilla ──────────────────────────────────────────────────────────
function Celda({ dia, alTocar }) {
  const hayRutina = !!dia.rutina;
  const marca = MARCAS[dia.estado];
  // Los puntos: uno por actividad registrada, uno por evento programado.
  // Sin texto a propósito — el nombre está al tocar.
  const puntos = [
    ...dia.actividades.map(() => ACCENT),
    ...dia.eventos.map(() => TEXT_LIGHT),
  ].slice(0, 4);

  return (
    <button onClick={alTocar} style={{
      aspectRatio: '1 / 1.15', border: `1px solid ${dia.es_hoy ? ACCENT : BORDER_SOFT}`,
      background: dia.es_hoy ? ACCENT_LIGHT : SURFACE,
      borderRadius: 11, padding: '5px 4px 4px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2,
      fontFamily: 'inherit', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
        fontSize: 11, fontWeight: 700, color: dia.es_hoy ? ACCENT_DARK : TEXT_MUTED,
      }}>
        <span>{Number(dia.fecha.slice(8))}</span>
        {marca && <span style={{ color: marca.color, fontSize: 11 }}>{marca.simbolo}</span>}
      </div>

      {/* La fuerza: un bloque sólido, lo único con peso visual */}
      {hayRutina && (
        <div style={{
          background: dia.estado === 'completada' ? ACCENT : ACCENT_PASTEL_SUAVE,
          color: dia.estado === 'completada' ? '#fff' : ACCENT_DARK,
          borderRadius: 5, fontSize: 8.5, fontWeight: 800, lineHeight: 1.25,
          padding: '2px 3px', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', textAlign: 'left',
        }}>{dia.rutina.nombre}</div>
      )}

      {/* Lo complementario: puntos, y nada más */}
      {puntos.length > 0 && (
        <div style={{ display: 'flex', gap: 2.5, marginTop: 'auto', justifyContent: 'center' }}>
          {puntos.map((c, i) => (
            <span key={i} style={{ width: 4, height: 4, borderRadius: 999, background: c, opacity: .8 }} />
          ))}
        </div>
      )}
    </button>
  );
}

const ACCENT_PASTEL_SUAVE = '#E7EBD6';

function Leyenda() {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '4px 14px',
      fontSize: 11, color: TEXT_LIGHT, marginTop: 12, alignItems: 'center',
    }}>
      <span><Marca estado="completada" /> entrenaste</span>
      <span><Marca estado="saltada" /> la saltaste</span>
      <span>
        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 999, background: ACCENT, marginRight: 4 }} />
        cardio o deporte
      </span>
      <span>
        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 999, background: TEXT_LIGHT, marginRight: 4 }} />
        lo que te puso tu coach
      </span>
    </div>
  );
}

// ── El día, al tocarlo ───────────────────────────────────────────────────
function HojaDia({ dia, catalogo, alCerrar, alEntrenar, alRegistrar }) {
  if (!dia) return null;
  const futuro = dia.fecha > hoyLocal();
  return (
    <Hoja abierta={!!dia} alCerrar={alCerrar} titulo={fechaLarga(dia.fecha)} alto="72vh">
      {dia.semana && (
        <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 12 }}>
          Semana {dia.semana} de tu plan
        </div>
      )}

      {dia.rutina ? (
        <Card onClick={() => alEntrenar(dia.rutina.id)} style={{ padding: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>{dia.rutina.nombre}</div>
              <div style={{ fontSize: 12.5, color: TEXT_LIGHT }}>
                {dia.rutina.minutos ? `Unos ${dia.rutina.minutos} min` : 'Tu rutina de fuerza'}
              </div>
            </div>
            {dia.estado && <Marca estado={dia.estado} style={{ fontSize: 17 }} />}
          </div>
          {dia.rpe && (
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 7 }}>
              Lo sentiste {dia.rpe} de 10
            </div>
          )}
        </Card>
      ) : (
        <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>
          Ese día no tienes rutina de fuerza.
        </div>
      )}

      {dia.eventos.length > 0 && (
        <>
          <Rot>Lo que te puso tu coach</Rot>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dia.eventos.map(ev => (
              <div key={ev.id} style={{
                border: `1px dashed ${BORDER}`, borderRadius: 12, padding: '9px 12px', fontSize: 13,
              }}>
                <b>{ev.hora ? `${String(ev.hora).slice(0, 5)} · ` : ''}{ev.titulo}</b>
                {ev.detalle && <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 2 }}>{ev.detalle}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {dia.actividades.length > 0 && (
        <>
          <Rot>Lo que registraste</Rot>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dia.actividades.map(a => <ChipActividad key={a.id} actividad={a} catalogo={catalogo} />)}
          </div>
        </>
      )}

      {!futuro && (
        <div style={{ marginTop: 18 }}>
          <Boton ancho variante="suave" onClick={() => alRegistrar(dia.fecha)}>
            + Registrar cardio o deporte
          </Boton>
        </div>
      )}
      {futuro && (
        <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 16, textAlign: 'center' }}>
          Podrás registrar actividad cuando llegue el día.
        </div>
      )}
    </Hoja>
  );
}

function Rot({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
      color: TEXT_LIGHT, margin: '18px 0 8px',
    }}>{children}</div>
  );
}

const flecha = {
  width: 36, height: 36, borderRadius: 999, border: `1px solid ${BORDER}`,
  background: 'transparent', color: TEXT_MUTED, fontSize: 17, cursor: 'pointer',
  fontFamily: 'inherit', lineHeight: 1,
};
