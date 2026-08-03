#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BATERÍA DE REGRESIÓN del chat del Meal Tracker.
//
// Corre las frases críticas (las que hoy funcionan + las casuísticas
// arregladas) contra el modelo real y verifica que la clasificación sea la
// esperada. Es el seguro contra "arreglamos una cosa y se rompió otra":
// se corre ANTES de desplegar cualquier cambio de prompt/handlers, y
// también sirve para comparar modelos (Sonnet vs Haiku) con datos.
//
// Uso:
//   ANTHROPIC_API_KEY=sk-... node scripts/bateria.mjs                 # Sonnet
//   ANTHROPIC_API_KEY=sk-... node scripts/bateria.mjs --model=haiku
//   ANTHROPIC_API_KEY=sk-... node scripts/bateria.mjs --model=both
//   ... --solo=A2            # un solo caso
//   ... --grupo=protegidas   # un grupo
//
// Nota: valida la CLASIFICACIÓN del modelo (intents/comandos/fechas), que es
// lo que varía entre modelos y versiones de prompt. Las guardias
// determinísticas del frontend (fechas, pendientes, fallback) se prueban en
// la app; aquí se prueba el contrato con el modelo.
// ─────────────────────────────────────────────────────────────────────────

import { CHAT_SYSTEM_PROMPT, PARSE_SCHEMA } from '../src/chatSpec.js';

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('Falta ANTHROPIC_API_KEY'); process.exit(1); }

const MODELS = { sonnet: 'claude-sonnet-5', haiku: 'claude-haiku-4-5-20251001' };
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const modelArg = args.model || 'sonnet';
const CONCURRENCY = Number(args.concurrencia) || 4;

// ── Fechas de referencia (hoy real, igual que la app) ──────────────────────
const getLocalDate = (d = new Date()) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return getLocalDate(d); };
const D = { hoy: daysAgo(0), ayer: daysAgo(1), antier: daysAgo(2) };
// Fecha del <día de semana> pasado más reciente (0=domingo..6=sábado)
const lastWeekday = (dow) => {
  const d = new Date();
  do { d.setDate(d.getDate() - 1); } while (d.getDay() !== dow);
  return getLocalDate(d);
};
D.sabado = lastWeekday(6); D.viernes = lastWeekday(5); D.lunes = lastWeekday(1);

// ── Constructor de contexto (réplica del formato de la app) ───────────────
function buildContext(fx = {}) {
  const dateTable = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const rel = i === 0 ? 'HOY' : i === 1 ? 'ayer' : i === 2 ? 'antier/anteayer' : `hace ${i} días`;
    return `  · ${rel} (${d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}) = ${getLocalDate(d)}`;
  }).join('\n');

  const pastDaysBlock = (fx.pastDays && fx.pastDays.length)
    ? `\nDÍAS PASADOS CON REGISTRO (para borrar/consultar días anteriores; si una fecha NO está aquí, ese día no tiene nada):\n${fx.pastDays.map(p => `  · ${p.date}: ${p.meals.length} comida(s) [${p.meals.join(', ')}] · ${p.kcal || 500} kcal`).join('\n')}\n`
    : '\nDÍAS PASADOS CON REGISTRO: ninguno en los últimos 14 días.\n';

  const entries = fx.entries || [];
  const last = entries[entries.length - 1] || null;
  const minutesAgo = fx.minutesAgo ?? 30;
  const lastEntrySnippet = last
    ? `\nÚLTIMA COMIDA REGISTRADA HOY (id=${last.id}, meal=${last.meal}, time=${last.time}, hace ${(minutesAgo / 60).toFixed(1)} horas / ${minutesAgo} minutos):\n${JSON.stringify(last.items.map(i => ({ name: i.name, amount: i.amount || '', kcal: i.kcal, p: i.p, c: i.c, g: i.g })))}\n`
    : '\nÚLTIMA COMIDA REGISTRADA HOY: ninguna aún.\n';

  const todayDetail = entries.length
    ? `\nDETALLE COMIDAS DE HOY (para consultas retrospectivas):\n${entries.map((e, i) => `  [#${i + 1} ${e.meal} ${e.time}] items: ${e.items.map(it => `${it.name}${it.amount ? ' ' + it.amount : ''} (${it.kcal}kcal P${it.p} C${it.c} G${it.g})`).join(', ')}`).join('\n')}\n`
    : '';

  const appendHint = last
    ? `\nSEÑAL DETERMINÍSTICA DEL FRONTEND sobre intención de adición: ${fx.appendSignal ? 'TRUE — el cliente usó palabras explícitas de "agregar a la anterior" ("me faltó", "olvidé", "agrégale", "súmale", etc.). Considera APPEND.' : 'FALSE — el cliente NO usó palabras explícitas de adición. Considera log_meal NUEVO por default a menos que el contexto sea inequívoco.'}\n`
    : '';

  const historyBlock = fx.chatHistory
    ? `\n═══ HISTORIAL RECIENTE DE LA CONVERSACIÓN (úsalo para mantener coherencia; si el cliente se refiere a algo dicho antes, recuérdalo) ═══\n${fx.chatHistory}\n`
    : '';

  const totals = entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + (e.p || 0), c: a.c + (e.c || 0), g: a.g + (e.g || 0) }), { kcal: 0, p: 0, c: 0, g: 0 });

  return `
CONTEXTO DEL CLIENTE:
- Nombre: Carolina
- Zona horaria del teléfono: America/Bogota
- Comidas registradas hoy: ${entries.length}
- Totales hoy: ${totals.kcal} kcal · P ${totals.p}g · C ${totals.c}g · G ${totals.g}g
- Meta diaria: 1850 kcal · P 120g · C 180g · G 55g
- Hora actual: ${fx.hora || '10:30'}
- Fecha de hoy: ${D.hoy} (${new Date().toLocaleDateString('es', { weekday: 'long' })})
- TABLA DE FECHAS (para "log_date" COPIA la fecha exacta de esta tabla, NO la calcules tú):
${dateTable}${pastDaysBlock}${lastEntrySnippet}${todayDetail}${appendHint}${historyBlock}`;
}

