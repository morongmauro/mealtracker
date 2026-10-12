// Íconos de LÍNEA para el calendario y la actividad (visual nueva). Los
// emojis del catálogo se quedan en la base para la visual de siempre; aquí
// cada actividad tiene su trazo, del mismo juego que el resto de la app.
import React from 'react';
import {
  PersonSimpleRun, PersonSimpleWalk, PersonSimpleBike, Bicycle, Stairs, Boat, Mountains,
  SwimmingPool, TennisBall, PingPong, SoccerBall, Basketball, Volleyball, BoxingGlove, Barbell,
  MusicNotes, PersonSimpleTaiChi, FlowerLotus, ArrowsClockwise, Waves, Sparkle,
  Ruler, Scales, Camera, CalendarBlank, Note, Moon,
} from '@phosphor-icons/react';

const POR_SLUG = {
  cinta: PersonSimpleRun, eliptica: ArrowsClockwise, remo_maquina: Boat, escaladora: Stairs,
  bici_estatica: Bicycle, running: PersonSimpleRun, caminata: PersonSimpleWalk, ciclismo: PersonSimpleBike,
  trote_trail: Mountains, natacion: SwimmingPool, tenis: TennisBall, padel: PingPong, futbol: SoccerBall,
  baloncesto: Basketball, voleibol: Volleyball, boxeo: BoxingGlove, crossfit: Barbell, baile: MusicNotes,
  yoga: FlowerLotus, pilates: PersonSimpleTaiChi, estiramiento: PersonSimpleTaiChi, movilidad: Waves,
};
const POR_CATEGORIA = { cardio: PersonSimpleRun, deporte: SoccerBall, movilidad: Waves };

export function IconoActividad({ slug, categoria, size = 18, color = 'currentColor' }) {
  const I = POR_SLUG[slug] || POR_CATEGORIA[categoria] || Sparkle;
  return <I size={size} color={color} weight="regular" aria-hidden />;
}

// Báscula (la de pesarse): no está en el juego de íconos, se dibuja con el
// mismo trazo. Acepta `weight` como los demás (bold = trazo más grueso).
export function Bascula({ size = 16, color = 'currentColor', weight = 'regular' }) {
  const w = weight === 'bold' ? 2.4 : weight === 'fill' ? 2.4 : 1.7;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="M8.2 9.6a5 5 0 0 1 7.6 0" />
      <path d="M12 10.2l1.6-2" />
    </svg>
  );
}

// Lo que el coach pone en el calendario y el cliente REGISTRA.
export const REGISTRO = {
  medidas:  { Icono: Ruler,  nombre: 'Medición corporal',     boton: 'Ya me medí' },
  peso:     { Icono: Bascula, nombre: 'Peso',                 boton: 'Registrar peso' },
  fotos:    { Icono: Camera, nombre: 'Registro fotográfico',  boton: 'Ya envié mis fotos' },
  medicion: { Icono: Ruler,  nombre: 'Medición',              boton: 'Ya la hice' },
};
const OTROS = { actividad: PersonSimpleRun, cita: CalendarBlank, nota: Note, descanso: Moon };

export function IconoEvento({ tipo, size = 16, color = 'currentColor' }) {
  const I = REGISTRO[tipo]?.Icono || OTROS[tipo] || CalendarBlank;
  return <I size={size} color={color} weight="regular" aria-hidden />;
}
