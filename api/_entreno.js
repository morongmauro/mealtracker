// /api/_entreno.js
// Lo que comparten la API del cliente (training.js) y el cron de avisos
// (push-cron.js): qué rutina toca cada día, qué fase ve el cliente y en qué
// días caen los eventos. Si el aviso «hoy te toca Push» calculara el día por
// su cuenta, tarde o temprano diría una cosa y la app otra.
//
// El "_" delante hace que Vercel NO lo cuente como función (tope de 12).

export const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

export const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// "22,5" → 22.5. El teclado decimal en español pone coma, y Number('22,5')
// es NaN: la serie se guardaba sin peso. La app ya lo convierte; esto es por
// si llega una versión vieja de la app.
export const aNumero = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// "Hoy" en hora de Colombia: Vercel corre en UTC y a partir de las 7pm ya
// sería el día siguiente — la rutina de hoy cambiaría a media tarde.
export function hoyBogota() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

export function letraDeHoy() {
  const [y, m, d] = hoyBogota().split('-').map(Number);
  return DIAS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}

export function semanaISO(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// En qué semana de la fase estamos (1..N), o null si aún no arranca o ya pasó.
export function semanaDeFase(fase, hoy) {
  if (!fase?.fecha_inicio || !fase?.semanas) return null;
  const dias = Math.floor((Date.parse(hoy + 'T00:00:00Z') - Date.parse(fase.fecha_inicio + 'T00:00:00Z')) / 86400000);
  if (dias < 0) return null;
  const s = Math.floor(dias / 7) + 1;
  return s > fase.semanas ? null : s;
}

// Reparto de rutinas por día — EL MISMO criterio que el calendario del CRM
// (entRepartirRutinas). Si aquí difiere, el cliente ve su semana ordenada de
// una forma y el coach de otra.
// Una rutina puede caer en VARIOS días: media lista entrena A-B-A-B, dos
// rutinas repartidas en cuatro días. Por eso manda `dias_semana` (lista) y
// no el viejo `dia_semana` (un solo día), que se sigue leyendo solo para las
// rutinas que aún no han pasado por la migración.
export const diasDeRutina = (r) => {
  if (Array.isArray(r?.dias_semana) && r.dias_semana.length) return r.dias_semana;
  return r?.dia_semana ? [r.dia_semana] : [];
};

// ── Bloques complementarios ───────────────────────────────────────────────
// Un recovery, una movilidad diaria («Elbow Recovery»): una rutina aparte que
// el coach pone el MISMO día que la fuerza, sin tener que ver con ella. La
// marca `rutinas.complementaria` (carga/migracion-bloques-complementarios.sql).
// Nunca ocupa el día de la fuerza: la fuerza manda y va primero; el bloque
// sale debajo, en los días que diga su `dias_semana`. Sin días, queda suelto
// («También en tu ciclo»), como antes. Sin la columna, ninguna lo es.
export const esComplementaria = (r) => r?.complementaria === true;

// Las rutinas de una fase con su marca de complementaria. Si la columna aún
// no existe (SQL sin correr), se leen sin ella y todo sigue como antes.
export async function leerRutinas(sb, campos, filtro) {
  const leer = async (c) => { const x = await sb(`rutinas?select=${c}&${filtro}`); return Array.isArray(x) ? x : []; };
  try { return await leer(`${campos},complementaria`); }
  catch (e) { return leer(campos); }
}

// Los bloques complementarios que caen en una fecha, en el orden del coach.
export function complementariasDe(fase, rutinas, fecha) {
  if (!fase?.fecha_inicio || !fecha || fecha < fase.fecha_inicio || fecha > finDeFase(fase)) return [];
  const [y, m, d] = fecha.split('-').map(Number);
  const letra = DIAS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
  return (rutinas || []).filter(r => esComplementaria(r) && diasDeRutina(r).includes(letra))
    .sort((a, b) => (a.dia_orden || 0) - (b.dia_orden || 0));
}

export function repartirPorDia(fase, rutinasTodas) {
  const porDia = {};
  DIAS.forEach(d => { porDia[d] = null; });
  // Los bloques complementarios no se reparten: van aparte, debajo de la fuerza.
  const rutinas = (rutinasTodas || []).filter(r => !esComplementaria(r));

  // 1. Las que declaran sus días mandan, en orden de `dia_orden` para que un
  //    empate entre dos rutinas sobre el mismo día se resuelva siempre igual.
  const porOrden = rutinas.slice().sort((a, b) => (a.dia_orden || 0) - (b.dia_orden || 0));
  porOrden.filter(r => diasDeRutina(r).length).forEach(r => {
    diasDeRutina(r).forEach(d => { if (porDia[d] === null) porDia[d] = r; });
  });

  // 2. Las que no declaran nada se reparten sobre los días que quedan libres
  //    de los que la fase declaró.
  const libres = porOrden.filter(r => !diasDeRutina(r).length);
  const huecos = (fase?.dias_semana || []).filter(d => porDia[d] === null);
  libres.forEach((r, i) => { if (huecos[i]) porDia[huecos[i]] = r; });
  return porDia;
}

// ── Cambios de UN día (del cliente o del coach) ───────────────────────────
// «El martes no puedo, lo paso al jueves.» Cada movimiento cambia UNA fecha
// (tabla `rutina_movimientos`); el plan semanal no se toca. Si el destino ya
// tenía rutina, se intercambian. Se aplican en orden, así que mover dos veces
// la misma rutina la deja donde quedó la última vez.
//
// `quitados`: días en que el coach quitó la fuerza SOLO esa fecha (tabla
// `rutina_dias_quitados`). Van en la misma fila de tiempo que los
// movimientos: lo último que pasó es lo que vale.
// `extras`: rutinas añadidas a un día libre ([{ fecha, rutina, origen }]),
// por el cliente o por el coach. Solo cuentan si ese día, después de los
// cambios, no tiene rutina.
//
// Lo que cambió el coach es su plan: la app lo pinta como cualquier otro día
// (sin «la moviste», sin «la añadiste tú»).
//
// Devuelve una función fecha → rutina (o null) que ya los tiene en cuenta.
// La usan la semana, el mes y el aviso de la mañana: los tres dicen lo mismo.
// Espejo en el CRM: entRutinaPorFechaDia (entrenamiento.js). Hay una prueba
// que compara las dos.
export function rutinaPorFecha(fase, porDia, movimientos = [], extras = [], quitados = []) {
  const fin = finDeFase(fase);
  const base = (fecha) => {
    if (!fase?.fecha_inicio || fecha < fase.fecha_inicio || fecha > fin) return null;
    const [y, m, d] = fecha.split('-').map(Number);
    return porDia[DIAS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7]] || null;
  };
  const mapa = {}, delCoach = {};
  const ver = (f) => (f in mapa ? mapa[f] : base(f));
  [
    ...(movimientos || []).map(mv => ({ t: String(mv.created_at || ''), mv })),
    ...(quitados || []).map(q => ({ t: String(q.created_at || ''), q })),
  ].sort((a, b) => a.t.localeCompare(b.t))
    .forEach(({ mv, q }) => {
      if (q) {
        const f = String(q.fecha || '').slice(0, 10);
        if (f) { mapa[f] = null; delCoach[f] = true; }
        return;
      }
      const r = ver(mv.desde);
      if (!r || r.id !== mv.rutina_id || mv.desde === mv.hasta) return;   // ya no está ahí: no aplica
      const otra = ver(mv.hasta);
      mapa[mv.hasta] = r;
      mapa[mv.desde] = otra;
      delCoach[mv.hasta] = delCoach[mv.desde] = mv.origen === 'coach';
    });
  const extra = {}, extraCoach = {};
  (extras || []).forEach(x => { if (x && x.rutina && x.fecha) { extra[x.fecha] = x.rutina; extraCoach[x.fecha] = x.origen === 'coach'; } });
  const fn = (fecha) => ver(fecha) || extra[fecha] || null;
  // Movida por el cliente (lo del coach es su plan).
  fn.movida = (fecha) => fecha in mapa && !delCoach[fecha] && (mapa[fecha]?.id || null) !== (base(fecha)?.id || null);
  // Añadida a un día libre (por quien sea): no se arrastra, se quita y se pone.
  fn.extra = (fecha) => !ver(fecha) && !!extra[fecha];
  // …y de esas, las que añadió el cliente (las puede quitar él).
  fn.extraDelCliente = (fecha) => fn.extra(fecha) && !extraCoach[fecha];
  return fn;
}

