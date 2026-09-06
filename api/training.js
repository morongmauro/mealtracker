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
//
// Fail-safe: ante cualquier problema devuelve { ok:false } y la app muestra
// su estado vacío. Nunca rompe la pantalla.

import { guard } from './_guard.js';

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
    if (!esGet && accion === 'abrir') return res.status(200).json(await abrirSesion(cliente, cuerpo, hoy));
    if (!esGet && accion === 'serie') return res.status(200).json(await guardarSerie(cliente, cuerpo));
    if (!esGet && accion === 'cerrar') return res.status(200).json(await cerrarSesion(cliente, cuerpo));
    return res.status(200).json({ ok: false, motivo: 'accion_desconocida' });
  } catch (e) {
    return res.status(200).json({ ok: false, motivo: 'error' });
  }
}

// ── EL PLAN ───────────────────────────────────────────────────────────────
async function verPlan(cliente, hoy) {
  // La fase ACTIVA. Si hay varias (no debería), manda la de mayor orden.
  const fases = await sb(`fases?select=id,nombre,objetivo,semanas,fecha_inicio,dias_semana,orden,estado`
    + `&cliente_id=eq.${cliente.id}&estado=eq.activa&order=orden.desc&limit=1`);
  const fase = Array.isArray(fases) ? fases[0] : null;
  if (!fase) return { ok: true, cliente: cliente.nombre, fase: null, dias: [], hoy };

  const rutinas = await sb(`rutinas?select=id,nombre,descripcion,dia_orden,dia_semana,tipo_sesion,duracion_estimada_min`
    + `&fase_id=eq.${fase.id}&archivada=is.false&order=dia_orden.asc`);
  const lista = Array.isArray(rutinas) ? rutinas : [];

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
  const rr = await sb(`rutinas?select=id,nombre,descripcion,tipo_sesion,duracion_estimada_min,fase_id,cliente_id`
    + `&id=eq.${encodeURIComponent(rutinaId)}&cliente_id=eq.${cliente.id}&limit=1`);
  const rutina = Array.isArray(rr) ? rr[0] : null;
  if (!rutina) return { ok: false, motivo: 'no_es_suya' };

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
async function abrirSesion(cliente, cuerpo, hoy) {
  const rutinaId = cuerpo.rutina_id;
  if (!rutinaId) return { ok: false, motivo: 'sin_id' };
  const rr = await sb(`rutinas?select=id,fase_id,cliente_id&id=eq.${encodeURIComponent(rutinaId)}&cliente_id=eq.${cliente.id}&limit=1`);
  const rutina = Array.isArray(rr) ? rr[0] : null;
  if (!rutina) return { ok: false, motivo: 'no_es_suya' };

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