// ── Fixtures reutilizables ─────────────────────────────────────────────────
const FX_DESAYUNO_HOY = { entries: [{ id: 1, meal: 'desayuno', time: '08:30', kcal: 240, p: 18, c: 2, g: 16, items: [{ name: 'huevo', amount: '3 unidades (150g)', kcal: 225, p: 18, c: 1, g: 15 }, { name: 'café negro', amount: '240ml', kcal: 5, p: 0, c: 1, g: 0 }] }] };
const FX_DOS_COMIDAS = {
  entries: [
    { id: 1, meal: 'desayuno', time: '08:30', kcal: 240, p: 18, c: 2, g: 16, items: [{ name: 'huevo', amount: '3 unidades', kcal: 225, p: 18, c: 1, g: 15 }] },
    { id: 2, meal: 'almuerzo', time: '13:00', kcal: 520, p: 45, c: 48, g: 12, items: [{ name: 'pechuga de pollo', amount: '180g', kcal: 297, p: 55, c: 0, g: 6 }, { name: 'arroz blanco cocido', amount: '1 taza (160g)', kcal: 205, p: 4, c: 45, g: 0 }] },
  ], hora: '15:00', minutesAgo: 120,
};
const FX_CENA_TRES_ITEMS = { entries: [{ id: 1, meal: 'cena', time: '19:40', kcal: 610, p: 48, c: 52, g: 18, items: [{ name: 'arroz blanco cocido', amount: '1 taza (160g)', kcal: 205, p: 4, c: 45, g: 0 }, { name: 'pechuga de pollo', amount: '150g', kcal: 248, p: 46, c: 0, g: 5 }, { name: 'ensalada verde', amount: '1 porción', kcal: 60, p: 2, c: 7, g: 3 }] }], hora: '20:10', minutesAgo: 25 };
const FX_DOS_CENAS = { entries: [
  { id: 1, meal: 'desayuno', time: '08:30', kcal: 240, p: 18, c: 2, g: 16, items: [{ name: 'huevo', amount: '3', kcal: 225, p: 18, c: 1, g: 15 }] },
  { id: 2, meal: 'cena', time: '19:00', kcal: 400, p: 30, c: 30, g: 12, items: [{ name: 'sancocho', amount: '1 plato', kcal: 400, p: 30, c: 30, g: 12 }] },
  { id: 3, meal: 'cena', time: '21:30', kcal: 300, p: 10, c: 40, g: 8, items: [{ name: 'arepa con queso', amount: '1', kcal: 300, p: 10, c: 40, g: 8 }] },
], hora: '21:45', minutesAgo: 15 };
const FX_AYER_DESAYUNO = { pastDays: [{ date: D.ayer, meals: ['desayuno'], kcal: 334 }] };

