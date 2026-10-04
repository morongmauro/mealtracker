// ─────────────────────────────────────────────────────────────────────────
// ENTRENAMIENTO · capa de datos y utilidades
//
// Todo pasa por /api/training, que es del mismo dominio: no hay CORS que
// configurar ni un segundo despliegue que mantener. El endpoint tiene la
// service_role key (que nunca puede bajar al navegador), acota todo al
// cliente_id de quien pregunta y nunca devuelve `notas_coach`.
//
// FAIL-SAFE: nada de aquí lanza. Ante un error de red o un 500 se devuelve
// `{ ok:false, motivo }` y la pantalla enseña su estado vacío. Un cliente en
// el gimnasio con mala señal tiene que ver "no pude cargar, reintenta", no
// una pantalla en blanco.
// ─────────────────────────────────────────────────────────────────────────
import { v2Activa } from './v2.js';

async function pedir(body) {
  try {
    const r = await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: false, motivo: `http_${r.status}` };
    return await r.json();
  } catch (e) {
    return { ok: false, motivo: 'sin_red' };
  }
}

export const api = {
  plan:     (name)     => pedir({ accion: 'plan', name }),
  rutina:   (name, id) => pedir({ accion: 'rutina', name, id }),
  mes:      (name, ym) => pedir({ accion: 'mes', name, ym }),
  rutinas:  (name)     => pedir({ accion: 'rutinas', name }),
  resumen:  (name)     => pedir({ accion: 'resumen', name }),
  dash:     (name)     => pedir({ accion: 'dash', name }),
  catalogo: (name)     => pedir({ accion: 'catalogo', name }),

  // `crear:false` solo consulta: devuelve la sesión de hoy si ya existe, sin
  // crearla. Mirar una rutina no es entrenarla.
  abrir:  (name, rutina_id, { crear = true, fecha } = {}) => pedir({ accion: 'abrir', name, rutina_id, crear, fecha }),
  serie:  (name, datos)     => pedir({ accion: 'serie', name, ...datos }),
  cerrar: (name, datos)     => pedir({ accion: 'cerrar', name, ...datos }),
  actividad:       (name, datos) => pedir({ accion: 'actividad', name, ...datos }),
  borrarActividad: (name, id)    => pedir({ accion: 'borrar_actividad', name, id }),
  // Mover una rutina a otro día (solo esa fecha; si el destino tenía rutina, se intercambian).
  mover:     (name, datos) => pedir({ accion: 'mover', name, ...datos }),
  agregarRutina: (name, datos) => pedir({ accion: 'agregar_rutina', name, ...datos }),
  quitarRutina:  (name, datos) => pedir({ accion: 'quitar_rutina', name, ...datos }),
  // Medición corporal, peso y fotos que puso el coach: «ya lo hice».
  registrar: (name, datos) => pedir({ accion: 'registrar', name, ...datos }),

  // Peso y % de grasa que registra el propio cliente (van a la misma tabla
  // que las mediciones del coach en el CRM).
  medidas: (name)        => pedir({ accion: 'medidas', name }),
  medida:  (name, datos) => pedir({ accion: 'medida', name, ...datos }),
  // Nota para el coach, sobre la rutina o sobre un ejercicio.
  nota:    (name, datos) => pedir({ accion: 'nota', name, ...datos }),
  // Comunidad: lo que publica el coach, reaccionar, comentar y marcar visto.
  comunidad: (name)        => pedir({ accion: 'comunidad', name }),
  reaccionar: (name, datos) => pedir({ accion: 'reaccionar', name, ...datos }),
  comunidadVisto: (name, ids) => pedir({ accion: 'comunidad_visto', name, ids }),
  comentar: (name, post_id, texto) => pedir({ accion: 'comentar', name, post_id, texto }),
  borrarComentario: (name, id) => pedir({ accion: 'borrar_comentario', name, id }),

  // Fotos de progreso. Subir son DOS pasos a propósito: `fotoSubir` pide un
  // enlace firmado y el navegador manda el archivo directo al storage, sin
  // pasar por la función serverless. Una foto de 8 MB por ahí se comería el
  // límite de cuerpo de la petición.
  fotos:       (name)        => pedir({ accion: 'fotos', name }),
  fotoSubir:   (name, datos) => pedir({ accion: 'foto_subir', name, ...datos }),
  fotoGuardar: (name, datos) => pedir({ accion: 'foto_guardar', name, ...datos }),
  fotoBorrar:  (name, id)    => pedir({ accion: 'foto_borrar', name, id }),
};

