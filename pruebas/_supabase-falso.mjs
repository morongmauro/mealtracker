// Un PostgREST de mentira, en memoria, con lo justo que usa api/training.js:
// filtros eq / is / in / gte / lte, order, limit, y GET / POST / PATCH / DELETE.
//
// Si una tabla declara sus columnas, pedir una que no existe da 400, igual que
// el PostgREST de verdad. Así se prueba el respaldo de las columnas nuevas
// (una migración que el coach aún no corrió no debe tumbar la rutina).

import { randomUUID } from 'node:crypto';

// `obligatorias`: columnas NOT NULL sin valor por defecto que sirva desde la
// API. `user_id` en sesiones y actividades es el caso real: su default es
// auth.uid(), que con la service_role vale null.
export function crearSupabaseFalso({ tablas = {}, columnas = {}, porDefecto = {},
  obligatorias = { sesiones: ['user_id'], actividades: ['user_id'], mediciones_corporales: ['user_id'], notas_entreno: ['user_id'] } } = {}) {
  const db = {};
  for (const [t, filas] of Object.entries(tablas)) db[t] = filas.map(f => ({ ...f }));
  const log = [];

  const valor = (v) => {
    if (v === 'null') return null;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return v;
  };
  const cumple = (fila, col, expr) => {
    const [op, ...resto] = expr.split('.');
    const arg = decodeURIComponent(resto.join('.'));
    const v = fila[col];
    const s = v == null ? v : String(v);
    switch (op) {
      case 'eq': return s === arg;
      case 'is': return v === valor(arg) || (arg === 'null' && v === undefined);
      case 'in': return arg.replace(/^\(|\)$/g, '').split(',').includes(s);
      case 'gte': return s != null && s >= arg;
      case 'lte': return s != null && s <= arg;
      case 'lt': return s != null && s < arg;
      case 'gt': return s != null && s > arg;
      default: throw new Error('op no soportada: ' + op);
    }
  };

  async function fetchFalso(url, opts = {}) {
    const u = new URL(url);
    const metodo = (opts.method || 'GET').toUpperCase();
    const m = u.pathname.match(/\/rest\/v1\/([a-z_]+)/);
    if (!m) return respuesta(404, { error: 'ruta' });
    const tabla = m[1];
    const filas = db[tabla] || (db[tabla] = []);
    log.push({ metodo, tabla, query: u.search });

    // Columnas pedidas que no existen → 400, como PostgREST.
    const sel = u.searchParams.get('select');
    if (sel && columnas[tabla]) {
      const pedidas = sel.split(',').map(x => x.split(':').pop().split('->')[0].trim());
      const malas = pedidas.filter(c => c !== '*' && !columnas[tabla].includes(c));
      if (malas.length) return respuesta(400, { message: `column ${tabla}.${malas[0]} does not exist` });
    }

    const filtros = [];
    for (const [k, v] of u.searchParams.entries()) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
      filtros.push([k, v]);
    }
    const pasa = (f) => filtros.every(([k, v]) => cumple(f, k, v));

    if (metodo === 'GET') {
      let out = filas.filter(pasa);
      const orden = u.searchParams.get('order');
      if (orden) {
        const claves = orden.split(',').map(x => x.split('.'));
        out = out.slice().sort((a, b) => {
          for (const [c, dir] of claves) {
            const x = String(a[c] ?? ''), y = String(b[c] ?? '');
            if (x !== y) return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1);
          }
          return 0;
        });
      }
      const off = Number(u.searchParams.get('offset')) || 0;
      const lim = Number(u.searchParams.get('limit'));
      if (off) out = out.slice(off);
      if (lim) out = out.slice(0, lim);
      return respuesta(200, out.map(f => ({ ...f })));
    }
    if (metodo === 'POST') {
      const cuerpo = JSON.parse(opts.body);
      const nuevas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).map(f => ({
        id: randomUUID(), created_at: new Date().toISOString(), ...(porDefecto[tabla] || {}), ...f,
      }));
      for (const f of nuevas) {
        const falta = (obligatorias[tabla] || []).find(c => f[c] == null);
        if (falta) return respuesta(400, { message: `null value in column "${falta}" of relation "${tabla}" violates not-null constraint` });
        // El índice único de sesiones: cliente + rutina + fecha.
        if (tabla === 'sesiones' && f.rutina_id
            && filas.some(x => x.cliente_id === f.cliente_id && x.rutina_id === f.rutina_id && x.fecha === f.fecha)) {
          return respuesta(409, { message: 'duplicate key value violates unique constraint "sesiones_unica_idx"' });
        }
      }
      filas.push(...nuevas);
      return respuesta(201, nuevas);
    }
    if (metodo === 'PATCH') {
      const cambios = JSON.parse(opts.body);
      const tocadas = filas.filter(pasa);
      tocadas.forEach(f => Object.assign(f, cambios));
      return respuesta(200, tocadas);
    }
    if (metodo === 'DELETE') {
      const quedan = filas.filter(f => !pasa(f));
      const borradas = filas.filter(pasa);
      db[tabla] = quedan;
      // Como PostgREST: con «return=representation» devuelve lo borrado.
      const prefer = String((opts.headers && (opts.headers.Prefer || opts.headers.prefer)) || '');
      return prefer.includes('return=representation') ? respuesta(200, borradas) : respuesta(204, null);
    }
    return respuesta(405, {});
  }

  return { db, log, fetch: fetchFalso };
}

function respuesta(status, cuerpo) {
  const texto = cuerpo == null ? '' : JSON.stringify(cuerpo);
  return {
    ok: status >= 200 && status < 300, status,
    text: async () => texto,
    json: async () => JSON.parse(texto),
  };
}

// Llama al handler de Vercel como lo haría la plataforma.
export async function llamar(handler, cuerpo, { metodo = 'POST' } = {}) {
  const req = {
    method: metodo,
    headers: { host: 'app.test', origin: 'https://app.test', 'x-forwarded-for': '1.1.1.' + Math.floor(Math.random() * 250) },
    body: metodo === 'POST' ? cuerpo : undefined,
    query: metodo === 'GET' ? cuerpo : {},
  };
  let estado = 200, json = null;
  const res = {
    status(s) { estado = s; return this; },
    json(j) { json = j; return this; },
    setHeader() {}, end() { return this; },
  };
  await handler(req, res);
  return { estado, ...json };
}
