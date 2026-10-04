// /api/training.js
// El módulo de entrenamiento del cliente, contra el Supabase del CRM (misma
// fuente que authorize.js y adherence.js). El coach arma fases y rutinas
// desde el CRM; aquí el cliente las lee y marca lo que levantó.
//
// El cliente se identifica por NOMBRE, igual que el resto de la app. Todo lo
// que se devuelve va acotado a SU cliente_id: una rutina que no sea suya no
// se lee ni se escribe, aunque manden el id a mano.
//
// LO QUE NUNCA SALE DE AQUÍ: notas_coach (de ejercicios, rutinas y fases).
// Son criterios del coach, no material del cliente — el schema lo dice
// explícito y esta es la única puerta por la que podrían escaparse.
//
// GET|POST  ?accion=plan            → fase activa, calendario de la semana,
//                                     rutina de hoy y días ya entrenados
// GET|POST  ?accion=rutina&id=…     → sus ejercicios, con prescripción, video
//                                     y lo último que levantó en cada uno
// POST      { accion:'abrir', rutina_id }        → sesión del día (la crea o retoma)
// POST      { accion:'serie', sesion_id, … }     → guarda/actualiza una serie
// POST      { accion:'cerrar', sesion_id, … }    → cierra la sesión con RPE y notas
// GET|POST  ?accion=mes&ym=2026-10  → el mes entero: qué tocaba cada día, qué
//                                     entrenó, qué actividad registró y los
//                                     eventos que el coach le programó
// GET|POST  ?accion=rutinas         → todas las rutinas de la fase, para verlas
//                                     sin ejecutarlas
// GET|POST  ?accion=catalogo        → los tipos de actividad complementaria
// GET|POST  ?accion=resumen         → su semana: entrenamiento + alimentación
// GET|POST  ?accion=dash            → 12 semanas: entrenos, volumen, fuerza por
//                                     ejercicio y sus medidas (el Dash)
// POST      { accion:'actividad', … }         → registra cardio/deporte/caminata
// POST      { accion:'borrar_actividad', id } → la quita
// GET|POST  { accion:'comunidad' }            → lo que publica su coach, con reacciones
// POST      { accion:'reaccionar', post_id, tipo, quitar? }
// POST      { accion:'comunidad_visto', ids } → lo que vio (alcance en el CRM)
//
// Fail-safe: ante cualquier problema devuelve { ok:false } y la app muestra
// su estado vacío. Nunca rompe la pantalla.

import { guard, cors } from './_guard.js';
import {
  normalizeName, DIAS, aNumero, hoyBogota, letraDeHoy, semanaISO, semanaDeFase,
  diasDeRutina, repartirPorDia, FASE_VISIBLE, rutinaVisible, finDeFase,
  expandirEventos, sumarDiasISO, lunesDe, aKg, rutinaPorFecha, movimientosDe, extrasDe, nombreCorto, TIPOS_REGISTRO, nombreFase, objetivoCliente,
} from './_entreno.js';
import { alertarCoach } from './_alerta.js';
import { whatsappCoach, textoNotaWhatsapp } from './_whatsapp.js';
import { completarMusculos } from './_musculos.js';
import { fechaCorte } from './_pagos.js';
import manejarRelojes from './_relojes.js';

const CRM_URL = process.env.CRM_SUPABASE_URL;
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

