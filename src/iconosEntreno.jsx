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

// La caminadora (el cardio de después de entrenar): no está en el juego de
// íconos, se dibuja con el mismo trazo.
export function Caminadora({ size = 16, color = 'currentColor', weight = 'regular' }) {
  const w = weight === 'bold' ? 2.3 : 1.7;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 18.5h15" />
      <path d="M5.5 18.5l4-8" />
      <path d="M18 18.5V6" />
      <path d="M18 6h-3" />
      <path d="M9.5 10.5l3-1.5" />
      <path d="M12.5 9v4.5" />
      <circle cx="12.5" cy="5.5" r="1.4" />
    </svg>
  );
}

const POR_SLUG = {
  cinta: Caminadora, eliptica: ArrowsClockwise, remo_maquina: Boat, escaladora: Stairs,
  bici_estatica: Bicycle, running: PersonSimpleRun, caminata: PersonSimpleWalk, ciclismo: PersonSimpleBike,
  trote_trail: Mountains, natacion: SwimmingPool, tenis: TennisBall, padel: PingPong, futbol: SoccerBall,
  baloncesto: Basketball, voleibol: Volleyball, boxeo: BoxingGlove, crossfit: Barbell, baile: MusicNotes,
  yoga: FlowerLotus, pilates: PersonSimpleTaiChi, estiramiento: PersonSimpleTaiChi, movilidad: Waves,
};
const POR_CATEGORIA = { cardio: PersonSimpleRun, deporte: SoccerBall, movilidad: Waves };

// Por el nombre, cuando no hay slug (lo que escribe el cliente o el coach a
// mano): «fútbol con amigos» → pelota, «caminata al parque» → caminando.
const POR_TEXTO = [
  [/f[uú]tbol|soccer|micro/, SoccerBall], [/balonc|basket/, Basketball], [/v[oó]ley|volley/, Volleyball],
  [/tenis(?!.*mesa)|tennis/, TennisBall], [/p[aá]del|ping|mesa/, PingPong], [/box|golpe/, BoxingGlove],
  [/nata|swim|pisc/, SwimmingPool], [/bici|cicl|spin|bike/, Bicycle], [/escal|stair/, Stairs], [/remo|row/, Boat],
  [/el[ií]ptic/, ArrowsClockwise], [/cinta|caminadora|treadmill/, Caminadora],
  [/run|corr|trot|sprint/, PersonSimpleRun], [/camin|walk|sender|hik|paseo/, PersonSimpleWalk],
  [/yoga|lotus/, FlowerLotus], [/pilates|estir|stretch|tai/, PersonSimpleTaiChi], [/movil|recup|foam/, Waves],
  [/cross|pesas|gym/, Barbell], [/bail|danza|zumba/, MusicNotes],
];
const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// El ícono de UNA actividad concreta, para el calendario: lo de después de
// entrenar es la caminadora; lo demás por su slug, por su nombre o, al final,
// por la categoría (deporte → pelota).
export function iconoDeActividad({ slug, titulo, tipo, categoria, despues } = {}) {
  if (despues) return Caminadora;
  const s = slug || tipo;
  if (s && POR_SLUG[s]) return POR_SLUG[s];
  const t = normTxt(`${titulo || ''} ${s && s !== 'otro' ? s : ''}`);
  for (const [re, I] of POR_TEXTO) if (re.test(t)) return I;
  return POR_CATEGORIA[categoria] || (categoria === 'otro' ? SoccerBall : PersonSimpleRun);
}

export function IconoActividad({ slug, categoria, titulo, size = 18, color = 'currentColor' }) {
  const I = POR_SLUG[slug] || (titulo ? iconoDeActividad({ slug, titulo, categoria }) : null) || POR_CATEGORIA[categoria] || Sparkle;
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
