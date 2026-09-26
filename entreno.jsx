// Monta el módulo de entrenamiento solo, con un padre que se re-renderiza cada
// 300 ms — como la app de verdad, que sondea metas y recordatorios. Si algo se
// desmonta con cada render del padre, aquí se ve. Lo usa pruebas/entreno-navegador.mjs.
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/index.css';
import Entrenamiento from '../../src/Entrenamiento.jsx';

function Padre() {
  const [tic, setTic] = useState(0);
  useEffect(() => { const id = setInterval(() => setTic(t => t + 1), 300); return () => clearInterval(id); }, []);
  return <div data-tic={tic}><Entrenamiento name="Mauro Morón" /></div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Padre />);