const H = () => ({ 'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json' });
const sb = async (path, opts = {}) => {
  const r = await fetch(`${CRM_URL}/rest/v1/${path}`, { ...opts, headers: { ...H(), ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};

// El cliente, por nombre. Es la única puerta: todo lo demás se acota a su id.
async function buscarCliente(nombre) {
  const buscado = normalizeName(nombre);
  if (!buscado) return null;
  const cl = await sb('clientes?select=id,user_id,nombre,estado,dias_entreno,dias_entreno_cantidad,lugar_entreno,dia_pago')
    .catch(() => sb('clientes?select=id,user_id,nombre,estado,dias_entreno,dias_entreno_cantidad,lugar_entreno'));
  return (Array.isArray(cl) ? cl : []).find(c => normalizeName(c.nombre) === buscado) || null;
}

// Lo que se le manda al cliente de un ejercicio. Lista blanca a propósito:
// añadir una columna al schema no debe filtrar notas del coach sin querer.
const CAMPOS_EJERCICIO = 'id,nombre,alias,descripcion,claves_tecnicas,patron,segmento,tipo,'
  + 'musculos_primarios,musculos_secundarios,equipo,nivel,unilateral,'
  + 'video_fuente,video_url,video_ref,video_inicio_seg,poster_url';

export default async function handler(req, res) {
  // Relojes y anillos: /api/relojes llega aquí (ver vercel.json y _relojes.js).
  if (req.query && req.query.modulo === 'relojes') return manejarRelojes(req, res);
  // El módulo de entrenamiento llama desde su propio dominio: hay que
  // contestarle el preflight y marcarle la respuesta como suya.
  if (cors(req, res)) return;
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const esGet = req.method === 'GET';
  if (!guard(req, res, { key: 'training', limit: 90, allowNoOrigin: esGet })) return;
  if (!CRM_URL || !CRM_KEY) return res.status(200).json({ ok: false, motivo: 'sin_crm' });

  const cuerpo = esGet ? req.query : (req.body || {});
  const accion = String(cuerpo.accion || 'plan');
  const hoy = hoyBogota();

  try {
    const cliente = await buscarCliente(cuerpo.name);
    if (!cliente) return res.status(200).json({ ok: false, motivo: 'sin_cliente' });

    if (accion === 'plan') return res.status(200).json(await verPlan(cliente, hoy));
    if (accion === 'rutina') return res.status(200).json(await verRutina(cliente, cuerpo.id, hoy));
    if (accion === 'mes') return res.status(200).json(await verMes(cliente, cuerpo.ym, hoy));
    if (accion === 'rutinas') return res.status(200).json(await verRutinas(cliente));
    if (accion === 'catalogo') return res.status(200).json(await verCatalogo());
    if (accion === 'resumen') return res.status(200).json(await verResumen(cliente, hoy));
    if (accion === 'dash') return res.status(200).json(await verDash(cliente, hoy));
    if (!esGet && accion === 'abrir') return res.status(200).json(await abrirSesion(cliente, cuerpo, hoy));
    if (!esGet && accion === 'serie') return res.status(200).json(await guardarSerie(cliente, cuerpo));
    if (!esGet && accion === 'cerrar') return res.status(200).json(await cerrarSesion(cliente, cuerpo));
    if (!esGet && accion === 'registrar') return res.status(200).json(await registrarEvento(cliente, cuerpo, hoy));
    if (!esGet && accion === 'mover') return res.status(200).json(await moverRutina(cliente, cuerpo, hoy));
    if (!esGet && accion === 'agregar_rutina') return res.status(200).json(await agregarRutina(cliente, cuerpo, hoy));
    if (!esGet && accion === 'quitar_rutina') return res.status(200).json(await quitarRutina(cliente, cuerpo, hoy));
    if (!esGet && accion === 'actividad') return res.status(200).json(await guardarActividad(cliente, cuerpo, hoy));
    if (!esGet && accion === 'borrar_actividad') return res.status(200).json(await borrarActividad(cliente, cuerpo));
    if (accion === 'medidas') return res.status(200).json(await verMedidas(cliente));
    if (!esGet && accion === 'medida') return res.status(200).json(await guardarMedida(cliente, cuerpo, hoy));
    if (!esGet && accion === 'nota') return res.status(200).json(await guardarNota(cliente, cuerpo, hoy));
    if (accion === 'comunidad') return res.status(200).json(await verComunidad(cliente));
    if (!esGet && accion === 'reaccionar') return res.status(200).json(await reaccionarComunidad(cliente, cuerpo));
    if (!esGet && accion === 'comunidad_visto') return res.status(200).json(await vistoComunidad(cliente, cuerpo));
    // Fotos de progreso: APAGADAS por decisión del coach (por ahora llegan por
    // WhatsApp). El código se queda para retomarlo; con esto en false nadie
    // puede ver, subir ni borrar fotos por esta puerta.
    if (FOTOS_ACTIVAS) {
      if (accion === 'fotos') return res.status(200).json(await verFotos(cliente));
      if (!esGet && accion === 'foto_subir') return res.status(200).json(await pedirSubidaFoto(cliente, cuerpo, hoy));
      if (!esGet && accion === 'foto_guardar') return res.status(200).json(await guardarFoto(cliente, cuerpo, hoy));
      if (!esGet && accion === 'foto_borrar') return res.status(200).json(await borrarFoto(cliente, cuerpo));
    } else if (accion.startsWith('foto')) {
      return res.status(200).json({ ok: false, motivo: 'desactivado' });
    }
    return res.status(200).json({ ok: false, motivo: 'accion_desconocida' });
  } catch (e) {
    return res.status(200).json({ ok: false, motivo: 'error' });
  }
}

// ── EL PLAN ───────────────────────────────────────────────────────────────
async function verPlan(cliente, hoy) {
  // La fase ACTIVA Y ENVIADA. Si hay varias (no debería), la de mayor orden.
  const fases = await sb(`fases?select=id,nombre,objetivo,semanas,fecha_inicio,dias_semana,orden,estado,visible_cliente`
    + `&cliente_id=eq.${cliente.id}&${FASE_VISIBLE}&order=orden.desc&limit=1`);
  const fase = Array.isArray(fases) ? fases[0] : null;
  if (!fase) return { ok: true, cliente: cliente.nombre, fase: null, dias: [], hoy };

  const rutinas = await sb(`rutinas?select=id,nombre,descripcion,dia_orden,dia_semana,dias_semana,tipo_sesion,duracion_estimada_min,visible_cliente`
    + `&fase_id=eq.${fase.id}&archivada=is.false&order=dia_orden.asc`);
  const lista = (Array.isArray(rutinas) ? rutinas : []).filter(r => rutinaVisible(r, fase));

  // Cuántos ejercicios trae cada rutina, para no abrirla solo por saberlo.
  const conteo = {};
  if (lista.length) {
    const ids = lista.map(r => r.id).join(',');
    const re = await sb(`rutina_ejercicios?select=rutina_id&rutina_id=in.(${ids})`);
    (Array.isArray(re) ? re : []).forEach(x => { conteo[x.rutina_id] = (conteo[x.rutina_id] || 0) + 1; });
  }

  // Las sesiones de ESTA semana, para marcar los días ya entrenados.
  const lunes = (() => {
    const [y, m, d] = hoy.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
    return t.toISOString().slice(0, 10);
  })();
  const ses = await sb(`sesiones?select=id,rutina_id,fecha,estado,duracion_seg,rpe`
    + `&cliente_id=eq.${cliente.id}&fecha=gte.${lunes}&order=fecha.asc`);
  const sesiones = Array.isArray(ses) ? ses : [];

  const porDia = repartirPorDia(fase, lista);
  // Lo que el cliente movió de día pesa sobre el plan semanal.
  const rutinaDe = rutinaPorFecha(fase, porDia, await movimientosDe(sb, `cliente_id=eq.${cliente.id}&fase_id=eq.${fase.id}`),
    await extrasDe(sb, `cliente_id=eq.${cliente.id}&fase_id=eq.${fase.id}`, lista));
  const letraHoy = letraDeHoy();
  const huecos = DIAS.map((d, i) => {
    const t = new Date(Date.parse(lunes + 'T00:00:00Z')); t.setUTCDate(t.getUTCDate() + i);
    const fecha = t.toISOString().slice(0, 10);
    const r = rutinaDe(fecha);
    return { fecha, rutinaId: r ? r.id : null, r };
  });
  const asignadas = asignarSesiones(huecos, sesiones);
  const dias = DIAS.map((d, i) => {
    const r = huecos[i].r;
    const fecha = huecos[i].fecha;
    const s = asignadas[i];
    return {
      dia: d, fecha, es_hoy: d === letraHoy,
      descanso: !r,
      rutina: r ? {
        id: r.id, nombre: r.nombre, tipo: r.tipo_sesion,
        minutos: r.duracion_estimada_min || null,
        ejercicios: conteo[r.id] || 0,
      } : null,
      hecha: !!(s && s.estado === 'completada'),
      en_curso: !!(s && s.estado === 'en_curso'),
      saltada: !!(s && s.estado === 'saltada'),
      // Si la hizo otro día de la semana, cuál. La gente mueve los días: el
      // Push del lunes hecho el martes cuenta, y la app lo dice.
      hecha_el: s && s.fecha !== fecha ? s.fecha : null,
      movida: rutinaDe.movida(fecha),
    };
  });

  return {
    ok: true, hoy, cliente: cliente.nombre,
    fase: {
      nombre: nombreFase(fase.nombre), objetivo: objetivoCliente(fase.objetivo),
      semanas: fase.semanas, semana_actual: semanaDeFase(fase, hoy),
      dias_semana: fase.dias_semana || [],
    },
    dias,
    // Rutinas que no cupieron en el calendario: el coach armó más días de
    // entreno que días declaró en la fase. Se muestran igual, sueltas, en vez
    // de desaparecer sin que nadie se entere.
    sueltas: lista.filter(r => !Object.values(porDia).some(x => x && x.id === r.id))
      .map(r => ({ id: r.id, nombre: r.nombre, tipo: r.tipo_sesion, ejercicios: conteo[r.id] || 0 })),
  };
}

// Qué sesión de la semana cuenta para cada día del plan.
//
// Antes se buscaba por FECHA: una sesión contaba solo si caía el mismo día que
// su rutina. Pero la gente mueve los días. Si el Push del lunes se hacía el
// martes, el lunes salía sin hacer y el martes (que tocaba Lower) también: la
// semana decía cero cuando había entrenado. Ahora:
//   1. primero, cada día se queda con la sesión de SU rutina en SU fecha;
//   2. lo que sobra se reparte, por rutina, en el primer día de esa rutina que
//      siga libre. Con A-B-A-B, la segunda A de la semana va a la segunda A.
// Una sesión sin rutina de la semana (una rutina suelta, un extra) no ocupa
// ningún día: no es la que tocaba.
export function asignarSesiones(huecos, sesiones) {
  const out = huecos.map(() => null);
  const usadas = new Set();
  const peso = (s) => (s.estado === 'completada' ? 0 : s.estado === 'en_curso' ? 1 : 2);
  const ordenadas = (sesiones || []).slice()
    .sort((a, b) => peso(a) - peso(b) || String(a.fecha).localeCompare(String(b.fecha)));

  huecos.forEach((h, i) => {
    if (!h.rutinaId) return;
    const s = ordenadas.find(x => !usadas.has(x.id) && x.rutina_id === h.rutinaId && x.fecha === h.fecha);
    if (s) { out[i] = s; usadas.add(s.id); }
  });
  ordenadas.forEach(s => {
    if (usadas.has(s.id) || !s.rutina_id) return;
    const i = huecos.findIndex((h, j) => !out[j] && h.rutinaId === s.rutina_id);
    if (i >= 0) { out[i] = s; usadas.add(s.id); }
  });
  return out;
}

// ── UNA RUTINA ────────────────────────────────────────────────────────────
async function verRutina(cliente, rutinaId, hoy) {
  if (!rutinaId) return { ok: false, motivo: 'sin_id' };
  // Que la rutina sea SUYA. Sin esto, mandando un id a mano se leería la
  // rutina de cualquier otro cliente.
  const rr = await sb(`rutinas?select=id,nombre,descripcion,tipo_sesion,duracion_estimada_min,fase_id,cliente_id,visible_cliente`
    + `&id=eq.${encodeURIComponent(rutinaId)}&cliente_id=eq.${cliente.id}&limit=1`);
  const rutina = Array.isArray(rr) ? rr[0] : null;
  if (!rutina) return { ok: false, motivo: 'no_es_suya' };
  // Que sea suya no basta: tiene que estar ENVIADA. Con el id a mano se
  // podría abrir una rutina que el coach todavía está armando.
  if (!(await rutinaEnviada(rutina))) return { ok: false, motivo: 'no_enviada' };

  // `descanso_entre_seg` (el descanso corto entre estaciones de un circuito)
  // llegó con una migración. Si la base aún no la tiene, PostgREST rechaza la
  // consulta entera; en ese caso se pide sin ella en vez de dejar al cliente
  // sin rutina.
  const bloques = await sb(`rutina_bloques?select=id,nombre,tipo,vueltas,descanso_seg,descanso_entre_seg,orden,notas`
    + `&rutina_id=eq.${rutina.id}&order=orden.asc`)
    .catch(() => sb(`rutina_bloques?select=id,nombre,tipo,vueltas,descanso_seg,orden,notas`
      + `&rutina_id=eq.${rutina.id}&order=orden.asc`));
  const res = await sb(`rutina_ejercicios?select=id,bloque_id,ejercicio_id,orden,series,reps,peso_objetivo,rir,tempo,descanso_seg,notas`
    + `&rutina_id=eq.${rutina.id}&order=orden.asc`);
  const lista = Array.isArray(res) ? res : [];
  if (!lista.length) {
    return { ok: true, rutina: { ...limpiarRutina(rutina), bloques: [], ejercicios: [] } };
  }

  const ids = [...new Set(lista.map(x => x.ejercicio_id))].join(',');
  const ejs = await sb(`ejercicios?select=${CAMPOS_EJERCICIO}&id=in.(${ids})`);
  const porId = {};
  (Array.isArray(ejs) ? ejs : []).forEach(e => { porId[e.id] = completarMusculos(e); });

  // Lo último que levantó en cada ejercicio: es lo que de verdad se mira
  // antes de cargar la barra. Se lee de SUS sesiones, no de las de nadie más.
  //
  // Sin contar la sesión de HOY de esta misma rutina. Si se cerró la app a
  // mitad del entreno y se vuelve a entrar, "la última vez" era lo que acababa
  // de marcar hace diez minutos: la columna «Antes» se copiaba a sí misma y
  // el peso sugerido era el de hoy, no el de la semana pasada.
  const deHoy = await sb(`sesiones?select=id&cliente_id=eq.${cliente.id}`
    + `&rutina_id=eq.${rutina.id}&fecha=eq.${hoy}&limit=1`);
  const ultimas = await ultimasSeries(cliente.id, [...new Set(lista.map(x => x.ejercicio_id))],
    { excluirSesion: Array.isArray(deHoy) && deHoy[0] ? deHoy[0].id : null });

  return {
    ok: true, hoy,
    rutina: {
      ...limpiarRutina(rutina),
      bloques: (Array.isArray(bloques) ? bloques : []).map(b => ({
        id: b.id, nombre: b.nombre, tipo: b.tipo, vueltas: b.vueltas,
        descanso_seg: b.descanso_seg, descanso_entre_seg: b.descanso_entre_seg ?? null,
        notas: b.notas,
      })),
      ejercicios: lista.map(x => ({
        id: x.id, bloque_id: x.bloque_id, orden: x.orden,
        series: x.series, reps: x.reps, peso_objetivo: x.peso_objetivo,
        rir: x.rir, tempo: x.tempo, descanso_seg: x.descanso_seg, notas: x.notas,
        ejercicio: porId[x.ejercicio_id] || { id: x.ejercicio_id, nombre: 'Ejercicio' },
        ultima_vez: ultimas[x.ejercicio_id] || null,
      })),
    },
  };
}
// notas_coach no está en el select, pero se recorta igual por si alguien
// añade un '*' más adelante.
function limpiarRutina(r) {
  return { id: r.id, nombre: r.nombre, descripcion: r.descripcion, tipo: r.tipo_sesion, minutos: r.duracion_estimada_min };
}

// ── LO QUE YA HA LEVANTADO EN CADA EJERCICIO ────────────────────────────
// Tres cosas distintas, y las tres hacen falta:
//
//   · `ultima_vez`  — la sesión más reciente. Es lo que prerrellena los
//     campos y lo que se mira de reojo entre serie y serie.
//   · `record`      — lo máximo que ha levantado NUNCA en ese ejercicio.
//     Sin esto no hay nada que batir, y batir algo es lo que hace que la
//     gente cargue más.
//   · `historial`   — las últimas sesiones, serie a serie, para ver la
//     progresión y no una foto suelta.
//
// Son DOS consultas pase lo que pase, no una por ejercicio: primero las
// fechas de sus sesiones y luego todas las series de esos ejercicios. El
// tope de 400 sesiones son más de dos años entrenando cinco días por
// semana; pasado eso el récord se calcula sobre lo reciente, que es lo que
// importa, y la consulta no crece sin freno.
const TOPE_SESIONES = 400;
const TOPE_HISTORIAL = 12;

async function ultimasSeries(clienteId, ejercicioIds, { excluirSesion = null } = {}) {
  if (!ejercicioIds.length) return {};
  const ses = await sb(`sesiones?select=id,fecha&cliente_id=eq.${clienteId}`
    + `&order=fecha.desc&limit=${TOPE_SESIONES}`);
  // Al cerrar hace falta saber cómo estaba el récord ANTES de hoy: con la
  // sesión de hoy dentro, todo lo de hoy sería siempre el récord.
  const lista = (Array.isArray(ses) ? ses : []).filter(x => x.id !== excluirSesion);
  if (!lista.length) return {};

  const fechaDe = {};
  lista.forEach(s => { fechaDe[s.id] = s.fecha; });

  const logs = await sb(`series_log?select=ejercicio_id,sesion_id,serie_num,reps,peso,unidad`
    + `&sesion_id=in.(${lista.map(s => s.id).join(',')})&ejercicio_id=in.(${ejercicioIds.join(',')})`
    + `&completada=is.true`);

  // Primero se agrupa por ejercicio y fecha: una sesión del mismo día es una
  // entrada del historial.
  const porEjercicio = {};
  (Array.isArray(logs) ? logs : []).forEach(l => {
    const fecha = fechaDe[l.sesion_id];
    if (!fecha) return;
    const dias = porEjercicio[l.ejercicio_id] || (porEjercicio[l.ejercicio_id] = {});
    (dias[fecha] || (dias[fecha] = [])).push(l);
  });

  const out = {};
  Object.entries(porEjercicio).forEach(([ejercicioId, dias]) => {
    const fechas = Object.keys(dias).sort().reverse();   // la más nueva primero
    const sesion = (f) => ({
      fecha: f,
      series: dias[f]
        .slice().sort((a, b) => a.serie_num - b.serie_num)
        .map(s => ({ serie: s.serie_num, reps: s.reps, peso: s.peso, unidad: s.unidad })),
    });

    const ultima = sesion(fechas[0]);
    // `mejor_peso` de la última sesión: es lo que prerrellena el campo. No es
    // el récord — se llamaba así y confundía. Va con SU unidad: si la última
    // vez fue en libras, la app lo sabe y abre el ejercicio en libras.
    let mejor = null;
    ultima.series.forEach(s => {
      const kg = aKg(s.peso, s.unidad);
      if (kg != null && kg > 0 && (!mejor || kg > mejor.kg)) mejor = { kg, peso: Number(s.peso), unidad: s.unidad || 'kg' };
    });
    ultima.mejor_peso = mejor ? mejor.peso : null;
    ultima.unidad = mejor ? mejor.unidad : ((ultima.series[0] && ultima.series[0].unidad) || 'kg');

    // El récord: el peso más alto de toda su historia y, con ESE peso, las
    // reps más altas. Así "60 kg × 8" es una marca real y no el peso de un
    // día mezclado con las reps de otro. Se compara en kg: 50 lb no le gana
    // a 40 kg aunque el número sea más grande.
    let record = null;
    fechas.forEach(f => {
      dias[f].forEach(s => {
        const cand = marcaDe(s, f);
        if (cand && superaMarca(cand, record)) record = cand;
      });
    });

    out[ejercicioId] = {
      ...ultima,
      record,
      // Cuántas veces lo ha hecho en total, aunque solo se manden las últimas.
      veces: fechas.length,
      historial: fechas.slice(0, TOPE_HISTORIAL).map(sesion),
    };
  });
  return out;
}

// ¿La sesión que se acaba de cerrar batió algún récord? Se calcula DESPUÉS
// de guardar las series, comparando lo de hoy contra lo de antes de hoy.
// Es lo que convierte "terminaste" en "levantaste más que nunca".
// Una marca: peso (en su unidad), reps y el peso pasado a kg para comparar.
function marcaDe(s, fecha = null) {
  const reps = Number(s.reps);
  if (!Number.isFinite(reps) || reps <= 0) return null;
  const kg = aKg(s.peso, s.unidad);
  const conPeso = kg != null && kg > 0;
  return { peso: conPeso ? Number(s.peso) : null, reps, unidad: s.unidad || 'kg', kg: conPeso ? kg : null, ...(fecha ? { fecha } : {}) };
}
// ¿`a` supera a `b`? Más peso gana; con el mismo peso (±10 g, por el redondeo
// de lb a kg), más reps. Sin peso (dominadas, planchas): más reps.
export function superaMarca(a, b) {
  if (!b) return true;
  if (a.kg != null && (b.kg == null || a.kg > b.kg + 0.01)) return true;
  const mismoPeso = a.kg != null ? (b.kg != null && Math.abs(a.kg - b.kg) <= 0.01) : b.kg == null;
  return mismoPeso && a.reps > b.reps;
}

export function recordsBatidos(antes, series) {
  const mejorDeHoy = {};
  series.forEach(s => {
    const m = marcaDe(s);
    if (m && superaMarca(m, mejorDeHoy[s.ejercicio_id])) mejorDeHoy[s.ejercicio_id] = m;
  });
  const batidos = [];
  Object.entries(mejorDeHoy).forEach(([id, hoy]) => {
    const previo = antes[id];
    const { kg, ...marca } = hoy;
    if (!previo) { batidos.push({ ejercicio_id: id, ...marca, primera_vez: true }); return; }
    const prev = previo.kg !== undefined ? previo : marcaDe(previo);
    if (prev && superaMarca(hoy, prev)) {
      batidos.push({ ejercicio_id: id, ...marca, antes: { peso: previo.peso, reps: previo.reps, unidad: previo.unidad || 'kg' } });
    }
  });
  return batidos;
}

// ═══════════════════════════════════════════════════════════════════════
// FOTOS DE PROGRESO
// ═══════════════════════════════════════════════════════════════════════
// Las fotos viven en un bucket PRIVADO. Nunca sale de aquí una URL que
// funcione sola: cada enlace se firma con service_role y caduca. El archivo
// no pasa por esta función — el navegador lo sube directo al storage con un
// enlace de subida firmado, así que una foto de 8 MB no se come el límite de
// cuerpo de la función ni su tiempo de ejecución.
//
// Todo va acotado al `cliente_id` de quien pregunta, igual que el resto del
// endpoint. No hay ninguna acción que devuelva la foto de otro.

const FOTOS_ACTIVAS = false;
const FOTOS_BUCKET = 'progreso';
// Cinco minutos: suficiente para verlas y demasiado poco para que un enlace
// reenviado siga abriendo mañana.
const FOTO_VER_SEG = 300;
const FOTO_POSES = ['frente', 'lado', 'espalda', 'otra'];
const FOTO_TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };

// El storage de Supabase no está bajo /rest/v1, así que no sirve `sb()`.
async function storage(ruta, opts = {}) {
  const r = await fetch(`${CRM_URL}/storage/v1/${ruta}`, {
    ...opts,
    headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`storage ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const firmarVer = async (ruta) => {
  const r = await storage(`object/sign/${FOTOS_BUCKET}/${ruta}`, {
    method: 'POST', body: JSON.stringify({ expiresIn: FOTO_VER_SEG }),
  });
  // Supabase devuelve la ruta relativa; el cliente necesita la absoluta.
  return r?.signedURL ? `${CRM_URL}/storage/v1${r.signedURL}` : null;
};

async function verFotos(cliente) {
  const filas = await sb(`fotos_progreso?select=id,fecha,pose,ruta,peso_kg,nota`
    + `&cliente_id=eq.${cliente.id}&order=fecha.desc,created_at.desc&limit=200`);
  const lista = Array.isArray(filas) ? filas : [];
  // Las URLs se firman en paralelo: con veinte fotos, en serie son veinte
  // idas y vueltas y la pantalla tarda segundos en aparecer.
  const urls = await Promise.all(lista.map(f => firmarVer(f.ruta).catch(() => null)));
  return {
    ok: true,
    // `ruta` no sale: al cliente no le sirve de nada y es lo único que
    // permitiría pedir un enlace de otra foto.
    fotos: lista.map((f, i) => ({
      id: f.id, fecha: f.fecha, pose: f.pose,
      peso_kg: f.peso_kg, nota: f.nota, url: urls[i],
    })).filter(f => f.url),
    caducan_en_seg: FOTO_VER_SEG,
  };
}

// Paso 1 de subir: el navegador pide permiso y recibe un enlace firmado.
async function pedirSubidaFoto(cliente, cuerpo, hoy) {
  const ext = FOTO_TIPOS[String(cuerpo.tipo || '').toLowerCase()];
  if (!ext) return { ok: false, motivo: 'tipo_no_permitido' };
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(cuerpo.fecha || '') ? cuerpo.fecha : hoy;
  if (fecha > hoy) return { ok: false, motivo: 'fecha_futura' };
  const pose = FOTO_POSES.includes(cuerpo.pose) ? cuerpo.pose : 'frente';

  // La ruta lleva el id del cliente delante: aunque algún día se abran
  // políticas sobre el bucket, "lo mío empieza por mi id" es una regla que
  // se puede escribir. El sufijo aleatorio evita que subir dos veces el
  // mismo día pise la anterior.
  const azar = Math.random().toString(36).slice(2, 10);
  const ruta = `${cliente.id}/${fecha}-${pose}-${azar}.${ext}`;
  const firma = await storage(`object/upload/sign/${FOTOS_BUCKET}/${ruta}`, { method: 'POST' });
  if (!firma?.url) return { ok: false, motivo: 'sin_firma' };
  return { ok: true, ruta, url: `${CRM_URL}/storage/v1${firma.url}`, fecha, pose };
}

// Paso 2: el archivo ya está arriba, se registra la fila.
async function guardarFoto(cliente, cuerpo, hoy) {
  const ruta = String(cuerpo.ruta || '');
  // Que la ruta sea suya. Sin esto, cualquiera podría registrar como propia
  // una foto de otro pasando su ruta.
  if (!ruta.startsWith(`${cliente.id}/`)) return { ok: false, motivo: 'ruta_ajena' };
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(cuerpo.fecha || '') ? cuerpo.fecha : hoy;
  if (fecha > hoy) return { ok: false, motivo: 'fecha_futura' };

  const peso = aNumero(cuerpo.peso_kg);
  const fila = await sb('fotos_progreso', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: cliente.user_id || undefined,
      cliente_id: cliente.id,
      fecha,
      pose: FOTO_POSES.includes(cuerpo.pose) ? cuerpo.pose : 'frente',
      ruta,
      peso_kg: peso != null && peso > 0 ? peso : null,
      nota: cuerpo.nota ? String(cuerpo.nota).slice(0, 300) : null,
    }),
  });
  const f = Array.isArray(fila) ? fila[0] : fila;
  if (!f) return { ok: false, motivo: 'no_se_guardo' };
  return { ok: true, foto: { id: f.id, fecha: f.fecha, pose: f.pose, peso_kg: f.peso_kg, nota: f.nota, url: await firmarVer(f.ruta).catch(() => null) } };
}

// Borrar de verdad: la fila Y el archivo. Dejar el archivo sería decirle al
// cliente que la borró cuando sigue ahí.
async function borrarFoto(cliente, cuerpo) {
  const id = String(cuerpo.id || '');
  if (!id) return { ok: false, motivo: 'sin_id' };
  const suyas = await sb(`fotos_progreso?select=id,ruta&id=eq.${encodeURIComponent(id)}`
    + `&cliente_id=eq.${cliente.id}&limit=1`);
  const f = Array.isArray(suyas) ? suyas[0] : null;
  if (!f) return { ok: false, motivo: 'no_es_suya' };

  await sb(`fotos_progreso?id=eq.${f.id}`, { method: 'DELETE' });
  try {
    await storage(`object/${FOTOS_BUCKET}/${f.ruta}`, { method: 'DELETE' });
  } catch (e) {
    // La fila ya no está, así que para el cliente la foto desapareció. El
    // archivo huérfano sale en la consulta del final de migracion-fotos.sql.
  }
  return { ok: true };
}

// ── ESCRITURAS ────────────────────────────────────────────────────────────
// ¿Está enviada esta rutina? Mira su propia bandera y, si no dice nada, la
// de su fase. Se consulta aparte porque hace falta tanto para leerla como
// para abrirle una sesión.
async function rutinaEnviada(rutina) {
  if (rutina.visible_cliente === false) return false;
  if (rutina.visible_cliente === true) return true;
  if (!rutina.fase_id) return false;      // suelta y sin decidir: no se ve
  const f = await sb(`fases?select=visible_cliente,estado&id=eq.${rutina.fase_id}&limit=1`);
  const fase = Array.isArray(f) ? f[0] : null;
  return !!(fase && fase.visible_cliente);
}

async function abrirSesion(cliente, cuerpo, hoy) {
  const rutinaId = cuerpo.rutina_id;
  if (!rutinaId) return { ok: false, motivo: 'sin_id' };
  const rr = await sb(`rutinas?select=id,fase_id,cliente_id,visible_cliente&id=eq.${encodeURIComponent(rutinaId)}&cliente_id=eq.${cliente.id}&limit=1`);
  const rutina = Array.isArray(rr) ? rr[0] : null;
  if (!rutina) return { ok: false, motivo: 'no_es_suya' };
  if (!(await rutinaEnviada(rutina))) return { ok: false, motivo: 'no_enviada' };

  // El schema garantiza una sola sesión por cliente/rutina/fecha: si vuelve a
  // entrar, retoma la que ya tenía en vez de abrir otra.
  // La fecha es la de HOY, salvo que la app mande la de ayer: son series que
  // se marcaron sin señal y suben después de medianoche. Más atrás no, y
  // nunca en el futuro.
  const fecha = (/^\d{4}-\d{2}-\d{2}$/.test(String(cuerpo.fecha || ''))
    && cuerpo.fecha <= hoy && cuerpo.fecha >= sumarDiasISO(hoy, -1)) ? cuerpo.fecha : hoy;

  const ya = await sb(`sesiones?select=id,estado,rpe,notas_cliente&cliente_id=eq.${cliente.id}`
    + `&rutina_id=eq.${rutina.id}&fecha=eq.${fecha}&limit=1`);
  if (Array.isArray(ya) && ya[0]) {
    // Solo las series que siguen marcadas. Una serie desmarcada se queda en la
    // tabla con completada=false; devolverla hacía que al volver a entrar
    // apareciera otra vez con el check puesto y sin números.
    const series = await sb(`series_log?select=id,rutina_ejercicio_id,ejercicio_id,serie_num,reps,peso,unidad,completada&sesion_id=eq.${ya[0].id}`
      + `&completada=is.true`);
    return { ok: true, sesion: ya[0], series: Array.isArray(series) ? series : [], retomada: true };
  }

  // Mirar no es entrenar. La app abre la rutina con `crear:false` y solo crea
  // la sesión cuando se marca la primera serie. Antes, curiosear el jueves
  // desde el lunes dejaba una sesión «a medias» del jueves fechada el lunes,
  // que nunca se cerraba y ensuciaba la semana del cliente y el CRM.
  if (cuerpo.crear === false) return { ok: true, sesion: null, series: [], retomada: false };

  const creada = await sb('sesiones', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      // El coach dueño. Es obligatorio en la base y la API escribe con la
      // service_role, que no tiene usuario: sin esto el insert fallaba SIEMPRE
      // y ningún cliente podía guardar un entreno (probado en Postgres).
      user_id: cliente.user_id,
      cliente_id: cliente.id, rutina_id: rutina.id, fase_id: rutina.fase_id,
      fecha, semana_iso: semanaISO(fecha), estado: 'en_curso',
      // Quién generó esta fila. Sin esto el CRM no distingue una sesión que
      // el cliente marcó de una que trajo la importación de Trainerize, y
      // acaba diciéndote "lo marcó en su app" sobre historial importado.
      origen: 'cliente',
    }),
  });
  const sesion = Array.isArray(creada) ? creada[0] : creada;
  return { ok: true, sesion, series: [], retomada: false };
}

// Que la sesión sea suya antes de escribirle nada.
async function sesionPropia(clienteId, sesionId) {
  if (!sesionId) return null;
  const s = await sb(`sesiones?select=id,cliente_id,rutina_id,iniciada_en&id=eq.${encodeURIComponent(sesionId)}&cliente_id=eq.${clienteId}&limit=1`);
  return Array.isArray(s) ? s[0] : null;
}

async function guardarSerie(cliente, cuerpo) {
  const sesion = await sesionPropia(cliente.id, cuerpo.sesion_id);
  if (!sesion) return { ok: false, motivo: 'no_es_suya' };
  const num = Number(cuerpo.serie_num);
  if (!Number.isFinite(num) || num < 1) return { ok: false, motivo: 'serie_invalida' };

  const fila = {
    sesion_id: sesion.id,
    rutina_ejercicio_id: cuerpo.rutina_ejercicio_id || null,
    ejercicio_id: cuerpo.ejercicio_id,
    serie_num: num,
    reps: aNumero(cuerpo.reps),
    peso: aNumero(cuerpo.peso),
    unidad: cuerpo.unidad === 'lb' ? 'lb' : 'kg',
    rir: cuerpo.rir == null || cuerpo.rir === '' ? null : Number(cuerpo.rir),
    completada: cuerpo.completada !== false,
  };
  if (!fila.ejercicio_id) return { ok: false, motivo: 'sin_ejercicio' };

  // Marcar la misma serie dos veces la ACTUALIZA, no la duplica: el cliente
  // corrige el peso que puso mal sin que queden dos filas peleando.
  //
  // La serie se identifica por su LÍNEA de la rutina (rutina_ejercicio_id), no
  // por el ejercicio: si el mismo ejercicio sale dos veces en la rutina (press
  // al principio y otra vez de remate), la serie 1 del segundo pisaba la
  // serie 1 del primero. Por ejercicio solo se busca cuando no hay línea.
  const porLinea = fila.rutina_ejercicio_id
    ? `rutina_ejercicio_id=eq.${encodeURIComponent(fila.rutina_ejercicio_id)}`
    : `ejercicio_id=eq.${encodeURIComponent(fila.ejercicio_id)}&rutina_ejercicio_id=is.null`;
  const previa = await sb(`series_log?select=id&sesion_id=eq.${sesion.id}`
    + `&${porLinea}&serie_num=eq.${num}&limit=1`);
  if (Array.isArray(previa) && previa[0]) {
    const upd = await sb(`series_log?id=eq.${previa[0].id}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(fila),
    });
    return { ok: true, serie: Array.isArray(upd) ? upd[0] : upd, actualizada: true };
  }
  const ins = await sb('series_log', {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(fila),
  });
  return { ok: true, serie: Array.isArray(ins) ? ins[0] : ins, actualizada: false };
}

async function cerrarSesion(cliente, cuerpo) {
  const sesion = await sesionPropia(cliente.id, cuerpo.sesion_id);
  if (!sesion) return { ok: false, motivo: 'no_es_suya' };
  const ahora = new Date();

  // La duración se mide desde la PRIMERA SERIE marcada, no desde que se abrió
  // la rutina. Abrir no es entrenar: quien mira su rutina a las 6am y entrena
  // a las 7pm tendría una sesión de trece horas, y ese número contamina
  // cualquier promedio que el coach mire después. Si no marcó ninguna serie,
  // no hay duración que reportar — mejor null que un número inventado.
  let dur = null;
  const primeras = await sb(`series_log?select=created_at&sesion_id=eq.${sesion.id}`
    + `&order=created_at.asc&limit=1`);
  const inicio = Array.isArray(primeras) && primeras[0] ? primeras[0].created_at : null;
  if (inicio) dur = Math.max(0, Math.round((ahora - new Date(inicio)) / 1000));
  // Qué récords batió hoy. Se mira ANTES de marcar la sesión como cerrada
  // porque da igual el estado: lo que cuenta son las series que dejó.
  let records = [];
  if (cuerpo.estado !== 'saltada') {
    try {
      const hoy = await sb(`series_log?select=ejercicio_id,reps,peso,unidad`
        + `&sesion_id=eq.${sesion.id}&completada=is.true`);
      const series = Array.isArray(hoy) ? hoy : [];
      const ids = [...new Set(series.map(x => x.ejercicio_id))];
      if (ids.length) {
        const antes = await ultimasSeries(cliente.id, ids, { excluirSesion: sesion.id });
        const previos = {};
        Object.entries(antes).forEach(([id, v]) => { if (v.record) previos[id] = v.record; });
        records = recordsBatidos(previos, series);
        // El nombre, para poder enseñárselo. Sin esto es un id.
        if (records.length) {
          const ej = await sb(`ejercicios?select=id,nombre&id=in.(${records.map(r => r.ejercicio_id).join(',')})`);
          const nombre = Object.fromEntries((Array.isArray(ej) ? ej : []).map(e => [e.id, e.nombre]));
          records = records.map(r => ({ ...r, nombre: nombre[r.ejercicio_id] || 'Ejercicio' }));
        }
      }
    } catch (e) {
      // Un récord no calculado no puede impedir cerrar la sesión: lo que el
      // cliente acaba de entrenar ya está guardado y eso es lo que importa.
      records = [];
    }
  }

  const cierre = {
    estado: cuerpo.estado === 'saltada' ? 'saltada' : 'completada',
    finalizada_en: ahora.toISOString(),
    duracion_seg: dur,
    rpe: (() => {
      const n = Number(cuerpo.rpe);
      return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : null;
    })(),
    notas_cliente: cuerpo.notas ? String(cuerpo.notas).slice(0, 500) : null,
  };
  // Los récords se guardan con la sesión para que la Bandeja del CRM los
  // enseñe sin recalcular el historial de todos los clientes. La columna
  // llega con carga/migracion-bandeja.sql; sin ella se cierra igual.
  const conRecords = records.length ? { ...cierre, records } : cierre;
  const upd = await sb(`sesiones?id=eq.${sesion.id}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(conRecords),
  }).catch(() => sb(`sesiones?id=eq.${sesion.id}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(cierre),
  }));
  // Una nota al cerrar ("me molestó el hombro") es de las que el coach tiene
  // que ver hoy, no el domingo: le llega al teléfono.
  if (cierre.notas_cliente) {
    await alertarCoach({
      title: `${cliente.nombre} · ${cierre.estado === 'saltada' ? 'no pudo entrenar' : 'terminó su rutina'}`,
      body: cierre.notas_cliente,
    });
    const rr = sesion.rutina_id
      ? await sb(`rutinas?select=nombre&id=eq.${sesion.rutina_id}&limit=1`).catch(() => [])
      : [];
    await whatsappCoach(textoNotaWhatsapp({
      cliente: cliente.nombre, alCerrar: true,
      rutina: `${Array.isArray(rr) && rr[0] ? rr[0].nombre : 'su rutina'} (${cierre.estado === 'saltada' ? 'no pudo entrenar' : 'terminó'})`,
      texto: cierre.notas_cliente,
    }));
  }
  return { ok: true, sesion: Array.isArray(upd) ? upd[0] : upd, records };
}