// ─────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE RESPALDO
// ─────────────────────────────────────────────────────────────────────────
// Si la migración de actividades no se ha corrido, el endpoint devuelve el
// catálogo vacío. Antes que dejar al cliente sin nada que marcar, se ofrece
// esta lista corta. Los slugs son los mismos que los de la tabla, así que
// cuando la migración se corra no hay que migrar nada de lo ya registrado.
export const CATALOGO_MINIMO = [
  { slug: 'cinta',     nombre: 'Caminadora',       categoria: 'cardio',  icono: '🏃', remate: true,  pide_distancia: true },
  { slug: 'eliptica',  nombre: 'Elíptica',         categoria: 'cardio',  icono: '🌀', remate: true,  pide_distancia: false },
  { slug: 'running',   nombre: 'Running en calle', categoria: 'cardio',  icono: '👟', remate: false, pide_distancia: true },
  { slug: 'caminata',  nombre: 'Caminata',         categoria: 'cardio',  icono: '🚶', remate: false, pide_distancia: true },
  { slug: 'natacion',  nombre: 'Natación',         categoria: 'deporte', icono: '🏊', remate: false, pide_distancia: true },
  { slug: 'otro',      nombre: 'Otra actividad',   categoria: 'otro',    icono: '✨', remate: false, pide_distancia: false },
];

