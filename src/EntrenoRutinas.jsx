// ─────────────────────────────────────────────────────────────────────────
// TUS RUTINAS · vista informativa
//
// Todas las rutinas del plan, para MIRARLAS. No para ejecutarlas: eso se
// hace desde Hoy, el día que toca.
//
// Existe porque la pregunta "¿qué tengo esta fase?" no se responde en la
// pantalla de hoy — ahí solo está lo de hoy. Y mirar el plan completo es
// justo lo que la gente hace el domingo por la noche.
//
// De cada rutina se dice qué músculos trabaja, sacados de sus ejercicios.
// Es lo que distingue "Día A" de "Día B" cuando el coach no les puso nombres
// descriptivos.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { api, DIAS_LARGO, fechaLarga } from './entrenoDatos.js';
import { MUSCULO_POR_SLUG } from './musculos.js';
import { Card, Chip, Titulo, Cargando, Fallo, Vacio, Boton,
         ACCENT_DARK, BORDER_SOFT, TEXT, TEXT_MUTED, TEXT_LIGHT } from './entrenoUI.jsx';

export default function Rutinas({ nombre, alEntrenar }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  const cargar = async () => {
    setError(null);
    const r = await api.rutinas(nombre);
    if (!r.ok) { setError(r.motivo || 'error'); return; }
    setDatos(r);
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [nombre]);

  if (error) return <Fallo motivo={error} alReintentar={cargar} />;
  if (!datos) return <Cargando />;

  if (!datos.fase || !datos.rutinas.length) {
    return (
      <div>
        <Titulo>Tus rutinas</Titulo>
        <div style={{ marginTop: 14 }}>
          <Vacio
            icono="📋"
            titulo="Aún no hay rutinas"
            texto="Cuando tu coach te envíe el plan, lo verás completo aquí."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Titulo>Tus rutinas</Titulo>
      <div style={{ color: TEXT_MUTED, fontSize: 13.5 }}>{datos.fase.nombre}</div>
      {datos.fase.desde && (
        <div style={{ color: TEXT_LIGHT, fontSize: 12.5, marginTop: 2 }}>
          {fechaLarga(datos.fase.desde)} a {fechaLarga(datos.fase.hasta)} · {datos.fase.semanas} semanas
        </div>
      )}
      {datos.fase.objetivo && (
        <Card style={{ marginTop: 14, padding: 14, background: '#F1F3E5', border: 'none' }}>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
            color: ACCENT_DARK, marginBottom: 4, opacity: .8,
          }}>El objetivo de esta fase</div>
          <div style={{ fontSize: 14, color: ACCENT_DARK, lineHeight: 1.5 }}>{datos.fase.objetivo}</div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {datos.rutinas.map(r => (
          <Card key={r.id} onClick={() => alEntrenar(r.id)} style={{ padding: 15 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5, flex: 1, minWidth: 0 }}>{r.nombre}</div>
              {r.dia && <Chip tono="marca">{DIAS_LARGO[r.dia]}</Chip>}
            </div>

            <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginBottom: 8 }}>
              {r.ejercicios} ejercicio{r.ejercicios === 1 ? '' : 's'}
              {r.minutos ? ` · unos ${r.minutos} min` : ''}
            </div>

            {r.descripcion && (
              <p style={{ fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.55, margin: '0 0 9px' }}>
                {r.descripcion}
              </p>
            )}

            {r.musculos?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 9, borderTop: `1px solid ${BORDER_SOFT}` }}>
                {r.musculos.map(s => {
                  const m = MUSCULO_POR_SLUG[s];
                  return m ? <Chip key={s} tono="suave">{m.corto}</Chip> : null;
                })}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div style={{ fontSize: 12, color: TEXT_LIGHT, textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
        Toca cualquiera para ver sus ejercicios.<br />
        Para entrenar, entra desde <b>Hoy</b> el día que te toque.
      </div>
    </div>
  );
}
