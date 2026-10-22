// ─────────────────────────────────────────────────────────────────────────
// ¿QUIERES REPASAR CÓMO USAR LA APP? · lote 28 (solo Mauro por ahora)
//
// Para quien ya está activo y nunca vio el recorrido guiado: una ventana de
// marca, una sola vez, con «Sí, ver el recorrido» o «No es necesario, saltar».
// No sale en la vista compacta. Después queda en Configuración → Recorrido.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { MapPin } from '@phosphor-icons/react';
import VentanaMarca, { BotonVentana, Color, Negrita } from './VentanaMarca.jsx';
import { SECCION, DASH_AZUL } from './theme.js';

export const CLAVE_REPASO = 'mt:repasoOfrecido';
export const repasoOfrecido = () => { try { return !!localStorage.getItem(CLAVE_REPASO); } catch (e) { return true; } };
const marcar = () => { try { localStorage.setItem(CLAVE_REPASO, String(Date.now())); } catch (e) { /* sin almacenamiento */ } };

const CAMPO = 'rgba(255,255,255,0.85)';

export default function RepasoRecorrido({ alVer, alSaltar }) {
  return (
    <VentanaMarca data-repaso-recorrido simbolo={<MapPin size={28} weight="fill" color={DASH_AZUL.ink || '#2F6CC4'} />}
      titulo={<>¿Quieres repasar<br /><Color c="azul">cómo usar la app?</Color></>}
      texto={<>Un recorrido de <Negrita>un minuto</Negrita> por las cuatro secciones. Si ya la manejas, sáltalo: lo tienes siempre en Configuración.</>}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {[['Dash', DASH_AZUL.base], ['Entreno', SECCION.entreno.base], ['Comida', SECCION.comida.base], ['Aprende', SECCION.aprende.base]].map(([t, c]) => (
          <div key={t} style={{ width: 70, height: 58, borderRadius: 18, background: CAMPO, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i style={{ width: 12, height: 12, borderRadius: 99, background: c }} /><span style={{ fontSize: 11.5, fontWeight: 700 }}>{t}</span>
          </div>
        ))}
      </div>
      <BotonVentana onClick={() => { marcar(); alVer && alVer(); }} data-repaso-ver>Sí, ver el recorrido</BotonVentana>
      <BotonVentana secundario onClick={() => { marcar(); alSaltar && alSaltar(); }} data-repaso-saltar>No es necesario, saltar</BotonVentana>
    </VentanaMarca>
  );
}