// Las rutinas añadidas a días libres (tabla `rutina_extras`,
// carga/migracion-rutina-extra.sql). Sin la tabla, no hay ninguna. La columna
// `origen` (cliente | coach) llega con migracion-fuerza-por-dia.sql; sin ella,
// todas son del cliente, como antes.
export async function extrasDe(sb, filtro, rutinas = []) {
  const porId = Object.fromEntries((rutinas || []).map(r => [r.id, r]));
  const leer = async (campos) => { const x = await sb(`rutina_extras?select=${campos}&${filtro}`); return Array.isArray(x) ? x : []; };
  let x = [];
  try { x = await leer('fecha,rutina_id,fase_id,origen'); }
  catch (e) { try { x = await leer('fecha,rutina_id,fase_id'); } catch (e2) { return []; } }
  return x.filter(e => porId[e.rutina_id]).map(e => ({ fecha: String(e.fecha).slice(0, 10), rutina: porId[e.rutina_id], fase_id: e.fase_id, origen: e.origen || 'cliente' }));
}

// Los días en que el coach quitó la fuerza solo esa fecha
// (carga/migracion-fuerza-por-dia.sql). Sin la tabla, ninguno.
export async function quitadosDe(sb, filtro) {
  try {
    const q = await sb(`rutina_dias_quitados?select=fecha,fase_id,created_at&${filtro}`);
    return Array.isArray(q) ? q.map(x => ({ ...x, fecha: String(x.fecha).slice(0, 10) })) : [];
  } catch (e) { return []; }
}

