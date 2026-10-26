// ─────────────────────────────────────────────────────────────────────────
// GRABAR VIDEO · el recordatorio del video que pidió el coach
//
// El coach lo pide desde el CRM (videos de técnica). El video no se sube a la
// app: se manda por WhatsApp. Aquí solo se le recuerda cómo grabarlo y se abre
// WhatsApp con el mensaje listo. Si se lo pidió de nuevo tras revisarlo,
// arriba va qué corregir. Deja de salir cuando el coach lo marca como llegado.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { VideoCamera } from '@phosphor-icons/react';
import { miniatura } from './entrenoDatos.js';
import { nombresEj, WHATSAPP_COACH } from './v2.js';
import { Hoja, Boton, TEXT, TEXT_LIGHT } from './entrenoUI.jsx';

export const NARANJA_VIDEO = '#C9672B';
export const NARANJA_TINTA = '#B5561A';
export const NARANJA_FONDO = '#FCEFE4';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaPedido = (f) => {
  if (!f) return '';
  const d = new Date(String(f).slice(0, 10) + 'T12:00:00');
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};

const PASOS = ['Grábate en una serie completa, con el peso de hoy.', 'De lado y de cuerpo entero.', 'Envíaselo por WhatsApp.'];

export default function HojaVideo({ re, alCerrar }) {
  const v = re && re.video_pedido;
  const e = re && re.ejercicio;
  const nombre = e ? nombresEj(e).grande : '';
  const wa = WHATSAPP_COACH ? `https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent(`Hola Mau! Te mando el video de ${nombre}`)}` : null;
  return (
    <Hoja abierta={!!v} alCerrar={alCerrar} titulo={`Grabar video · ${nombre}`} alto="78vh"
      marca={{ etiqueta: 'Grabar video', colorEtiqueta: NARANJA_TINTA, nombre, foto: e ? miniatura(e) : null, Icono: VideoCamera }}>
      {v && <div data-hoja-video>
        {v.corregir && (
          <div data-video-corregir style={{ background: NARANJA_FONDO, borderRadius: 16, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: NARANJA_TINTA }}>Qué corregir</div>
            <div style={{ fontSize: 15, lineHeight: 1.45, color: TEXT, marginTop: 3 }}>{v.corregir}</div>
          </div>
        )}
        <div style={{ fontSize: 16, lineHeight: 1.45, color: TEXT, marginBottom: 6 }}>Tu coach te pidió un video de este ejercicio{v.vez > 1 ? ' otra vez' : ''}.</div>
        {PASOS.map((t, i) => (
          <div key={i} data-video-paso style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '7px 0' }}>
            <span style={{ flex: '0 0 26px', height: 26, borderRadius: 13, background: NARANJA_FONDO, color: NARANJA_TINTA, fontSize: 13.5, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{i + 1}</span>
            <span style={{ fontSize: 16, lineHeight: 1.45, color: TEXT, paddingTop: 2 }}>{t}</span>
          </div>
        ))}
        <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 8 }}>
          {`Pedido el ${fechaPedido(v.pedido_en)}${v.vez > 1 ? ` · ${v.vez}ª vez` : ''} · El video no se sube a la app, va por WhatsApp.`}
        </div>
        {wa && <Boton ancho data-video-whatsapp style={{ marginTop: 16 }} onClick={() => window.open(wa, '_blank')}>Abrir WhatsApp</Boton>}
      </div>}
    </Hoja>
  );
}
