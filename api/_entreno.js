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

export function repartirPorDia(fase, rutinas) {
  const porDia = {};
  DIAS.forEach(d => { porDia[d] = null; });

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

// ── Cambios de día que hizo el cliente ────────────────────────────────────
// «El martes no puedo, lo paso al jueves.» Cada movimiento cambia UNA fecha
// (tabla `rutina_movimientos`); el plan semanal no se toca. Si el destino ya
// tenía rutina, se intercambian. Se aplican en orden, así que mover dos veces
// la misma rutina la deja donde quedó la última vez.
//
// Devuelve una función fecha → rutina (o null) que ya los tiene en cuenta.
// La usan la semana, el mes y el aviso de la mañana: los tres dicen lo mismo.
export function rutinaPorFecha(fase, porDia, movimientos = []) {
  const fin = finDeFase(fase);
  const base = (fecha) => {
    if (!fase?.fecha_inicio || fecha < fase.fecha_inicio || fecha > fin) return null;
    const [y, m, d] = fecha.split('-').map(Number);
    return porDia[DIAS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7]] || null;
  };
  const mapa = {};
  const ver = (f) => (f in mapa ? mapa[f] : base(f));
  (movimientos || []).slice()
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .forEach(mv => {
      const r = ver(mv.desde);
      if (!r || r.id !== mv.rutina_id || mv.desde === mv.hasta) return;   // ya no está ahí: no aplica
      const otra = ver(mv.hasta);
      mapa[mv.hasta] = r;
      mapa[mv.desde] = otra;
    });
  const fn = (fecha) => ver(fecha);
  fn.movida = (fecha) => fecha in mapa && (mapa[fecha]?.id || null) !== (base(fecha)?.id || null);
  return fn;
}

// La tabla puede no existir (migración sin correr): entonces no hay cambios.
export async function movimientosDe(sb, filtro) {
  try {
    const m = await sb(`rutina_movimientos?select=cliente_id,fase_id,rutina_id,desde,hasta,created_at&${filtro}&order=created_at.asc`);
    return Array.isArray(m) ? m : [];
  } catch (e) { return []; }
}

// Los eventos del calendario que el cliente REGISTRA (y que avisan al coach
// cuando los marca). `medicion` es el tipo de antes de separarlos.
export const TIPOS_REGISTRO = ['medidas', 'peso', 'fotos', 'medicion'];

// «Cycle 2» (lo que traía Trainerize) → «Ciclo 2». En español siempre.
export const nombreFase = (n) => String(n || '').replace(/\bcycle\b/gi, 'Ciclo');

// La fase que el cliente puede ver: activa Y ENVIADA.
//
// `estado` y `visible_cliente` son dos cosas distintas y las dos tienen que
// cumplirse. `estado='activa'` es el estado de trabajo del coach; el que
// decide si el cliente la ve es `visible_cliente`, que pone el botón "enviar
// al cliente" del CRM. Sin esta segunda condición ese botón no servía de
// nada: bastaba marcar la fase como activa —que es lo natural mientras se
// arma— para que al cliente le apareciera media rutina a medio hacer.
export const FASE_VISIBLE = 'estado=eq.activa&visible_cliente=is.true';

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
  (Array.isArray(fases) ? fases : []).forEach(f => { if (!faseDe[f.cliente_id]) faseDe[f.cliente_id] = f; });
  const ids = Object.values(faseDe).map(f => f.id);
  const rutinas = ids.length
    ? await sb(`rutinas?select=id,fase_id,nombre,dia_orden,dia_semana,dias_semana,visible_cliente&fase_id=in.(${ids.join(',')})&archivada=is.false`)
    : [];
  const lunes = lunesDe(hoy);
  const sesiones = await sb(`sesiones?select=cliente_id,rutina_id,fecha,estado&fecha=gte.${lunes}&fecha=lte.${hoy}`);
  const movs = ids.length ? await movimientosDe(sb, `fase_id=in.(${ids.join(',')})`) : [];
  let eventos = [];
  try { eventos = await sb(`eventos?select=id,cliente_id,fase_id,tipo,titulo,fecha,dias_semana,semanas,visible_cliente&tipo=in.(${TIPOS_REGISTRO.join(',')})`); }
  catch (e) { eventos = []; }

  for (const c of (Array.isArray(clientes) ? clientes : [])) {
    if (String(c.estado || 'activo').toLowerCase() !== 'activo') continue;
    const fase = faseDe[c.id] || null;
    let rutina = null;
    if (fase && hoy >= (fase.fecha_inicio || '9999') && hoy <= finDeFase(fase)) {
      const suyas = (Array.isArray(rutinas) ? rutinas : []).filter(r => r.fase_id === fase.id && rutinaVisible(r, fase));
      const r = rutinaPorFecha(fase, repartirPorDia(fase, suyas), movs.filter(mv => mv.fase_id === fase.id))(hoy);
      // Si esa rutina ya está hecha esta semana (la adelantó), no se insiste.
      const hecha = r && (Array.isArray(sesiones) ? sesiones : [])
        .some(s => s.cliente_id === c.id && s.rutina_id === r.id && s.estado === 'completada');
      if (r && !hecha) rutina = r.nombre;
    }
    const evs = (Array.isArray(eventos) ? eventos : []).filter(e => e.cliente_id === c.id);
    const deHoy = expandirEventos(evs, fase)[hoy] || [];
    const medicion = !!deHoy.length;
    // Qué toca registrar hoy, para que el aviso diga «pesarte» o «tus fotos».
    const registros = [...new Set(deHoy.map(e => e.tipo))];
    const dato = { rutina, medicion, registros };
    [c.nombre, ...(Array.isArray(c.nombres_alternos) ? c.nombres_alternos : [])]
      .forEach(n => { const k = normalizeName(n); if (k) out.set(k, dato); });
  }
  return out;
}