// ══════════════════════════════════════════════════════════════════════════
// EL MES
// ══════════════════════════════════════════════════════════════════════════
// Todo lo que pasó y va a pasar en un mes, en una sola petición: lo que
// tocaba cada día, lo que entrenó, la actividad que registró y lo que el
// coach le programó aparte.
//
// LA FUERZA MANDA. La app pinta el cardio y los deportes apagados a
// propósito, pero la jerarquía empieza aquí: cada día trae `rutina` como
// campo propio y lo demás en listas aparte, para que la pantalla no tenga
// que adivinar qué es lo importante.
async function verMes(cliente, ym, hoy) {
  const mes = /^\d{4}-\d{2}$/.test(String(ym || '')) ? String(ym) : hoy.slice(0, 7);
  const [y, m] = mes.split('-').map(Number);
  const primero = `${mes}-01`;
  const ultimo = `${mes}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;

  const fases = await sb(`fases?select=id,nombre,semanas,fecha_inicio,dias_semana,orden,visible_cliente`
    + `&cliente_id=eq.${cliente.id}&${FASE_VISIBLE}&order=orden.desc&limit=1`);
  const fase = Array.isArray(fases) ? fases[0] : null;

  let porDia = {}, rutinas = [], rutinaDe = () => null;
  if (fase) {
    const rr = await sb(`rutinas?select=id,nombre,dia_orden,dia_semana,dias_semana,tipo_sesion,duracion_estimada_min,visible_cliente`
      + `&fase_id=eq.${fase.id}&archivada=is.false&order=dia_orden.asc`);
    rutinas = (Array.isArray(rr) ? rr : []).filter(r => rutinaVisible(r, fase));
    porDia = repartirPorDia(fase, rutinas);
    rutinaDe = rutinaPorFecha(fase, porDia, await movimientosDe(sb, `cliente_id=eq.${cliente.id}&fase_id=eq.${fase.id}`),
      await extrasDe(sb, `cliente_id=eq.${cliente.id}&fase_id=eq.${fase.id}`, rutinas));
  }
  const musculos = await musculosDeRutinas(rutinas);

  // Las tres cosas que pasaron, en paralelo: tres viajes encadenados por un
  // mes se notan en el teléfono.
  const [ses, act, evs, regs] = await Promise.all([
    sb(`sesiones?select=id,rutina_id,fecha,estado,rpe,duracion_seg`
      + `&cliente_id=eq.${cliente.id}&fecha=gte.${primero}&fecha=lte.${ultimo}`),
    sb(`actividades?select=id,fecha,tipo,titulo,duracion_min,distancia_km,intensidad`
      + `&cliente_id=eq.${cliente.id}&fecha=gte.${primero}&fecha=lte.${ultimo}`).catch(() => []),
    eventosDelCliente(cliente.id),
    sb(`evento_registros?select=evento_id,fecha,estado,valor&cliente_id=eq.${cliente.id}&fecha=gte.${primero}&fecha=lte.${ultimo}`).catch(() => []),
  ]);
  const hechoDe = {};
  (Array.isArray(regs) ? regs : []).forEach(r => { hechoDe[`${r.evento_id}:${r.fecha}`] = r; });
  const sesiones = Array.isArray(ses) ? ses : [];
  const actividades = Array.isArray(act) ? act : [];
  const eventosPorFecha = expandirEventos(evs, fase);

  // El nombre de lo que entrenó de verdad, aunque no fuera lo que tocaba ese
  // día (o fuera de una fase anterior): el mes es el registro de lo que pasó.
  const nombreRutina = Object.fromEntries(rutinas.map(r => [r.id, r.nombre]));
  const faltan = [...new Set(sesiones.map(x => x.rutina_id).filter(id => id && !nombreRutina[id]))];
  if (faltan.length) {
    const otras = await sb(`rutinas?select=id,nombre&cliente_id=eq.${cliente.id}&id=in.(${faltan.join(',')})`).catch(() => []);
    (Array.isArray(otras) ? otras : []).forEach(r => { nombreRutina[r.id] = r.nombre; });
  }

  // La fecha de corte de su mensualidad en este mes (el día de pago de su
  // ficha; si el mes es más corto, el último día). Solo a clientes activos.
  const diaPago = Number(cliente.dia_pago);
  const corte = String(cliente.estado || 'activo').toLowerCase() === 'activo' && diaPago >= 1 && diaPago <= 31
    ? fechaCorte(y, m, diaPago) : null;

  const dias = [];
  for (let d = new Date(Date.UTC(y, m - 1, 1)); d.getUTCMonth() === m - 1; d.setUTCDate(d.getUTCDate() + 1)) {
    const fecha = d.toISOString().slice(0, 10);
    const letra = DIAS[(d.getUTCDay() + 6) % 7];
    const dentro = !!fase?.fecha_inicio && fecha >= fase.fecha_inicio
      && fecha <= finDeFase(fase);
    const r = dentro ? rutinaDe(fecha) : null;
    const s = r
      ? (sesiones.find(x => x.fecha === fecha && x.rutina_id === r.id)
        || sesiones.find(x => x.fecha === fecha && !x.rutina_id))
      : null;
    // Entrenó OTRA rutina ese día (movió el Push al martes, o entrenó en su
    // día de descanso). Antes no salía en ningún lado: el cliente entrenaba y
    // su calendario decía que no.
    const otra = (!s || s.estado !== 'completada')
      ? sesiones.find(x => x.fecha === fecha && x.estado === 'completada' && x.rutina_id && x.rutina_id !== r?.id)
      : null;
    dias.push({
      fecha, dia: letra, es_hoy: fecha === hoy,
      semana: dentro ? Math.floor((Date.parse(fecha) - Date.parse(fase.fecha_inicio)) / 86400000 / 7) + 1 : null,
      rutina: r ? { id: r.id, nombre: r.nombre, corto: nombreCorto(r.nombre), minutos: r.duracion_estimada_min || null } : null,
      movida: dentro && !!rutinaDe.movida && rutinaDe.movida(fecha),
      extra: dentro && !!rutinaDe.extra && rutinaDe.extra(fecha),
      estado: s ? s.estado : null,          // completada | saltada | en_curso | null
      rpe: s ? s.rpe : (otra ? otra.rpe : null),
      hecho: otra ? { id: otra.rutina_id, nombre: nombreRutina[otra.rutina_id] || 'Entreno', corto: nombreCorto(nombreRutina[otra.rutina_id] || 'Entreno') } : null,
      inicio_ciclo: !!fase?.fecha_inicio && fecha === fase.fecha_inicio,
      fin_ciclo: !!fase?.fecha_inicio && !!fase?.semanas && fecha === finDeFase(fase),
      corte_pago: fecha === corte,
      actividades: actividades.filter(a => a.fecha === fecha),
      // Medición, peso y fotos llevan si ya lo marcó (y el peso que puso).
      eventos: (eventosPorFecha[fecha] || []).map(ev => {
        const r = hechoDe[`${ev.id}:${fecha}`];
        return { ...ev, registra: TIPOS_REGISTRO.includes(ev.tipo), hecho: !!(r && r.estado === 'hecho'), valor: r ? r.valor : null };
      }),
    });
  }

  return {
    ok: true, mes, hoy,
    fase: fase ? { nombre: nombreFase(fase.nombre), semanas: fase.semanas, desde: fase.fecha_inicio, hasta: finDeFase(fase) } : null,
    // La semana en la que se puede mover y añadir.
    semana: { desde: lunesDe(hoy), hasta: sumarDiasISO(lunesDe(hoy), 6) },
    // Las rutinas del ciclo, con lo que trabajan: para añadir una a un día
    // libre y para avisar si dos días seguidos cargan los mismos músculos.
    rutinas: rutinas.map(r => ({ id: r.id, nombre: r.nombre, corto: nombreCorto(r.nombre), musculos: musculos[r.id] || [] })),
    dias,
  };
}

// ── MEDICIÓN, PESO Y FOTOS: «YA LO HICE» ──────────────────────────────────
// El coach los pone en el calendario; el cliente los marca desde su día. Se
// guarda en `evento_registros` (uno por fecha) y le llega un aviso al coach
// al instante, además de salir en la Bandeja del CRM.
const QUE_HIZO = {
  medidas: 'hizo su medición corporal',
  peso: 'se pesó',
  fotos: 'envió su registro fotográfico',
  medicion: 'hizo su medición',
};
async function registrarEvento(cliente, cuerpo, hoy) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(cuerpo.fecha || '')) ? String(cuerpo.fecha) : hoy;
  if (fecha > sumarDiasISO(hoy, 1)) return { ok: false, motivo: 'fecha_futura' };
  if (!cuerpo.evento_id) return { ok: false, motivo: 'sin_evento' };

  // Que el evento sea SUYO, lo vea, y caiga ese día.
  const evs = await eventosDelCliente(cliente.id);
  const ev = evs.find(e => e.id === cuerpo.evento_id);
  if (!ev) return { ok: false, motivo: 'no_es_suyo' };
  if (!TIPOS_REGISTRO.includes(ev.tipo)) return { ok: false, motivo: 'no_se_registra' };
  let fase = null;
  if (ev.fase_id) {
    const f = await sb(`fases?select=id,fecha_inicio,semanas,dias_semana,visible_cliente&id=eq.${ev.fase_id}&limit=1`);
    fase = Array.isArray(f) ? f[0] : null;
  }
  if (!(expandirEventos([ev], fase)[fecha] || []).length) return { ok: false, motivo: 'no_cae_ese_dia' };

  const deshacer = cuerpo.hecho === false;
  const valor = ev.tipo === 'peso' ? aNumero(cuerpo.valor) : null;
  if (valor != null && (valor < 25 || valor > 350)) return { ok: false, motivo: 'valor_raro' };
  const fila = {
    evento_id: ev.id, cliente_id: cliente.id, fecha,
    estado: deshacer ? 'saltado' : 'hecho',
    valor, nota: cuerpo.nota ? String(cuerpo.nota).slice(0, 300) : null,
  };
  try {
    const ya = await sb(`evento_registros?select=id,estado&evento_id=eq.${ev.id}&fecha=eq.${fecha}&limit=1`);
    const previo = Array.isArray(ya) ? ya[0] : null;
    if (previo) {
      await sb(`evento_registros?id=eq.${previo.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(fila) });
    } else {
      await sb('evento_registros', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(fila) });
    }
    // Un aviso por hecho: marcarlo dos veces (o corregir el peso) no te
    // vuelve a sonar el teléfono.
    if (!deshacer && !(previo && previo.estado === 'hecho') && !cuerpo.sin_alerta) {
      await alertarCoach({
        title: `${cliente.nombre} ${QUE_HIZO[ev.tipo] || 'registró algo'}`,
        body: [ev.titulo, valor != null ? `${String(valor).replace('.', ',')} kg` : null, fila.nota].filter(Boolean).join(' · '),
        tag: 'ecm-registro',
      });
    }
  } catch (e) {
    return { ok: false, motivo: 'error' };
  }
  return { ok: true, hecho: !deshacer, tipo: ev.tipo, fecha };
}

