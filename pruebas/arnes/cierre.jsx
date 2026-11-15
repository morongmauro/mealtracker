// Monta solas las pantallas del Cierre de ciclo y de Tu balance con datos de
// ejemplo (?ver=logro|aliento|balance). Lo usa pruebas/cierre-capturas.mjs.
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/index.css';
import { PantallaCierre, PantallaBalance } from '../../src/CierreBalance.jsx';
import { cierreDelCiclo, balanceDe } from '../../src/cierreCiclo.js';

const ver = new URLSearchParams(location.search).get('ver') || 'logro';
const sumar = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ciclo = { id: 'f1', desde: '2026-10-19', hasta: '2026-11-15', semanas: 4, nuevo_desde: '2026-11-16',
  rutinas: { hechos: 11, planeados: 12 }, semanas_completas: 3, records_n: 2,
  records: [{ nombre: 'Sentadilla', alias: 'Back Squat', kg: 75, reps: 6, sube: 6.5 }, { nombre: 'Press banca', alias: 'Bench Press', kg: 52.5, reps: 8, sube: 3 }] };
const goals = { kcal: 2000, p: 150 };
const comida = (dias, kcal, p) => Object.fromEntries(Array.from({ length: dias }, (_, i) => [sumar(ciclo.desde, i), { kcal, p }]));
let el;
if (ver === 'balance') {
  el = <PantallaBalance name="Prueba" balance={balanceDe([{ fecha: '2026-10-12', peso: 78.2, grasa_pct: 24.5 }, { fecha: '2026-11-15', peso: 78.2, grasa_pct: 23.1 }], '2026-11-18')} alCerrar={() => {}} />;
} else if (ver === 'aliento') {
  el = <PantallaCierre cierre={cierreDelCiclo({ ciclo: { ...ciclo, rutinas: { hechos: 4, planeados: 12 }, semanas_completas: 0, records: [], records_n: 0 }, history: comida(9, 2800, 80), goals })} alCerrar={() => {}} />;
} else {
  el = <PantallaCierre cierre={cierreDelCiclo({ ciclo, history: comida(23, 2050, 155), goals })} alCerrar={() => {}} />;
}
ReactDOM.createRoot(document.getElementById('root')).render(el);