// «Pull Training» → «Pull», «Lower Body + Core Training» → «Lower + Core»:
// para que en el calendario se lea el nombre entero.
export const nombreCorto = (n) => {
  const s = String(n || '')
    .replace(/\b(training|workout|entrenamiento|entreno|session|sesi[oó]n)\b/gi, '')
    .replace(/\b(upper|lower)\s+body\b/gi, '$1')
    .replace(/\s*\+\s*/g, ' + ').replace(/\s{2,}/g, ' ').replace(/^[\s+·-]+|[\s+·-]+$/g, '').trim();
  return s.length >= 3 ? s : String(n || '');
};

// La tabla puede no existir (migración sin correr): entonces no hay cambios.
export async function movimientosDe(sb, filtro) {
  try {
    const m = await sb(`rutina_movimientos?select=cliente_id,fase_id,rutina_id,desde,hasta,origen,created_at&${filtro}&order=created_at.asc`);
    return Array.isArray(m) ? m : [];
  } catch (e) { return []; }
}

// Los eventos del calendario que el cliente REGISTRA (y que avisan al coach
// cuando los marca). `medicion` es el tipo de antes de separarlos.
export const TIPOS_REGISTRO = ['medidas', 'peso', 'fotos', 'medicion'];

// «Cycle 2» (lo que traía Trainerize) → «Ciclo 2». En español siempre.
export const nombreFase = (n) => String(n || '').replace(/\bcycle\b/gi, 'Ciclo');

// El objetivo de la fase tal como lo ve el cliente. Las fases que se cargaron
// desde el programa anterior traían de objetivo una nota de la importación
// («Bloque importado de …»): eso es del coach, no del cliente, y no sale.
export const objetivoCliente = (t) => {
  const s = String(t || '').trim();
  if (!s || /trainerize|importad/i.test(s)) return null;
  return s;
};

// La fase que el cliente puede ver: activa Y ENVIADA.
//
// `estado` y `visible_cliente` son dos cosas distintas y las dos tienen que
// cumplirse. `estado='activa'` es el estado de trabajo del coach; el que
// decide si el cliente la ve es `visible_cliente`, que pone el botón "enviar
// al cliente" del CRM. Sin esta segunda condición ese botón no servía de
// nada: bastaba marcar la fase como activa —que es lo natural mientras se
// arma— para que al cliente le apareciera media rutina a medio hacer.
export const FASE_VISIBLE = 'estado=eq.activa&visible_cliente=is.true';

