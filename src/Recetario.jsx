import React, { useState, useMemo, useRef, startTransition } from 'react';
import { ChevronLeft, Search, SlidersHorizontal as Sliders, RotateCcw, Check, Info, Clock, AlertTriangle, X } from 'lucide-react';

// Paleta, sombras y tipografía compartidas — ver src/theme.js.
import {
  ACCENT, ACCENT_DARK, ACCENT_PASTEL, ACCENT_LIGHT,
  C_PROTEIN, C_CARBS, C_FAT,
  BG, SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, TEXT_LIGHT,
  FONT_UI, SHADOW_CARD,
} from './theme.js';

const haptic = (p = 10) => { if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(p); };
const r0 = (n) => Math.round(Number(n) || 0);
const round5 = (n) => Math.round((Number(n) || 0) / 5) * 5;
const roundHalf = (n) => Math.round((Number(n) || 0) * 2) / 2;
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const SPLIT = { desayuno: 0.25, almuerzo: 0.35, cena: 0.30, snack: 0.10 };
const SLOT_LABELS = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena', snack: 'Snack' };
const SLOT_ORDER = ['desayuno', 'almuerzo', 'cena', 'snack'];
// Almuerzo y cena se muestran como un solo grupo (son intercambiables).
const SLOT_FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'principal', label: 'Almuerzo / Cena' },
  { key: 'snack', label: 'Snack' },
];
const slotMatches = (recipeSlot, filterKey) => filterKey === 'principal'
  ? (recipeSlot === 'almuerzo' || recipeSlot === 'cena')
  : recipeSlot === filterKey;
const displaySlot = (slot) => (slot === 'almuerzo' || slot === 'cena') ? 'Almuerzo / Cena' : SLOT_LABELS[slot];

