// ─────────────────────────────────────────────────────────────────────────
// DÍA EN META · el reconocimiento de Alimentación
//
// Sube una vez al día, en el momento en que el día entra en meta (calorías
// entre el 90 y el 110 % de la meta y proteína al 90 % o más). Es la misma
// hoja que el cierre de entreno y el de aprendizaje (Reconocimiento): el
// dato como ilustración. Versión corta casi siempre; la completa, con el
// blob y los días en meta de la semana, al quinto día en meta o en el día
// perfecto (las cuatro metas dentro del 5 %).
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import Reconocimiento from './Reconocimiento.jsx';
import { Conteo } from './Celebraciones.jsx';
import { diasEnMeta } from './aros.js';

const ORDINAL = ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo'];

export default function MetaComida({ totals, goals, history = {}, hoy, perfecto = false, alCerrar, alCalendario = null }) {
  const meta = Math.round(goals?.kcal || 0);
  const kcal = Math.round(totals?.kcal || 0);
  const metaP = Math.round(goals?.p || 0);
  const prot = Math.round(totals?.p || 0);
  const { dias, enMeta, racha } = diasEnMeta(history, goals, hoy, true);
  const grande = perfecto || enMeta >= 5;
  const puntos = dias.map(d => (d.enMeta ? 'hecho' : d.hoy ? 'hoy' : 'nada'));
  const titulo = perfecto
    ? ['Día perfecto.', 'Las cuatro metas, en rango.']
    : ['Día en meta.', enMeta >= 1 && enMeta <= 7 ? `${ORDINAL[enMeta - 1]} de la semana.` : null];
  const linea = perfecto
    ? 'Calorías, proteína, carbos y grasa dentro del 5 %. Así se construye el resultado.'
    : 'Calorías y proteína dentro de tu rango. Así se construye el resultado.';
  const chips = [
    [<Conteo valor={kcal} ms={900} />, meta ? `kcal · meta ${meta.toLocaleString('es-CO')}` : 'kcal'],
    [<><Conteo valor={prot} ms={900} /> g</>, metaP ? `proteína · ${Math.min(999, Math.round((prot / metaP) * 100))} %` : 'proteína'],
    [String(racha), racha === 1 ? 'día en meta' : 'días seguidos'],
  ];
  return (
    <Reconocimiento tema="comida" grande={grande} attrs={{ 'data-meta-comida': '', 'data-perfecto': perfecto ? '1' : undefined }}
      numero={{ valor: enMeta, sufijo: '/7', pie: 'DÍAS EN META' }} puntos={puntos}
      etiqueta="Alimentación" titulo={titulo} linea={linea} chips={chips}
      boton={{ texto: 'Seguir', onClick: alCerrar }}
      enlace={alCalendario ? { texto: 'Ver mi calendario de comidas', onClick: alCalendario } : null}
      alCerrar={alCerrar} />
  );
}