// ── Helpers de verificación ────────────────────────────────────────────────
const is = (v, ...opts) => opts.includes(v);
const noPast = (p) => !p.log_date || p.log_date === D.hoy;
const hasNoticia = (p) => typeof p.second_action_notice === 'string' && p.second_action_notice.trim().length > 0;

// ── CASOS ──────────────────────────────────────────────────────────────────
// check(p) devuelve true si pasa, o un string con el motivo del fallo.
const CASES = [
  // ═══ PROTEGIDAS: lo que hoy funciona y NO se puede romper ═══
  { id: 'P1', grupo: 'protegidas', msg: 'desayuno: 2 huevos revueltos y un café negro',
    check: p => p.intent === 'log_meal' && is(p.meal, 'desayuno') && (p.items?.length >= 2 || p.meals?.length >= 1) && noPast(p) || 'esperaba log_meal desayuno hoy con 2+ items' },
  { id: 'P2', grupo: 'protegidas', msg: 'almorcé 150g de pollo a la plancha con una taza de arroz', fx: { hora: '13:20' },
    check: p => p.intent === 'log_meal' && is(p.meal, 'almuerzo') && noPast(p) || 'esperaba log_meal almuerzo hoy' },
  { id: 'P3', grupo: 'protegidas', msg: 'te cuento mi día: en la mañana avena con banano, al almuerzo pechuga con arroz y de cena ensalada con atún',
    check: p => p.intent === 'log_meal' && Array.isArray(p.meals) && p.meals.length === 3 || 'esperaba meals[] con 3 comidas' },
  { id: 'P4', grupo: 'protegidas', msg: 'me tomé un litro de agua',
    check: p => p.intent === 'water' && p.water_ml === 1000 || 'esperaba water 1000ml' },
  { id: 'P5', grupo: 'protegidas', msg: 'cómo voy hoy?', fx: FX_DOS_COMIDAS,
    check: p => p.intent === 'summary_day' || 'esperaba summary_day' },
  { id: 'P6', grupo: 'protegidas', msg: 'muéstrame el resumen de la semana',
    check: p => p.intent === 'summary_week' || 'esperaba summary_week' },
  { id: 'P7', grupo: 'protegidas', msg: 'bórrame la cena, estaba mal', fx: FX_CENA_TRES_ITEMS,
    check: p => p.intent === 'command' && p.command === 'delete_entry' && is(p.meal, 'cena') || 'esperaba delete_entry cena' },
  { id: 'P8', grupo: 'protegidas', msg: 'reinicia mi día por favor',
    check: p => p.intent === 'command' && p.command === 'reset_day' || 'esperaba reset_day' },
  { id: 'P9', grupo: 'protegidas', msg: 'me faltó decirte que también comí una banana', fx: { ...FX_DESAYUNO_HOY, minutesAgo: 20, appendSignal: true },
    check: p => p.intent === 'append_to_last' && p.items?.length >= 1 || 'esperaba append_to_last' },
  { id: 'P10', grupo: 'protegidas', msg: 'me equivoqué: eran 2 huevos, no 3', fx: FX_DESAYUNO_HOY,
    check: p => p.intent === 'command' && p.command === 'edit_entry' && p.items?.some(i => /huevo/i.test(i.name)) || 'esperaba edit_entry con huevos' },
  { id: 'P11', grupo: 'protegidas', msg: 'hola!',
    check: p => p.intent === 'off_topic' || 'esperaba off_topic' },
  { id: 'P12', grupo: 'protegidas', msg: '¿cuántas calorías tiene una manzana?',
    check: p => p.intent === 'nutrition_query' && p.nutrition_response || 'esperaba nutrition_query' },
  { id: 'P13', grupo: 'protegidas', msg: '¿cuánto arroz me falta para completar mis carbohidratos de hoy?', fx: FX_DOS_COMIDAS,
    check: p => p.intent === 'command' && p.command === 'proportion' || 'esperaba proportion' },
  { id: 'P14', grupo: 'protegidas', msg: 'ármame el día con lo que me gusta comer',
    check: p => p.intent === 'command' && p.command === 'plan_day' || 'esperaba plan_day' },
  { id: 'P15', grupo: 'protegidas', msg: 'ayer cené pollo con arroz y no te lo registré',
    check: p => p.intent === 'log_meal' && (p.log_date === D.ayer || p.meals?.some(m => m.log_date === D.ayer)) || `esperaba log_date=${D.ayer}` },
  { id: 'P16', grupo: 'protegidas', msg: '¿qué menús favoritos tengo guardados?',
    check: p => p.intent === 'command' && p.command === 'favorites' || 'esperaba favorites' },
  { id: 'P17', grupo: 'protegidas', msg: 'hola, soy Carolina Pérez',
    check: p => p.intent === 'name' && /carolina/i.test(p.name_detected || '') || 'esperaba name detectado' },
  { id: 'P18', grupo: 'protegidas', msg: 'borra todo lo que registré el sábado', fx: { pastDays: [{ date: D.sabado, meals: ['desayuno', 'cena'], kcal: 900 }] },
    check: p => p.intent === 'command' && p.command === 'delete_day' && p.log_date === D.sabado || `esperaba delete_day ${D.sabado}` },
  { id: 'P19', grupo: 'protegidas', msg: '¿qué puedo cenar hoy que sea rico?',
    check: p => p.intent === 'meal_suggestion' || 'esperaba meal_suggestion' },
  { id: 'P20', grupo: 'protegidas', msg: '250 kcal 22p 30c 5g',
    check: p => p.intent === 'log_meal' && p.items?.length === 1 || 'esperaba log_meal directo 1 item' },

  // ═══ CASUÍSTICAS ═══
  { id: 'A1', grupo: 'fechas', msg: 'Añade a mi desayuno media arepa (50 gr), 35 gr de salmón ahumado y una porción de yogurt griego',
    fx: { ...FX_AYER_DESAYUNO, chatHistory: `Cliente: buenas noches, mañana te cuento el desayuno\nAsistente: perfecto, aquí te espero (eso fue AYER ${D.ayer})` },
    check: p => (p.intent === 'log_meal' || p.intent === 'append_to_last') && noPast(p) && !p.meals?.some(m => m.log_date && m.log_date !== D.hoy) || 'NO debía fechar en ayer sin referencia temporal' },
  { id: 'A2', grupo: 'fechas', msg: 'no, ese registro era para hoy — muévelo a hoy',
    fx: { ...FX_AYER_DESAYUNO, chatHistory: `Cliente: añade a mi desayuno media arepa y salmón\nAsistente: Listo, lo registré en ${D.ayer} (ayer), no en hoy. Tu día de hoy queda intacto.` },
    check: p => p.intent === 'command' && p.command === 'move_entry' && p.log_date === D.hoy && (p.move_from === D.ayer || !p.move_from) || `esperaba move_entry destino ${D.hoy} origen ${D.ayer}` },
  { id: 'A3', grupo: 'fechas', msg: 'mueve la cena del sábado para el viernes', fx: { pastDays: [{ date: D.sabado, meals: ['cena'], kcal: 600 }] },
    check: p => p.intent === 'command' && p.command === 'move_entry' && p.log_date === D.viernes && p.move_from === D.sabado || `esperaba move ${D.sabado}→${D.viernes}` },
  { id: 'A4', grupo: 'fechas', msg: 'cámbiale la cantidad al almuerzo de ayer: eran 300g de arroz, no 150', fx: { pastDays: [{ date: D.ayer, meals: ['almuerzo'], kcal: 650 }] },
    check: p => p.intent === 'command' && p.command === 'edit_entry' && p.log_date === D.ayer || `esperaba edit_entry con log_date=${D.ayer}` },
  { id: 'A5', grupo: 'fechas', msg: '¿qué comí ayer?', fx: FX_AYER_DESAYUNO,
    check: p => p.intent === 'summary_day' && p.log_date === D.ayer || `esperaba summary_day log_date=${D.ayer}` },
  { id: 'A6', grupo: 'fechas', msg: 'mañana voy a desayunar 4 huevos con arepa, regístramelo',
    check: p => p.intent !== 'log_meal' && p.intent !== 'append_to_last' || 'NO debía registrar comida futura' },
  { id: 'A7', grupo: 'fechas', msg: 'borra todo lo que registré el 10 de junio',
    check: p => p.intent === 'command' && p.command === 'delete_day' && /^\d{4}-06-10$/.test(p.log_date || '') || 'esperaba delete_day con fecha 10 de junio' },
  { id: 'B10', grupo: 'pendientes', msg: 'para hoy',
    fx: { ...FX_AYER_DESAYUNO, chatHistory: `Cliente: ese desayuno era para hoy\nAsistente: ¿Para qué día muevo esa comida? Dime por ejemplo "para hoy", "para ayer" o la fecha exacta.` },
    check: p => p.intent === 'command' && p.command === 'move_entry' && p.log_date === D.hoy || `esperaba move_entry destino hoy` },
  { id: 'B11', grupo: 'pendientes', msg: 'del sábado',
    fx: { pastDays: [{ date: D.sabado, meals: ['cena'], kcal: 600 }], chatHistory: `Cliente: borra todo ese día\nAsistente: Dime de qué fecha borro todo (por ejemplo: "borra todo lo del 20 de julio").` },
    check: p => p.intent === 'command' && p.command === 'delete_day' && p.log_date === D.sabado || `esperaba delete_day ${D.sabado}` },
  { id: 'B13', grupo: 'pendientes', msg: 'tengo pollo, arroz integral y aceite de oliva',
    fx: { ...FX_DOS_COMIDAS, chatHistory: `Cliente: ayúdame a cuadrar mis macros de hoy\nAsistente: Indícame qué alimentos tienes disponibles. Calculo proporciones para cuadrar tus macros faltantes.` },
    check: p => p.intent === 'command' && p.command === 'proportion' || 'esperaba proportion (NO manage_favorites)' },
  { id: 'D22', grupo: 'pendientes', msg: 'no, bórralo',
    fx: { chatHistory: `Cliente: ayer cené pizza, 3 porciones\nAsistente: Listo, lo registré en ${D.ayer} (ayer). Ese día sumó 850 kcal.`, pastDays: [{ date: D.ayer, meals: ['cena'], kcal: 850 }] },
    check: p => p.intent === 'command' && is(p.command, 'delete_entry', 'delete_day') && p.log_date === D.ayer || `esperaba borrar en ${D.ayer}` },
  { id: 'C15', grupo: 'append', msg: 'agrégale una banana al desayuno', fx: { ...FX_DOS_COMIDAS, appendSignal: true },
    check: p => (p.intent === 'append_to_last' && is(p.meal, 'desayuno')) || (p.intent === 'command' && p.command === 'edit_entry' && p.edit_entry_index === 1) || 'esperaba append/edit dirigido al DESAYUNO, no al almuerzo' },
  { id: 'C16', grupo: 'append', msg: 'agrégale al desayuno el café que se me olvidó decirte', fx: { ...FX_DOS_COMIDAS, appendSignal: true, minutesAgo: 240 },
    check: p => (p.intent === 'append_to_last' && is(p.meal, 'desayuno')) || (p.intent === 'command' && p.command === 'edit_entry' && p.edit_entry_index === 1) || 'esperaba append al desayuno aunque pasaran horas (comida nombrada)' },
  { id: 'C17', grupo: 'append', msg: 'fueron 2 huevos', fx: FX_DESAYUNO_HOY,
    check: p => p.intent === 'command' && p.command === 'edit_entry' || 'esperaba edit_entry (corrección), NO sumar huevos' },
  { id: 'C18', grupo: 'append', msg: '¿estuvo muy grasoso el almuerzo que registré? me siento pesado', fx: FX_DOS_COMIDAS,
    check: p => p.intent !== 'log_meal' && p.intent !== 'append_to_last' || 'NO debía registrar nada (era una pregunta)' },
  { id: 'D20', grupo: 'borrado', msg: 'borra el arroz de la cena', fx: FX_CENA_TRES_ITEMS,
    check: p => p.intent === 'command' && p.command === 'edit_entry' && p.items?.length >= 1 && !p.items.some(i => /arroz/i.test(i.name)) || 'esperaba edit_entry SIN el arroz (no borrar la cena completa)' },
  { id: 'D21', grupo: 'borrado', msg: 'borra la primera cena, la de las 7', fx: FX_DOS_CENAS,
    check: p => p.intent === 'command' && p.command === 'delete_entry' && Number(p.edit_entry_index) === 2 || 'esperaba delete_entry con edit_entry_index=2' },
  { id: 'E23', grupo: 'multi', msg: 'borra la cena y regístrame una manzana de snack', fx: FX_CENA_TRES_ITEMS,
    check: p => hasNoticia(p) || 'esperaba second_action_notice avisando la acción no ejecutada' },
];

