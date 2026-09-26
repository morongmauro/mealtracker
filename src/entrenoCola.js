// ─────────────────────────────────────────────────────────────────────────
// ENTRENAMIENTO · la cola de series sin subir
//
// Media lista entrena en gimnasios de sótano o con la señal cortada. Antes,
// marcar una serie sin red ponía el check en verde y la petición se perdía:
// el cliente creía que estaba guardado, cerraba la app y la serie no existía.
//
// Ahora cada serie marcada (o desmarcada) entra primero a esta cola, que vive
// en el teléfono (localStorage) y sobrevive a cerrar la app. Se sube en orden
// en cuanto hay red. Subir dos veces la misma serie no duplica nada: el
// servidor la busca por sesión + línea de la rutina + número de serie y la
// actualiza.
//
// Si la sesión aún no existe (se marcó la primera serie sin red), la cola la
// abre al subir, con la FECHA en que se marcó, no la de cuando volvió la señal.
//
// Sin React ni DOM a propósito: se prueba en Node (pruebas/entreno-cola.mjs).
// ─────────────────────────────────────────────────────────────────────────

const CLAVE = 'entreno:cola:v1';
const CLAVE_RUTINA = (id) => `entreno:rutina:v1:${id}`;

export function crearCola({ almacen, api, hoy }) {
  const leer = () => {
    try { const v = JSON.parse(almacen.getItem(CLAVE) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  };
  const escribir = (lista) => { try { almacen.setItem(CLAVE, JSON.stringify(lista)); } catch (e) {} };

  const oyentes = new Set();
  const avisar = () => { const n = leer().length; oyentes.forEach(f => { try { f(n); } catch (e) {} }); };

  // Una serie es una sola entrada: marcar, corregir y desmarcar la misma
  // serie antes de que suba deja solo lo último.
  const claveDe = (x) => `${x.name}|${x.rutina_id}|${x.fecha}|${x.datos.rutina_ejercicio_id || x.datos.ejercicio_id}|${x.datos.serie_num}`;

  function encolar({ name, rutina_id, sesion_id = null, fecha = hoy(), datos }) {
    const item = { name, rutina_id, sesion_id, fecha, datos, en: Date.now() };
    const k = claveDe(item);
    const lista = leer().filter(x => claveDe(x) !== k);
    lista.push(item);
    escribir(lista);
    avisar();
  }

  // Quita ESA entrada releyendo la cola: mientras se esperaba a la red pudo
  // entrar otra serie, y escribir la lista vieja la borraría.
  const quitar = (x) => {
    const k = claveDe(x);
    const actual = leer();
    const i = actual.findIndex(y => claveDe(y) === k && y.en === x.en);
    if (i >= 0) actual.splice(i, 1);
    escribir(actual);
    avisar();
    return actual;
  };

  // Las sesiones que ya se abrieron mientras se vaciaba, para no pedir la
  // misma dos veces seguidas.
  const sesionDe = new Map();
  let enCurso = null;

  async function vaciarUnaVez() {
    let lista = leer();
    while (lista.length) {
      const x = lista[0];
      let sesionId = x.sesion_id || sesionDe.get(`${x.name}|${x.rutina_id}|${x.fecha}`) || null;
      if (!sesionId) {
        const s = await api.abrir(x.name, x.rutina_id, { crear: true, fecha: x.fecha });
        if (!s || !s.ok || !s.sesion) {
          // La rutina ya no existe o dejó de ser visible: esa serie no tiene a
          // dónde ir. Se descarta para que no bloquee a las demás para siempre.
          if (s && (s.motivo === 'no_es_suya' || s.motivo === 'no_enviada')) { lista = quitar(x); continue; }
          return leer().length;
        }
        sesionId = s.sesion.id;
        sesionDe.set(`${x.name}|${x.rutina_id}|${x.fecha}`, sesionId);
      }
      const r = await api.serie(x.name, { sesion_id: sesionId, ...x.datos });
      if (!r || !r.ok) {
        if (r && (r.motivo === 'no_es_suya' || r.motivo === 'serie_invalida' || r.motivo === 'sin_ejercicio')) {
          lista = quitar(x); continue;
        }
        return leer().length;
      }
      lista = quitar(x);
    }
    return 0;
  }

  // Nunca dos vaciados a la vez: el segundo espera al primero y vuelve a mirar.
  function vaciar() {
    if (enCurso) return enCurso.then(() => vaciar());
    enCurso = vaciarUnaVez().catch(() => leer().length).finally(() => { enCurso = null; });
    return enCurso;
  }

  return {
    encolar, vaciar,
    pendientes: (filtro) => leer().filter(x => !filtro || filtro(x)),
    alCambiar: (f) => { oyentes.add(f); return () => oyentes.delete(f); },
    // La sesión que ya abrió la cola, para que la pantalla no pida otra.
    sesionAbierta: (name, rutina_id, fecha) => sesionDe.get(`${name}|${rutina_id}|${fecha}`) || null,
  };
}

// La última copia de una rutina, para poder abrirla sin señal. Es la misma
// respuesta del servidor, tal cual; se reemplaza cada vez que hay red.
export function guardarRutinaLocal(almacen, rutina) {
  try { almacen.setItem(CLAVE_RUTINA(rutina.id), JSON.stringify({ en: Date.now(), rutina })); } catch (e) {}
}
export function leerRutinaLocal(almacen, id) {
  try { const v = JSON.parse(almacen.getItem(CLAVE_RUTINA(id)) || 'null'); return v && v.rutina ? v.rutina : null; }
  catch (e) { return null; }
}
