// ─────────────────────────────────────────────────────────────────────────
// AVISO AL ABRIR · PESO, FOTOS Y MEDIDAS DE HOY
//
// Si hoy el coach le puso en el calendario pesarse, el registro fotográfico
// o la medición corporal, y todavía no lo marcó, sale apenas abre la app (a
// todos, con la visual nueva o la de siempre): ahí mismo pone el peso o dice
// que ya mandó las fotos, sin ir a buscarlo al calendario.
//
// Los recordatorios de texto del coach (ejercicios, hábitos…) NO salen así:
// esos viven en «Recordatorios», con su contador.
//
// Sale una vez por apertura: «Más tarde» lo cierra hasta la próxima vez que
// abra la app (o hasta que cambie el día con la app abierta). El de pago
// manda: con la app bloqueada por mora esto no sale.
// ─────────────────────────────────────────────────────────────────────────
import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { api, hoyLocal } from './entrenoDatos.js';

const HojaAvisoRegistro = lazy(() => import('./EntrenoMes.jsx').then(m => ({ default: m.HojaAvisoRegistro })));

const CLAVE = 'mt:avisoRegistro';   // sessionStorage: la fecha en que ya se mostró (esta apertura)
const yaMostrado = (fecha) => { try { return sessionStorage.getItem(CLAVE) === fecha; } catch (e) { return false; } };
const marcarMostrado = (fecha) => { try { sessionStorage.setItem(CLAVE, fecha); } catch (e) { /* sin almacenamiento: sale una vez por carga */ } };

// Lo que hay por registrar hoy, según el calendario.
export function pendientesDeHoy(respMes, hoy) {
  const dia = respMes && respMes.ok && (respMes.dias || []).find(d => d.fecha === hoy);
  return dia ? (dia.eventos || []).filter(e => e.registra && !e.hecho) : [];
}

export default function AvisoRegistro({ nombre, listo, v2 }) {
  const [aviso, setAviso] = useState(null);   // { fecha, eventos }

  const revisar = useCallback(async () => {
    if (!nombre || !listo) return;
    const hoy = hoyLocal();
    if (yaMostrado(hoy)) return;
    const r = await api.mes(nombre, hoy.slice(0, 7));
    const evs = pendientesDeHoy(r, hoy);
    if (!evs.length || yaMostrado(hoy)) return;
    marcarMostrado(hoy);
    setAviso({ fecha: hoy, eventos: evs });
  }, [nombre, listo]);

  useEffect(() => { revisar(); }, [revisar]);
  // La app abierta de un día para otro (el teléfono la deja en memoria): al
  // volver a ella con otra fecha, se revisa de nuevo.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') revisar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [revisar]);

  if (!aviso || !listo) return null;
  return (
    <Suspense fallback={null}>
      <HojaAvisoRegistro nombre={nombre} fecha={aviso.fecha} eventos={aviso.eventos} v2={v2}
        alCerrar={() => setAviso(null)} />
    </Suspense>
  );
}