// ─────────────────────────────────────────────────────────────────────────
// RECETAS — cargadas desde los PDFs del cliente. Nombres de ingredientes en
// lenguaje cotidiano. `totals` = macros de la porción base. `main` = escalan;
// `season` = "para realzar" (fijos).
// ─────────────────────────────────────────────────────────────────────────
const RECIPES = [
  {
    id: 'tuna-wrap', name: 'Wrap crujiente de atún', slot: 'almuerzo', time: '10 min', icon: '🥙',
    allergens: ['Pescado', 'Gluten'], tags: ['Alto en fibra', 'Comida simple'],
    totals: { kcal: 464, p: 34, c: 49, g: 15 },
    main: [
      { n: 'Atún en agua (escurrido)', q: 100, u: 'g' },
      { n: 'Tortilla de harina', q: 1, u: 'unidad' },
      { n: 'Aguacate', q: 60, u: 'g' },
      { n: 'Zanahoria', q: 25, u: 'g' },
      { n: 'Repollo morado', q: 25, u: 'g' },
    ],
    season: ['Sal y pimienta al gusto'],
    steps: [
      'Pela y ralla la zanahoria y el repollo. Corta el aguacate en láminas y escurre bien el atún.',
      'Calienta la tortilla 10–15 segundos para ablandarla.',
      'Arma el wrap: coloca el repollo, la zanahoria, el aguacate y el atún en el centro.',
      'Enróllalo con cuidado, córtalo a la mitad y disfruta.',
    ],
  },
  {
    id: 'caesar-wrap', name: 'Wrap César de salmón', slot: 'almuerzo', time: '5 min', icon: '🥪',
    allergens: ['Lácteos', 'Pescado', 'Gluten'], tags: ['Sin cocción', 'Comida simple'],
    totals: { kcal: 455, p: 30, c: 47, g: 15 },
    main: [
      { n: 'Salmón ahumado', q: 90, u: 'g' },
      { n: 'Tortilla de harina', q: 1, u: 'unidad' },
      { n: 'Queso parmesano', q: 20, u: 'g' },
      { n: 'Lechuga romana', q: 24, u: 'g' },
    ],
    season: ['Aderezo César light · 2 cda'],
    steps: [
      'Unta el aderezo César sobre un lado de la tortilla.',
      'Agrega la lechuga, el salmón ahumado en trozos y el parmesano rallado.',
      'Enrolla con cuidado, corta a la mitad y disfruta.',
    ],
  },
  {
    id: 'teriyaki-salmon', name: 'Salmón teriyaki', slot: 'cena', time: '25 min', icon: '🐟',
    allergens: ['Pescado'], tags: ['Alto en fibra'],
    totals: { kcal: 507, p: 35, c: 54, g: 18 },
    main: [
      { n: 'Filete de salmón', q: 140, u: 'g' },
      { n: 'Brócoli', q: 91, u: 'g' },
    ],
    season: [
      'Salsa de soya · 60 ml', 'Miel · 2 cda', 'Vinagre de arroz · 2 cdta',
      'Aceite de sésamo · 2 cdta', 'Ajo · 1 diente', 'Jengibre · 1 cdta', 'Semillas de sésamo · 1 cdta',
    ],
    steps: [
      'Combina la salsa de soya, la miel, el vinagre, 1 cdta de aceite de sésamo, el jengibre y el ajo en una olla. Fuego lento 10 min hasta que espese.',
      'Retira del fuego y enfría en la nevera. Precalienta el horno a 230°C.',
      'Baña el salmón en la salsa y hornéalo sobre papel aluminio 12 min.',
      'Pásalo a gratinar 2–3 min hasta que caramelice.',
      'Sirve con semillas de sésamo y el brócoli al vapor con un toque de aceite de sésamo y sal.',
    ],
  },
  {
    id: 'salmon-potatoes', name: 'Salmón con papas y espárragos', slot: 'cena', time: '15 min', icon: '🥔',
    allergens: ['Pescado'], tags: ['Comida simple'],
    totals: { kcal: 541, p: 46, c: 51, g: 19 },
    main: [
      { n: 'Filete de salmón', q: 180, u: 'g' },
      { n: 'Papas baby', q: 220, u: 'g' },
      { n: 'Espárragos', q: 8, u: 'unidades' },
    ],
    season: [
      'Aceite de oliva · 2 cdta', 'Limón · 1 unidad', 'Eneldo fresco · 2 cda',
      'Ajo · ½ cdta', 'Sal y pimienta al gusto',
    ],
    steps: [
      'Hierve las papas en agua 3–5 min hasta que estén tiernas. Escurre.',
      'Precalienta la freidora de aire a 180°C por 5 min.',
      'En un bol, mezcla las papas y los espárragos con aceite de oliva, sal y pimienta.',
      'Cocínalos en la freidora de aire 5 min hasta que estén tiernos. Reserva.',
      'Mezcla aceite de oliva, jugo de limón y eneldo; cubre el salmón con esa mezcla.',
      'Cocina el salmón en la freidora 8 min, girándolo a la mitad. Desmenúzalo con dos tenedores.',
      'Emplata las papas, luego los espárragos y encima el salmón. Decora con eneldo.',
    ],
  },
  {
    id: 'salmon-quinoa', name: 'Bowl de salmón y quinoa', slot: 'cena', time: '15 min', icon: '🍚',
    allergens: ['Pescado'], tags: ['Alto en fibra', 'Comida simple'],
    totals: { kcal: 527, p: 37, c: 51, g: 21 },
    main: [
      { n: 'Filete de salmón', q: 120, u: 'g' },
      { n: 'Quinoa cocida', q: 160, u: 'g' },
      { n: 'Tomate', q: 250, u: 'g' },
      { n: 'Aguacate', q: 60, u: 'g' },
    ],
    season: [
      'Semillas de sésamo · 2 cdta', 'Alga nori · 1 hoja', 'Aceite en spray · 1', 'Sal y pimienta al gusto',
    ],
    steps: [
      'Calienta una sartén antiadherente con un poco de spray. Cocina el salmón ~4 min por lado. Reserva.',
      'Pica el aguacate y el tomate, sazónalos con sal y pimienta y mézclalos con suavidad.',
      'Corta el nori en tiras finas.',
      'Sirve la quinoa a un lado y la ensalada de tomate al otro; corona la quinoa con el salmón.',
      'Espolvorea sésamo, agrega las tiras de nori y disfruta.',
    ],
  },
  {
    id: 'chicken-caprese', name: 'Pollo con ensalada caprese', slot: 'almuerzo', time: '15 min', icon: '🍅',
    allergens: ['Lácteos', 'Carne'], tags: ['Alto en fibra', 'Ensalada', 'Comida simple'],
    totals: { kcal: 531, p: 47, c: 27, g: 27 },
    main: [
      { n: 'Pechuga de pollo', q: 65, u: 'g' },
      { n: 'Queso mozzarella', q: 100, u: 'g' },
      { n: 'Tomate cherry', q: 112, u: 'g' },
      { n: 'Quinoa cocida', q: 93, u: 'g' },
      { n: 'Rúcula', q: 20, u: 'g' },
    ],
    season: ['Sal, pimienta y especias italianas al gusto'],
    steps: [
      'Corta los tomates cherry por la mitad, pica la mozzarella en trozos pequeños y corta la pechuga en láminas.',
      'En un bol mezcla la quinoa, los tomates, la mozzarella y la rúcula. Sazona con sal, pimienta y especias italianas.',
      'Agrega las láminas de pollo a un lado y disfruta.',
    ],
  },
  {
    id: 'chicken-lentil', name: 'Pollo con lentejas', slot: 'cena', time: '10 min', icon: '🍲',
    allergens: ['Carne'], tags: ['Alto en fibra', 'Comida simple'],
    totals: { kcal: 532, p: 45, c: 52, g: 14 },
    main: [
      { n: 'Lentejas cocidas', q: 325, u: 'g' },
      { n: 'Tomate', q: 425, u: 'g' },
      { n: 'Pepino', q: 150, u: 'g' },
      { n: 'Pechuga de pollo', q: 85, u: 'g' },
    ],
    season: ['Aceite de oliva · ¾ cda', 'Sal y pimienta al gusto'],
    steps: [
      'Pica el pepino y corta el tomate. Pásalos a un bol, agrega aceite de oliva, sal y pimienta y combina.',
      'Calienta la pechuga de pollo en una sartén y sírvela en el plato. Añade las lentejas a un lado y completa con la ensalada de pepino.',
    ],
  },
  {
    id: 'chicken-burrito', name: 'Bowl burrito de pollo', slot: 'almuerzo', time: '10 min', icon: '🌯',
    allergens: ['Carne'], tags: ['Alto en fibra', 'Sin cocción'],
    totals: { kcal: 524, p: 60, c: 43, g: 14 },
    main: [
      { n: 'Pechuga de pollo', q: 175, u: 'g' },
      { n: 'Arroz de coliflor', q: 109, u: 'g' },
      { n: 'Piña', q: 155, u: 'g' },
      { n: 'Lechuga', q: 36, u: 'g' },
      { n: 'Aguacate', q: 50, u: 'g' },
    ],
    season: [
      'Pico de gallo · 3 cda', 'Limón · 1 unidad', 'Chile chipotle en polvo · ½ cdta',
      'Comino · ½ cdta', 'Ajo · ½ cdta',
    ],
    steps: [
      'Sazona el pollo picado con el chile chipotle, el comino y el ajo.',
      'Machaca el aguacate con jugo de limón y sal. Reserva.',
      'Arma el bowl con el arroz de coliflor caliente, la lechuga, el pollo, el pico de gallo, el guacamole y la piña.',
    ],
  },
  {
    id: 'chicken-pesto', name: 'Bowl de pollo al pesto', slot: 'cena', time: '10 min', icon: '🌿',
    allergens: ['Carne', 'Frutos secos'], tags: ['Comida simple'],
    totals: { kcal: 498, p: 39, c: 51, g: 16 },
    main: [
      { n: 'Pechuga de pollo', q: 90, u: 'g' },
      { n: 'Quinoa cocida', q: 185, u: 'g' },
      { n: 'Tomate cherry', q: 225, u: 'g' },
    ],
    season: ['Pesto · 1½ cda', 'Albahaca fresca · 3 cda', 'Albahaca seca · 1 cdta'],
    steps: [
      'Pica la pechuga de pollo en cubos pequeños y corta los tomates cherry por la mitad.',
      'Coloca todos los ingredientes en un bol, espolvorea la albahaca seca y reparte el pesto por encima.',
    ],
  },
  {
    id: 'creamy-eggs', name: 'Huevos revueltos cremosos', slot: 'desayuno', time: '10 min', icon: '🍳',
    allergens: ['Lácteos', 'Huevo', 'Gluten'], tags: ['Comida simple'],
    totals: { kcal: 469, p: 28, c: 53, g: 17 },
    main: [
      { n: 'Huevo', q: 3, u: 'unidades' },
      { n: 'Crema agria descremada', q: 40, u: 'g' },
      { n: 'Pan integral', q: 2, u: 'rebanadas' },
      { n: 'Fresas', q: 152, u: 'g' },
    ],
    season: ['Sal y pimienta al gusto', 'Aceite en spray · 1'],
    steps: [
      'Calienta una sartén a fuego medio-bajo. Bate los huevos con sal y pimienta. Engrasa con spray y vierte los huevos.',
      'Cuando empiecen a cuajar, revuelve y agrega la crema poco a poco. Bate hasta integrar, sin sobrecocinar.',
      'Tuesta el pan y córtalo a la mitad.',
      'Sirve los huevos cremosos con el pan y las fresas.',
    ],
  },
  {
    id: 'eggs-tuna', name: 'Huevos con atún', slot: 'desayuno', time: '15 min', icon: '🥚',
    allergens: ['Huevo', 'Pescado'], tags: ['Paleo'],
    totals: { kcal: 455, p: 40, c: 45, g: 13 },
    main: [
      { n: 'Papa al horno', q: 213, u: 'g' },
      { n: 'Clara de huevo cocida', q: 4, u: 'unidades' },
      { n: 'Atún en agua (escurrido)', q: 100, u: 'g' },
    ],
    season: ['Mayonesa paleo · 3 cda', 'Sal y pimienta al gusto'],
    steps: [
      'Machaca la papa, agrega la mayonesa y el atún, y mezcla bien.',
      'Cubre cada clara de huevo con la mezcla de papa y sazona con sal y pimienta.',
    ],
  },
  {
    id: 'egg-avocado-sandwich', name: 'Sándwich de huevo y aguacate', slot: 'desayuno', time: '10 min', icon: '🥑',
    allergens: ['Huevo', 'Gluten'], tags: ['Comida simple'],
    totals: { kcal: 485, p: 34, c: 37, g: 22 },
    main: [
      { n: 'Pan multigrano', q: 2, u: 'rebanadas' },
      { n: 'Huevo', q: 3, u: 'unidades' },
      { n: 'Clara de huevo', q: 61, u: 'g' },
      { n: 'Aguacate', q: 50, u: 'g' },
    ],
    season: ['Sal y pimienta al gusto', 'Aceite en spray · 1'],
    steps: [
      'Revuelve los huevos en una sartén con spray a fuego medio; voltea a la mitad y cocina 2 min más.',
      'Tuesta el pan y úntalo con el aguacate.',
      'Coloca el huevo sobre el pan, sazona con sal y pimienta y sirve como sándwich.',
    ],
  },
  {
    id: 'boiled-eggs-apples', name: 'Huevos cocidos con manzana', slot: 'desayuno', time: '10 min', icon: '🍎',
    allergens: ['Huevo'], tags: ['Paleo', 'Comida simple'],
    totals: { kcal: 506, p: 26, c: 60, g: 20 },
    main: [
      { n: 'Huevo', q: 4, u: 'unidades' },
      { n: 'Manzana', q: 2, u: 'unidades' },
    ],
    season: ['Sal y pimienta al gusto'],
    steps: [
      'Coloca los huevos en una olla y cúbrelos con agua. Hierve, baja a fuego medio-alto y cocina 7 min.',
      'Retíralos, pélalos y sirve con la manzana picada. Sazona con sal y pimienta.',
    ],
  },
  {
    id: 'turkey-egg-bites', name: 'Muffins de huevo y pavo con frutas', slot: 'desayuno', time: '25 min', icon: '🧁',
    allergens: ['Lácteos', 'Huevo', 'Carne'], tags: ['Paleo'],
    totals: { kcal: 465, p: 27, c: 42, g: 23 },
    main: [
      { n: 'Huevo', q: 2, u: 'unidades' },
      { n: 'Clara de huevo', q: 30, u: 'g' },
      { n: 'Queso cheddar', q: 28, u: 'g' },
      { n: 'Tocino de pavo', q: 23, u: 'g' },
      { n: 'Arándanos', q: 55, u: 'g' },
      { n: 'Fresas', q: 60, u: 'g' },
      { n: 'Kiwi', q: 1, u: 'unidades' },
      { n: 'Mandarina', q: 1, u: 'unidades' },
    ],
    season: ['Pimentón rojo · al gusto', 'Perejil fresco · al gusto', 'Ajo en polvo · al gusto', 'Sal y pimienta al gusto'],
    steps: [
      'Precalienta el horno a 175°C.',
      'Bate los huevos con el queso rallado, el ajo en polvo, el perejil, el tocino de pavo picado y el pimentón en cubos.',
      'Engrasa un molde para muffins, vierte la mezcla en cada cavidad, sazona y hornea 12 min.',
      'Mientras, pica las fresas y el kiwi y mézclalos con la mandarina pelada y los arándanos.',
      'Sirve los muffins de huevo con la ensalada de frutas.',
    ],
  },
  {
    id: 'parmesan-baked-eggs', name: 'Huevos al horno con parmesano', slot: 'desayuno', time: '15 min', icon: '🧀',
    allergens: ['Lácteos', 'Huevo', 'Gluten'], tags: ['Alto en fibra', 'Comida simple'],
    totals: { kcal: 505, p: 35, c: 48, g: 20 },
    main: [
      { n: 'Huevo', q: 2, u: 'unidades' },
      { n: 'Espárragos', q: 6, u: 'unidades' },
      { n: 'Pan sourdough', q: 80, u: 'g' },
      { n: 'Espinaca', q: 45, u: 'g' },
      { n: 'Queso parmesano', q: 30, u: 'g' },
    ],
    season: ['Sal y pimienta al gusto'],
    steps: [
      'Precalienta la freidora de aire a 180°C por 5 min.',
      'En un recipiente apto, coloca la espinaca y los espárragos; pon los huevos encima.',
      'Sazona con sal y pimienta y espolvorea el parmesano.',
      'Cocina 10 min (o un poco más) hasta que el huevo esté bien cocido.',
      'Sirve con el pan tostado.',
    ],
  },
  {
    id: 'spinach-feta-wrap', name: 'Wrap de huevo, espinaca y feta', slot: 'desayuno', time: '5 min', icon: '🥬',
    allergens: ['Lácteos', 'Huevo', 'Gluten'], tags: ['Comida simple'],
    totals: { kcal: 522, p: 36, c: 54, g: 19 },
    main: [
      { n: 'Clara de huevo', q: 122, u: 'g' },
      { n: 'Huevo', q: 1, u: 'unidades' },
      { n: 'Tortilla de harina', q: 1, u: 'unidad' },
      { n: 'Queso feta light', q: 40, u: 'g' },
      { n: 'Espinaca baby', q: 30, u: 'g' },
      { n: 'Tomates secos', q: 18, u: 'g' },
    ],
    season: ['Sal y pimienta al gusto'],
    steps: [
      'Bate el huevo y las claras con sal y pimienta.',
      'Calienta una sartén antiadherente; vierte la mezcla y, justo antes de cuajar, agrega la espinaca y cocina.',
      'Coloca la tortilla y pon los huevos revueltos en un lado.',
      'Pica los tomates secos, agrégalos y espolvorea el feta.',
      'Enrolla con cuidado, corta a la mitad y disfruta.',
    ],
  },
  {
    id: 'egg-toast', name: 'Tostada de huevo y cottage', slot: 'desayuno', time: '10 min', icon: '🍞',
    allergens: ['Lácteos', 'Huevo', 'Gluten'], tags: ['Comida simple'],
    totals: { kcal: 491, p: 35, c: 46, g: 18 },
    main: [
      { n: 'Huevo', q: 3, u: 'unidades' },
      { n: 'Pan sourdough', q: 80, u: 'g' },
      { n: 'Queso cottage', q: 80, u: 'g' },
      { n: 'Espinaca', q: 15, u: 'g' },
    ],
    season: ['Hojuelas de chile · 1 cdta', 'Aceite en spray · 1', 'Sal al gusto'],
    steps: [
      'Corta y tuesta el pan.',
      'Corta la espinaca en tiras finas.',
      'Bate los huevos con una pizca de sal.',
      'Calienta una sartén con spray, vierte los huevos y revuelve hasta cuajar.',
      'Unta el cottage sobre cada rebanada, agrega la espinaca y los huevos, y decora con hojuelas de chile. Sirve.',
    ],
  },
  {
    id: 'yogurt-parfait', name: 'Parfait de yogur griego', slot: 'snack', time: '5 min', icon: '🥣',
    allergens: ['Lácteos', 'Gluten'], tags: ['Sin cocción'],
    totals: { kcal: 485, p: 56, c: 38, g: 13 },
    main: [
      { n: 'Yogur griego natural', q: 490, u: 'g' },
      { n: 'Arándanos', q: 36, u: 'g' },
      { n: 'Granola', q: 25, u: 'g' },
    ],
    season: ['Semillas de cáñamo · 1 cda'],
    steps: [
      'Coloca la mitad de los arándanos en el fondo de un frasco.',
      'Mezcla la granola con las semillas de cáñamo y arma capas alternando yogur griego y granola.',
      'Termina con arándanos y granola por encima.',
    ],
  },
  {
    id: 'blueberry-smoothie', name: 'Smoothie cremoso de arándanos', slot: 'snack', time: '5 min', icon: '🥤',
    allergens: ['Lácteos', 'Frutos secos'], tags: ['Sin cocción', 'Comida simple'],
    totals: { kcal: 450, p: 32, c: 50, g: 16 },
    main: [
      { n: 'Yogur griego natural', q: 245, u: 'g' },
      { n: 'Arándanos', q: 145, u: 'g' },
      { n: 'Banano', q: 0.5, u: 'unidad' },
      { n: 'Leche de almendras', q: 49, u: 'ml' },
    ],
    season: ['Mantequilla de almendra · 1½ cda', 'Hielo · 136 g'],
    steps: [
      'Coloca el yogur, los arándanos, el banano, la mantequilla de almendra y la leche de almendras en la licuadora. Licúa hasta que quede suave.',
      'Agrega el hielo y licúa hasta triturarlo por completo.',
    ],
  },
  {
    id: 'lentil-soup', name: 'Sopa de lentejas y tomate', slot: 'cena', time: '20 min', icon: '🍵',
    allergens: ['Huevo'], tags: ['Alto en fibra', 'Una olla'],
    totals: { kcal: 470, p: 33, c: 52, g: 15 },
    main: [
      { n: 'Lentejas secas', q: 45, u: 'g' },
      { n: 'Tomate triturado', q: 142, u: 'g' },
      { n: 'Caldo de verduras', q: 663, u: 'ml' },
      { n: 'Pasta de tomate', q: 66, u: 'g' },
      { n: 'Proteína de clara de huevo', q: 26, u: 'g' },
      { n: 'Zanahoria', q: 2, u: 'unidades' },
      { n: 'Apio', q: 2, u: 'tallos' },
    ],
    season: ['Ajo · 1 cda', 'Cilantro · 2 cda', 'Hojuelas de chile · ½ cdta', 'Aceite de oliva · 1 cda', 'Sal y pimienta al gusto'],
    steps: [
      'Pica el ajo y el cilantro; corta la zanahoria y el apio y prepara el resto de ingredientes.',
      'Activa el modo saltear y calienta el aceite. Agrega el ajo, el apio y la zanahoria y sofríe hasta que el ajo esté fragante.',
      'Agrega las lentejas, el cilantro, el caldo, la pasta de tomate y el tomate triturado; sazona con hojuelas de chile, sal y pimienta.',
      'Tapa y cocina a presión 10 min; libera la presión antes de abrir.',
      'Pasa la mitad de la sopa a la licuadora, deja enfriar un poco y licúa.',
      'Agrega la proteína y el resto de la sopa, y licúa hasta que quede suave. Si está muy espesa, añade un poco de agua.',
      'Sirve la sopa en un bol.',
    ],
  },
  {
    id: 'steak-skewers', name: 'Pinchos de res, papa y champiñón', slot: 'cena', time: '15 min', icon: '🍢',
    allergens: ['Carne'], tags: ['Comida simple'],
    totals: { kcal: 477, p: 35, c: 48, g: 16 },
    main: [
      { n: 'Lomo de res', q: 120, u: 'g' },
      { n: 'Papas baby', q: 10, u: 'unidades' },
      { n: 'Champiñones', q: 10, u: 'unidades' },
      { n: 'Rúcula', q: 20, u: 'g' },
    ],
    season: ['Sal, ajo en polvo y pimienta al gusto'],
    steps: [
      'Hierve las papas 5 min hasta que empiecen a ablandar; escúrrelas.',
      'Córtalas a la mitad y corta la carne en trozos medianos.',
      'Calienta una parrilla a fuego alto por 5 min.',
      'Arma los pinchos con un trozo de carne, un champiñón y media papa. Sazona con sal, ajo en polvo y pimienta.',
      'Asa a fuego medio 3–4 min por lado hasta cocer.',
      'Sirve los pinchos sobre una cama de rúcula.',
    ],
  },
  {
    id: 'creamy-beef-mushroom', name: 'Carne molida con champiñones a la crema', slot: 'cena', time: '15 min', icon: '🍄',
    allergens: ['Lácteos', 'Carne'], tags: ['Comida simple'],
    totals: { kcal: 542, p: 46, c: 55, g: 17 },
    main: [
      { n: 'Carne molida magra', q: 156, u: 'g' },
      { n: 'Champiñones', q: 280, u: 'g' },
      { n: 'Papa', q: 150, u: 'g' },
      { n: 'Cebolla', q: 40, u: 'g' },
      { n: 'Crema agria descremada', q: 71, u: 'g' },
    ],
    season: ['Sal y pimienta al gusto'],
    steps: [
      'Pela y pica la papa en cubos pequeños.',
      'Coloca la cebolla y la papa en una sartén antiadherente, tapa y cocina.',
      'Agrega la carne molida, sazona con sal y pimienta y cocina con tapa hasta dorar.',
      'Añade los champiñones en láminas y la crema agria; mezcla y cocina 5 min más.',
      'Sirve en un plato y disfruta.',
    ],
  },
  {
    id: 'rice-chicken-salad', name: 'Ensalada de arroz con pollo y aguacate', slot: 'almuerzo', time: '15 min', icon: '🥗',
    allergens: ['Carne'], tags: ['Alto en fibra', 'Sin cocción', 'Ensalada'],
    totals: { kcal: 529, p: 42, c: 55, g: 16 },
    main: [
      { n: 'Pechuga de pollo', q: 120, u: 'g' },
      { n: 'Arroz blanco cocido', q: 158, u: 'g' },
      { n: 'Aguacate', q: 80, u: 'g' },
      { n: 'Cebollín', q: 25, u: 'g' },
    ],
    season: ['Cilantro · ¼ taza', 'Ajo en polvo · 1 cdta', 'Sal y pimienta al gusto'],
    steps: [
      'Corta el pollo en trozos pequeños; pica el cebollín y el cilantro.',
      'Corta el aguacate a la mitad; pica una mitad en cubos y reserva.',
      'En un bol, machaca la otra mitad del aguacate con un tenedor. Agrega el arroz, sazona con sal, pimienta y ajo en polvo y mezcla bien.',
      'Incorpora el cilantro, el cebollín y el pollo. Agrega con cuidado el aguacate en cubos y disfruta.',
    ],
  },
  {
    id: 'beef-broccoli', name: 'Res con brócoli a la olla', slot: 'cena', time: '25 min', icon: '🥦',
    allergens: ['Gluten', 'Carne', 'Soya'], tags: ['Comida simple'],
    totals: { kcal: 525, p: 31, c: 51, g: 22 },
    main: [
      { n: 'Carne de res', q: 76, u: 'g' },
      { n: 'Arroz blanco cocido', q: 78, u: 'g' },
      { n: 'Brócoli', q: 60, u: 'g' },
      { n: 'Cebolla', q: 30, u: 'g' },
    ],
    season: ['Salsa de soya · 43 ml', 'Caldo de res · 80 ml', 'Azúcar morena · 1 cda', 'Aceite de sésamo · 2 cdta', 'Ajo · 1 diente', 'Maicena · 1 cda', 'Aceite de oliva · 2 cdta'],
    steps: [
      'Agrega el caldo de res, el ajo, la salsa de soya, el azúcar morena y el aceite de sésamo a la olla. Revuelve hasta disolver y agrega la carne.',
      'Tapa y cocina a presión alta 10 min con la válvula sellada; al terminar, libera la presión.',
      'Activa el modo saltear, agrega el brócoli y la maicena disuelta en un poco de agua; cocina hasta que espese.',
      'Sirve sobre el arroz blanco.',
    ],
  },
  {
    id: 'grilled-chicken-sandwich', name: 'Sándwich de pollo a la parrilla', slot: 'almuerzo', time: '15 min', icon: '🍗',
    allergens: ['Lácteos', 'Gluten', 'Carne', 'Frutos secos'], tags: ['Comida simple'],
    totals: { kcal: 455, p: 51, c: 32, g: 16 },
    main: [
      { n: 'Pechuga de pollo', q: 80, u: 'g' },
      { n: 'Pan sándwich integral', q: 1, u: 'unidad' },
      { n: 'Queso suizo light', q: 65, u: 'g' },
      { n: 'Tomate', q: 1, u: 'unidades' },
    ],
    season: ['Pesto · 2 cda'],
    steps: [
      'Tuesta el pan. Corta el tomate en rodajas finas y la pechuga a la mitad a lo largo.',
      'Calienta el pollo en una sartén antiadherente; agrega el queso encima y deja que se derrita.',
      'Unta pesto en ambas rebanadas; coloca el pollo con queso en una y cubre con el tomate. Cierra.',
      'Corta a la mitad y disfruta.',
    ],
  },
  {
    id: 'chicken-panini', name: 'Panini de pollo', slot: 'almuerzo', time: '5 min', icon: '🥪',
    allergens: ['Lácteos', 'Gluten', 'Carne'], tags: ['Comida simple'],
    totals: { kcal: 511, p: 38, c: 54, g: 17 },
    main: [
      { n: 'Pechuga de pollo', q: 85, u: 'g' },
      { n: 'Pan multigrano', q: 2, u: 'rebanadas' },
      { n: 'Queso mozzarella', q: 21, u: 'g' },
      { n: 'Tomates deshidratados', q: 30, u: 'g' },
    ],
    season: ['Pesto · 3 cdta'],
    steps: [
      'Tuesta el pan y, mientras, corta la pechuga en láminas.',
      'Unta el pesto en cada rebanada y arma el sándwich con la mozzarella, los tomates deshidratados y el pollo.',
    ],
  },
  {
    id: 'avocado-tuna-sandwich', name: 'Sándwich de atún y aguacate', slot: 'almuerzo', time: '5 min', icon: '🐟',
    allergens: ['Lácteos', 'Pescado', 'Gluten'], tags: ['Sin cocción', 'Comida simple'],
    totals: { kcal: 539, p: 41, c: 60, g: 15 },
    main: [
      { n: 'Atún en agua (escurrido)', q: 111, u: 'g' },
      { n: 'Pan sourdough', q: 100, u: 'g' },
      { n: 'Aguacate', q: 70, u: 'g' },
      { n: 'Repollo morado', q: 18, u: 'g' },
    ],
    season: ['Crema agria light · 15 g', 'Sal y ajo en polvo al gusto'],
    steps: [
      'Tuesta las rebanadas de pan.',
      'Escurre el atún.',
      'En un bol, mezcla el aguacate, la crema agria y el atún. Sazona con sal y ajo en polvo y machaca con un tenedor.',
      'Coloca el repollo en una rebanada, agrega la mezcla de atún y cierra el sándwich.',
      'Corta a la mitad y disfruta.',
    ],
  },
  {
    id: 'pumpkin-egg-pie', name: 'Pastel de calabaza y huevo', slot: 'snack', time: '35 min', icon: '🥧',
    allergens: ['Huevo'], tags: ['Comida simple'],
    totals: { kcal: 173, p: 10, c: 18, g: 7 },
    main: [
      { n: 'Puré de calabaza', q: 45, u: 'g' },
      { n: 'Huevo', q: 2, u: 'unidades' },
    ],
    season: ['Miel · ¾ cda', 'Esencia de vainilla · al gusto'],
    steps: [
      'Precalienta la freidora de aire a 180°C por 5 min.',
      'En un procesador, agrega todos los ingredientes y licúa hasta que quede suave.',
      'Vierte la mezcla en un molde para freidora de aire y cocina 35 min, o hasta que cuaje (comprueba con un palillo).',
      'Retira y deja enfriar un poco antes de servir.',
      'Corta, comparte y disfruta.',
    ],
  },
  {
    id: 'apple-pie-smoothie', name: 'Smoothie proteico de manzana', slot: 'snack', time: '5 min', icon: '🥤',
    allergens: ['Lácteos', 'Frutos secos'], tags: ['Alto en fibra', 'Sin cocción'],
    totals: { kcal: 230, p: 16, c: 29, g: 7 },
    main: [
      { n: 'Compota de manzana', q: 65, u: 'g' },
      { n: 'Yogur griego natural', q: 45, u: 'g' },
      { n: 'Avena', q: 12, u: 'g' },
      { n: 'Proteína whey', q: 30, u: 'g' },
      { n: 'Leche de almendras', q: 368, u: 'ml' },
    ],
    season: ['Canela · ½ cdta'],
    steps: [
      'En la licuadora, agrega la compota de manzana, el yogur griego, la avena, la canela, la proteína y la leche de almendras. Licúa hasta que quede suave.',
      'Sirve en un vaso y disfruta.',
    ],
  },
  {
    id: 'protein-balls', name: 'Bolitas proteicas de chocolate y maní', slot: 'snack', time: '5 min', icon: '🍫',
    allergens: ['Lácteos', 'Maní'], tags: ['Sin cocción'],
    totals: { kcal: 207, p: 14, c: 16, g: 11 },
    main: [
      { n: 'Proteína whey', q: 11, u: 'g' },
      { n: 'Mantequilla de maní', q: 17, u: 'g' },
      { n: 'Avena', q: 11, u: 'g' },
    ],
    season: ['Miel · al gusto', 'Chispas de chocolate negro · al gusto'],
    steps: [
      'Mezcla la avena, la mantequilla de maní, la proteína, la miel y las chispas de chocolate hasta integrar.',
      'Forma bolitas y guárdalas en un recipiente tapado en la nevera o el congelador. Cada porción son dos bolitas.',
    ],
  },
  {
    id: 'chicken-avocado-toast', name: 'Tostada de arroz con pollo y aguacate', slot: 'snack', time: '5 min', icon: '🍘',
    allergens: ['Lácteos', 'Carne'], tags: ['Sin cocción', 'Comida simple'],
    totals: { kcal: 218, p: 17, c: 19, g: 8 },
    main: [
      { n: 'Pechuga de pollo cocida', q: 40, u: 'g' },
      { n: 'Aguacate', q: 45, u: 'g' },
      { n: 'Tortas de arroz', q: 2, u: 'unidades' },
      { n: 'Yogur griego natural', q: 15, u: 'g' },
    ],
    season: ['Cebolla morada · 1 cda', 'Sal al gusto'],
    steps: [
      'Desmenuza el pollo.',
      'En un bol, mezcla el aguacate, el yogur griego y sal; machaca con un tenedor.',
      'Unta la mezcla de aguacate sobre cada torta de arroz.',
      'Agrega el pollo desmenuzado y la cebolla morada. Disfruta.',
    ],
  },
  {
    id: 'strawberries-chocolate', name: 'Fresas con chocolate negro', slot: 'snack', time: '5 min', icon: '🍓',
    allergens: [], tags: ['Alto en fibra', 'Sin cocción', 'Paleo'],
    totals: { kcal: 204, p: 3, c: 28, g: 10 },
    main: [
      { n: 'Fresas', q: 240, u: 'g' },
      { n: 'Chocolate negro 70-85%', q: 21, u: 'g' },
    ],
    season: [],
    steps: [
      'Parte el chocolate negro en trozos y sírvelo junto a las fresas frescas.',
    ],
  },
  {
    id: 'creamy-chicken-curry', name: 'Pollo al curry cremoso', slot: 'cena', time: '20 min', icon: '🍛',
    allergens: ['Lácteos', 'Carne'], tags: ['Comida simple'],
    totals: { kcal: 545, p: 41, c: 54, g: 19 },
    main: [
      { n: 'Pechuga de pollo', q: 160, u: 'g' },
      { n: 'Arroz blanco cocido', q: 140, u: 'g' },
      { n: 'Yogur natural', q: 81, u: 'g' },
    ],
    season: ['Pasta de tomate · 2 cda', 'Caldo de pollo · 60 ml', 'Curry en polvo · 1 cda', 'Ghee · 2 cdta', 'Cilantro · 1 cda', 'Sal al gusto'],
    steps: [
      'Calienta el ghee en una sartén a fuego bajo.',
      'Agrega el curry, la pasta de tomate y una pizca de sal. Mezcla y cocina 2 min.',
      'Incorpora el caldo de pollo y la pechuga. Tapa y cocina 10 min o hasta que el pollo esté cocido.',
      'Vierte el yogur y mezcla bien.',
      'Recalienta el arroz y sírvelo; encima el pollo al curry. Decora con cilantro.',
    ],
  },
  {
    id: 'burger-bowl', name: 'Bowl de hamburguesa', slot: 'almuerzo', time: '10 min', icon: '🍔',
    allergens: ['Lácteos', 'Carne'], tags: ['Alto en fibra', 'Ensalada'],
    totals: { kcal: 497, p: 41, c: 48, g: 16 },
    main: [
      { n: 'Carne molida magra', q: 120, u: 'g' },
      { n: 'Papa', q: 150, u: 'g' },
      { n: 'Tomate cherry', q: 149, u: 'g' },
      { n: 'Lechuga', q: 72, u: 'g' },
      { n: 'Queso cheddar light', q: 44, u: 'g' },
    ],
    season: ['Cebolla morada · 30 g', 'Sal, ajo en polvo y pimienta al gusto'],
    steps: [
      'Cocina la carne molida en una sartén a fuego medio-alto hasta dorar. Sazona con sal, ajo en polvo y pimienta.',
      'Corta los tomates cherry en cuartos.',
      'Arma el bowl: coloca la lechuga, añade la carne, el queso rallado, los tomates y la cebolla morada. Disfruta.',
    ],
  },
  {
    id: 'caprese-chicken-salad', name: 'Caprese de pollo a la parrilla', slot: 'almuerzo', time: '15 min', icon: '🥗',
    allergens: ['Lácteos', 'Carne'], tags: ['Comida simple'],
    totals: { kcal: 524, p: 51, c: 31, g: 20 },
    main: [
      { n: 'Pechuga de pollo', q: 90, u: 'g' },
      { n: 'Mezcla de espinaca y kale', q: 170, u: 'g' },
      { n: 'Tomate cherry', q: 298, u: 'g' },
      { n: 'Perlas de mozzarella', q: 90, u: 'g' },
    ],
    season: ['Vinagre balsámico · 3 cda'],
    steps: [
      'Corta los tomates cherry a la mitad.',
      'Arma el plato: coloca las hojas verdes como base; a un lado agrega los tomates y las perlas de mozzarella.',
      'Corta la pechuga en trozos o tiras y colócala al otro lado del plato.',
      'Rocía el vinagre balsámico sobre todo el plato. Disfruta.',
    ],
  },
  {
    id: 'mexican-chicken-bowl', name: 'Bowl mexicano de pollo', slot: 'almuerzo', time: '10 min', icon: '🌽',
    allergens: ['Carne'], tags: ['Comida simple'],
    totals: { kcal: 509, p: 42, c: 53, g: 22 },
    main: [
      { n: 'Pollo molido', q: 120, u: 'g' },
      { n: 'Maíz dulce', q: 246, u: 'g' },
      { n: 'Aguacate', q: 113, u: 'g' },
      { n: 'Tomate', q: 113, u: 'g' },
    ],
    season: ['Cebolla morada · 53 g', 'Especias al gusto', 'Sal al gusto'],
    steps: [
      'Cocina el pollo en una sartén antiadherente, sazona con tus especias favoritas y tapa para que no se seque.',
      'Prepara los ingredientes: escurre el maíz y pica el tomate en cubos.',
      'En un bol, sirve el pollo, el aguacate y el maíz. Termina con la cebolla morada y el tomate.',
    ],
  },
  {
    id: 'beef-plantain-bowl', name: 'Bowl de res y plátano con salsa verde', slot: 'cena', time: '30 min', icon: '🍌',
    allergens: ['Carne'], tags: ['Alto en fibra'],
    totals: { kcal: 503, p: 37, c: 41, g: 23 },
    main: [
      { n: 'Carne molida magra', q: 156, u: 'g' },
      { n: 'Plátano', q: 100, u: 'g' },
      { n: 'Cebolla', q: 80, u: 'g' },
      { n: 'Kale', q: 33, u: 'g' },
    ],
    season: ['Salsa verde · 2 cda', 'Chile en polvo · ½ cda', 'Aceite de coco · 1 cda', 'Sal al gusto'],
    steps: [
      'Precalienta el horno a 200°C y forra una bandeja. Pela y corta el plátano en rodajas; rocía con la mitad del aceite, sazona con sal y hornea 20 min, volteando una vez.',
      'Mientras, cocina la carne y la cebolla picada en una sartén a fuego medio con el resto del aceite, desmenuzando, hasta dorar.',
      'Sazona la carne con sal y chile en polvo, agrega el kale picado y cocina hasta marchitar (~2 min).',
      'Sirve la carne con el plátano y corona con salsa verde.',
    ],
  },
];

