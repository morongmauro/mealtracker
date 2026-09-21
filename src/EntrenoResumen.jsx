// ─────────────────────────────────────────────────────────────────────────
// RESUMEN DE LA SEMANA · entrenamiento y alimentación
//
// Las dos mitades del trabajo, juntas. Están separadas en la app —el
// mealtracker lleva la comida, este módulo el entreno— y esa separación es
// correcta para registrar, pero terrible para saber cómo va la semana: hay
// que mirar en dos sitios y sumar de cabeza.
//
// NO SE PONE NOTA. Ni semáforos, ni "vas mal". Se enseñan los números y se
// deja que la persona saque su conclusión: quien entrenó dos de cuatro días
// ya lo sabe, y que la app se lo remarque en rojo no le hace entrenar más.
// La única excepción es celebrar lo cumplido, que sí empuja.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { api, fechaLarga, CATALOGO_MINIMO } from './entrenoDatos.js';
import { Card, Chip, Titulo, Seccion, Cargando, Fallo, Barra,
         ACCENT, ACCENT_DARK, ACCENT_LIGHT, SURFACE_2, BORDER_SOFT,
         TEXT, TEXT_MUTED, TEXT_LIGHT, SUCCESS } from './entrenoUI.jsx';

export default function Resumen({ nombre }) {
  const [datos, setDatos] = useState(null);
  const [catalogo, setCatalogo] = useState(CATALOGO_MINIMO);
  const [error, setError] = useState(null);

  const cargar = async () => {
    setError(null);
    const r = await api.resumen(nombre);
    if (!r.ok) { setError(r.motivo || 'error'); return; }
    setDatos(r);
  };
  useEffect(() => {
    cargar();
    api.catalogo(nombre).then(r => { if (r.ok && r.catalogo?.length) setCatalogo(r.catalogo); });
    /* eslint-disable-next-line */
  }, [nombre]);

  if (error) return <Fallo motivo={error} alReintentar={cargar} />;
  if (!datos) return <Cargando />;

  const { entreno, complementaria, alimentacion, semana } = datos;
  const cumplio = entreno.planeados > 0 && entreno.hechos >= entreno.planeados;

  return (
    <div>
      <Titulo>Tu semana</Titulo>
      <div style={{ color: TEXT_MUTED, fontSize: 13.5 }}>
        {fechaLarga(semana.desde)} a {fechaLarga(semana.hasta)}
      </div>

      {/* ── Entrenamiento ── */}
      <Seccion>Entrenamiento</Seccion>
      <Card>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, color: cumplio ? ACCENT : TEXT }}>
            {entreno.hechos}
          </div>
          <div style={{ fontSize: 14, color: TEXT_MUTED }}>
            de {entreno.planeados || '—'} día{entreno.planeados === 1 ? '' : 's'}
          </div>
          {cumplio && <Chip tono="ok" style={{ marginLeft: 'auto' }}>Semana cumplida</Chip>}
        </div>

        {entreno.planeados > 0 && (
          <Barra valor={entreno.hechos} total={entreno.planeados} tono={cumplio ? SUCCESS : ACCENT} />
        )}

        <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
          {entreno.minutos > 0 && <Dato valor={entreno.minutos} unidad="min entrenando" />}
          {entreno.rpe_promedio != null && <Dato valor={entreno.rpe_promedio} unidad="esfuerzo medio" />}
          {entreno.saltados > 0 && <Dato valor={entreno.saltados} unidad="días saltados" />}
        </div>

        {entreno.fase && (
          <div style={{
            marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER_SOFT}`,
            fontSize: 12.5, color: TEXT_LIGHT,
          }}>
            <b style={{ color: TEXT_MUTED }}>{entreno.fase.nombre}</b>
            {entreno.fase.semana_actual
              ? ` · semana ${entreno.fase.semana_actual} de ${entreno.fase.semanas}`
              : ''}
          </div>
        )}

        {entreno.en_curso > 0 && (
          <div style={{ fontSize: 12.5, color: '#B8732B', marginTop: 8 }}>
            Tienes {entreno.en_curso} entrenamiento sin cerrar. Ábrelo y dale a “Terminar”.
          </div>
        )}
      </Card>

      {/* ── Actividad complementaria ── */}
      <Seccion>Además de la fuerza</Seccion>
      {complementaria.veces > 0 ? (
        <Card>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Dato valor={complementaria.veces} unidad={complementaria.veces === 1 ? 'vez' : 'veces'} />
            {complementaria.minutos > 0 && <Dato valor={complementaria.minutos} unidad="minutos" />}
            {complementaria.km > 0 && <Dato valor={complementaria.km} unidad="km" />}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
            {complementaria.tipos.map(t => {
              const c = catalogo.find(x => x.slug === t);
              return <Chip key={t} tono="suave">{c ? `${c.icono} ${c.nombre}` : t}</Chip>;
            })}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 15 }}>
          <div style={{ fontSize: 13.5, color: TEXT_LIGHT, lineHeight: 1.55 }}>
            Esta semana no has registrado cardio ni deportes. Si te has movido,
            márcalo en <b>Hoy</b> — cuenta igual.
          </div>
        </Card>
      )}

      {/* ── Alimentación ── */}
      <Seccion>Alimentación</Seccion>
      {alimentacion == null ? (
        <Card style={{ padding: 15 }}>
          <div style={{ fontSize: 13.5, color: TEXT_LIGHT, lineHeight: 1.55 }}>
            No pude leer tu registro de comidas ahora mismo. Míralo en la pantalla de alimentación.
          </div>
        </Card>
      ) : alimentacion.dias === 0 ? (
        <Card style={{ padding: 15 }}>
          <div style={{ fontSize: 13.5, color: TEXT_LIGHT, lineHeight: 1.55 }}>
            Esta semana no has registrado comidas todavía.
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 12 }}>
            Promedio de los <b>{alimentacion.dias}</b> día{alimentacion.dias === 1 ? '' : 's'} que registraste
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Dato valor={alimentacion.kcal} unidad="kcal al día"
                  meta={alimentacion.meta_kcal} />
            <Dato valor={alimentacion.proteina} unidad="g de proteína"
                  meta={alimentacion.meta_proteina} />
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
            <Dato valor={alimentacion.carbos} unidad="g carbos" chico />
            <Dato valor={alimentacion.grasas} unidad="g grasas" chico />
          </div>
          {alimentacion.dias < 5 && (
            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 12, lineHeight: 1.5 }}>
              Con {alimentacion.dias} día{alimentacion.dias === 1 ? '' : 's'} el promedio todavía dice poco.
              A partir de cinco empieza a ser una foto de tu semana.
            </div>
          )}
        </Card>
      )}

      <div style={{ fontSize: 12, color: TEXT_LIGHT, textAlign: 'center', margin: '20px 0 0', lineHeight: 1.6 }}>
        Los números de arriba son los mismos que ve tu coach.
      </div>
    </div>
  );
}

function Dato({ valor, unidad, meta, chico }) {
  if (valor == null) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: chico ? 18 : 22, fontWeight: 800, lineHeight: 1.1, color: TEXT }}>
          {valor}
        </span>
        {meta ? <span style={{ fontSize: 12, color: TEXT_LIGHT }}>/ {meta}</span> : null}
      </div>
      <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 2 }}>{unidad}</div>
    </div>
  );
}
