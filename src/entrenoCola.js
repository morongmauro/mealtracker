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
const CLAVE_APARTADAS = 'entreno:cola:apartadas:v1';
// Los «Terminar» que no se pudieron enviar: se envían solos después.
const CLAVE_CIERRES = 'entreno:cierres:v1';
const CLAVE_RUTINA = (id) => `entreno:rutina:v1:${id}`;

export function crearCola({ almacen, api, hoy, alApartar = null }) {
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

  // ¿Falló por la señal (o el servidor no contestó)? Eso se reintenta. Lo
  // demás es que el servidor RECHAZÓ esa serie: reintentarla igual no sirve.
  const esDeRed = (m) => !m || m === 'sin_red' || /^http_(5\d\d|408|429)$/.test(m);
  // Una serie que el servidor rechaza no puede trancar a las demás (antes se
  // quedaba primera en la cola para siempre: ninguna otra subía y la rutina
  // no se podía terminar, con el aviso «Sin señal» aunque hubiera señal).
  // Se salta, se le cuenta el fallo y, a la tercera, se aparta: queda
  // guardada aparte en el teléfono (no se borra) y se avisa a la bitácora.
  const apartar = (x, motivo) => {
    quitar(x);
    try {
      const v = JSON.parse(almacen.getItem(CLAVE_APARTADAS) || '[]');
      const l = Array.isArray(v) ? v : [];
      l.push({ ...x, motivo, apartada: Date.now() });
      almacen.setItem(CLAVE_APARTADAS, JSON.stringify(l.slice(-200)));
    } catch (e) { /* nada */ }
    try { alApartar && alApartar(x, motivo); } catch (e) { /* nada */ }
  };
  const fallo = (x, motivo) => {
    const k = claveDe(x);
    const actual = leer();
    const y = actual.find(z => claveDe(z) === k && z.en === x.en);
    if (!y) return;
    y.fallos = (y.fallos || 0) + 1;
    y.ultimo = motivo || 'error';
    if (y.fallos >= 3) { apartar(y, y.ultimo); return; }
    escribir(actual);
  };

  async function vaciarUnaVez(primero) {
    const saltadas = new Set();
    for (;;) {
      let lista = leer().filter(x => !saltadas.has(`${claveDe(x)}|${x.en}`));
      // Las de la rutina que se está terminando, primero.
      if (primero) lista = [...lista.filter(primero), ...lista.filter(x => !primero(x))];
      if (!lista.length) return leer().length;
      const x = lista[0];
      let sesionId = x.sesion_id || sesionDe.get(`${x.name}|${x.rutina_id}|${x.fecha}`) || null;
      if (!sesionId) {
        const s = await api.abrir(x.name, x.rutina_id, { crear: true, fecha: x.fecha });
        if (!s || !s.ok || !s.sesion) {
          // La rutina ya no existe o dejó de ser visible: esa serie no tiene a
          // dónde ir. Se descarta para que no bloquee a las demás para siempre.
          if (s && (s.motivo === 'no_es_suya' || s.motivo === 'no_enviada')) { quitar(x); continue; }
          if (!s || esDeRed(s.motivo) || s.motivo === 'sesion') return leer().length;
          fallo(x, s.motivo); saltadas.add(`${claveDe(x)}|${x.en}`); continue;
        }
        sesionId = s.sesion.id;
        sesionDe.set(`${x.name}|${x.rutina_id}|${x.fecha}`, sesionId);
      }
      const r = await api.serie(x.name, { sesion_id: sesionId, ...x.datos });
      if (!r || !r.ok) {
        if (r && (r.motivo === 'no_es_suya' || r.motivo === 'serie_invalida' || r.motivo === 'sin_ejercicio')) { quitar(x); continue; }
        if (r && r.motivo === 'serie_rechazada') { apartar(x, r.motivo); continue; }
        if (!r || esDeRed(r.motivo) || r.motivo === 'sesion') return leer().length;
        fallo(x, r.motivo); saltadas.add(`${claveDe(x)}|${x.en}`); continue;
      }
      quitar(x);
    }
  }

  // ── Los «Terminar» pendientes ────────────────────────────────────────
  // Si al terminar no hay señal (o el servidor falla), la rutina se termina
  // igual en el teléfono y el cierre queda aquí. Se envía solo cuando ya
  // subieron todas sus series. Nunca se borra sin enviarse: si el servidor
  // lo rechaza 5 veces, se aparta (guardado) y se avisa a la bitácora.
  const leerC = () => { try { const v = JSON.parse(almacen.getItem(CLAVE_CIERRES) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const escribirC = (l) => { try { almacen.setItem(CLAVE_CIERRES, JSON.stringify(l)); } catch (e) {} };
  const claveC = (c) => `${c.name}|${c.rutina_id}|${c.fecha}`;
  function encolarCierre({ name, rutina_id, fecha = hoy(), sesion_id = null, estado, rpe = null, notas = null }) {
    const c = { name, rutina_id, fecha, sesion_id, estado, rpe, notas, en: Date.now() };
    escribirC([...leerC().filter(x => claveC(x) !== claveC(c)), c]);
    avisar();
  }
  const quitarC = (c) => escribirC(leerC().filter(x => !(claveC(x) === claveC(c) && x.en === c.en)));
  const falloC = (c, motivo) => {
    const l = leerC(); const y = l.find(x => claveC(x) === claveC(c) && x.en === c.en);
    if (!y) return;
    y.fallos = (y.fallos || 0) + 1; y.ultimo = motivo || 'error';
    if (y.fallos >= 5) {
      escribirC(l.filter(x => x !== y));
      try { const v = JSON.parse(almacen.getItem(CLAVE_APARTADAS) || '[]'); const a = Array.isArray(v) ? v : []; a.push({ cierre: true, ...y, apartada: Date.now() }); almacen.setItem(CLAVE_APARTADAS, JSON.stringify(a.slice(-200))); } catch (e) { /* nada */ }
      try { alApartar && alApartar({ rutina_id: y.rutina_id, fecha: y.fecha, datos: { cierre: true, estado: y.estado, rpe: y.rpe } }, `cierre ${y.ultimo}`); } catch (e) { /* nada */ }
      return;
    }
    escribirC(l);
  };
  async function subirCierres() {
    for (const c of leerC()) {
      // Primero sus series: la duración y los récords salen de ellas.
      if (leer().some(x => x.name === c.name && x.rutina_id === c.rutina_id && x.fecha === c.fecha)) continue;
      let sid = c.sesion_id || sesionDe.get(claveC(c)) || null;
      if (!sid) {
        const s = await api.abrir(c.name, c.rutina_id, { crear: true, fecha: c.fecha });
        if (!s || !s.ok || !s.sesion) {
          if (s && (s.motivo === 'no_es_suya' || s.motivo === 'no_enviada')) { quitarC(c); continue; }
          if (!s || esDeRed(s.motivo) || s.motivo === 'sesion') return;
          falloC(c, s.motivo); continue;
        }
        sid = s.sesion.id;
      }
      const r = await api.cerrar(c.name, { sesion_id: sid, rpe: c.rpe, notas: c.notas, estado: c.estado });
      if (r && r.ok) { quitarC(c); continue; }
      if (r && r.motivo === 'no_es_suya') { quitarC(c); continue; }
      if (!r || esDeRed(r.motivo) || r.motivo === 'sesion') return;
      falloC(c, r.motivo);
    }
  }

  // Nunca dos vaciados a la vez: el segundo espera al primero y vuelve a mirar.
  function vaciar(primero) {
    if (enCurso) return enCurso.then(() => vaciar(primero));
    enCurso = vaciarUnaVez(primero).then(async (n) => { if (leerC().length) { try { await subirCierres(); } catch (e) { /* luego */ } } return n; })
      .catch(() => leer().length).finally(() => { enCurso = null; });
    return enCurso;
  }

  // Al terminar la rutina: las series de ESTA rutina que el servidor rechazó
  // (no por señal) se apartan para que se pueda cerrar con lo demás.
  function apartarRechazadas(filtro) {
    leer().filter(x => (!filtro || filtro(x)) && x.ultimo && !esDeRed(x.ultimo) && x.ultimo !== 'sesion').forEach(x => apartar(x, x.ultimo));
  }

  return {
    encolar, vaciar, apartarRechazadas, encolarCierre,
    cierresPendientes: (filtro) => leerC().filter(c => !filtro || filtro(c)),
    // Si el «Terminar» que se daba por perdido sí llegó (tarde), no se repite.
    quitarCierres: (filtro) => escribirC(leerC().filter(c => !filtro(c))),
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