// Metadata para tags y filtros: costo (1=económico … 3=premium), dificultad
// y minutos. El tercer indicador relevante para clientes fitness es "Alta en
// proteína" (≥34% de las calorías vienen de proteína), que se calcula solo.
const META = {
  'tuna-wrap': { cost: 1, diff: 'Fácil', min: 10 },
  'caesar-wrap': { cost: 3, diff: 'Fácil', min: 5 },
  'teriyaki-salmon': { cost: 3, diff: 'Media', min: 25 },
  'salmon-potatoes': { cost: 3, diff: 'Media', min: 15 },
  'salmon-quinoa': { cost: 3, diff: 'Fácil', min: 15 },
  'chicken-caprese': { cost: 2, diff: 'Fácil', min: 15 },
  'chicken-lentil': { cost: 1, diff: 'Fácil', min: 10 },
  'chicken-burrito': { cost: 2, diff: 'Fácil', min: 10 },
  'chicken-pesto': { cost: 2, diff: 'Fácil', min: 10 },
  'creamy-eggs': { cost: 1, diff: 'Fácil', min: 10 },
  'eggs-tuna': { cost: 1, diff: 'Fácil', min: 15 },
  'egg-avocado-sandwich': { cost: 1, diff: 'Fácil', min: 10 },
  'boiled-eggs-apples': { cost: 1, diff: 'Fácil', min: 10 },
  'turkey-egg-bites': { cost: 2, diff: 'Media', min: 25 },
  'parmesan-baked-eggs': { cost: 2, diff: 'Fácil', min: 15 },
  'spinach-feta-wrap': { cost: 2, diff: 'Fácil', min: 5 },
  'egg-toast': { cost: 1, diff: 'Fácil', min: 10 },
  'yogurt-parfait': { cost: 1, diff: 'Fácil', min: 5 },
  'blueberry-smoothie': { cost: 1, diff: 'Fácil', min: 5 },
  'lentil-soup': { cost: 1, diff: 'Media', min: 20 },
  'steak-skewers': { cost: 3, diff: 'Media', min: 15 },
  'creamy-beef-mushroom': { cost: 2, diff: 'Fácil', min: 15 },
  'rice-chicken-salad': { cost: 2, diff: 'Fácil', min: 15 },
  'beef-broccoli': { cost: 2, diff: 'Media', min: 25 },
  'grilled-chicken-sandwich': { cost: 2, diff: 'Fácil', min: 15 },
  'chicken-panini': { cost: 2, diff: 'Fácil', min: 5 },
  'avocado-tuna-sandwich': { cost: 1, diff: 'Fácil', min: 5 },
  'pumpkin-egg-pie': { cost: 1, diff: 'Fácil', min: 35 },
  'apple-pie-smoothie': { cost: 1, diff: 'Fácil', min: 5 },
  'protein-balls': { cost: 2, diff: 'Fácil', min: 5 },
  'chicken-avocado-toast': { cost: 1, diff: 'Fácil', min: 5 },
  'strawberries-chocolate': { cost: 2, diff: 'Fácil', min: 5 },
  'creamy-chicken-curry': { cost: 2, diff: 'Fácil', min: 20 },
  'burger-bowl': { cost: 2, diff: 'Fácil', min: 10 },
  'caprese-chicken-salad': { cost: 2, diff: 'Fácil', min: 15 },
  'mexican-chicken-bowl': { cost: 1, diff: 'Fácil', min: 10 },
  'beef-plantain-bowl': { cost: 2, diff: 'Media', min: 30 },
};
const COST_LABELS = { 1: 'Económica', 2: 'Moderada', 3: 'Premium' };
const SORT_NOTES = {
  reco: 'Las más equilibradas en tiempo, costo y eficiencia nutricional. Nuestra selección para empezar.',
  rapidos: 'Ordenadas de menor a mayor tiempo de preparación.',
  economicos: 'Ordenadas de menor a mayor costo de ingredientes.',
  proteina: 'Ordenadas de mayor a menor proteína por porción.',
};
const isHighProtein = (rec) => (rec.totals.p * 4) / rec.totals.kcal >= 0.34;

