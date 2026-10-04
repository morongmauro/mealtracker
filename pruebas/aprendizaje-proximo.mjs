// Qué le recomienda «Hoy» de Aprendizaje, según lo que ya vio.
//   node pruebas/aprendizaje-proximo.mjs
import { avanceAprendizaje, recomendarAprendizaje } from '../src/aprendizaje.js';

let fallos = 0, casos = 0;
const caso = (n, fn) => { casos++; try { fn(); console.log('  ok   ' + n); } catch (e) { fallos++; console.log('  MAL  ' + n + '\n         ' + e.message); } };
const igual = (a, b, q) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${q}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };
const yo = 'Ana Prueba';
const fila = (source, section_key) => ({ client_name: 'ana prueba', source, section_key });
const hubCompleto = ['programa', 'journey', 'faq', 'recorrido'].map(k => fila('hub', k));

caso('sin nada visto: primero «Acerca del programa», en su orden', () => {
  const r = recomendarAprendizaje(avanceAprendizaje([], yo), 3);
  igual(r.map(x => x.destino), ['hub:programa', 'hub:journey', 'hub:faq'], 'destinos');
  igual(r[0].motivo, 'Empieza por aquí', 'motivo');
});

caso('con el onboarding hecho: algo nuevo de cada bloque', () => {
  const r = recomendarAprendizaje(avanceAprendizaje(hubCompleto, yo), 4);
  igual(r.map(x => x.bloque), ['capsula', 'guia', 'podcast', 'capsula'], 'bloques');
  igual(r[0].destino, 'cap:ent-01-capacidades', 'primera cápsula');
  igual(r[1].destino, 'guia', 'la guía abre la guía');
  igual(r[0].motivo, 'Nuevo para ti', 'motivo');
});

caso('sigue donde iba: el capítulo siguiente de la guía y el tema que más ve', () => {
  const filas = [...hubCompleto,
    fila('guia', 'como-leer-esta-guia'), fila('guia', 'capitulo-1-antes-de-cambiar-tu-alimentacion-entiende-tu-cuer'),
    fila('capsula', 'cap:nut-07-cada-macro')];
  const r = recomendarAprendizaje(avanceAprendizaje(filas, yo), 3);
  igual(r[0].bloque, 'guia', 'la guía va primero (la lleva más avanzada)');
  igual(r[0].id, 'capitulo-2-nutrientes-y-alimentos-como-tomar-buenas-decision', 'capítulo 2');
  igual(r[0].motivo, 'Sigue donde ibas', 'motivo');
  igual([r[1].bloque, r[1].id], ['capsula', 'nut-08-grasa-y-musculo'], 'otra cápsula de nutrición');
  igual(r[2].bloque, 'podcast', 'luego algo nuevo');
});

caso('nada repetido y nunca algo ya visto', () => {
  const filas = [...hubCompleto, fila('podcast', 'pod:etiquetas-leer-1')];
  const r = recomendarAprendizaje(avanceAprendizaje(filas, yo), 12);
  const claves = r.map(x => x.bloque + x.id);
  igual(new Set(claves).size, claves.length, 'sin repetidos');
  igual(r.some(x => x.id === 'etiquetas-leer-1' || x.bloque === 'hub'), false, 'nada visto');
});

caso('lo leído en el centro viejo cuenta; las piezas de «cómo usar cada app» ya no', () => {
  const a = avanceAprendizaje([fila('hub', 'programa'), fila('hub', 'app'), fila('hub', 'meal-tracker')], yo);
  const hub = a.bloques.find(b => b.k === 'hub');
  igual([hub.titulo, hub.vistas, hub.total], ['Acerca del programa', 1, 4], 'hub');
});

caso('sin datos: lista vacía', () => { igual(recomendarAprendizaje(null), [], 'vacío'); });

console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
