// ─────────────────────────────────────────────────────────────────────────
// AJUSTES DEL ENTRENAMIENTO · la tuerca junto a Avisos y Coach
//
// Lo que se ajusta para entrenar, sin salir de Entrenamiento:
//   · Sonido del descanso: el tono al empezar y la alarma al terminar
//     (sonidoDescanso.js). Nunca corta la música; apagado, solo vibra.
//   · Aviso al terminar el descanso: la notificación si sale de la app con
//     un descanso largo corriendo. Es el mismo interruptor de Configuración
//     → Notificaciones («Fin del descanso»): cambiarlo aquí lo cambia allá.
//   · Unidades: kilos o libras, kilómetros o metros.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { SpeakerHigh, Bell, Ruler, CaretRight } from '@phosphor-icons/react';
import { Hoja } from './entrenoUI.jsx';
import { Interruptor } from './Configuracion.jsx';
import { HojaUnidades, useUnidades } from './Unidades.jsx';
import { useAvisos, guardarAviso } from './avisos.js';
import { sonidoActivo, guardarSonido } from './sonidoDescanso.js';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';

const SOMBRA = '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)';

function useSonido() {
  const [si, setSi] = useState(sonidoActivo);
  useEffect(() => {
    const f = () => setSi(sonidoActivo());
    window.addEventListener('mt:sonido', f); window.addEventListener('storage', f);
    return () => { window.removeEventListener('mt:sonido', f); window.removeEventListener('storage', f); };
  }, []);
  return si;
}

function Fila({ Icono, titulo, detalle, derecha, alTocar, primera, id }) {
  const Tag = alTocar ? 'button' : 'div';
  return (
    <Tag data-ajuste-entreno={id} onClick={alTocar || undefined} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', border: 0, background: 'transparent',
      borderTop: primera ? 0 : '1px solid #EFEBE3', textAlign: 'left', fontFamily: 'inherit', cursor: alTocar ? 'pointer' : 'default', color: 'inherit',
    }}>
      <span style={{ width: 38, height: 38, borderRadius: 99, background: '#F1EFE9', color: TEXT, display: 'grid', placeItems: 'center', flex: 'none' }}><Icono size={20} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, color: TEXT }}>{titulo}</span>
        <span style={{ display: 'block', fontSize: 13, color: TEXT_MUTED, marginTop: 1, lineHeight: 1.35 }}>{detalle}</span>
      </span>
      {derecha}
    </Tag>
  );
}

export default function HojaAjustesEntreno({ abierta, alCerrar }) {
  const sonido = useSonido();
  const avisos = useAvisos();
  const unidad = useUnidades();
  const [unidades, setUnidades] = useState(false);
  return (
    <>
      <Hoja abierta={abierta && !unidades} alCerrar={alCerrar} titulo="Ajustes · Entrenamiento" alto="64vh" tono="entreno">
        <div data-hoja-ajustes-entreno style={{ background: '#FFFFFF', borderRadius: 18, boxShadow: SOMBRA, padding: '2px 0' }}>
          <Fila id="sonido" primera Icono={SpeakerHigh} titulo="Sonido del descanso"
            detalle="Un tono al empezar y una alarma al terminar. No pausa tu música."
            derecha={<Interruptor id="sonido-descanso" etiqueta="Sonido del descanso" encendido={sonido} alCambiar={guardarSonido} />} />
          <Fila id="aviso" Icono={Bell} titulo="Aviso al terminar el descanso"
            detalle="Una notificación si sales de la app en un descanso de 90 segundos o más."
            derecha={<Interruptor id="aviso-descanso" etiqueta="Aviso al terminar el descanso" encendido={avisos.descanso !== false} alCambiar={(v) => guardarAviso('descanso', v)} />} />
          <Fila id="unidades" Icono={Ruler} titulo="Unidades"
            detalle={`${unidad.peso === 'lb' ? 'Libras (lb)' : 'Kilos (kg)'} · ${unidad.distancia === 'm' ? 'metros' : 'kilómetros'}`}
            alTocar={() => setUnidades(true)} derecha={<CaretRight size={18} color={TEXT_LIGHT} />} />
        </div>
      </Hoja>
      <HojaUnidades abierta={abierta && unidades} alCerrar={() => setUnidades(false)} />
    </>
  );
}
