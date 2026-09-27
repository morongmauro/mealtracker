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

// Lo que el coach pone en el calendario y el cliente REGISTRA.
export const REGISTRO = {
  medidas:  { Icono: Ruler,  nombre: 'Medición corporal',     boton: 'Ya me medí' },
  peso:     { Icono: Scales, nombre: 'Peso',                  boton: 'Registrar peso' },
  fotos:    { Icono: Camera, nombre: 'Registro fotográfico',  boton: 'Ya envié mis fotos' },
  medicion: { Icono: Ruler,  nombre: 'Medición',              boton: 'Ya la hice' },
};
const OTROS = { actividad: Sparkle, cita: CalendarBlank, nota: Note, descanso: Moon };

export function IconoEvento({ tipo, size = 16, color = 'currentColor' }) {
  const I = REGISTRO[tipo]?.Icono || OTROS[tipo] || CalendarBlank;
  return <I size={size} color={color} weight="regular" aria-hidden />;
}
