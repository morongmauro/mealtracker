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
// POST      { accion:'actividad', … }         → registra cardio/deporte/caminata
// POST      { accion:'borrar_actividad', id } → la quita
//
// Fail-safe: ante cualquier problema devuelve { ok:false } y la app muestra
// su estado vacío. Nunca rompe la pantalla.

import { guard, cors } from './_guard.js';

const CRM_URL = process.env.CRM_SUPABASE_URL;
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// "Hoy" en hora de Colombia: Vercel corre en UTC y a partir de las 7pm ya
// sería el día siguiente — la rutina de hoy cambiaría a media tarde.
function hoyBogota() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}
function letraDeHoy() {
  const [y, m, d] = hoyBogota().split('-').map(Number);
  return DIAS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}
function semanaISO(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
// En qué semana de la fase estamos (1..N), o null si aún no arranca o ya pasó.
function semanaDeFase(fase, hoy) {
  if (!fase?.fecha_inicio || !fase?.semanas) return null;
  const dias = Math.floor((Date.parse(hoy + 'T00:00:00Z') - Date.parse(fase.fecha_inicio + 'T00:00:00Z')) / 86400000);
  if (dias < 0) return null;
  const s = Math.floor(dias / 7) + 1;
  return s > fase.semanas ? null : s;
}

// Reparto de rutinas por día — EL MISMO criterio que el calendario del CRM
// (entRepartirRutinas). Si aquí difiere, el cliente ve su semana ordenada de
// una forma y el coach de otra.
function repartirPorDia(fase, rutinas) {
  const porDia = {};
  DIAS.forEach(d => { porDia[d] = null; });
  rutinas.filter(r => r.dia_semana).forEach(r => {
    if (porDia[r.dia_semana] === null) porDia[r.dia_semana] = r;
  });
  const libres = rutinas.filter(r => !r.dia_semana)
    .slice().sort((a, b) => (a.dia_orden || 0) - (b.dia_orden || 0));
  const huecos = (fase?.dias_semana || []).filter(d => porDia[d] === null);
  libres.forEach((r, i) => { if (huecos[i]) porDia[huecos[i]] = r; });
  return porDia;
}

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
  const cl = await sb('clientes?select=id,nombre,estado,dias_entreno,dias_entreno_cantidad,lugar_entreno');
  return (Array.isArray(cl) ? cl : []).find(c => normalizeName(c.nombre) === buscado) || null;
}

// Lo que se le manda al cliente de un ejercicio. Lista blanca a propósito:
// añadir una columna al schema no debe filtrar notas del coach sin querer.
const CAMPOS_EJERCICIO = 'id,nombre,descripcion,claves_tecnicas,patron,segmento,tipo,'
  + 'musculos_primarios,musculos_secundarios,equipo,nivel,unilateral,'
  + 'video_fuente,video_url,video_ref,video_inicio_seg,poster_url';

export default async function handler(req, res) {
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
    if (!esGet && accion === 'abrir') return res.status(200).json(await abrirSesion(cliente, cuerpo, hoy));
    if (!esGet && accion === 'serie') return res.status(200).json(await guardarSerie(cliente, cuerpo));
    if (!esGet && accion === 'cerrar') return res.status(200).json(await cerrarSesion(cliente, cuerpo));
    if (!esGet && accion === 'actividad') return res.status(200).json(await guardarActividad(cliente, cuerpo, hoy));
    if (!esGet && accion === 'borrar_actividad') return res.status(200).json(await borrarActividad(cliente, cuerpo));
    return res.status(200).json({ ok: false, motivo: 'accion_desconocida' });
  } catch (e) {
    return res.status(200).json({ ok: false, motivo: 'error' });
  }
}

// La fase que el cliente puede ver: activa Y ENVIADA.
//
// `estado` y `visible_cliente` son dos cosas distintas y las dos tienen que
// cumplirse. `estado='activa'` es el estado de trabajo del coach; el que
// decide si el cliente la ve es `visible_cliente`, que pone el botón "enviar
// al cliente" del CRM. Sin esta segunda condición ese botón no servía de
// nada: bastaba marcar la fase como activa —que es lo natural mientras se
// arma— para que al cliente le apareciera media rutina a medio hacer.
const FASE_VISIBLE = 'estado=eq.activa&visible_cliente=is.true';

// Una rutina hereda la visibilidad de su fase salvo que diga lo contrario.
// `false` la esconde dentro de una fase ya enviada (el día que aún estás
// armando); `true` la muestra aunque la fase no lo esté.
const rutinaVisible = (r, fase) => r.visible_cliente == null
  ? !!fase?.visible_cliente
  : !!r.visible_cliente;