// ─────────────────────────────────────────────────────────────────────────
// FECHAS · siempre en local, nunca en UTC
// ─────────────────────────────────────────────────────────────────────────
// `toISOString()` convierte a UTC: en Colombia (UTC-5) a partir de las 7pm
// devolvería el día siguiente, y "la rutina de hoy" cambiaría a media tarde.
export const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const aFecha = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const sumarDias = (iso, n) => {
  const d = aFecha(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS_LARGO = { L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado', D: 'Domingo' };
export const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const CODIGOS_DIA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
// getDay() numera el domingo como 0, lo que descuadra la semana española
// entera si se usa tal cual.
export const codigoDia = (iso) => CODIGOS_DIA[(aFecha(iso).getDay() + 6) % 7];

export const fechaLarga = (iso) => {
  const d = aFecha(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
};

// ─────────────────────────────────────────────────────────────────────────
// VIDEO
// ─────────────────────────────────────────────────────────────────────────
// La miniatura sale del propio video de YouTube. `mqdefault` (320×180) y no
// `maxresdefault`: la grande no existe para todos los videos y cuando falta
// deja un hueco roto en la lista.
export const miniatura = (ej) => {
  if (!ej) return null;
  if (ej.poster_url) return ej.poster_url;
  if (ej.video_fuente === 'youtube' && ej.video_ref) {
    // Con la visual nueva se usa un fotograma del MEDIO del video (mq2) y no
    // la portada que eligió el canal: las portadas traen letreros y estilos
    // de cada canal, y en una galería se ven desparejas. El fotograma muestra
    // el ejercicio mismo, y todas se ven de la misma familia.
    return `https://i.ytimg.com/vi/${ej.video_ref}/${v2Activa() ? 'mq2' : 'mqdefault'}.jpg`;
  }
  return null;
};

// `youtube-nocookie` a propósito: el cliente está viendo esto dentro de su
// app de entrenamiento, no hay razón para dejarle cookies de publicidad.
export const urlVideo = (ej) => {
  if (!ej || ej.video_fuente !== 'youtube' || !ej.video_ref) return null;
  const t = Number(ej.video_inicio_seg) || 0;
  return `https://www.youtube-nocookie.com/embed/${ej.video_ref}?rel=0&modestbranding=1${t ? `&start=${t}` : ''}`;
};

// Visual nueva: el video «limpio», como un GIF del ejercicio. Arranca solo,
// sin sonido, en bucle, sin controles ni videos sugeridos. YouTube no deja
// quitar del todo su título y su logo; por eso el reproductor se muestra un
// poco ampliado (y recortado) y con una capa encima que no deja tocarlo.
export const urlVideoLimpio = (ej) => {
  if (!ej || ej.video_fuente !== 'youtube' || !ej.video_ref) return null;
  const t = Number(ej.video_inicio_seg) || 0;
  const id = ej.video_ref;
  // Sin loop=1/playlist: el bucle lo hace VideoLimpio (volviendo al inicio
  // justo antes del final), así nunca sale la pantalla final de YouTube con
  // «más videos» ni el ícono de repetir.
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1`
    + `&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0${t ? `&start=${t}` : ''}`;
};

// ─────────────────────────────────────────────────────────────────────────
// LO QUE PASÓ ESE DÍA, en un carácter
// ─────────────────────────────────────────────────────────────────────────
export const MARCAS = {
  completada: { simbolo: '✓', color: '#7A9579', titulo: 'Lo hiciste' },
  saltada:    { simbolo: '✕', color: '#C75A4A', titulo: 'La saltaste' },
  en_curso:   { simbolo: '◐', color: '#B8732B', titulo: 'La empezaste' },
};

// ─────────────────────────────────────────────────────────────────────────
// AL MARCAR UNA SERIE
// ─────────────────────────────────────────────────────────────────────────
// "22,5" es como escribe el peso medio país: el teclado decimal en español
// pone coma. Number('22,5') es NaN y la serie se guardaba sin peso.
export const numero = (v) => {
  const t = String(v ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

// En un circuito hay dos descansos: el corto entre una estación y la
// siguiente (`descanso_entre_seg`) y el largo al terminar la vuelta
// (`descanso_seg`). Tras la última estación de la última vuelta, ninguno.
// Antes el coach los ponía en el CRM y la app no usaba ninguno de los dos.
export function descansoEnCircuito(bloque, estacion, estaciones, vuelta, vueltas) {
  if (!bloque) return null;
  if (estacion < estaciones - 1) return Number(bloque.descanso_entre_seg) > 0 ? Number(bloque.descanso_entre_seg) : null;
  if (vuelta < vueltas - 1) return Number(bloque.descanso_seg) > 0 ? Number(bloque.descanso_seg) : null;
  return null;
}

// kg ⇄ lb, redondeado a lo que de verdad se puede cargar: medio kilo, o una
// libra. 50 lb → 22.5 kg; 20 kg → 44 lb.
export function convertir(peso, de, a) {
  const n = Number(peso);
  if (!Number.isFinite(n) || de === a) return peso;
  if (de === 'lb' && a === 'kg') return Math.round(n * 0.45359237 * 2) / 2;
  if (de === 'kg' && a === 'lb') return Math.round(n / 0.45359237);
  return peso;
}

// ¿Este ejercicio se hace con el propio cuerpo (o con banda) y no lleva
// kilos que anotar? Flexiones, dominadas, planchas, zancadas sin peso,
// bandas: se piden SOLO las reps. Pedir un peso ahí confunde («¿pongo mi
// peso?») y ensucia el historial.
//
// Manda lo que el coach marque en el CRM, en «Equipo»: cualquier equipo con
// carga (barra, mancuernas, máquina…) pide peso; «Peso corporal» sin nada de
// eso, no. Si el ejercicio no tiene equipo marcado, se deduce del nombre.
const EQUIPO_CON_CARGA = new Set(['barra', 'mancuerna', 'kettlebell', 'polea', 'maquina', 'smith', 'balon', 'disco', 'landmine', 'lastre']);
const EQUIPO_SIN_CARGA = new Set(['peso_corporal', 'banda', 'trx']);
// Equipo con kilos dicho en el nombre (inglés o español).
const CON_EQUIPO = /\b(dumbbells?|barbell|kettlebells?|cable|(?<!dip )machine|smith|landmine|plates?|weighted|medicine ball|leg press|pulldown|ez[- ]bar|trap bar|sled|sandbag|goblet)\b|mancuerna|con barra|polea|m[aá]quina|multipower|con disco|lastrad|bal[oó]n medicinal|prensa|jal[oó]n/i;
// Se hace con el cuerpo o con banda, dicho en el nombre.
const SIN_EQUIPO = /\bband(s|ed)?\b|superband|mini band|banda|\btrx\b|suspension|suspensi[oó]n|bodyweight|body weight|peso corporal|sin peso|sin carga/i;
// Movimientos que casi siempre llevan peso aunque el nombre no diga con qué
// («Press banca», «Remo», «Curl»): ante la duda se pide peso, que es lo que
// menos estorba (se puede dejar vacío; lo contrario no deja anotarlo).
const SUELE_LLEVAR_PESO = /\brow\b|\bremo\b|mu[ñn]eca|\bwrist\b|\bpress\b|\bcurl\b|\bbanca\b|peso muerto|\bdeadlift\b|\bshrug\b|encogimiento|\b(lateral|front|calf|shoulder) raises?\b|elevaci[oó]n (lateral|frontal)/i;
export function sinPeso(e) {
  if (!e) return false;
  const equipo = Array.isArray(e.equipo) ? e.equipo : [];
  if (equipo.some(x => EQUIPO_CON_CARGA.has(x))) return false;
  if (equipo.some(x => EQUIPO_SIN_CARGA.has(x))) return true;
  const texto = `${e.alias || ''} ${e.nombre || ''}`;
  if (CON_EQUIPO.test(texto)) return false;
  if (SIN_EQUIPO.test(texto)) return true;
  if (SUELE_LLEVAR_PESO.test(texto)) return false;
  return true;
}

// «Pull Training» → «Pull», «Lower Body + Core Training» → «Lower + Core».
// Espejo de nombreCorto() en api/_entreno.js (el mes ya lo trae calculado).
export const nombreCorto = (n) => {
  const s = String(n || '')
    .replace(/\b(training|workout|entrenamiento|entreno|session|sesi[oó]n)\b/gi, '')
    .replace(/\b(upper|lower)\s+body\b/gi, '$1')
    .replace(/\s*\+\s*/g, ' + ').replace(/\s{2,}/g, ' ').replace(/^[\s+·-]+|[\s+·-]+$/g, '').trim();
  return s.length >= 3 ? s : String(n || '');
};