// De las fases enviadas, la VIGENTE la decide la FECHA, no un clic en el
// CRM: entre las que ya empezaron, la de inicio más reciente (empate: mayor
// orden). Si ninguna empezó todavía (un cliente nuevo cuyo ciclo arranca el
// lunes), la de mayor orden, como antes. Así el ciclo anterior deja de ser
// el actual el día en que arranca el nuevo, aunque en el CRM siga marcado
// «activa», y el nuevo no aparece antes de su fecha.
export function elegirVigente(fases, hoy) {
  const lista = (Array.isArray(fases) ? fases : []).slice().sort((a, b) => (b.orden || 0) - (a.orden || 0));
  const dia = (f) => String(f.fecha_inicio || '').slice(0, 10);
  const empezadas = lista.filter(f => dia(f) && dia(f) <= hoy)
    .sort((a, b) => dia(b).localeCompare(dia(a)) || (b.orden || 0) - (a.orden || 0));
  return empezadas[0] || lista[0] || null;
}
export async function faseVigente(sb, clienteId, campos, hoy) {
  const fases = await sb(`fases?select=${campos}&cliente_id=eq.${clienteId}&${FASE_VISIBLE}&order=orden.desc`);
  return elegirVigente(fases, hoy || hoyBogota());
}

// El cliente por el nombre con que entra a la app: el del CRM o uno de sus
// nombres alternos (si en la app se llama distinto que en el CRM, igual se
// le encuentra). `campos` sin nombres_alternos: se pide aparte y, si la
// columna no existe, se busca solo por nombre.
export async function buscarClientePorNombre(sb, nombre, campos = 'id,user_id,nombre,estado', respaldo = null) {
  const k = normalizeName(nombre);
  if (!k) return null;
  const leer = async (c) => { const x = await sb(`clientes?select=${c}`); return Array.isArray(x) ? x : []; };
  let lista = null;
  for (const c of [`${campos},nombres_alternos`, campos, respaldo].filter(Boolean)) {
    try { lista = await leer(c); break; } catch (e) { /* siguiente */ }
  }
  lista = lista || [];
  return lista.find(c => normalizeName(c.nombre) === k)
    || lista.find(c => (Array.isArray(c.nombres_alternos) ? c.nombres_alternos : []).some(n => normalizeName(n) === k))
    || null;
}

// ¿Tiene un ciclo enviado? Es lo que decide si ve el módulo de entreno.
export async function tienePlanVisible(sb, nombre) {
  try {
    const c = await buscarClientePorNombre(sb, nombre);
    if (!c) return false;
    const f = await sb(`fases?select=id&cliente_id=eq.${c.id}&${FASE_VISIBLE}&limit=1`);
    return Array.isArray(f) && f.length > 0;
  } catch (e) { return false; }
}

// Una rutina hereda la visibilidad de su fase salvo que diga lo contrario.
// `false` la esconde dentro de una fase ya enviada (el día que aún estás
// armando); `true` la muestra aunque la fase no lo esté.
export const rutinaVisible = (r, fase) => r.visible_cliente == null
  ? !!fase?.visible_cliente
  : !!r.visible_cliente;

export function finDeFase(f) {
  if (!f?.fecha_inicio || !f?.semanas) return '9999-12-31';
  const t = new Date(Date.parse(f.fecha_inicio + 'T00:00:00Z'));
  t.setUTCDate(t.getUTCDate() + f.semanas * 7 - 1);
  return t.toISOString().slice(0, 10);
}

// Espejo de evtFechasDe() en el CRM y de evento_fechas() en SQL. Las tres
// tienen que dar los mismos días o el cliente ve la natación un día y el
// coach otro.
export function expandirEventos(eventos, fase) {
  const out = {};
  (eventos || []).forEach(ev => {
    const visible = ev.visible_cliente == null ? !!fase?.visible_cliente : !!ev.visible_cliente;
    if (!visible) return;
    const meta = { id: ev.id, tipo: ev.tipo, titulo: ev.titulo, detalle: ev.detalle, hora: ev.hora, duracion_min: ev.duracion_min ?? null,
      ...(ev.opciones ? { opciones: ev.opciones } : {}) };
    if (ev.fecha) { (out[String(ev.fecha).slice(0, 10)] ||= []).push(meta); return; }
    if (!fase?.fecha_inicio || !fase?.semanas || ev.fase_id !== fase.id) return;
    // Los días que el coach le quitó (o movió) a la serie: ahí no cae.
    const quitados = new Set((ev.fechas_excluidas || []).map(f => String(f).slice(0, 10)));
    for (let semana = 1; semana <= fase.semanas; semana++) {
      if (Array.isArray(ev.semanas) && ev.semanas.length && !ev.semanas.includes(semana)) continue;
      (ev.dias_semana || []).forEach(codigo => {
        const off = DIAS.indexOf(codigo);
        if (off < 0) return;
        const t = new Date(Date.parse(fase.fecha_inicio + 'T00:00:00Z'));
        t.setUTCDate(t.getUTCDate() + (semana - 1) * 7 + off);
        const f = t.toISOString().slice(0, 10);
        if (!quitados.has(f)) (out[f] ||= []).push(meta);
      });
    }
  });
  return out;
}