// ── MOVER UNA RUTINA DE DÍA ───────────────────────────────────────────────
// El cliente arrastra la rutina en su calendario. Se guarda como un cambio
// de UNA fecha (ver rutinaPorFecha); si el destino tenía rutina, se
// intercambian. Reglas:
//   · las dos fechas dentro de la semana en curso (lunes a domingo), también
//     los días que ya pasaron: si perdió el martes, lo pasa al jueves para
//     compensar. Lo de otras semanas lo planea el coach;
//   · las dos fechas dentro de la fase;
//   · la rutina tiene que estar de verdad ese día (lo que ve el cliente);
//   · no se mueve lo ya entrenado.
async function moverRutina(cliente, cuerpo, hoy) {
  const fecha = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
  const desde = fecha(cuerpo.desde), hasta = fecha(cuerpo.hasta);
  if (!desde || !hasta || desde === hasta) return { ok: false, motivo: 'fechas' };
  // Solo dentro de la semana en curso: lo de otras semanas lo planea el coach.
  if (![desde, hasta].every(enSemanaActual(hoy))) return { ok: false, motivo: 'otra_semana' };

  const ctx = await contextoCalendario(cliente);
  if (!ctx) return { ok: false, motivo: 'sin_fase' };
  const { fase, rutinaDe } = ctx;
  const fin = finDeFase(fase);
  if ([desde, hasta].some(f => f < fase.fecha_inicio || f > fin)) return { ok: false, motivo: 'fuera_de_fase' };

  const r = rutinaDe(desde);
  if (!r || (cuerpo.rutina_id && r.id !== cuerpo.rutina_id)) return { ok: false, motivo: 'no_esta_ese_dia' };
  // Una rutina añadida no se arrastra (se quita y se añade en otro día), y
  // no se intercambia con una: sería mover algo que no es del plan.
  if (rutinaDe.extra(desde) || rutinaDe.extra(hasta)) return { ok: false, motivo: 'es_extra' };

  const hechas = await sb(`sesiones?select=id,fecha,rutina_id,estado&cliente_id=eq.${cliente.id}`
    + `&fecha=in.(${desde},${hasta})&estado=eq.completada`);
  if ((Array.isArray(hechas) ? hechas : []).length) return { ok: false, motivo: 'ya_entrenada' };

  try {
    const ins = await sb('rutina_movimientos', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: cliente.user_id, cliente_id: cliente.id, fase_id: fase.id, rutina_id: r.id, desde, hasta, origen: 'cliente' }),
    });
    if (!Array.isArray(ins) || !ins[0]) return { ok: false, motivo: 'error' };
  } catch (e) {
    return { ok: false, motivo: 'sin_tabla' };
  }
  const otra = rutinaDe(hasta);
  return { ok: true, movida: { id: r.id, nombre: r.nombre, desde, hasta }, intercambio: otra ? { id: otra.id, nombre: otra.nombre } : null };
}

