// ─────────────────────────────────────────────────────────────────────────
// ENCUESTA DE LA APP · una sola vez por cliente
//
// Desde su segunda semana (el servidor decide si le toca: api/training,
// accion 'encuesta'), al abrir la app: qué tan útil, qué tan fácil, qué tan
// agradable se ve (1 a 5) y si la recomendaría (0 a 10, el NPS). Si ya la
// respondió, no vuelve a salir. «Ahora no» la guarda para la semana
// siguiente (la clave es el lunes de esta semana).
// ─────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { ChatCircleText } from '@phosphor-icons/react';
import VentanaMarca, { BotonVentana, Color, GRAFITO } from './VentanaMarca.jsx';
import { api } from './entrenoDatos.js';
import { posponerEncuesta } from './encuestaLuego.js';

const PREGUNTAS = [
  { k: 'util', t: '¿Qué tan útil te resulta la app?', min: 1, max: 5, de: 'Nada útil', a: 'Muy útil' },
  { k: 'facil', t: '¿Qué tan fácil es de usar?', min: 1, max: 5, de: 'Muy difícil', a: 'Muy fácil' },
  { k: 'agradable', t: '¿Qué tan agradable te parece cómo se ve?', min: 1, max: 5, de: 'Nada agradable', a: 'Muy agradable' },
  { k: 'recomienda', t: 'Del 0 al 10, ¿le recomendarías la app a un amigo?', min: 0, max: 10, de: 'Nada probable', a: 'Muy probable' },
];

function Escala({ p, valor, alElegir }) {
  const n = p.max - p.min + 1;
  return (
    <div data-encuesta-pregunta={p.k} style={{ marginTop: 16, textAlign: 'left' }}>
      <div style={{ fontSize: 15.5, fontWeight: 650, lineHeight: 1.3, marginBottom: 8 }}>{p.t}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: n > 5 ? 3 : 6 }}>
        {Array.from({ length: n }, (_, i) => p.min + i).map(v => (
          <button key={v} type="button" aria-pressed={valor === v} data-valor={v} onClick={() => alElegir(v)} style={{
            height: n > 5 ? 36 : 42, borderRadius: n > 5 ? 10 : 14, border: 0, cursor: 'pointer', padding: 0,
            background: valor === v ? GRAFITO : 'rgba(255,255,255,0.85)', color: valor === v ? '#fff' : GRAFITO,
            fontFamily: 'inherit', fontSize: n > 5 ? 13.5 : 15.5, fontWeight: 650,
          }}>{v}</button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#7A7A80', marginTop: 4 }}><span>{p.de}</span><span>{p.a}</span></div>
    </div>
  );
}

export default function EncuestaApp({ nombre, alCerrar }) {
  const [r, setR] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [gracias, setGracias] = useState(false);
  const [error, setError] = useState('');
  const completa = PREGUNTAS.every(p => r[p.k] != null);
  const primer = String(nombre || '').trim().split(/\s+/)[0] || '';
  const enviar = async () => {
    if (!completa || enviando) return;
    setEnviando(true); setError('');
    const res = await api.encuestaResponder(nombre, r).catch(() => null);
    setEnviando(false);
    if (res && res.ok) setGracias(true);
    else setError('No pude enviarla. Revisa tu conexión e inténtalo de nuevo.');
  };
  if (gracias) {
    return (
      <VentanaMarca data-encuesta-app="gracias" simbolo={<ChatCircleText size={28} weight="fill" color="#2F6CC4" />}
        titulo={<>¡Gracias{primer ? `, ${primer}` : ''}!</>}
        texto="Tu opinión me ayuda a mejorar la app para ti.">
        <BotonVentana onClick={alCerrar} data-encuesta-cerrar>Listo</BotonVentana>
      </VentanaMarca>
    );
  }
  return (
    <VentanaMarca data-encuesta-app sinIcono simbolo={<ChatCircleText size={28} weight="fill" color="#2F6CC4" />}
      titulo={<>¿Cómo te va<br /><Color c="azul">con la app{primer ? `, ${primer}` : ''}?</Color></>}
      texto="Son 4 preguntas rápidas y solo te las hago una vez.">
      {PREGUNTAS.map(p => <Escala key={p.k} p={p} valor={r[p.k]} alElegir={(v) => setR(x => ({ ...x, [p.k]: v }))} />)}
      {error && <div style={{ marginTop: 12, fontSize: 13.5, color: '#A3301B', textAlign: 'center' }}>{error}</div>}
      {/* Hasta responder las 4 se ve apagado (y no envía). */}
      <div style={{ opacity: completa ? 1 : 0.4, transition: 'opacity .2s' }}><BotonVentana onClick={enviar} cargando={enviando} data-encuesta-enviar aria-disabled={!completa}>Enviar</BotonVentana></div>
      <BotonVentana secundario onClick={() => { posponerEncuesta(); alCerrar && alCerrar(); }} data-encuesta-luego>Ahora no</BotonVentana>
    </VentanaMarca>
  );
}