export function sumarDiasISO(ymd, n) {
  const t = new Date(Date.parse(ymd + 'T00:00:00Z'));
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function lunesDe(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}

// ── kg y lb ──────────────────────────────────────────────────────────────
// Cada gimnasio es distinto: las mancuernas de uno van en libras y las
// máquinas del otro en kilos. Cada serie guarda su unidad tal cual la marcó
// el cliente; para comparar (récords, estancamiento) todo se pasa a kg.
export const LB_A_KG = 0.45359237;
export const aKg = (peso, unidad) => {
  const n = Number(peso);
  if (!Number.isFinite(n)) return null;
  return unidad === 'lb' ? n * LB_A_KG : n;
};

// ── Sesiones olvidadas ───────────────────────────────────────────────────
// Quien marca sus series y cierra la app sin pulsar «Terminar» deja la sesión
// «a medias» para siempre, y la adherencia del coach cuenta de menos.
//
// Pasados dos días sin tocarla (hoy y ayer siguen abiertos: la cola de la app
// puede subir series de ayer), se cierra sola:
//   · con series marcadas → COMPLETADA, con lo que dejó guardado y marcada
//     como `cerrada_auto` para que el coach sepa que no la cerró él;
//   · sin ninguna serie → se borra. Es una sesión vacía de alguien que abrió
//     la rutina para mirarla (versiones viejas de la app): no dice nada.
// No es el «Mark as Complete» descartado: sin series reales no cuenta nada.
//
// `sb(path, opts)` es el cliente PostgREST del CRM de quien llama.
export async function cerrarOlvidadas(sb, hoy) {
  const limite = sumarDiasISO(hoy, -1);           // anteriores a ayer
  const abiertas = await sb(`sesiones?select=id,fecha,origen&estado=eq.en_curso&fecha=lt.${limite}&limit=200`);
  const lista = Array.isArray(abiertas) ? abiertas : [];
  const res = { cerradas: 0, borradas: 0 };
  for (const s of lista) {
    const series = await sb(`series_log?select=created_at&sesion_id=eq.${s.id}&completada=is.true&order=created_at.asc`);
    const hechas = Array.isArray(series) ? series : [];
    if (!hechas.length) {
      // Solo las del cliente: una importada vacía no se toca.
      if ((s.origen || 'cliente') === 'cliente') {
        await sb(`sesiones?id=eq.${s.id}&estado=eq.en_curso`, { method: 'DELETE' });
        res.borradas++;
      }
      continue;
    }
    const ini = hechas[0].created_at, fin = hechas[hechas.length - 1].created_at;
    const cambios = {
      estado: 'completada',
      finalizada_en: fin,
      duracion_seg: Math.max(0, Math.round((Date.parse(fin) - Date.parse(ini)) / 1000)) || null,
    };
    // `cerrada_auto` llega con carga/migracion-bandeja.sql. Sin ella, se cierra
    // igual: lo importante es que cuente.
    try {
      await sb(`sesiones?id=eq.${s.id}&estado=eq.en_curso`, { method: 'PATCH', body: JSON.stringify({ ...cambios, cerrada_auto: true }) });
    } catch (e) {
      await sb(`sesiones?id=eq.${s.id}&estado=eq.en_curso`, { method: 'PATCH', body: JSON.stringify(cambios) });
    }
    res.cerradas++;
  }
  return res;
}

// ── Lo que le toca hoy a cada cliente ────────────────────────────────────
// Para el aviso de la mañana: la rutina de hoy (si no la hizo ya esta
// semana) y si hoy tiene un evento de medición. Una pasada por TODOS los
// clientes, con pocas consultas, para no hacer una por cliente cada hora.
//   → Map(nombreNormalizado → { rutina: 'Push'|null, medicion: bool })
export async function agendaDeHoy(sb, hoy) {
  const out = new Map();
  const clientes = await sb('clientes?select=id,nombre,nombres_alternos,estado');
  const fases = await sb(`fases?select=id,cliente_id,semanas,fecha_inicio,dias_semana,orden,visible_cliente&${FASE_VISIBLE}&order=orden.desc`);
  const faseDe = {};
  const porCliente = {};
  (Array.isArray(fases) ? fases : []).forEach(f => { (porCliente[f.cliente_id] = porCliente[f.cliente_id] || []).push(f); });
  Object.keys(porCliente).forEach(id => { faseDe[id] = elegirVigente(porCliente[id], hoy); });
  const ids = Object.values(faseDe).map(f => f.id);
  const rutinas = ids.length
    ? await leerRutinas(sb, 'id,fase_id,nombre,dia_orden,dia_semana,dias_semana,visible_cliente', `fase_id=in.(${ids.join(',')})&archivada=is.false`)
    : [];
  // Un bloque complementario hecho (un recovery) no es «ya entrenó hoy».
  const deBloque = new Set((Array.isArray(rutinas) ? rutinas : []).filter(esComplementaria).map(r => r.id));
  const lunes = lunesDe(hoy);
  const sesiones = await sb(`sesiones?select=cliente_id,rutina_id,fecha,estado&fecha=gte.${lunes}&fecha=lte.${hoy}`);
  const movs = ids.length ? await movimientosDe(sb, `fase_id=in.(${ids.join(',')})`) : [];
  const extras = ids.length ? await extrasDe(sb, `fase_id=in.(${ids.join(',')})&fecha=eq.${hoy}`, Array.isArray(rutinas) ? rutinas : []) : [];
  const quitados = ids.length ? await quitadosDe(sb, `fase_id=in.(${ids.join(',')})&fecha=eq.${hoy}`) : [];
  let eventos = [];
  // `fechas_excluidas` puede no existir (migracion-eventos-excluir.sql sin correr).
  const camposEv = 'id,cliente_id,fase_id,tipo,titulo,fecha,dias_semana,semanas,visible_cliente';
  try { eventos = await sb(`eventos?select=${camposEv},fechas_excluidas&tipo=in.(${TIPOS_REGISTRO.join(',')})`)
    .catch(() => sb(`eventos?select=${camposEv}&tipo=in.(${TIPOS_REGISTRO.join(',')})`)); }
  catch (e) { eventos = []; }

  for (const c of (Array.isArray(clientes) ? clientes : [])) {
    if (String(c.estado || 'activo').toLowerCase() !== 'activo') continue;
    const fase = faseDe[c.id] || null;
    let rutina = null;
    if (fase && hoy >= (fase.fecha_inicio || '9999') && hoy <= finDeFase(fase)) {
      const suyas = (Array.isArray(rutinas) ? rutinas : []).filter(r => r.fase_id === fase.id && rutinaVisible(r, fase));
      const r = rutinaPorFecha(fase, repartirPorDia(fase, suyas), movs.filter(mv => mv.fase_id === fase.id),
        extras.filter(x => x.fase_id === fase.id), quitados.filter(x => x.fase_id === fase.id))(hoy);
      // Si esa rutina ya está hecha esta semana (la adelantó), no se insiste.
      const hecha = r && (Array.isArray(sesiones) ? sesiones : [])
        .some(s => s.cliente_id === c.id && s.rutina_id === r.id && s.estado === 'completada');
      if (r && !hecha) rutina = r.nombre;
    }
    // ¿Entrenó HOY (lo que sea, terminado o a medias)? El cierre del día no
    // le recuerda entrenar a quien ya lo hizo.
    const entrenoHoy = (Array.isArray(sesiones) ? sesiones : [])
      .some(s => s.cliente_id === c.id && s.fecha === hoy && (s.estado === 'completada' || s.estado === 'en_curso') && !deBloque.has(s.rutina_id));
    const evs = (Array.isArray(eventos) ? eventos : []).filter(e => e.cliente_id === c.id);
    const deHoy = expandirEventos(evs, fase)[hoy] || [];
    const medicion = !!deHoy.length;
    // Qué toca registrar hoy, para que el aviso diga «pesarte» o «tus fotos».
    const registros = [...new Set(deHoy.map(e => e.tipo))];
    // conPlan: tiene ciclo enviado → usa el módulo de entreno de la app.
    const dato = { rutina, medicion, registros, entrenoHoy, conPlan: !!fase };
    [c.nombre, ...(Array.isArray(c.nombres_alternos) ? c.nombres_alternos : [])]
      .forEach(n => { const k = normalizeName(n); if (k) out.set(k, dato); });
  }
  return out;
}