// ¿Cae en la semana en curso (lunes a domingo)?
const enSemanaActual = (hoy) => (f) => f >= lunesDe(hoy) && f <= sumarDiasISO(lunesDe(hoy), 6);

// La fase visible, sus rutinas y qué rutina cae cada día (con lo movido y lo
// añadido por el cliente). Lo comparten mover, añadir y quitar.
async function contextoCalendario(cliente) {
  const fases = await sb(`fases?select=id,nombre,semanas,fecha_inicio,dias_semana,orden,visible_cliente`
    + `&cliente_id=eq.${cliente.id}&${FASE_VISIBLE}&order=orden.desc&limit=1`);
  const fase = Array.isArray(fases) ? fases[0] : null;
  if (!fase) return null;
  const rr = await sb(`rutinas?select=id,nombre,dia_orden,dia_semana,dias_semana,tipo_sesion,duracion_estimada_min,visible_cliente`
    + `&fase_id=eq.${fase.id}&archivada=is.false&order=dia_orden.asc`);
  const rutinas = (Array.isArray(rr) ? rr : []).filter(r => rutinaVisible(r, fase));
  const filtro = `cliente_id=eq.${cliente.id}&fase_id=eq.${fase.id}`;
  const rutinaDe = rutinaPorFecha(fase, repartirPorDia(fase, rutinas), await movimientosDe(sb, filtro), await extrasDe(sb, filtro, rutinas));
  return { fase, rutinas, rutinaDe };
}

// Los músculos principales que trabaja cada rutina (unión de sus ejercicios).
async function musculosDeRutinas(rutinas) {
  if (!rutinas.length) return {};
  try {
    const re = await sb(`rutina_ejercicios?select=rutina_id,ejercicio_id&rutina_id=in.(${rutinas.map(r => r.id).join(',')})`);
    const lista = Array.isArray(re) ? re : [];
    const ejIds = [...new Set(lista.map(x => x.ejercicio_id))];
    const ejs = ejIds.length ? await sb(`ejercicios?select=id,nombre,alias,tipo,musculos_primarios&id=in.(${ejIds.join(',')})`) : [];
    const mus = {};
    (Array.isArray(ejs) ? ejs : []).forEach(e => { mus[e.id] = completarMusculos(e).musculos_primarios || []; });
    const out = {};
    lista.forEach(x => { (out[x.rutina_id] ||= new Set()); (mus[x.ejercicio_id] || []).forEach(m => out[x.rutina_id].add(m)); });
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
  } catch (e) { return {}; }
}

// ── AÑADIR UNA RUTINA A UN DÍA LIBRE ─────────────────────────────────────
// «Este sábado quiero hacer otra vez el Push.» Solo en la semana en curso
// (también un día que ya pasó, si lo entrenó y no lo tenía), en un día SIN rutina, y con una rutina de su ciclo. Se
// guarda aparte (`rutina_extras`): el plan del coach no cambia.
async function agregarRutina(cliente, cuerpo, hoy) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(cuerpo.fecha || '')) ? String(cuerpo.fecha) : null;
  if (!fecha) return { ok: false, motivo: 'fechas' };
  if (!enSemanaActual(hoy)(fecha)) return { ok: false, motivo: 'otra_semana' };
  const ctx = await contextoCalendario(cliente);
  if (!ctx) return { ok: false, motivo: 'sin_fase' };
  const { fase, rutinas, rutinaDe } = ctx;
  if (fecha < fase.fecha_inicio || fecha > finDeFase(fase)) return { ok: false, motivo: 'fuera_de_fase' };
  const r = rutinas.find(x => x.id === cuerpo.rutina_id);
  if (!r) return { ok: false, motivo: 'no_es_suya' };
  if (rutinaDe(fecha)) return { ok: false, motivo: 'ocupado' };
  try {
    const ins = await sb('rutina_extras', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: cliente.user_id, cliente_id: cliente.id, fase_id: fase.id, rutina_id: r.id, fecha }),
    });
    if (!Array.isArray(ins) || !ins[0]) return { ok: false, motivo: 'error' };
  } catch (e) {
    return { ok: false, motivo: 'sin_tabla' };
  }
  return { ok: true, agregada: { id: r.id, nombre: r.nombre, fecha } };
}