// ── Llamada a la API (mismos parámetros por modelo que api/chat.js) ────────
async function callModel(model, userMessage) {
  const body = {
    model,
    max_tokens: 4000,
    system: [{ type: 'text', text: CHAT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
    output_config: {
      ...(model.startsWith('claude-sonnet-5') ? { effort: 'low' } : {}),
      format: { type: 'json_schema', schema: PARSE_SCHEMA },
    },
    ...(model.startsWith('claude-sonnet-5') ? { thinking: { type: 'disabled' } } : { temperature: 0 }),
  };
  for (let i = 0; i < 3; i++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    });
    if (r.status === 429 || r.status === 529 || r.status >= 500) { await new Promise(s => setTimeout(s, 2000 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    const text = data.content.map(c => c.text || '').join('');
    return { parsed: JSON.parse(text.replace(/```json|```/g, '').trim()), usage: data.usage };
  }
  throw new Error('reintentos agotados');
}

// ── Runner ─────────────────────────────────────────────────────────────────
async function runSuite(modelKey) {
  const model = MODELS[modelKey];
  let cases = CASES;
  if (args.solo) cases = cases.filter(c => c.id === args.solo);
  if (args.grupo) cases = cases.filter(c => c.grupo === args.grupo);
  console.log(`\n═══ ${model} · ${cases.length} casos ═══\n`);

  const results = [];
  let idx = 0;
  const worker = async () => {
    while (idx < cases.length) {
      const c = cases[idx++];
      const userMessage = `${buildContext(c.fx)}\n\n═══ MENSAJE ACTUAL DEL CLIENTE ═══\n${c.msg}`;
      try {
        const { parsed } = await callModel(model, userMessage);
        const r = c.check(parsed);
        const ok = r === true;
        results.push({ ...c, ok, why: ok ? '' : r, got: parsed });
        console.log(`${ok ? '✓' : '✗'} ${c.id.padEnd(4)} ${c.msg.slice(0, 58)}${ok ? '' : `\n     → ${r}\n     → recibido: intent=${parsed.intent} command=${parsed.command} meal=${parsed.meal} log_date=${parsed.log_date} move_from=${parsed.move_from} idx=${parsed.edit_entry_index}`}`);
      } catch (e) {
        results.push({ ...c, ok: false, why: `ERROR: ${e.message}` });
        console.log(`✗ ${c.id.padEnd(4)} ERROR: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const byGroup = {};
  for (const r of results) { (byGroup[r.grupo] = byGroup[r.grupo] || []).push(r); }
  console.log(`\n─── Resumen ${model} ───`);
  for (const [g, rs] of Object.entries(byGroup)) {
    console.log(`  ${g.padEnd(12)} ${rs.filter(r => r.ok).length}/${rs.length}`);
  }
  const total = results.filter(r => r.ok).length;
  console.log(`  TOTAL        ${total}/${results.length} (${Math.round(total / results.length * 100)}%)\n`);
  return { model: modelKey, total, n: results.length, results };
}

const suites = modelArg === 'both' ? ['sonnet', 'haiku'] : [modelArg];
let failed = false;
for (const s of suites) {
  const r = await runSuite(s);
  // Las protegidas son bloqueantes SOLO para el modelo de producción (sonnet)
  if (s === 'sonnet' && r.results.some(x => !x.ok && x.grupo === 'protegidas')) failed = true;
}
if (suites.length === 2) console.log('Comparativo listo: usa los resúmenes de arriba para decidir el enrutamiento híbrido.');
process.exit(failed ? 1 : 0);