// ── EL PLAN ───────────────────────────────────────────────────────────────
async function verPlan(cliente, hoy) {
  // La fase ACTIVA Y ENVIADA. Si hay varias (no debería), la de mayor orden.
  const fases = await sb(`fases?select=id,nombre,objetivo,semanas,fecha_inicio,dias_semana,orden,estado,visible_cliente`
    + `&cliente_id=eq.${cliente.id}&${FASE_VISIBLE}&order=orden.desc&limit=1`);
  const fase = Array.isArray(fases) ? fases[0] : null;
  if (!fase) return { ok: true, cliente: cliente.nombre, fase: null, dias: [], hoy };

  const rutinas = await sb(`rutinas?select=id,nombre,descripcion,dia_orden,dia_semana,tipo_sesion,duracion_estimada_min,visible_cliente`
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
  const letraHoy = letraDeHoy();
  const dias = DIAS.map((d, i) => {
    const r = porDia[d];
    const fecha = (() => {
      const t = new Date(Date.parse(lunes + 'T00:00:00Z')); t.setUTCDate(t.getUTCDate() + i);
      return t.toISOString().slice(0, 10);
    })();
    const s = sesiones.find(x => x.fecha === fecha && (!r || x.rutina_id === r.id));
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
    };
  });

  return {
    ok: true, hoy, cliente: cliente.nombre,
    fase: {
      nombre: fase.nombre, objetivo: fase.objetivo,
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

  const bloques = await sb(`rutina_bloques?select=id,nombre,tipo,vueltas,descanso_seg,orden,notas`
    + `&rutina_id=eq.${rutina.id}&order=orden.asc`);
  const res = await sb(`rutina_ejercicios?select=id,bloque_id,ejercicio_id,orden,series,reps,peso_objetivo,rir,tempo,descanso_seg,notas`
    + `&rutina_id=eq.${rutina.id}&order=orden.asc`);
  const lista = Array.isArray(res) ? res : [];
  if (!lista.length) {
    return { ok: true, rutina: { ...limpiarRutina(rutina), bloques: [], ejercicios: [] } };
  }

  const ids = [...new Set(lista.map(x => x.ejercicio_id))].join(',');
  const ejs = await sb(`ejercicios?select=${CAMPOS_EJERCICIO}&id=in.(${ids})`);
  const porId = {};
  (Array.isArray(ejs) ? ejs : []).forEach(e => { porId[e.id] = e; });

  // Lo último que levantó en cada ejercicio: es lo que de verdad se mira
  // antes de cargar la barra. Se lee de SUS sesiones, no de las de nadie más.
  const ultimas = await ultimasSeries(cliente.id, [...new Set(lista.map(x => x.ejercicio_id))]);

  return {
    ok: true, hoy,
    rutina: {
      ...limpiarRutina(rutina),
      bloques: (Array.isArray(bloques) ? bloques : []).map(b => ({
        id: b.id, nombre: b.nombre, tipo: b.tipo, vueltas: b.vueltas,
        descanso_seg: b.descanso_seg, notas: b.notas,
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

async function ultimasSeries(clienteId, ejercicioIds) {
  if (!ejercicioIds.length) return {};
  const ses = await sb(`sesiones?select=id,fecha&cliente_id=eq.${clienteId}&order=fecha.desc&limit=30`);
  const lista = Array.isArray(ses) ? ses : [];
  if (!lista.length) return {};
  const fechaDe = {};
  lista.forEach(s => { fechaDe[s.id] = s.fecha; });
  const logs = await sb(`series_log?select=ejercicio_id,sesion_id,serie_num,reps,peso,unidad`
    + `&sesion_id=in.(${lista.map(s => s.id).join(',')})&ejercicio_id=in.(${ejercicioIds.join(',')})`
    + `&completada=is.true`);
  const out = {};
  (Array.isArray(logs) ? logs : []).forEach(l => {
    const f = fechaDe[l.sesion_id];
    if (!f) return;
    const prev = out[l.ejercicio_id];
    if (!prev || f > prev.fecha) out[l.ejercicio_id] = { fecha: f, series: [] };
    if (out[l.ejercicio_id].fecha === f) out[l.ejercicio_id].series.push(l);
  });
  Object.values(out).forEach(v => {
    v.series.sort((a, b) => a.serie_num - b.serie_num);
    v.series = v.series.map(s => ({ serie: s.serie_num, reps: s.reps, peso: s.peso, unidad: s.unidad }));
    const pesos = v.series.map(s => Number(s.peso)).filter(n => Number.isFinite(n) && n > 0);
    v.mejor_peso = pesos.length ? Math.max(...pesos) : null;
  });
  return out;
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
  const ya = await sb(`sesiones?select=id,estado,rpe,notas_cliente&cliente_id=eq.${cliente.id}`
    + `&rutina_id=eq.${rutina.id}&fecha=eq.${hoy}&limit=1`);
  if (Array.isArray(ya) && ya[0]) {
    const series = await sb(`series_log?select=id,rutina_ejercicio_id,ejercicio_id,serie_num,reps,peso,unidad,completada&sesion_id=eq.${ya[0].id}`);
    return { ok: true, sesion: ya[0], series: Array.isArray(series) ? series : [], retomada: true };
  }

  const creada = await sb('sesiones', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: cuerpo.user_id_coach || undefined,
      cliente_id: cliente.id, rutina_id: rutina.id, fase_id: rutina.fase_id,
      fecha: hoy, semana_iso: semanaISO(hoy), estado: 'en_curso',
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
    reps: cuerpo.reps === '' || cuerpo.reps == null ? null : Number(cuerpo.reps),
    peso: cuerpo.peso === '' || cuerpo.peso == null ? null : Number(cuerpo.peso),
    unidad: cuerpo.unidad === 'lb' ? 'lb' : 'kg',
    rir: cuerpo.rir == null || cuerpo.rir === '' ? null : Number(cuerpo.rir),
    completada: cuerpo.completada !== false,
  };
  if (!fila.ejercicio_id) return { ok: false, motivo: 'sin_ejercicio' };

  // Marcar la misma serie dos veces la ACTUALIZA, no la duplica: el cliente
  // corrige el peso que puso mal sin que queden dos filas peleando.
  const previa = await sb(`series_log?select=id&sesion_id=eq.${sesion.id}`
    + `&ejercicio_id=eq.${encodeURIComponent(fila.ejercicio_id)}&serie_num=eq.${num}&limit=1`);
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
  const upd = await sb(`sesiones?id=eq.${sesion.id}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      estado: cuerpo.estado === 'saltada' ? 'saltada' : 'completada',
      finalizada_en: ahora.toISOString(),
      duracion_seg: dur,
      rpe: (() => {
        const n = Number(cuerpo.rpe);
        return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : null;
      })(),
      notas_cliente: cuerpo.notas ? String(cuerpo.notas).slice(0, 500) : null,
    }),
  });
  return { ok: true, sesion: Array.isArray(upd) ? upd[0] : upd };
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

  let porDia = {}, rutinas = [];
  if (fase) {
    const rr = await sb(`rutinas?select=id,nombre,dia_orden,dia_semana,tipo_sesion,duracion_estimada_min,visible_cliente`
      + `&fase_id=eq.${fase.id}&archivada=is.false&order=dia_orden.asc`);
    rutinas = (Array.isArray(rr) ? rr : []).filter(r => rutinaVisible(r, fase));
    porDia = repartirPorDia(fase, rutinas);
  }

  // Las tres cosas que pasaron, en paralelo: tres viajes encadenados por un
  // mes se notan en el teléfono.
  const [ses, act, evs] = await Promise.all([
    sb(`sesiones?select=id,rutina_id,fecha,estado,rpe,duracion_seg`
      + `&cliente_id=eq.${cliente.id}&fecha=gte.${primero}&fecha=lte.${ultimo}`),
    sb(`actividades?select=id,fecha,tipo,titulo,duracion_min,distancia_km,intensidad`
      + `&cliente_id=eq.${cliente.id}&fecha=gte.${primero}&fecha=lte.${ultimo}`).catch(() => []),
    eventosDelCliente(cliente.id),
  ]);
  const sesiones = Array.isArray(ses) ? ses : [];
  const actividades = Array.isArray(act) ? act : [];
  const eventosPorFecha = expandirEventos(evs, fase);

  const dias = [];
  for (let d = new Date(Date.UTC(y, m - 1, 1)); d.getUTCMonth() === m - 1; d.setUTCDate(d.getUTCDate() + 1)) {
    const fecha = d.toISOString().slice(0, 10);
    const letra = DIAS[(d.getUTCDay() + 6) % 7];
    const dentro = !!fase?.fecha_inicio && fecha >= fase.fecha_inicio
      && fecha <= finDeFase(fase);
    const r = dentro ? porDia[letra] : null;
    const s = sesiones.find(x => x.fecha === fecha && (!r || x.rutina_id === r.id))
      || sesiones.find(x => x.fecha === fecha && !x.rutina_id);
    dias.push({
      fecha, dia: letra, es_hoy: fecha === hoy,
      semana: dentro ? Math.floor((Date.parse(fecha) - Date.parse(fase.fecha_inicio)) / 86400000 / 7) + 1 : null,
      rutina: r ? { id: r.id, nombre: r.nombre, minutos: r.duracion_estimada_min || null } : null,
      estado: s ? s.estado : null,          // completada | saltada | en_curso | null
      rpe: s ? s.rpe : null,
      actividades: actividades.filter(a => a.fecha === fecha),
      eventos: (eventosPorFecha[fecha] || []),
    });
  }

  return {
    ok: true, mes, hoy,
    fase: fase ? { nombre: fase.nombre, semanas: fase.semanas, desde: fase.fecha_inicio, hasta: finDeFase(fase) } : null,
    dias,
  };
}

function finDeFase(f) {
  if (!f?.fecha_inicio || !f?.semanas) return '9999-12-31';
  const t = new Date(Date.parse(f.fecha_inicio + 'T00:00:00Z'));
  t.setUTCDate(t.getUTCDate() + f.semanas * 7 - 1);
  return t.toISOString().slice(0, 10);
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

// Espejo de evtFechasDe() en el CRM y de evento_fechas() en SQL. Las tres
// tienen que dar los mismos días o el cliente ve la natación un día y el
// coach otro.
function expandirEventos(eventos, fase) {
  const out = {};
  (eventos || []).forEach(ev => {
    const visible = ev.visible_cliente == null ? !!fase?.visible_cliente : !!ev.visible_cliente;
    if (!visible) return;
    const meta = { id: ev.id, tipo: ev.tipo, titulo: ev.titulo, detalle: ev.detalle, hora: ev.hora };
    if (ev.fecha) { (out[String(ev.fecha).slice(0, 10)] ||= []).push(meta); return; }
    if (!fase?.fecha_inicio || !fase?.semanas || ev.fase_id !== fase.id) return;
    for (let semana = 1; semana <= fase.semanas; semana++) {
      if (Array.isArray(ev.semanas) && ev.semanas.length && !ev.semanas.includes(semana)) continue;
      (ev.dias_semana || []).forEach(codigo => {
        const off = DIAS.indexOf(codigo);
        if (off < 0) return;
        const t = new Date(Date.parse(fase.fecha_inicio + 'T00:00:00Z'));
        t.setUTCDate(t.getUTCDate() + (semana - 1) * 7 + off);
        (out[t.toISOString().slice(0, 10)] ||= []).push(meta);
      });
    }
  });
  return out;
}

// ══════════════════════════════════════════════════════════════════════════
// TODAS SUS RUTINAS  ·  vista informativa, sin ejecutar nada
// ══════════════════════════════════════════════════════════════════════════
async function verRutinas(cliente) {
  const fases = await sb(`fases?select=id,nombre,objetivo,semanas,fecha_inicio,dias_semana,visible_cliente`
    + `&cliente_id=eq.${cliente.id}&${FASE_VISIBLE}&order=orden.desc&limit=1`);
  const fase = Array.isArray(fases) ? fases[0] : null;
  if (!fase) return { ok: true, fase: null, rutinas: [] };

  const rr = await sb(`rutinas?select=id,nombre,descripcion,dia_orden,dia_semana,tipo_sesion,duracion_estimada_min,visible_cliente`
    + `&fase_id=eq.${fase.id}&archivada=is.false&order=dia_orden.asc`);
  const rutinas = (Array.isArray(rr) ? rr : []).filter(r => rutinaVisible(r, fase));
  if (!rutinas.length) return { ok: true, fase: { nombre: fase.nombre, objetivo: fase.objetivo }, rutinas: [] };

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
      nombre: fase.nombre, objetivo: fase.objetivo,
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
  // viene descuadra la adherencia de una semana que aún no pasó.
  if (fecha > hoy) return { ok: false, motivo: 'fecha_futura' };

  const num = (v, max) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : null;
  };
  const fila = {
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
      fase: fase ? { nombre: fase.nombre, semana_actual: semanaDeFase(fase, hoy), semanas: fase.semanas } : null,
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

function lunesDe(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
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