// Quitar una rutina AÑADIDA (las del plan no se quitan, se mueven).
async function quitarRutina(cliente, cuerpo, hoy) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(cuerpo.fecha || '')) ? String(cuerpo.fecha) : null;
  if (!fecha) return { ok: false, motivo: 'fechas' };
  if (!enSemanaActual(hoy)(fecha)) return { ok: false, motivo: 'otra_semana' };
  const hechas = await sb(`sesiones?select=id&cliente_id=eq.${cliente.id}&fecha=eq.${fecha}&estado=eq.completada`).catch(() => []);
  if ((Array.isArray(hechas) ? hechas : []).length) return { ok: false, motivo: 'ya_entrenada' };
  try {
    const del = await sb(`rutina_extras?cliente_id=eq.${cliente.id}&fecha=eq.${fecha}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
    if (!Array.isArray(del) || !del.length) return { ok: false, motivo: 'no_hay' };
  } catch (e) {
    return { ok: false, motivo: 'sin_tabla' };
  }
  return { ok: true };
}

// Los eventos que el coach le programó Y decidió mostrarle. La tabla puede
// no existir todavía (si no se corrió la migración), y eso no debe tumbar el
// calendario: se devuelve vacío.
async function eventosDelCliente(clienteId) {
  try {
    const e = await sb(`eventos?select=id,fase_id,tipo,titulo,detalle,hora,fecha,dias_semana,semanas,visible_cliente`
      + `&cliente_id=eq.${clienteId}`);
    return Array.isArray(e) ? e : [];
  } catch (err) { return []; }
}

// ══════════════════════════════════════════════════════════════════════════
// TODAS SUS RUTINAS  ·  vista informativa, sin ejecutar nada
// ══════════════════════════════════════════════════════════════════════════
async function verRutinas(cliente) {
  const fases = await sb(`fases?select=id,nombre,objetivo,semanas,fecha_inicio,dias_semana,visible_cliente`
    + `&cliente_id=eq.${cliente.id}&${FASE_VISIBLE}&order=orden.desc&limit=1`);
  const fase = Array.isArray(fases) ? fases[0] : null;
  if (!fase) return { ok: true, fase: null, rutinas: [] };

  const rr = await sb(`rutinas?select=id,nombre,descripcion,dia_orden,dia_semana,dias_semana,tipo_sesion,duracion_estimada_min,visible_cliente`
    + `&fase_id=eq.${fase.id}&archivada=is.false&order=dia_orden.asc`);
  const rutinas = (Array.isArray(rr) ? rr : []).filter(r => rutinaVisible(r, fase));
  if (!rutinas.length) return { ok: true, fase: { nombre: nombreFase(fase.nombre), objetivo: objetivoCliente(fase.objetivo) }, rutinas: [] };

  // Qué trabaja cada rutina: los músculos de sus ejercicios, para que se
  // distinga "Push" de "Pull" sin abrir ninguna.
  const ids = rutinas.map(r => r.id).join(',');
  const re = await sb(`rutina_ejercicios?select=rutina_id,ejercicio_id&rutina_id=in.(${ids})`);
  const lista = Array.isArray(re) ? re : [];
  const ejIds = [...new Set(lista.map(x => x.ejercicio_id))];
  const ejs = ejIds.length
    ? await sb(`ejercicios?select=id,musculos_primarios&id=in.(${ejIds.join(',')})`)
    : [];
  const musDe = {};
  (Array.isArray(ejs) ? ejs : []).forEach(e => { musDe[e.id] = e.musculos_primarios || []; });

  const porDia = repartirPorDia(fase, rutinas);
  return {
    ok: true,
    fase: {
      nombre: nombreFase(fase.nombre), objetivo: objetivoCliente(fase.objetivo),
      semanas: fase.semanas, desde: fase.fecha_inicio, hasta: finDeFase(fase),
    },
    rutinas: rutinas.map(r => {
      const suyos = lista.filter(x => x.rutina_id === r.id);
      const mus = [...new Set(suyos.flatMap(x => musDe[x.ejercicio_id] || []))];
      const dia = Object.keys(porDia).find(d => porDia[d] && porDia[d].id === r.id) || null;
      return {
        id: r.id, nombre: r.nombre, descripcion: r.descripcion,
        tipo: r.tipo_sesion, minutos: r.duracion_estimada_min || null,
        ejercicios: suyos.length, dia, musculos: mus,
      };
    }),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// ACTIVIDAD COMPLEMENTARIA
// ══════════════════════════════════════════════════════════════════════════
async function verCatalogo() {
  try {
    const c = await sb('actividades_catalogo?select=slug,nombre,categoria,icono,remate,pide_distancia,orden'
      + '&activo=is.true&order=orden.asc');
    return { ok: true, catalogo: Array.isArray(c) ? c : [] };
  } catch (e) {
    // Sin la migración corrida, la app ofrece su lista mínima de respaldo en
    // vez de quedarse sin nada que ofrecer.
    return { ok: true, catalogo: [], motivo: 'sin_tabla' };
  }
}

async function guardarActividad(cliente, cuerpo, hoy) {
  const tipo = String(cuerpo.tipo || '').trim();
  if (!tipo) return { ok: false, motivo: 'sin_tipo' };
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(cuerpo.fecha || '')) ? String(cuerpo.fecha) : hoy;
  // Nada de registrar en el futuro: marcar una caminata de la semana que
  // viene descuadra la adherencia de una semana que aún no pasó. Un día de
  // margen: «hoy» es la fecha de Bogotá y el teléfono puede ir adelantado
  // (un cliente de viaje en Europa, de noche, ya está en mañana).
  if (fecha > sumarDiasISO(hoy, 1)) return { ok: false, motivo: 'fecha_futura' };

  const num = (v, max) => {
    const n = aNumero(v);
    return n != null && n > 0 ? Math.min(n, max) : null;
  };
  const fila = {
    user_id: cliente.user_id,          // obligatorio en la base (ver abrirSesion)
    cliente_id: cliente.id,
    fecha,
    tipo,
    titulo: cuerpo.titulo ? String(cuerpo.titulo).slice(0, 80) : null,
    duracion_min: num(cuerpo.duracion_min, 1440),
    distancia_km: num(cuerpo.distancia_km, 500),
    intensidad: ['suave', 'moderada', 'fuerte'].includes(cuerpo.intensidad) ? cuerpo.intensidad : null,
    rpe: (() => { const n = Number(cuerpo.rpe); return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : null; })(),
    notas: cuerpo.notas ? String(cuerpo.notas).slice(0, 300) : null,
    evento_id: cuerpo.evento_id || null,
    sesion_id: cuerpo.sesion_id || null,
    origen: 'cliente',
  };

  try {
    // Editar en vez de duplicar: si manda el id de una que ya registró, se
    // corrige. Marcar dos veces la misma caminata la contaría dos veces en
    // el resumen del coach.
    if (cuerpo.id) {
      const mia = await sb(`actividades?select=id&id=eq.${encodeURIComponent(cuerpo.id)}&cliente_id=eq.${cliente.id}&limit=1`);
      if (!Array.isArray(mia) || !mia[0]) return { ok: false, motivo: 'no_es_suya' };
      const upd = await sb(`actividades?id=eq.${mia[0].id}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(fila),
      });
      return { ok: true, actividad: Array.isArray(upd) ? upd[0] : upd, actualizada: true };
    }
    const ins = await sb('actividades', {
      method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(fila),
    });
    return { ok: true, actividad: Array.isArray(ins) ? ins[0] : ins, actualizada: false };
  } catch (e) {
    return { ok: false, motivo: 'sin_tabla' };
  }
}

async function borrarActividad(cliente, cuerpo) {
  if (!cuerpo.id) return { ok: false, motivo: 'sin_id' };
  try {
    const mia = await sb(`actividades?select=id&id=eq.${encodeURIComponent(cuerpo.id)}&cliente_id=eq.${cliente.id}&limit=1`);
    if (!Array.isArray(mia) || !mia[0]) return { ok: false, motivo: 'no_es_suya' };
    await sb(`actividades?id=eq.${mia[0].id}`, { method: 'DELETE' });
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: 'error' };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// EL RESUMEN DE LA SEMANA  ·  entrenamiento + alimentación
// ══════════════════════════════════════════════════════════════════════════
// Las dos mitades viven en bases distintas: el entrenamiento en el Supabase
// del CRM, la alimentación en `user_data` de esta misma app. Se juntan aquí
// y no en el navegador porque el módulo de entrenamiento corre dentro de un
// iframe y no tiene acceso al historial del padre.
async function verResumen(cliente, hoy) {
  const lunes = lunesDe(hoy);
  const domingo = (() => {
    const t = new Date(Date.parse(lunes + 'T00:00:00Z'));
    t.setUTCDate(t.getUTCDate() + 6);
    return t.toISOString().slice(0, 10);
  })();

  const fases = await sb(`fases?select=id,nombre,semanas,fecha_inicio,dias_semana,visible_cliente`
    + `&cliente_id=eq.${cliente.id}&${FASE_VISIBLE}&order=orden.desc&limit=1`);
  const fase = Array.isArray(fases) ? fases[0] : null;

  const [ses, act] = await Promise.all([
    sb(`sesiones?select=id,fecha,estado,rpe,duracion_seg`
      + `&cliente_id=eq.${cliente.id}&fecha=gte.${lunes}&fecha=lte.${domingo}`),
    sb(`actividades?select=id,fecha,tipo,duracion_min,distancia_km`
      + `&cliente_id=eq.${cliente.id}&fecha=gte.${lunes}&fecha=lte.${domingo}`).catch(() => []),
  ]);
  const sesiones = (Array.isArray(ses) ? ses : []);
  const hechas = sesiones.filter(s => s.estado === 'completada');
  const actividades = Array.isArray(act) ? act : [];
  const rpes = hechas.map(s => Number(s.rpe)).filter(n => Number.isFinite(n) && n > 0);

  return {
    ok: true,
    semana: { desde: lunes, hasta: domingo, iso: semanaISO(hoy) },
    entreno: {
      planeados: fase ? (fase.dias_semana || []).length : 0,
      hechos: hechas.length,
      saltados: sesiones.filter(s => s.estado === 'saltada').length,
      en_curso: sesiones.filter(s => s.estado === 'en_curso').length,
      minutos: Math.round(hechas.reduce((a, s) => a + (Number(s.duracion_seg) || 0), 0) / 60),
      rpe_promedio: rpes.length ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length * 10) / 10 : null,
      fase: fase ? { nombre: nombreFase(fase.nombre), semana_actual: semanaDeFase(fase, hoy), semanas: fase.semanas } : null,
    },
    complementaria: {
      veces: actividades.length,
      minutos: actividades.reduce((a, x) => a + (Number(x.duracion_min) || 0), 0),
      km: Math.round(actividades.reduce((a, x) => a + (Number(x.distancia_km) || 0), 0) * 10) / 10,
      tipos: [...new Set(actividades.map(x => x.tipo))],
    },
    alimentacion: await resumenAlimentacion(cliente.nombre, lunes, domingo),
  };
}

