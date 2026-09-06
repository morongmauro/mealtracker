import React from 'react';
import { Dumbbell, Calendar, User } from 'lucide-react';
import {
  SURFACE, BORDER, TEXT, TEXT_MUTED, ACCENT, SHADOW_CARD,
} from './theme.js';

// ─────────────────────────────────────────────────────────────────────────
// MÓDULO DE ENTRENAMIENTO  ·  EN PRUEBA
//
// El cliente ve su calendario de entrenos, abre la rutina del día y marca
// reps y pesos. Las rutinas las arma el coach desde el CRM.
//
// Vive DENTRO de esta app, no en un sitio aparte. La primera versión del
// módulo (repo entrenamientoecm) se pensó como una app suelta que se
// embebía en un iframe, y por eso cargaba con dos cosas que aquí sobran:
// tenía que resolver su propia identidad leyendo ?mt_user= y ?mt_name= de
// la URL, y tenía que estar desplegada en su propio dominio para que la app
// tuviera un link al que apuntar. Adentro no hace falta ninguna de las dos:
// el nombre y el id del cliente llegan por props, y para publicar un cambio
// se sube este archivo como cualquier otro.
//
// Lo que sí se conserva del contrato original es el espacio de arriba y de
// abajo: la app pinta degradados sobre esta vista y su barra ovalada tapa
// los últimos ~96px. Sin ese aire, el contenido de los extremos se lee a
// medias. Y nada fijo abajo, por la misma razón.
//
// Estado: cascarón. El calendario y la ejecución se montan encima de esto.
// ─────────────────────────────────────────────────────────────────────────

const FADE_TOP = 46;
const FADE_BOTTOM = 96;

export default function Entrenamiento({ name, userId }) {
  const primerNombre = name ? String(name).split(' ')[0] : '';

  return (
    <div style={{
      position: 'relative',
      maxWidth: 560, margin: '0 auto', padding: '0 20px',
      paddingTop: `calc(${FADE_TOP}px + env(safe-area-inset-top, 0px) + 12px)`,
      paddingBottom: `calc(${FADE_BOTTOM}px + env(safe-area-inset-bottom, 0px))`,
    }}>
      <Tarjeta>
        <Fila icono={<User size={18} color={ACCENT} />} titulo={name || 'Cliente'} />
        <p style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.55, margin: 0 }}>
          {primerNombre ? `${primerNombre}, esta` : 'Esta'} es la sección de entrenamiento.
          Está en construcción: por ahora solo se ve la estructura, todavía no
          trae tus rutinas.
        </p>
      </Tarjeta>

      <Tarjeta>
        <Fila icono={<Calendar size={18} color={ACCENT} />} titulo="Tu calendario" />
        <Vacio texto="Aún no hay fases asignadas. Cuando el coach cargue tu primera fase desde el CRM, aquí aparecen tus días de entreno." />
      </Tarjeta>

      <Tarjeta>
        <Fila icono={<Dumbbell size={18} color={ACCENT} />} titulo="Rutina de hoy" />
        <Vacio texto="Nada programado para hoy." />
      </Tarjeta>

      {/* Solo mientras el módulo esté en prueba: confirma de un vistazo que
          la identidad llegó bien desde la app, que es lo único que este
          cascarón puede verificar todavía. Se quita cuando haya datos. */}
      <div style={{
        marginTop: 4, padding: '10px 12px', borderRadius: 10,
        border: `1px dashed ${BORDER}`, fontSize: 11, color: TEXT_MUTED, lineHeight: 1.6,
      }}>
        <strong style={{ color: TEXT }}>Módulo en prueba.</strong> Solo tú lo ves.
        <br />
        Identidad recibida: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {name || '(sin nombre)'}
        </span>
        {userId ? ' · id ok' : ' · sin id'}
      </div>
    </div>
  );
}

const Tarjeta = ({ children }) => (
  <div style={{
    background: SURFACE, borderRadius: 16, padding: 16,
    boxShadow: SHADOW_CARD, marginBottom: 14,
  }}>{children}</div>
);

const Fila = ({ icono, titulo }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
    {icono}
    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: TEXT }}>{titulo}</div>
  </div>
);

const Vacio = ({ texto }) => (
  <p style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.55, margin: 0 }}>{texto}</p>
);