// Etiqueta de costo: $ $$ $$$ (llenos = nivel, resto atenuado).
function CostTag({ cost, color = TEXT_MUTED }) {
  return (
    <span className="font-bold tracking-tight" style={{ fontSize: 12 }}>
      <span style={{ color }}>{'$'.repeat(cost)}</span>
      <span style={{ color: '#D8D2C2' }}>{'$'.repeat(3 - cost)}</span>
    </span>
  );
}

// Escala TODA la receta por un factor k anclado en proteína.
function scale(rec, targetP) {
  let k = rec.totals.p > 0 ? targetP / rec.totals.p : 1;
  if (!Number.isFinite(k) || k <= 0) k = 1;
  k = Math.max(0.5, Math.min(2, k));
  const totals = { kcal: rec.totals.kcal * k, p: rec.totals.p * k, c: rec.totals.c * k, g: rec.totals.g * k };
  const main = rec.main.map(i => {
    let q = i.q * k;
    if (i.u === 'g' || i.u === 'ml') q = round5(q);
    else if (i.u === 'unidades' || i.u === 'rebanadas') q = Math.max(1, Math.round(q));
    else q = Math.max(0.5, roundHalf(q));
    return { ...i, q };
  });
  return { k, totals, main };
}

// Donut de distribución de macros con los colores del MealTracker.
function MacroDonut({ totals, size = 92 }) {
  const pc = totals.p * 4, cc = totals.c * 4, gc = totals.g * 9, tot = Math.max(1, pc + cc + gc);
  const r = 15.9, C = 2 * Math.PI * r;
  let off = 0;
  const seg = (val, color) => {
    const len = (val / tot) * C;
    const el = (<circle key={color} cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3.6" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} strokeLinecap="round" transform="rotate(-90 18 18)" />);
    off += len; return el;
  };
  return (
    <div className="relative" style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#EDE8DA" strokeWidth="3.6" />
        {seg(pc, C_PROTEIN)}{seg(cc, C_CARBS)}{seg(gc, C_FAT)}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-bold num" style={{ fontSize: size * 0.2, color: TEXT, lineHeight: 1 }}>{r0(totals.kcal)}</div>
        <div className="num font-semibold" style={{ fontSize: size * 0.085, color: TEXT_LIGHT, letterSpacing: '0.1em' }}>KCAL</div>
      </div>
    </div>
  );
}

function MacroLegend({ totals }) {
  const row = (color, label, val) => (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="rounded-full" style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
      <span style={{ color: TEXT_MUTED }}>{label}</span>
      <span className="ml-auto font-bold num" style={{ color }}>{r0(val)}g</span>
    </div>
  );
  return (<div className="flex flex-col gap-2 flex-1">{row(C_PROTEIN, 'Proteína', totals.p)}{row(C_CARBS, 'Carbohidratos', totals.c)}{row(C_FAT, 'Grasas', totals.g)}</div>);
}

// Sin backdrop-filter: el blur en vivo sobre muchas cards congela el render al
// abrir/cerrar y al entrar a una receta. Fondo semi-sólido + sombra = mismo look
// premium, sin costo de GPU.
const cardStyle = { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: SHADOW_CARD };
const plainCard = { background: SURFACE, border: `1px solid ${BORDER}` };

export default function Recetario({ goals, consumed, onClose, onRegister, onChangeGoal }) {
  const [mode, setMode] = useState('comida');
  const [filterSlot, setFilterSlot] = useState('todas');
  const [sort, setSort] = useState('reco'); // reco | rapidos | economicos | proteina
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [manualK, setManualK] = useState(null);
  const [registered, setRegistered] = useState(false);
  const rootRef = useRef(null);

  // Cierra el overlay del Recetario INSTANTÁNEO: oculta el contenedor por
  // mutación directa de DOM antes de que el padre desmonte el componente.
  // Sin esto, el tap en "Volver" se siente congelado mientras React reconcilia
  // el árbol gigante de MealTracker que está mounted debajo.
  const fastClose = () => {
    if (rootRef.current) rootRef.current.style.display = 'none';
    // startTransition: el unmount del padre va en background, el paint del
    // tracker ya ocurrió por la mutación de DOM de arriba.
    startTransition(() => { onClose?.(); });
  };

  // Tracking de pointer-start para distinguir tap real de scroll cuando los
  // botones viven dentro de un contenedor scrolleable (lista de recetas).
  const tapStartRef = useRef(null);
  const onCardPointerDown = (e) => { tapStartRef.current = { x: e.clientX, y: e.clientY }; };
  const onCardPointerUp = (e, fn) => {
    const s = tapStartRef.current;
    tapStartRef.current = null;
    if (!s) return;
    if (Math.abs(e.clientX - s.x) > 8 || Math.abs(e.clientY - s.y) > 8) return;
    e.preventDefault();
    fn();
  };

  const g = goals || { kcal: 2000, p: 150, c: 200, g: 60 };
  const remaining = useMemo(() => ({
    kcal: Math.max(0, g.kcal - (consumed?.kcal || 0)),
    p: Math.max(0, g.p - (consumed?.p || 0)),
  }), [g, consumed]);

  const targetP = (slot) => {
    if (mode === 'dia') return remaining.p > 20 ? remaining.p : g.p * (SPLIT[slot] || 0.3);
    return g.p * (SPLIT[slot] || 0.3);
  };

  const searching = query.trim().length > 0;
  const list = useMemo(() => {
    let recs = RECIPES;
    if (searching) {
      const q = norm(query);
      recs = RECIPES.filter(r => norm(r.name).includes(q) || r.main.some(i => norm(i.n).includes(q)) || r.season.some(s => norm(s).includes(q)));
    } else if (filterSlot !== 'todas' && mode === 'comida') {
      recs = RECIPES.filter(r => slotMatches(r.slot, filterSlot));
    }
    const sorted = [...recs];
    if (sort === 'rapidos') sorted.sort((a, b) => META[a.id].min - META[b.id].min);
    else if (sort === 'economicos') sorted.sort((a, b) => META[a.id].cost - META[b.id].cost);
    else if (sort === 'proteina') sorted.sort((a, b) => b.totals.p - a.totals.p);
    return sorted.map(r => ({ recipe: r, sc: scale(r, targetP(r.slot)) }));
  }, [filterSlot, mode, query, sort, remaining, g]);

  const open = openId ? RECIPES.find(r => r.id === openId) : null;
  const detail = useMemo(() => {
    if (!open) return null;
    if (manualK != null) return scale(open, open.totals.p * manualK);
    return scale(open, targetP(open.slot));
  }, [open, manualK, mode, remaining, g]);

  const handleRegister = () => {
    if (!open || !detail) return;
    haptic(15);
    const entry = {
      id: Date.now(), meal: open.slot,
      items: detail.main.map(i => ({ name: i.n, amount: `${i.q} ${i.u}`, kcal: 0, p: 0, c: 0, g: 0, needs_quantity: false })),
      kcal: r0(detail.totals.kcal), p: r0(detail.totals.p), c: r0(detail.totals.c), g: r0(detail.totals.g),
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      rawInput: `receta: ${open.name}`, hasMissingQuantity: false,
    };
    onRegister?.(entry);
    setRegistered(true);
    setTimeout(() => { setRegistered(false); setOpenId(null); setManualK(null); }, 950);
  };

  // Fondo de manchas orgánicas con GRADIENTES (sin filter:blur) — el look se
  // mantiene y deja de congelar al re-renderizar.
  // OJO: sin <style> aquí. Antes este fragmento incluía un <style> y se
  // renderizaba DOS veces (lista + overlay de detalle); cada montaje del
  // detalle insertaba un tag de estilo nuevo y forzaba un recálculo de
  // estilos de TODO el documento — parte del delay al abrir una receta.
  const blobs = (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: `radial-gradient(60% 45% at 88% 6%, ${ACCENT_PASTEL}66, transparent 70%), radial-gradient(55% 42% at 3% 42%, #F2CBBE44, transparent 70%), radial-gradient(50% 42% at 96% 96%, #CDD2DB40, transparent 72%)` }} />
  );

  const sectionLabel = (t) => <div className="text-[11px] tracking-[0.16em] uppercase font-semibold mb-2.5" style={{ color: ACCENT }}>{t}</div>;

  // ───────────────────────── DETALLE (overlay sobre la lista) ─────────────────────────
  const detailOverlay = (open && detail) ? (
      <div className="fixed inset-0 z-[70] overflow-y-auto rec-slide-in" style={{ background: BG, fontFamily: FONT_UI }}>
        {blobs}
        <div className="sticky top-0 z-20 flex items-center gap-2 px-4 py-3" style={{ background: '#1F1F1F', color: '#FFF' }}>
          <button onClick={() => { haptic(6); setOpenId(null); setManualK(null); }} className="p-1.5 -ml-1.5 rounded-full active:scale-90"><ChevronLeft size={22} /></button>
          <span className="font-semibold text-[15px] truncate">{open.name}</span>
        </div>

        <div className="relative max-w-xl mx-auto px-4 pt-4 pb-32 space-y-3.5" style={{ zIndex: 1 }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 46, height: 46, background: SURFACE_2, fontSize: 24 }}>{open.icon}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] tracking-[0.16em] uppercase font-bold px-2.5 py-1 rounded-full" style={{ background: ACCENT_PASTEL, color: ACCENT_DARK }}>{displaySlot(open.slot)}</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: SURFACE_2, color: TEXT_MUTED }}><Clock size={11} /> {open.time}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: SURFACE_2, color: TEXT_MUTED }}><CostTag cost={META[open.id].cost} /> {COST_LABELS[META[open.id].cost]}</span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: SURFACE_2, color: TEXT_MUTED }}>{META[open.id].diff}</span>
              {isHighProtein(open) && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#F7E3DC', color: C_PROTEIN }}>Alta proteína</span>}
            </div>
          </div>
          {open.allergens.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full w-fit" style={{ background: '#FBEEE8', color: '#B8732B' }}><AlertTriangle size={11} /> Contiene: {open.allergens.join(', ')}</div>
          )}

          {/* Tu porción */}
          <div className="rounded-3xl p-4" style={cardStyle}>
            {sectionLabel('Tu porción')}
            <div className="flex items-center gap-4">
              <MacroDonut totals={detail.totals} size={92} />
              <MacroLegend totals={detail.totals} />
            </div>
            <div className="text-[11.5px] mt-3 flex items-start gap-1.5" style={{ color: TEXT_MUTED }}>
              <Info size={13} style={{ color: ACCENT, marginTop: 1, flexShrink: 0 }} />
              <span>{mode === 'dia' ? 'Ajustado a lo que te queda hoy.' : `Ajustado a tu ${displaySlot(open.slot).toLowerCase()} (~${Math.round((SPLIT[open.slot] || 0.3) * 100)}% de tu meta).`} Las porciones se recalculan solas si cambia tu meta.</span>
            </div>
          </div>

          {/* Ingredientes */}
          <div className="rounded-3xl p-4" style={plainCard}>
            {sectionLabel('Ingredientes')}
            {detail.main.map((i, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5" style={{ borderBottom: idx < detail.main.length - 1 ? `1px dashed ${BORDER}` : 'none' }}>
                <span className="text-[14px]" style={{ color: TEXT }}>{i.n}</span>
                <span className="text-[14px] font-semibold num" style={{ color: TEXT }}>{i.q} {i.u}</span>
              </div>
            ))}
          </div>

          {/* Para realzar */}
          {open.season.length > 0 && (
            <div className="rounded-3xl p-4" style={plainCard}>
              {sectionLabel('Para realzar')}
              {open.season.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2 py-1 text-[13.5px]" style={{ color: TEXT }}>
                  <span style={{ color: ACCENT, lineHeight: 1.2 }}>·</span><span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Preparación */}
          <div className="rounded-3xl p-4" style={plainCard}>
            {sectionLabel('Preparación')}
            {open.steps.map((s, idx) => (
              <div key={idx} className="flex gap-3 py-2" style={{ borderBottom: idx < open.steps.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <div className="flex-shrink-0 flex items-center justify-center font-bold num" style={{ width: 25, height: 25, borderRadius: '50%', background: SURFACE_2, color: TEXT, fontSize: 13 }}>{idx + 1}</div>
                <div className="text-[13.5px] leading-relaxed pt-0.5" style={{ color: TEXT }}>{s}</div>
              </div>
            ))}
          </div>

          {/* Ajuste manual */}
          <div className="rounded-3xl p-4" style={plainCard}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase font-semibold" style={{ color: ACCENT }}><Sliders size={13} /> Ajuste fino</div>
              {manualK != null && <button onClick={() => setManualK(null)} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEXT_MUTED }}><RotateCcw size={11} /> Volver a tu meta</button>}
            </div>
            <div className="text-[11.5px] mb-2" style={{ color: TEXT_MUTED }}>
              Las porciones de arriba ya están calculadas según tu meta. Usa esto solo si quieres aumentar o reducir esa cantidad sugerida.
            </div>
            <input type="range" min="0.5" max="2" step="0.05" value={manualK ?? detail.k} onChange={(e) => setManualK(parseFloat(e.target.value))} className="rec-range" />
            <div className="text-[11px] mt-1" style={{ color: TEXT_LIGHT }}>{(manualK ?? detail.k).toFixed(2)}× respecto a la receta base</div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-10" style={{ background: `linear-gradient(180deg, transparent, ${BG} 30%)` }}>
          <div className="max-w-xl mx-auto">
            <button onClick={handleRegister} disabled={registered} className="w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition" style={{ background: '#1F1F1F', color: '#FFF', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
              {registered ? <><Check size={18} /> Registrado en tu día</> : 'Registrar en mi día'}
            </button>
          </div>
        </div>
      </div>
  ) : null;

  // ───────────────────────── LISTA ─────────────────────────
  return (
    <div ref={rootRef} className="fixed inset-0 z-[60] overflow-y-auto rec-slide-in" style={{ background: BG, fontFamily: FONT_UI }}>
      <style>{`
        .rec-range { -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:999px; background:${BORDER}; outline:none; }
        .rec-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:24px; height:24px; border-radius:50%; background:#1F1F1F; border:3px solid #fff; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.3); }
        .rec-range::-moz-range-thumb { width:24px; height:24px; border-radius:50%; background:#1F1F1F; border:3px solid #fff; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.3); }
        button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        @keyframes recSlideIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .rec-slide-in { animation: recSlideIn 0.24s cubic-bezier(0.2, 0, 0, 1); }
      `}</style>
      {blobs}
      <div className="sticky top-0 z-20 px-4 py-3" style={{ background: '#1F1F1F', color: '#FFF' }}>
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <button
            onPointerDown={(e) => { e.preventDefault(); haptic(6); fastClose(); }}
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-1 p-1.5 -ml-1.5 rounded-full active:scale-90"
            style={{ touchAction: 'manipulation' }}>
            <ChevronLeft size={20} /><span className="text-[13px] font-semibold">MealTracker</span>
          </button>
          <span className="ml-auto font-semibold text-[15px]">Recetario</span>
        </div>
      </div>

      <div className="relative max-w-xl mx-auto px-4 pt-4 pb-24 space-y-3.5" style={{ zIndex: 1 }}>
        {/* Meta nutricional */}
        <div className="rounded-3xl p-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] tracking-[0.18em] uppercase font-semibold" style={{ color: ACCENT }}>Tu meta de hoy</div>
            <button onClick={() => { haptic(8); onChangeGoal?.(); }} className="flex items-center gap-1 px-2.5 py-1 rounded-full active:scale-95" style={{ color: TEXT, background: '#FFF', border: `1px solid ${BORDER}` }}>
              <Sliders size={11} /><span className="text-[10px] font-semibold">Cambiar meta</span>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ v: g.kcal, l: 'Calorías', c: TEXT, u: '' }, { v: g.p, l: 'Proteína', c: C_PROTEIN, u: 'g' }, { v: g.c, l: 'Carbos', c: C_CARBS, u: 'g' }, { v: g.g, l: 'Grasas', c: C_FAT, u: 'g' }].map((m, i) => (
              <div key={i}>
                <div className="font-bold num" style={{ fontSize: 19, color: m.c, lineHeight: 1 }}>{m.v}<span style={{ fontSize: 11 }}>{m.u}</span></div>
                <div className="text-[10px] uppercase tracking-wider font-semibold mt-1" style={{ color: TEXT_MUTED }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={plainCard}>
          <Search size={16} style={{ color: TEXT_LIGHT, flexShrink: 0 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar receta o ingrediente…" className="flex-1 bg-transparent outline-none text-[14px]" style={{ color: TEXT }} />
          {query && <button onClick={() => setQuery('')} className="p-0.5 rounded-full active:scale-90"><X size={15} style={{ color: TEXT_LIGHT }} /></button>}
        </div>

        {/* Modo (oculto al buscar) */}
        {!searching && (
          <>
            <div className="flex gap-2 p-1 rounded-2xl" style={{ background: SURFACE_2 }}>
              {[{ k: 'comida', l: 'Por comida' }, { k: 'dia', l: 'Ajustar recetas a mi día' }].map(m => (
                <button key={m.k} onClick={() => { haptic(6); setMode(m.k); }} className="flex-1 py-2 px-1 rounded-xl text-[12.5px] font-semibold transition text-center leading-tight flex items-center justify-center" style={{ minHeight: 40, background: mode === m.k ? SURFACE : 'transparent', color: mode === m.k ? TEXT : TEXT_MUTED, boxShadow: mode === m.k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>{m.l}</button>
              ))}
            </div>
            <div className="flex items-start gap-1.5 -mt-1.5 px-1 text-[11.5px]" style={{ color: TEXT_MUTED }}>
              <Info size={12} style={{ color: ACCENT, marginTop: 1, flexShrink: 0 }} />
              <span>{mode === 'dia'
                ? `Ajusta cada receta a lo que te queda por comer hoy, según lo que ya registraste en MealTracker. Úsalo cuando ya comiste algo y quieres cerrar el día justo en tu meta. Ahora mismo te quedan ${r0(remaining.kcal)} kcal y ${r0(remaining.p)}g de proteína, y las recetas se ajustan a eso.`
                : 'Ajusta cada receta a la porción típica de esa comida dentro de tu meta diaria. Ideal para planear de cero.'}</span>
            </div>
          </>
        )}

        {/* Filtro por comida — siempre los 4 momentos */}
        {!searching && mode === 'comida' && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {SLOT_FILTERS.map(f => (
              <button key={f.key} onClick={() => { haptic(4); setFilterSlot(f.key); }} className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition" style={{ background: filterSlot === f.key ? '#1F1F1F' : 'rgba(255,255,255,0.92)', color: filterSlot === f.key ? '#FFF' : TEXT_MUTED, border: 'none', boxShadow: filterSlot === f.key ? '0 2px 6px rgba(0,0,0,0.16)' : '0 1px 4px rgba(60,70,50,0.08)' }}>{f.label}</button>
            ))}
          </div>
        )}

        {/* Filtros rápidos / ordenar */}
        {!searching && (
          <>
            {mode === 'comida' && <div style={{ height: 1, background: BORDER, opacity: 0.7 }} className="mx-1 my-0.5" />}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[{ k: 'reco', l: 'Recomendado' }, { k: 'rapidos', l: '⚡ Más rápidos' }, { k: 'economicos', l: '💰 Más económicos' }, { k: 'proteina', l: '💪 Alta proteína' }].map(o => (
                <button key={o.k} onClick={() => { haptic(4); setSort(o.k); }} className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition" style={{ background: sort === o.k ? '#1F1F1F' : 'rgba(255,255,255,0.92)', color: sort === o.k ? '#FFF' : TEXT_MUTED, border: 'none', boxShadow: sort === o.k ? '0 2px 6px rgba(0,0,0,0.16)' : '0 1px 4px rgba(60,70,50,0.08)' }}>{o.l}</button>
              ))}
            </div>
            <div className="-mt-1.5 px-1 text-[11.5px]" style={{ color: TEXT_MUTED }}>{SORT_NOTES[sort]}</div>
          </>
        )}

        {/* Cards */}
        <div className="space-y-2.5">
          {list.map(({ recipe, sc }) => (
            <button
              key={recipe.id}
              onPointerDown={onCardPointerDown}
              onPointerUp={(e) => onCardPointerUp(e, () => {
                haptic(8);
                setOpenId(recipe.id);
                setManualK(null);
              })}
              onClick={(e) => e.preventDefault()}
              className="w-full text-left rounded-2xl p-3 active:scale-[0.99] transition flex items-center gap-3"
              style={{ ...cardStyle, touchAction: 'manipulation' }}>
              <div className="flex items-center justify-center rounded-xl" style={{ width: 46, height: 46, background: SURFACE_2, fontSize: 24, flexShrink: 0 }}>{recipe.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14.5px] truncate" style={{ color: TEXT }}>{recipe.name}</div>
                <div className="flex items-center gap-2 text-[10.5px] mt-1" style={{ color: TEXT_MUTED }}>
                  <span className="px-2 py-0.5 rounded-full font-bold tracking-[0.12em] uppercase" style={{ background: ACCENT_PASTEL, color: ACCENT_DARK, fontSize: 10 }}>{displaySlot(recipe.slot)}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {recipe.time}</span>
                  <CostTag cost={META[recipe.id].cost} />
                  {isHighProtein(recipe) && <span className="font-semibold" style={{ color: C_PROTEIN, fontSize: 10 }}>· Alta proteína</span>}
                </div>
                <div className="flex items-center gap-2.5 mt-1.5 text-[11px] font-semibold num">
                  <span style={{ color: TEXT_MUTED }}>{r0(sc.totals.kcal)} kcal</span>
                  <span style={{ color: C_PROTEIN }}>P{r0(sc.totals.p)}</span>
                  <span style={{ color: C_CARBS }}>C{r0(sc.totals.c)}</span>
                  <span style={{ color: C_FAT }}>G{r0(sc.totals.g)}</span>
                </div>
              </div>
            </button>
          ))}
          {list.length === 0 && (
            <div className="text-center py-10 text-[13px]" style={{ color: TEXT_LIGHT }}>
              {searching ? `Sin resultados para “${query}”.` : `Aún no hay recetas sugeridas para ${(SLOT_FILTERS.find(f => f.key === filterSlot)?.label || 'esta comida').toLowerCase()}. Pronto agregamos más.`}
            </div>
          )}
        </div>

        {!searching && (
          <div className="text-[11px] text-center pt-1" style={{ color: TEXT_LIGHT }}>
            {mode === 'dia' ? `Ajustadas a lo que te queda hoy · ${r0(remaining.p)}g proteína · ${r0(remaining.kcal)} kcal` : 'Cada receta se ajusta a su comida dentro de tu meta'}
          </div>
        )}
      </div>
      {detailOverlay}
    </div>
  );
}