// La mitad de alimentación sale de `user_data`, que es de ESTA app, no del
// CRM. `history[fecha]` ya trae el total del día calculado por el
// mealtracker: aquí solo se promedia, para no tener una segunda forma de
// sumar macros que se desvíe de la que el cliente ve en su pantalla.
async function resumenAlimentacion(nombre, lunes, domingo) {
  const URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!URL || !KEY) return null;
  try {
    const r = await fetch(
      `${URL}/rest/v1/user_data?select=name,history:data->history,goals:data->goals`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!r.ok) return null;
    const filas = await r.json();
    const buscado = normalizeName(nombre);
    const fila = (Array.isArray(filas) ? filas : []).find(x => normalizeName(x.name) === buscado);
    if (!fila) return null;

    const history = fila.history || {};
    const dias = [];
    for (let t = new Date(Date.parse(lunes + 'T00:00:00Z'));
         t.toISOString().slice(0, 10) <= domingo;
         t.setUTCDate(t.getUTCDate() + 1)) {
      const f = t.toISOString().slice(0, 10);
      const tot = history[f];
      if (tot && typeof tot === 'object') {
        dias.push({ kcal: Number(tot.kcal || 0), p: Number(tot.p || 0), c: Number(tot.c || 0), g: Number(tot.g || 0) });
      }
    }
    const prom = (k) => dias.length ? Math.round(dias.reduce((a, b) => a + b[k], 0) / dias.length) : null;
    const goals = fila.goals || {};
    return {
      dias: dias.length,
      kcal: prom('kcal'), proteina: prom('p'), carbos: prom('c'), grasas: prom('g'),
      meta_kcal: Number(goals.kcal) || null,
      meta_proteina: Number(goals.p) || null,
    };
  } catch (e) {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// MIS MEDIDAS  ·  peso y % de grasa que registra el propio cliente
// ══════════════════════════════════════════════════════════════════════════
// Van a la MISMA tabla que las mediciones que registra el coach en el CRM
// (mediciones_corporales), así la gráfica de Composición y el aviso de "la
// meta quedó vieja" las usan sin cambiar nada. Se marcan `origen='cliente'`
// para distinguirlas; lo importado o lo del coach no lleva esa marca.
//
// Nunca se da por buena para cambiar la meta: el CRM la enseña y el coach
// decide, como con cualquier medición.
const MEDIDA_LIMITES = { peso: [25, 350], grasa: [2, 70] };

async function verMedidas(cliente) {
  const filas = await sb(`mediciones_corporales?select=id,fecha,peso,grasa_pct`
    + `&cliente_id=eq.${cliente.id}&order=fecha.desc&limit=24`).catch(() => null);
  if (!Array.isArray(filas)) return { ok: false, motivo: 'sin_tabla' };
  return { ok: true, medidas: filas.map(m => ({ id: m.id, fecha: m.fecha, peso: m.peso, grasa_pct: m.grasa_pct })) };
}

async function guardarMedida(cliente, cuerpo, hoy) {
  const peso = aNumero(cuerpo.peso);
  const grasa = aNumero(cuerpo.grasa_pct);
  const [pMin, pMax] = MEDIDA_LIMITES.peso, [gMin, gMax] = MEDIDA_LIMITES.grasa;
  if (peso == null && grasa == null) return { ok: false, motivo: 'vacia' };
  if (peso != null && (peso < pMin || peso > pMax)) return { ok: false, motivo: 'peso_fuera_de_rango' };
  if (grasa != null && (grasa < gMin || grasa > gMax)) return { ok: false, motivo: 'grasa_fuera_de_rango' };
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(cuerpo.fecha || '')) ? String(cuerpo.fecha) : hoy;
  // El mismo día de margen que la actividad: el teléfono pone su fecha.
  if (fecha > sumarDiasISO(hoy, 1)) return { ok: false, motivo: 'fecha_futura' };

  // La anterior, para decirle al coach cuánto cambió.
  const previas = await sb(`mediciones_corporales?select=fecha,peso,grasa_pct&cliente_id=eq.${cliente.id}`
    + `&fecha=lte.${fecha}&order=fecha.desc&limit=1`).catch(() => []);
  const previa = Array.isArray(previas) ? previas[0] : null;

  const fila = {
    user_id: cliente.user_id,
    cliente_id: cliente.id,
    fecha,
    peso,
    grasa_pct: grasa,
    notas: cuerpo.nota ? String(cuerpo.nota).slice(0, 300) : null,
  };
  const ins = await sb('mediciones_corporales', {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...fila, origen: 'cliente' }),
  }).catch(() => sb('mediciones_corporales', {   // sin la columna `origen` todavía
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(fila),
  }));
  const m = Array.isArray(ins) ? ins[0] : ins;
  if (!m) return { ok: false, motivo: 'no_se_guardo' };

  const dif = (a, b, u) => (a != null && b != null ? ` (${a - b > 0 ? '+' : ''}${(a - b).toFixed(1)} ${u})` : '');
  const partes = [
    peso != null ? `${peso} kg${dif(peso, previa ? Number(previa.peso) : null, 'kg')}` : null,
    grasa != null ? `${grasa}% grasa${dif(grasa, previa && previa.grasa_pct != null ? Number(previa.grasa_pct) : null, 'pts')}` : null,
  ].filter(Boolean);
  await alertarCoach({ title: `${cliente.nombre} registró su medida`, body: partes.join(' · '), tag: 'ecm-medida' });
  return { ok: true, medida: { id: m.id, fecha: m.fecha, peso: m.peso, grasa_pct: m.grasa_pct } };
}

// ══════════════════════════════════════════════════════════════════════════
// NOTAS PARA EL COACH  ·  sobre la rutina entera o sobre un ejercicio
// ══════════════════════════════════════════════════════════════════════════
// «El press me molesta en el hombro», «la rutina del jueves me queda larga».
// Llegan a la Bandeja del CRM y al teléfono del coach. La tabla
// `notas_entreno` llega con carga/migracion-bandeja.sql.
async function guardarNota(cliente, cuerpo, hoy) {
  const texto = String(cuerpo.texto || '').trim().slice(0, 600);
  if (!texto) return { ok: false, motivo: 'vacia' };

  // Todo lo que se referencia tiene que ser SUYO.
  let rutina = null, ejercicioNombre = null, ejercicioLargo = null;
  if (cuerpo.rutina_id) {
    const rr = await sb(`rutinas?select=id,nombre&id=eq.${encodeURIComponent(cuerpo.rutina_id)}&cliente_id=eq.${cliente.id}&limit=1`);
    rutina = Array.isArray(rr) ? rr[0] : null;
    if (!rutina) return { ok: false, motivo: 'no_es_suya' };
  }
  let reId = null, ejId = null;
  if (cuerpo.rutina_ejercicio_id && rutina) {
    const re = await sb(`rutina_ejercicios?select=id,ejercicio_id&id=eq.${encodeURIComponent(cuerpo.rutina_ejercicio_id)}&rutina_id=eq.${rutina.id}&limit=1`);
    const x = Array.isArray(re) ? re[0] : null;
    if (x) {
      reId = x.id; ejId = x.ejercicio_id;
      const ej = await sb(`ejercicios?select=nombre,alias&id=eq.${ejId}&limit=1`)
        .catch(() => sb(`ejercicios?select=nombre&id=eq.${ejId}&limit=1`)).catch(() => []);
      const x0 = Array.isArray(ej) ? ej[0] : null;
      ejercicioNombre = x0 ? x0.nombre : null;
      // En el WhatsApp va como en la app: inglés primero, español entre paréntesis.
      ejercicioLargo = x0 ? (x0.alias && x0.alias !== x0.nombre ? `${x0.alias} (${x0.nombre})` : x0.nombre) : null;
    }
  }
  let sesionId = null;
  if (cuerpo.sesion_id) {
    const s = await sb(`sesiones?select=id&id=eq.${encodeURIComponent(cuerpo.sesion_id)}&cliente_id=eq.${cliente.id}&limit=1`);
    sesionId = Array.isArray(s) && s[0] ? s[0].id : null;
  }

  let ins;
  try {
    ins = await sb('notas_entreno', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: cliente.user_id, cliente_id: cliente.id, fecha: hoy,
        rutina_id: rutina ? rutina.id : null, rutina_ejercicio_id: reId, ejercicio_id: ejId,
        sesion_id: sesionId, texto,
      }),
    });
  } catch (e) {
    return { ok: false, motivo: 'sin_tabla' };
  }
  const sobre = ejercicioNombre || (rutina ? rutina.nombre : null);
  await alertarCoach({ title: `${cliente.nombre}${sobre ? ` · ${sobre}` : ''}`, body: texto, tag: 'ecm-nota' });
  // Y a tu WhatsApp: con quién, qué ejercicio (o que es general) y la nota.
  await whatsappCoach(textoNotaWhatsapp({
    cliente: cliente.nombre, ejercicio: ejercicioLargo, rutina: rutina ? rutina.nombre : null, texto,
  }));
  const n = Array.isArray(ins) ? ins[0] : ins;
  return { ok: true, nota: { id: n && n.id, texto } };
}


// ══════════════════════════════════════════════════════════════════════════
// DASH · las últimas 12 semanas en números
// ══════════════════════════════════════════════════════════════════════════
// Lo que la pantalla de Dash dibuja del entrenamiento. La comida no pasa por
// aquí: la app ya la tiene en el teléfono, con los mismos totales que el
// cliente ve en su día.
//
// La FUERZA se mide con el 1RM estimado (Epley: kg × (1 + reps/30)) de la
// mejor serie de cada sesión. Es lo que deja comparar 60 × 10 con 65 × 6: el
// peso solo, o las reps solas, dicen «igual» o «peor» cuando se progresó.
// Series de más de 15 reps no cuentan: ahí la fórmula ya no significa nada.
const DASH_SEMANAS = 12;
const DASH_EJERCICIOS = 4;
const E1RM_MAX_REPS = 15;

export const e1rm = (kg, reps) => {
  const r = Number(reps);
  if (!(kg > 0) || !Number.isFinite(r) || r <= 0 || r > E1RM_MAX_REPS) return null;
  return Math.round(kg * (1 + r / 30) * 10) / 10;
};

// Puro, para poder probarlo sin base: recibe las filas ya leídas.
// `alias`: el nombre original en inglés, que la app muestra chico debajo.
// Las actividades de cardio, por si la tabla del catálogo no está.
const CARDIO_BASE = ['cinta', 'eliptica', 'remo_maquina', 'escaladora', 'bici_estatica', 'running', 'caminata', 'bici', 'ciclismo', 'spinning', 'trote', 'hiit', 'cuerda'];
// Lo del calendario que el coach le pide HACER (no citas ni notas).
const EVENTOS_QUE_SE_HACEN = ['actividad', 'medidas', 'peso', 'fotos', 'medicion'];

export function armarDash({ hoy, fases = [], sesiones = [], series = [], nombres = {}, alias = {}, actividades = [], medidas = [],
  eventosSemana = {}, registros = [], categorias = {} }) {
  const lunesHoy = lunesDe(hoy);
  const semanas = [];
  for (let i = DASH_SEMANAS - 1; i >= 0; i--) {
    const desde = sumarDiasISO(lunesHoy, -7 * i);
    semanas.push({ desde, hasta: sumarDiasISO(desde, 6), planeados: 0, hechos: 0, volumen_kg: 0, cardio_min: 0 });
  }
  const semanaDe = (f) => semanas.find(w => f >= w.desde && f <= w.hasta) || null;

  // Lo planeado: los días de la fase que cubría esa semana. Sin fase, cero —
  // no se inventa una meta que el coach no puso.
  semanas.forEach(w => {
    const f = fases.find(x => x.fecha_inicio && x.fecha_inicio <= w.hasta && finDeFase(x) >= w.desde);
    w.planeados = f ? (f.dias_semana || []).length : 0;
  });

  const fechaDe = {};
  sesiones.forEach(ses => {
    fechaDe[ses.id] = ses.fecha;
    if (ses.estado !== 'completada') return;
    const w = semanaDe(ses.fecha);
    if (w) w.hechos++;
  });

  // Mejor e1RM de cada ejercicio en cada fecha.
  const mejor = {};
  series.forEach(l => {
    const fecha = fechaDe[l.sesion_id];
    if (!fecha) return;
    const kg = aKg(l.peso, l.unidad);
    const reps = Number(l.reps);
    const w = semanaDe(fecha);
    if (w && kg > 0 && reps > 0) w.volumen_kg += kg * reps;
    const est = e1rm(kg, reps);
    if (est == null) return;
    const porFecha = mejor[l.ejercicio_id] || (mejor[l.ejercicio_id] = {});
    if (!porFecha[fecha] || est > porFecha[fecha]) porFecha[fecha] = est;
  });
  semanas.forEach(w => { w.volumen_kg = Math.round(w.volumen_kg); });

  actividades.forEach(a => {
    const w = semanaDe(a.fecha);
    if (w) w.cardio_min += Number(a.duracion_min) || 0;
  });

  // Los que más ha hecho, que son los que tienen una tendencia que leer. Con
  // una sola sesión no hay línea: se quedan fuera.
  const ejercicios = Object.entries(mejor)
    .map(([id, porFecha]) => {
      const puntos = Object.keys(porFecha).sort().map(fecha => ({ fecha, e1rm: porFecha[fecha] }));
      return { id, nombre: nombres[id] || 'Ejercicio', alias: alias[id] || null, puntos };
    })
    .filter(e => e.puntos.length >= 2)
    .sort((a, b) => b.puntos.length - a.puntos.length || a.nombre.localeCompare(b.nombre))
    .slice(0, DASH_EJERCICIOS)
    .map(e => ({ ...e, inicio: e.puntos[0].e1rm, actual: e.puntos[e.puntos.length - 1].e1rm }));

  // ── LA SEMANA EN CURSO, de lunes a domingo ──────────────────────────────
  //   fuerza  — entrenos hechos contra los días de la fase
  //   cardio  — días con cardio (caminadora, elíptica, running…)
  //   coach   — lo que el coach le puso en el calendario y ya hizo
  //   extra   — días con actividad que se puso él solo (deporte u otra),
  //             sin contar el cardio, que va aparte
  const actual = semanas[semanas.length - 1];
  const deLaSemana = (f) => f >= actual.desde && f <= actual.hasta;
  const esCardio = (tipo) => (categorias[tipo] ? categorias[tipo] === 'cardio' : CARDIO_BASE.includes(tipo));
  const actSemana = actividades.filter(a => deLaSemana(a.fecha));
  const diasCon = (lista) => new Set(lista.map(a => a.fecha)).size;
  const hechoRegistro = new Set(registros.filter(r => r.estado === 'hecho').map(r => `${r.evento_id}:${r.fecha}`));
  const hechoActividad = new Set(actSemana.filter(a => a.evento_id).map(a => `${a.evento_id}:${a.fecha}`));
  let coachTotal = 0, coachHechos = 0;
  Object.entries(eventosSemana).forEach(([fecha, evs]) => {
    if (!deLaSemana(fecha)) return;
    evs.filter(ev => EVENTOS_QUE_SE_HACEN.includes(ev.tipo)).forEach(ev => {
      coachTotal++;
      if (hechoRegistro.has(`${ev.id}:${fecha}`) || hechoActividad.has(`${ev.id}:${fecha}`)) coachHechos++;
    });
  });
  const semana = {
    desde: actual.desde, hasta: actual.hasta,
    fuerza: { hechos: actual.hechos, planeados: actual.planeados },
    cardio: { dias: diasCon(actSemana.filter(a => esCardio(a.tipo))) },
    coach: { hechos: coachHechos, total: coachTotal },
    extra: { dias: diasCon(actSemana.filter(a => !a.evento_id && a.tipo && !esCardio(a.tipo))) },
  };

  return {
    ok: true, hoy, semanas, ejercicios, semana,
    medidas: medidas.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
      .map(m => ({ fecha: m.fecha, peso: m.peso == null ? null : Number(m.peso), grasa_pct: m.grasa_pct == null ? null : Number(m.grasa_pct) })),
  };
}

// Todas las filas, de mil en mil: Supabase no devuelve más de 1.000 por
// consulta y un cliente de cinco días a la semana pasa de eso en 12 semanas.
async function todas(path) {
  const out = [];
  for (let offset = 0; offset < 50000; offset += 1000) {
    const pag = await sb(`${path}&limit=1000&offset=${offset}`);
    const filas = Array.isArray(pag) ? pag : [];
    out.push(...filas);
    if (filas.length < 1000) break;
  }
  return out;
}

async function verDash(cliente, hoy) {
  const desde = sumarDiasISO(lunesDe(hoy), -7 * (DASH_SEMANAS - 1));
  const lunes = lunesDe(hoy), domingo = sumarDiasISO(lunesDe(hoy), 6);
  const [fases, sesiones, actividades, medidas, eventos, registros, catalogo] = await Promise.all([
    // Las fases pasadas también cuentan (la de hace dos meses ya está
    // finalizada): lo planeado de cada semana sale de la que la cubría.
    sb(`fases?select=id,fecha_inicio,semanas,dias_semana,visible_cliente,estado`
      + `&cliente_id=eq.${cliente.id}&estado=in.(activa,finalizada)&visible_cliente=is.true&order=orden.desc`).catch(() => []),
    todas(`sesiones?select=id,fecha,estado&cliente_id=eq.${cliente.id}&fecha=gte.${desde}&fecha=lte.${hoy}&order=fecha.asc`),
    sb(`actividades?select=fecha,duracion_min,tipo,evento_id&cliente_id=eq.${cliente.id}&fecha=gte.${desde}&fecha=lte.${hoy}`)
      .catch(() => sb(`actividades?select=fecha,duracion_min&cliente_id=eq.${cliente.id}&fecha=gte.${desde}&fecha=lte.${hoy}`)).catch(() => []),
    sb(`mediciones_corporales?select=fecha,peso,grasa_pct&cliente_id=eq.${cliente.id}&order=fecha.desc&limit=24`).catch(() => []),
    // Lo que el coach le puso en el calendario ESTA semana, y lo que ya marcó.
    eventosDelCliente(cliente.id),
    sb(`evento_registros?select=evento_id,fecha,estado&cliente_id=eq.${cliente.id}&fecha=gte.${lunes}&fecha=lte.${domingo}`).catch(() => []),
    sb('actividades_catalogo?select=slug,categoria').catch(() => []),
  ]);

  // Las series solo de las sesiones hechas, en tandas: una lista de cientos
  // de ids en la URL la corta el servidor.
  const ids = sesiones.filter(x => x.estado === 'completada').map(x => x.id);
  const series = [];
  for (let i = 0; i < ids.length; i += 80) {
    const tanda = ids.slice(i, i + 80).join(',');
    series.push(...await todas(`series_log?select=sesion_id,ejercicio_id,reps,peso,unidad`
      + `&sesion_id=in.(${tanda})&completada=is.true&order=id.asc`));
  }

  const ejIds = [...new Set(series.map(x => x.ejercicio_id).filter(Boolean))];
  const nombres = {}, alias = {};
  for (let i = 0; i < ejIds.length; i += 80) {
    const ejs = await sb(`ejercicios?select=id,nombre,alias&id=in.(${ejIds.slice(i, i + 80).join(',')})`)
      .catch(() => sb(`ejercicios?select=id,nombre&id=in.(${ejIds.slice(i, i + 80).join(',')})`));
    (Array.isArray(ejs) ? ejs : []).forEach(e => { nombres[e.id] = e.nombre; alias[e.id] = e.alias || null; });
  }

  const listaFases = Array.isArray(fases) ? fases : [];
  const faseHoy = listaFases.find(x => x.fecha_inicio && x.fecha_inicio <= hoy && finDeFase(x) >= hoy) || null;
  return armarDash({
    hoy, fases: listaFases, sesiones, series, nombres, alias,
    actividades: Array.isArray(actividades) ? actividades : [],
    medidas: Array.isArray(medidas) ? medidas : [],
    eventosSemana: expandirEventos(Array.isArray(eventos) ? eventos : [], faseHoy),
    registros: Array.isArray(registros) ? registros : [],
    categorias: Object.fromEntries((Array.isArray(catalogo) ? catalogo : []).map(c => [c.slug, c.categoria])),
  });
}

// ── COMUNIDAD ─────────────────────────────────────────────────────────────
// Lo que publica SU coach (nadie más escribe). Cada publicación con el total
// de cada reacción y las que puso esta persona. Sin la tabla (migración sin
// correr) responde ok:false y la app dice que aún no hay nada.
export const REACCIONES = ['fuego', 'fuerza', 'aplauso', 'corazon'];

async function verComunidad(cliente) {
  if (!cliente.user_id) return { ok: true, posts: [] };
  let posts;
  try {
    posts = await sb(`comunidad_posts?select=id,texto,imagen_url,enlace_url,fijado,publicado_en`
      + `&user_id=eq.${cliente.user_id}&borrado_en=is.null&order=fijado.desc,publicado_en.desc&limit=40`);
  } catch (e) { return { ok: false, motivo: 'sin_tabla' }; }
  posts = Array.isArray(posts) ? posts : [];
  if (!posts.length) return { ok: true, posts: [] };
  const ids = posts.map(p => p.id).join(',');
  const rx = await sb(`comunidad_reacciones?select=post_id,cliente_id,tipo&post_id=in.(${ids})`).catch(() => []);
  const vistos = await sb(`comunidad_vistas?select=post_id&cliente_id=eq.${cliente.id}&post_id=in.(${ids})`).catch(() => []);
  const visto = new Set((Array.isArray(vistos) ? vistos : []).map(v => v.post_id));
  return {
    ok: true,
    posts: posts.map(p => {
      const delPost = (Array.isArray(rx) ? rx : []).filter(r => r.post_id === p.id);
      const reacciones = Object.fromEntries(REACCIONES.map(t => [t, delPost.filter(r => r.tipo === t).length]));
      return { ...p, reacciones, mias: delPost.filter(r => r.cliente_id === cliente.id).map(r => r.tipo), visto: visto.has(p.id) };
    }),
  };
}

// La publicación tiene que ser de SU coach y no estar borrada.
async function postDeSuCoach(cliente, id) {
  if (!id || !cliente.user_id) return null;
  const r = await sb(`comunidad_posts?select=id&id=eq.${encodeURIComponent(id)}&user_id=eq.${cliente.user_id}&borrado_en=is.null&limit=1`).catch(() => null);
  return Array.isArray(r) && r[0] ? r[0] : null;
}

// Poner o quitar una reacción (un toque la pone, otro la quita).
async function reaccionarComunidad(cliente, cuerpo) {
  const tipo = String(cuerpo.tipo || '');
  if (!REACCIONES.includes(tipo)) return { ok: false, motivo: 'tipo' };
  const post = await postDeSuCoach(cliente, cuerpo.post_id);
  if (!post) return { ok: false, motivo: 'no_es_de_su_coach' };
  const filtro = `post_id=eq.${post.id}&cliente_id=eq.${cliente.id}&tipo=eq.${tipo}`;
  const ya = await sb(`comunidad_reacciones?select=tipo&${filtro}&limit=1`).catch(() => []);
  const tiene = Array.isArray(ya) && ya.length > 0;
  const quiere = cuerpo.quitar ? false : true;
  if (quiere && !tiene) await sb('comunidad_reacciones', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ post_id: post.id, cliente_id: cliente.id, tipo }) });
  if (!quiere && tiene) await sb(`comunidad_reacciones?${filtro}`, { method: 'DELETE' });
  return { ok: true, tipo, puesta: quiere };
}

// Lo que vio (para el alcance en el CRM). Solo publicaciones de su coach.
async function vistoComunidad(cliente, cuerpo) {
  const pedidos = (Array.isArray(cuerpo.ids) ? cuerpo.ids : []).map(String).slice(0, 40);
  if (!pedidos.length || !cliente.user_id) return { ok: true, nuevos: 0 };
  const lista = pedidos.map(encodeURIComponent).join(',');
  const suyos = await sb(`comunidad_posts?select=id&user_id=eq.${cliente.user_id}&id=in.(${lista})`).catch(() => []);
  const ya = await sb(`comunidad_vistas?select=post_id&cliente_id=eq.${cliente.id}&post_id=in.(${lista})`).catch(() => []);
  const vistos = new Set((Array.isArray(ya) ? ya : []).map(v => v.post_id));
  const nuevos = (Array.isArray(suyos) ? suyos : []).map(p => p.id).filter(id => !vistos.has(id));
  if (nuevos.length) {
    await sb('comunidad_vistas', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(nuevos.map(id => ({ post_id: id, cliente_id: cliente.id }))) }).catch(() => {});
  }
  return { ok: true, nuevos: nuevos.length };
}

