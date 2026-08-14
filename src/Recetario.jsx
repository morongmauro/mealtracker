import React, { useState, useMemo, useRef, useEffect, startTransition } from 'react';
import { ChevronLeft, Search, SlidersHorizontal as Sliders, RotateCcw, Check, Info, Clock, AlertTriangle, X, ShoppingCart, Copy } from 'lucide-react';

// Paleta, sombras y tipografía compartidas — ver src/theme.js.
import {
  ACCENT, ACCENT_DARK, ACCENT_PASTEL, ACCENT_LIGHT,
  C_PROTEIN, C_CARBS, C_FAT,
  BG, BG_STAINS, SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, TEXT_LIGHT,
  FONT_UI, FONT_DISPLAY, SHADOW_CARD,
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

  // ═══════════════════════════════════════════════════════════════════════
  // BLOQUE 2 — extraídas de nuevos PDFs (jul 2026). Recetas con >1 porción
  // fueron normalizadas a 1 porción (el Recetario escala por proteína). En
  // las que rinden un lote (pan, pie, bolitas), dejamos nota en steps para
  // hornear/preparar la receta completa.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'caprese-chicken-pasta', name: 'Bowl caprese de pollo y pasta', slot: 'almuerzo', time: '15 min', icon: '🍝',
    allergens: ['Gluten', 'Frutos secos'], tags: ['Ensalada', 'Comida simple'],
    totals: { kcal: 536, p: 36, c: 52, g: 19 },
    main: [
      { n: 'Espagueti o pasta cocida', q: 150, u: 'g' },
      { n: 'Pechuga de pollo (cruda)', q: 120, u: 'g' },
      { n: 'Tomates cherry', q: 112, u: 'g' },
      { n: 'Pesto de albahaca', q: 2, u: 'cda' },
    ],
    season: ['Albahaca fresca · 2 cda', 'Sal al gusto'],
    steps: [
      'Corta la pechuga de pollo en trozos pequeños y sazónala con sal.',
      'Calienta una sartén antiadherente a fuego medio con un toque de aceite en spray. Cocina el pollo unos minutos hasta que pierda el color rosado.',
      'Corta los tomates cherry a la mitad.',
      'En un bowl, mezcla la pasta con el pesto; agrega los tomates, el pollo y la albahaca. ¡Y a disfrutar!',
    ],
  },
  // (La receta "Egg Breakfast Toast" del PDF ya existía como 'egg-toast' — no se duplica.)
  {
    id: 'breakfast-pita', name: 'Pita rellena de desayuno', slot: 'desayuno', time: '15 min', icon: '🫓',
    allergens: ['Huevo', 'Gluten'], tags: ['Alta en proteína', 'Comida simple'],
    totals: { kcal: 477, p: 36, c: 44, g: 18 },
    main: [
      { n: 'Pan pita integral grande', q: 1, u: 'unidad' },
      { n: 'Huevo', q: 2, u: 'unidades' },
      { n: 'Claras de huevo', q: 122, u: 'g' },
      { n: 'Hummus', q: 3, u: 'cda' },
      { n: 'Espinaca', q: 15, u: 'g' },
    ],
    season: ['Sal y pimienta al gusto'],
    steps: [
      'Pica la espinaca.',
      'En un bol, mezcla los huevos, las claras, sal y pimienta, y bate con un tenedor.',
      'Calienta una sartén antiadherente a fuego bajo. Vierte la mezcla y cocina como huevos revueltos; cuando empiecen a cuajar, agrega la espinaca y revuelve con la espátula.',
      'Corta la pita a la mitad, unta hummus por dentro de cada mitad y rellénala con el revuelto. Sirve y disfruta.',
    ],
  },
  {
    id: 'carrot-protein-bites', name: 'Bocaditos de zanahoria y proteína', slot: 'snack', time: '15 min', icon: '🥕',
    allergens: ['Lácteos', 'Frutos secos'], tags: ['Sin cocción', 'Dulce'],
    totals: { kcal: 243, p: 16, c: 26, g: 10 },
    main: [
      { n: 'Zanahoria rallada', q: 32, u: 'g' },
      { n: 'Queso cottage bajo en grasa', q: 56, u: 'g' },
      { n: 'Proteína whey de vainilla', q: 0.5, u: 'scoop' },
      { n: 'Harina de almendra', q: 14, u: 'g' },
      { n: 'Harina de avena', q: 1, u: 'cda' },
      { n: 'Pasas', q: 12, u: 'g' },
    ],
    season: ['Canela en polvo · ¼ cdta', 'Leche baja en grasa · 1 cdta'],
    steps: [
      'Prepara los ingredientes: ralla la zanahoria, pica las pasas y licúa el queso cottage con la leche hasta que quede cremoso.',
      'En un bol, mezcla la harina de almendra, la harina de avena, la canela y la proteína de vainilla.',
      'Agrega el cottage licuado, la zanahoria y las pasas. Revuelve hasta lograr una mezcla cremosa y espesa.',
      'Con las manos secas, forma bolitas del tamaño de un bocado.',
      'Ponlas en un plato y disfruta. (Tip: duplica las cantidades y guarda en la nevera para dos snacks.)',
    ],
  },
  // (La receta "Pumpkin Egg Pie" del PDF ya existía como 'pumpkin-egg-pie' — no se duplica.)
  {
    id: 'salmon-lettuce-rolls', name: 'Rollitos de salmón y lechuga', slot: 'snack', time: '5 min', icon: '🌯',
    allergens: ['Lácteos', 'Pescado'], tags: ['Sin cocción', 'Comida simple'],
    totals: { kcal: 202, p: 14, c: 9, g: 13 },
    main: [
      { n: 'Salmón ahumado', q: 60, u: 'g' },
      { n: 'Hojas grandes de lechuga', q: 2, u: 'unidades' },
      { n: 'Queso crema', q: 2, u: 'cda' },
      { n: 'Papel de arroz', q: 1, u: 'unidad' },
    ],
    season: ['Eneldo fresco · unas ramitas'],
    steps: [
      'Corta la hoja de papel de arroz por la mitad y reserva.',
      'Extiende las hojas de lechuga sobre una superficie limpia y unta el queso crema por encima.',
      'Coloca las láminas de salmón ahumado sobre la lechuga y espolvorea con eneldo fresco.',
      'Enrolla cada hoja de lechuga bien apretada.',
      'Humedece ligeramente cada mitad de papel de arroz con agua, coloca un rollito en el centro y envuélvelo con firmeza.',
      'Sirve en un plato y disfruta.',
    ],
  },
  {
    id: 'creamy-potato-soup', name: 'Crema de papa con yogur griego', slot: 'cena', time: '20 min', icon: '🍲',
    allergens: ['Lácteos'], tags: ['Comida simple'],
    totals: { kcal: 492, p: 25, c: 59, g: 18 },
    main: [
      { n: 'Papas blancas', q: 300, u: 'g' },
      { n: 'Cebolla', q: 30, u: 'g' },
      { n: 'Ajo', q: 3, u: 'dientes' },
      { n: 'Caldo de pollo', q: 720, u: 'ml' },
      { n: 'Yogur griego natural bajo en grasa', q: 61, u: 'g' },
      { n: 'Queso suizo bajo en grasa', q: 30, u: 'g' },
    ],
    season: ['Aceite de oliva · 1 cda', 'Sal y pimienta al gusto'],
    steps: [
      'Pela y corta las papas en cubos, pica la cebolla y machaca el ajo.',
      'Calienta el aceite de oliva en una olla a fuego medio. Sofríe la cebolla y el ajo hasta que estén suaves y aromáticos.',
      'Agrega las papas y vierte el caldo de pollo. Lleva a hervor y baja a fuego lento hasta que las papas estén muy blandas.',
      'Apaga el fuego y licúa la sopa con licuadora de inmersión hasta obtener una textura cremosa.',
      'Incorpora el yogur griego y el queso suizo; revuelve hasta que el queso se derrita y quede integrado. Ajusta sal y pimienta.',
      'Sirve caliente y disfruta.',
    ],
  },
  {
    id: 'pumpkin-protein-bread', name: 'Pan de auyama y proteína', slot: 'snack', time: '40 min', icon: '🍞',
    allergens: ['Lácteos', 'Huevo', 'Frutos secos'], tags: ['Dulce', 'Alta en proteína'],
    totals: { kcal: 223, p: 16, c: 25, g: 7 },
    main: [
      { n: 'Harina de avena', q: 25, u: 'g' },
      { n: 'Puré de auyama (calabaza)', q: 40, u: 'g' },
      { n: 'Yogur griego natural sin grasa', q: 31, u: 'g' },
      { n: 'Huevo', q: 0.33, u: 'unidades' },
      { n: 'Proteína whey de vainilla', q: 8, u: 'g' },
      { n: 'Semillas de auyama peladas', q: 6, u: 'g' },
    ],
    season: ['Polvo para hornear · pizca', 'Especias para pie de auyama · pizca'],
    steps: [
      'Cantidades por porción; el pan completo rinde 6 porciones (multiplica ×6: 152 g harina de avena, 240 g puré de auyama, 184 g yogur griego, 2 huevos, 49 g proteína whey, 1 cdta polvo para hornear, 1 cdta especias, 35 g semillas de auyama).',
      'Precalienta el horno a 200 °C.',
      'Mezcla los ingredientes húmedos: puré de auyama, yogur griego y huevos.',
      'En otro bol, mezcla los ingredientes secos: polvo para hornear, especias, proteína de vainilla y harina de avena. Agrega la mezcla húmeda y combina bien.',
      'Forra un molde con papel manteca y vierte la mezcla. Decora con las semillas de auyama por encima.',
      'Hornea 40 min a 160 °C hasta que un palillo salga casi limpio. Deja enfriar antes de cortar en 6 porciones.',
    ],
  },
  {
    id: 'peach-blueberry-smoothie', name: 'Smoothie de durazno y arándanos', slot: 'desayuno', time: '5 min', icon: '🥤',
    allergens: ['Lácteos'], tags: ['Sin cocción', 'Smoothie'],
    totals: { kcal: 249, p: 20, c: 28, g: 8 },
    main: [
      { n: 'Yogur griego natural sin grasa', q: 150, u: 'g' },
      { n: 'Durazno', q: 0.5, u: 'unidad' },
      { n: 'Arándanos', q: 36, u: 'g' },
      { n: 'Semillas de chía', q: 22, u: 'g' },
    ],
    season: [],
    steps: [
      'Corta el durazno a la mitad, retira el hueso y pícalo.',
      'Agrega el durazno picado a la licuadora junto con los arándanos, el yogur griego y las semillas de chía. Licúa hasta que quede cremoso.',
      'Sirve en un vaso y disfruta.',
    ],
  },
  {
    id: 'vanilla-chai-smoothie', name: 'Smoothie de chai y vainilla', slot: 'snack', time: '5 min', icon: '🧋',
    allergens: ['Lácteos', 'Frutos secos'], tags: ['Sin cocción', 'Smoothie'],
    totals: { kcal: 238, p: 19, c: 23, g: 9 },
    main: [
      { n: 'Yogur griego natural bajo en grasa', q: 164, u: 'g' },
      { n: 'Leche de almendras de vainilla', q: 120, u: 'ml' },
      { n: 'Dátiles medjool', q: 20, u: 'g' },
      { n: 'Mantequilla de almendras con sal', q: 1.5, u: 'cdta' },
      { n: 'Bolsitas de té chai', q: 2, u: 'unidades' },
    ],
    season: [],
    steps: [
      'Prepara el té: hierve una taza de agua y viértela en una taza con las dos bolsitas de chai. Deja infusionar. Al mismo tiempo, remoja los dátiles en ¼ de taza de agua caliente para ablandarlos.',
      'En la licuadora, agrega el yogur griego, los dátiles escurridos, el té chai (frío o tibio) y la leche de almendras de vainilla. Añade la mantequilla de almendras. Licúa hasta que quede suave.',
      'Sirve en un vaso y disfruta.',
    ],
  },
  // (La receta "Chocolate PB Protein Balls" del PDF ya existía como 'protein-balls' — no se duplica.)
  {
    id: 'avocado-cocoa-mousse', name: 'Mousse de aguacate y cacao', slot: 'snack', time: '5 min', icon: '🥑',
    allergens: ['Lácteos'], tags: ['Sin cocción', 'Dulce'],
    totals: { kcal: 228, p: 15, c: 16, g: 14 },
    main: [
      { n: 'Yogur griego natural bajo en grasa', q: 123, u: 'g' },
      { n: 'Aguacate', q: 75, u: 'g' },
      { n: 'Cacao en polvo sin azúcar', q: 1.5, u: 'cda' },
    ],
    season: ['Endulzante sin calorías al gusto (opcional)'],
    steps: [
      'Licúa todos los ingredientes hasta que quede una mezcla cremosa y homogénea.',
      'Sirve y disfruta. Si te gusta más dulce, añade endulzante sin calorías al gusto.',
    ],
  },
  {
    id: 'strawberry-shake', name: 'Malteada de fresa', slot: 'snack', time: '5 min', icon: '🍓',
    allergens: ['Lácteos', 'Frutos secos'], tags: ['Sin cocción', 'Smoothie', 'Alta en proteína'],
    totals: { kcal: 221, p: 26, c: 18, g: 6 },
    main: [
      { n: 'Yogur griego 0% grasa', q: 227, u: 'g' },
      { n: 'Fresas', q: 114, u: 'g' },
      { n: 'Leche de almendras de vainilla sin azúcar', q: 99, u: 'ml' },
      { n: 'Almendras crudas', q: 5, u: 'unidades' },
    ],
    season: [],
    steps: [
      'Licúa todos los ingredientes con hielo hasta que quede cremoso. Sirve y disfruta.',
    ],
  },
  {
    id: 'chocolate-whey-pudding', name: 'Pudín de chocolate whey con fresas', slot: 'snack', time: '5 min', icon: '🍮',
    allergens: ['Lácteos', 'Frutos secos'], tags: ['Sin cocción', 'Dulce', 'Alta en proteína'],
    totals: { kcal: 223, p: 27, c: 21, g: 5 },
    main: [
      { n: 'Fresas', q: 152, u: 'g' },
      { n: 'Proteína whey de chocolate', q: 1, u: 'scoop' },
      { n: 'Mantequilla de almendras', q: 1, u: 'cdta' },
      { n: 'Cacao en polvo sin azúcar', q: 1, u: 'cda' },
    ],
    season: [],
    steps: [
      'En un bol, mezcla la mantequilla de almendras, la proteína whey y el cacao en polvo con una cucharada de agua.',
      'Revuelve hasta integrar; agrega agua poco a poco hasta que tome consistencia de pudín.',
      'Corta las fresas en rebanadas y sírvelas por encima. Disfruta.',
    ],
  },
  {
    id: 'banana-pancakes', name: 'Panqueques de banana y proteína', slot: 'desayuno', time: '15 min', icon: '🥞',
    allergens: ['Huevo', 'Frutos secos'], tags: ['Comida simple', 'Alta en proteína'],
    totals: { kcal: 530, p: 38, c: 55, g: 20 },
    main: [
      { n: 'Proteína whey de vainilla', q: 1, u: 'scoop' },
      { n: 'Banana', q: 1.5, u: 'unidades' },
      { n: 'Claras de huevo', q: 3, u: 'unidades' },
      { n: 'Harina de almendra', q: 2.5, u: 'cda' },
      { n: 'Aceite de coco', q: 2, u: 'cdta' },
    ],
    season: ['Canela o especias para pie de auyama al gusto'],
    steps: [
      'Licúa todos los ingredientes menos el aceite de coco.',
      'Calienta una sartén antiadherente a fuego bajo con 1 cdta de aceite de coco. Vierte la mitad de la mezcla y cocina 2–3 min por lado, hasta dorar.',
      'Repite con el resto del aceite y la mezcla para el segundo panqueque.',
      'Sirve y espolvorea con canela o especias para pie de auyama. Disfruta.',
    ],
  },
  {
    id: 'balanced-protein-pancakes', name: 'Panqueques balanceados con mantequilla de almendra', slot: 'desayuno', time: '15 min', icon: '🥞',
    allergens: ['Gluten', 'Frutos secos'], tags: ['Comida simple', 'Alta en proteína'],
    totals: { kcal: 540, p: 30, c: 65, g: 20 },
    main: [
      { n: 'Harina de trigo común', q: 50, u: 'g' },
      { n: 'Proteína de arveja en polvo', q: 0.75, u: 'scoop' },
      { n: 'Mantequilla de almendras con sal', q: 2, u: 'cda' },
      { n: 'Miel de maple', q: 1, u: 'cda' },
      { n: 'Arándanos', q: 3, u: 'cda' },
      { n: 'Agua', q: 118, u: 'ml' },
    ],
    season: ['Polvo para hornear · ½ cda', 'Sal · ½ cdta', 'Endulzante sin calorías · 1 sobre'],
    steps: [
      'Mezcla los ingredientes secos (harina, proteína, polvo para hornear, sal, endulzante) en un bol. Agrega el agua y bate hasta integrar; la mezcla puede quedar un poco grumosa, no importa.',
      'Vierte ¼ de taza de la mezcla en una sartén antiadherente con spray de cocina a fuego medio-alto.',
      'Cocina 1–2 min o hasta que aparezcan burbujas en la superficie. Voltea y cocina 1–2 min por el otro lado.',
      'Sírvelos calientes y corona con la mantequilla de almendras, la miel de maple y los arándanos.',
    ],
  },
  // ── Recetas nuevas (agosto 2026) ──
  {
    id: 'banana-whey-shake', name: 'Batido de banano y whey', slot: 'snack', time: '5 min', icon: '🥤',
    allergens: ['Lácteos'], tags: ['Sin cocción', 'Alta en proteína', 'Comida simple'],
    totals: { kcal: 218, p: 21, c: 32, g: 2 },
    main: [
      { n: 'Banano', q: 1, u: 'unidad' },
      { n: 'Proteína whey', q: 1.5, u: 'scoop' },
      { n: 'Hielo', q: 218, u: 'g' },
    ],
    season: ['Agua · 240 ml'],
    steps: [
      'Licúa el banano con la proteína, el hielo y aproximadamente 1 taza de agua hasta que quede suave.',
      'Sirve de inmediato.',
    ],
  },
  {
    id: 'choco-whey-pudding', name: 'Pudín de whey con chocolate y fresas', slot: 'snack', time: '5 min', icon: '🍫',
    allergens: ['Lácteos', 'Frutos secos'], tags: ['Sin cocción', 'Alta en proteína', 'Dulce'],
    totals: { kcal: 223, p: 27, c: 21, g: 5 },
    main: [
      { n: 'Fresas', q: 152, u: 'g' },
      { n: 'Proteína whey sabor chocolate', q: 1, u: 'scoop' },
      { n: 'Cacao en polvo sin azúcar', q: 1, u: 'cda' },
      { n: 'Mantequilla de almendras', q: 1, u: 'cdta' },
    ],
    season: ['Agua · la necesaria para dar consistencia'],
    steps: [
      'Mezcla la mantequilla de almendras, la proteína y el cacao con una cucharada de agua.',
      'Revuelve hasta integrar y ve agregando agua poco a poco hasta lograr consistencia de pudín.',
      'Sirve con las fresas en rodajas encima.',
    ],
  },
  {
    id: 'omelette-quesadilla', name: 'Quesadilla de omelette', slot: 'desayuno', time: '15 min', icon: '🫓',
    allergens: ['Lácteos', 'Huevo', 'Gluten'], tags: ['Comida simple', 'Alta en proteína'],
    totals: { kcal: 456, p: 35, c: 42, g: 16 },
    main: [
      { n: 'Huevo', q: 2, u: 'unidades' },
      { n: 'Queso suizo bajo en grasa', q: 60, u: 'g' },
      { n: 'Tortilla de harina', q: 60, u: 'g' },
      { n: 'Champiñones', q: 3, u: 'unidades' },
      { n: 'Cebolla', q: 1, u: 'rebanadas' },
      { n: 'Espinaca', q: 15, u: 'g' },
    ],
    season: ['Sal y pimienta al gusto', 'Ajo en polvo al gusto'],
    steps: [
      'Alista los ingredientes: corta los champiñones y la cebolla en láminas y pica la espinaca.',
      'Bate los huevos con sal, pimienta y ajo en polvo hasta integrarlos bien.',
      'Calienta una sartén antiadherente mediana a fuego bajo. Agrega la cebolla y los champiñones y cocina hasta que ablanden.',
      'Añade la espinaca y mezcla hasta que se marchite.',
      'Vierte el huevo batido en la sartén y cocina a fuego suave hasta que la superficie empiece a cuajar.',
      'Reparte el queso sobre una mitad del omelette y coloca la tortilla encima. Apaga el fuego y dobla el omelette por la mitad para formar la quesadilla.',
      'Pásala al plato, córtala a la mitad y disfruta.',
    ],
  },
  {
    id: 'pineapple-shrimp-bowl', name: 'Bowl de camarón y piña', slot: 'almuerzo', time: '15 min', icon: '🍤',
    allergens: ['Mariscos'], tags: ['Alto en fibra', 'Ensalada'],
    totals: { kcal: 494, p: 37, c: 59, g: 14 },
    main: [
      { n: 'Camarón cocido', q: 120, u: 'g' },
      { n: 'Quinua cocida', q: 139, u: 'g' },
      { n: 'Piña', q: 116, u: 'g' },
      { n: 'Aguacate', q: 60, u: 'g' },
      { n: 'Repollo morado', q: 60, u: 'g' },
      { n: 'Pimentón rojo', q: 40, u: 'g' },
    ],
    season: ['Perejil fresco · 1 cda', 'Sal al gusto'],
    steps: [
      'Alista los ingredientes: ralla el repollo, pica el aguacate en cubos y pica finamente el pimentón.',
      'Prepara la ensalada de piña: en un bol combina la piña, el aguacate y el pimentón rojo. Sazona con un poco de sal y mezcla con suavidad.',
      'Arma el bowl: pon la quinua de base y encima la ensalada de piña, el repollo rallado y el camarón.',
      'Termina con el perejil picado y sirve.',
    ],
  },
  {
    id: 'beef-sweet-potato-wrap', name: 'Wrap de carne y batata', slot: 'cena', time: '20 min', icon: '🌯',
    allergens: ['Gluten', 'Carne'], tags: ['Comida simple'],
    totals: { kcal: 460, p: 29, c: 49, g: 16 },
    main: [
      { n: 'Carne molida de res 90% magra', q: 110, u: 'g' },
      { n: 'Tortilla de harina', q: 60, u: 'g' },
      { n: 'Batata (camote)', q: 60, u: 'g' },
      { n: 'Cebolla', q: 3, u: 'cda' },
      { n: 'Pimentón rojo', q: 19, u: 'g' },
    ],
    season: ['Spray de cocina · 1 disparo', 'Paprika · 1 cdta', 'Perejil fresco · 1 cdta', 'Ajo en polvo, sal y pimienta al gusto'],
    steps: [
      'Pela y pica la batata en trozos pequeños. Pica finamente la cebolla, el pimentón y el perejil.',
      'Pon la batata en una olla, cúbrela con agua, lleva a hervor y baja a fuego medio.',
      'Cocina 5 minutos o hasta que los trozos se atraviesen fácil con un tenedor. Escurre y reserva.',
      'Calienta una sartén a fuego medio con un disparo de spray. Sofríe la cebolla hasta que ablande, agrega el pimentón y la carne molida. Sazona con paprika, ajo en polvo, sal y pimienta. Cocina hasta que la carne pierda el color rosado.',
      'Calienta la tortilla lo justo para que se ablande, en sartén o microondas.',
      'Pon la carne y la batata en el centro de la tortilla y corona con el perejil. Envuelve con cuidado.',
      'Corta el wrap a la mitad, sirve y disfruta.',
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
  // Bloque 2 (jul 2026)
  'caprese-chicken-pasta': { cost: 2, diff: 'Fácil', min: 15 },
  'breakfast-pita': { cost: 1, diff: 'Fácil', min: 15 },
  'carrot-protein-bites': { cost: 2, diff: 'Fácil', min: 15 },
  'salmon-lettuce-rolls': { cost: 3, diff: 'Fácil', min: 5 },
  'creamy-potato-soup': { cost: 1, diff: 'Media', min: 20 },
  'pumpkin-protein-bread': { cost: 2, diff: 'Media', min: 40 },
  'peach-blueberry-smoothie': { cost: 2, diff: 'Fácil', min: 5 },
  'vanilla-chai-smoothie': { cost: 2, diff: 'Fácil', min: 5 },
  'avocado-cocoa-mousse': { cost: 2, diff: 'Fácil', min: 5 },
  'strawberry-shake': { cost: 2, diff: 'Fácil', min: 5 },
  'chocolate-whey-pudding': { cost: 2, diff: 'Fácil', min: 5 },
  'banana-pancakes': { cost: 2, diff: 'Fácil', min: 15 },
  'balanced-protein-pancakes': { cost: 1, diff: 'Fácil', min: 15 },
  'banana-whey-shake': { cost: 2, diff: 'Fácil', min: 5 },
  'choco-whey-pudding': { cost: 2, diff: 'Fácil', min: 5 },
  'omelette-quesadilla': { cost: 2, diff: 'Fácil', min: 15 },
  'pineapple-shrimp-bowl': { cost: 3, diff: 'Media', min: 15 },
  'beef-sweet-potato-wrap': { cost: 2, diff: 'Media', min: 20 },
};

// ─────────────────────────────────────────────────────────────────────────
// MENÚS · propuestas de día y de semana armadas con las recetas de arriba
// ─────────────────────────────────────────────────────────────────────────
// El recetario resuelve "qué cocino ahora"; esto resuelve "qué como hoy":
// desayuno, almuerzo y cena que SUMADOS caen cerca de la meta, en vez de
// tres recetas sueltas que cada una cuadra por su lado y el día se pasa.
// Todo se genera desde una semilla, así que el mismo menú se puede volver a
// obtener y no cambia solo cuando React vuelve a pintar.

const MENU_SLOTS = ['desayuno', 'almuerzo', 'cena'];
const ALERGENOS = ['Lácteos', 'Gluten', 'Huevo', 'Frutos secos', 'Pescado', 'Mariscos', 'Carne', 'Soya', 'Maní'];
const MENUS_KEY = 'mt:menus_guardados';

// mulberry32: PRNG diminuto y determinista (no hace falta más).
function mkRng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Recetas candidatas para un hueco del día, aplicando los filtros del usuario.
// Almuerzo y cena comparten pool: son intercambiables en este recetario.
function recetasPara(slot, opts = {}) {
  const evitar = opts.evitar || [];
  const maxMin = opts.maxMin || 0;
  return RECIPES.filter(r => {
    const ok = slot === 'snack' ? r.slot === 'snack'
      : slot === 'desayuno' ? r.slot === 'desayuno'
      : (r.slot === 'almuerzo' || r.slot === 'cena');
    if (!ok) return false;
    if (evitar.some(a => (r.allergens || []).includes(a))) return false;
    if (maxMin && (META[r.id]?.min || 0) > maxMin) return false;
    return true;
  });
}

// Elige la receta cuyo tamaño ajustado cae más cerca de las kcal del hueco.
// No coge SIEMPRE la mejor: sortea entre las que caen dentro de un margen
// razonable, si no el menú sería idéntico cada vez y "otro día" no serviría.
//
// El margen es RELATIVO (±25% de las kcal del hueco) y no un top fijo: con un
// top fijo de 4, las recetas sistemáticamente más pequeñas o más grandes que
// el hueco no salían NUNCA por bien que cuadraran en el día completo. El
// mínimo de 4 garantiza que siempre haya de dónde escoger aunque el margen
// deje fuera a casi todas.
function elegirReceta(slot, targetKcal, targetP, opts, rand, usados = new Set()) {
  let pool = recetasPara(slot, opts);
  if (!pool.length) return null;
  const frescas = pool.filter(r => !usados.has(r.id));
  if (frescas.length) pool = frescas;              // variedad primero
  const puntuadas = pool
    .map(r => ({ r, sc: scale(r, targetP) }))
    .map(x => ({ ...x, dist: Math.abs(x.sc.totals.kcal - targetKcal) }))
    .sort((a, b) => a.dist - b.dist);
  const margen = Math.max(targetKcal * 0.25, puntuadas[Math.min(3, puntuadas.length - 1)].dist);
  const candidatas = puntuadas.filter(x => x.dist <= margen);
  return candidatas[Math.floor(rand() * candidatas.length)];
}

// Un día completo. `conSnack` solo si la meta da margen: meter snack en una
// meta baja obliga a raciones ridículas en las comidas principales.
function generarDia(g, opts = {}, seed = 1) {
  const rand = mkRng(seed);
  const conSnack = opts.snack !== false && g.kcal >= 1800;
  const slots = conSnack ? [...MENU_SLOTS, 'snack'] : MENU_SLOTS;
  // Sin snack su parte se reparte entre las tres comidas, si no el día
  // se quedaría corto respecto a la meta.
  const pesoTotal = slots.reduce((a, s) => a + (SPLIT[s] || 0), 0);
  const usados = opts.usados || new Set();

  const comidas = [];
  for (const slot of slots) {
    const share = (SPLIT[slot] || 0.3) / pesoTotal;
    const targetKcal = g.kcal * share;
    const targetP = g.p * share;
    const el = elegirReceta(slot, targetKcal, targetP, opts, rand, usados);
    if (!el) continue;
    usados.add(el.r.id);
    comidas.push({ slot, recipe: el.r, sc: el.sc });
  }
  const totals = comidas.reduce((a, c) => ({
    kcal: a.kcal + c.sc.totals.kcal, p: a.p + c.sc.totals.p,
    c: a.c + c.sc.totals.c, g: a.g + c.sc.totals.g,
  }), { kcal: 0, p: 0, c: 0, g: 0 });
  return { comidas, totals, desvio: desvioDe(totals, g), seed };
}

// Qué tan lejos quedó el día de la meta, en % de kcal y de proteína.
function desvioDe(totals, g) {
  const pct = (v, meta) => meta > 0 ? Math.round(((v - meta) / meta) * 100) : 0;
  const kcal = pct(totals.kcal, g.kcal);
  const p = pct(totals.p, g.p);
  const peor = Math.max(Math.abs(kcal), Math.abs(p));
  return { kcal, p, nivel: peor <= 8 ? 'bien' : peor <= 18 ? 'cerca' : 'lejos' };
}

// Semana: no repite plato principal en días seguidos. La memoria se limpia
// cada 3 días porque con 24 principales una semana sin repetir nada obliga
// a raciones forzadas; 3 días es suficiente para que no se sienta repetido.
function generarSemana(g, opts = {}, seed = 1) {
  const dias = [];
  let usados = new Set();
  for (let i = 0; i < 7; i++) {
    // Al vaciar la memoria se arranca con los platos del día ANTERIOR ya
    // vetados: si no, el día del reinicio podía repetir lo de ayer, que es
    // justo lo único que de verdad se nota.
    if (i % 3 === 0) {
      const ayer = dias[i - 1];
      usados = new Set(ayer ? ayer.comidas.map(c => c.recipe.id) : []);
    }
    const d = generarDia(g, { ...opts, usados }, seed + i * 977);
    dias.push(d);
  }
  return dias;
}

// Cambia una sola comida del día sin tocar las otras dos.
function cambiarComida(dia, slot, g, opts = {}, seed = Date.now()) {
  const rand = mkRng(seed);
  const conSnack = dia.comidas.some(c => c.slot === 'snack');
  const slots = conSnack ? [...MENU_SLOTS, 'snack'] : MENU_SLOTS;
  const pesoTotal = slots.reduce((a, s) => a + (SPLIT[s] || 0), 0);
  const share = (SPLIT[slot] || 0.3) / pesoTotal;
  // Se evita repetir lo que ya está en el día y la propia receta que se cambia
  const usados = new Set(dia.comidas.map(c => c.recipe.id));
  const el = elegirReceta(slot, g.kcal * share, g.p * share, opts, rand, usados);
  if (!el) return dia;
  const comidas = dia.comidas.map(c => c.slot === slot ? { slot, recipe: el.r, sc: el.sc } : c);
  const totals = comidas.reduce((a, c) => ({
    kcal: a.kcal + c.sc.totals.kcal, p: a.p + c.sc.totals.p,
    c: a.c + c.sc.totals.c, g: a.g + c.sc.totals.g,
  }), { kcal: 0, p: 0, c: 0, g: 0 });
  return { ...dia, comidas, totals, desvio: desvioDe(totals, g) };
}

// Pone una receta concreta en un hueco (lo usa el armador manual).
function ponerComida(dia, slot, recipeId, g) {
  const r = RECIPES.find(x => x.id === recipeId);
  if (!r) return dia;
  const conSnack = slot === 'snack' || dia.comidas.some(c => c.slot === 'snack');
  const slots = conSnack ? [...MENU_SLOTS, 'snack'] : MENU_SLOTS;
  const pesoTotal = slots.reduce((a, s) => a + (SPLIT[s] || 0), 0);
  const share = (SPLIT[slot] || 0.3) / pesoTotal;
  const sc = scale(r, g.p * share);
  const otras = dia.comidas.filter(c => c.slot !== slot);
  const comidas = [...otras, { slot, recipe: r, sc }]
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
  const totals = comidas.reduce((a, c) => ({
    kcal: a.kcal + c.sc.totals.kcal, p: a.p + c.sc.totals.p,
    c: a.c + c.sc.totals.c, g: a.g + c.sc.totals.g,
  }), { kcal: 0, p: 0, c: 0, g: 0 });
  return { ...dia, comidas, totals, desvio: desvioDe(totals, g) };
}

function quitarComida(dia, slot, g) {
  const comidas = dia.comidas.filter(c => c.slot !== slot);
  const totals = comidas.reduce((a, c) => ({
    kcal: a.kcal + c.sc.totals.kcal, p: a.p + c.sc.totals.p,
    c: a.c + c.sc.totals.c, g: a.g + c.sc.totals.g,
  }), { kcal: 0, p: 0, c: 0, g: 0 });
  return { ...dia, comidas, totals, desvio: desvioDe(totals, g) };
}

// ── Lista de mercado ──────────────────────────────────────────────────
// Un menú sin lista de compras se queda en buena intención: el día que toca
// cocinar falta un ingrediente y se abandona. Aquí se suman las cantidades
// de todas las comidas, así que lo que sale es lo que hay que comprar de
// verdad, no una receta detrás de otra.
//
// Los ingredientes principales se suman por nombre y unidad (el mismo
// alimento en g y en unidades no se puede mezclar). Los de "para realzar"
// son texto libre — sal, especias, un chorrito de aceite — así que se
// listan aparte, sin cantidades: es la despensa, no la compra de la semana.
const MERCADO_UNIDAD_UNICA = { unidades: 'unidad', unidad: 'unidad' };

function listaMercado(dias) {
  const principales = new Map();
  const despensa = new Set();
  for (const dia of dias || []) {
    for (const c of dia.comidas || []) {
      for (const i of c.sc.main) {
        const unidad = MERCADO_UNIDAD_UNICA[i.u] || i.u;
        const clave = `${norm(i.n)}|${unidad}`;
        const prev = principales.get(clave);
        if (prev) prev.q += i.q;
        else principales.set(clave, { n: i.n, u: unidad, q: i.q, recetas: new Set() });
        principales.get(clave).recetas.add(c.recipe.name);
      }
      for (const s of c.recipe.season || []) despensa.add(s.split('·')[0].trim());
    }
  }
  const items = [...principales.values()]
    .map(x => ({
      ...x,
      // Se redondea al comprar, no al gramo: nadie pesa 137 g de quinua en
      // el supermercado.
      q: x.u === 'g' || x.u === 'ml' ? round5(x.q) : roundHalf(x.q),
      recetas: [...x.recetas],
    }))
    .sort((a, b) => a.n.localeCompare(b.n));
  return { items, despensa: [...despensa].sort((a, b) => a.localeCompare(b)) };
}

// Texto plano para pegar en notas o mandar por WhatsApp.
function listaMercadoTexto(lista, titulo) {
  const l = [`🛒 ${titulo}`, ''];
  for (const i of lista.items) l.push(`• ${i.n} — ${i.q} ${i.u}`);
  if (lista.despensa.length) {
    l.push('', 'De despensa (revisa si te queda):');
    for (const d of lista.despensa) l.push(`• ${d}`);
  }
  return l.join('\n');
}

// ── Menús guardados (viven en el teléfono, no necesitan cuenta) ──
function leerMenusGuardados() {
  try { return JSON.parse(localStorage.getItem(MENUS_KEY) || '[]'); }
  catch (e) { return []; }
}
function escribirMenusGuardados(arr) {
  try { localStorage.setItem(MENUS_KEY, JSON.stringify(arr)); return true; }
  catch (e) { return false; }
}
// Se guardan los IDs, no las recetas enteras: si mañana se corrige una receta,
// los menús guardados heredan la corrección en vez de quedarse con la copia vieja.
function guardarMenu(nombre, dia) {
  const menus = leerMenusGuardados();
  const item = {
    // Date.now() solo no basta: guardar dos menús en el mismo milisegundo
    // les daba el mismo id, y borrar uno se llevaba los dos por delante.
    id: `m${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
    nombre: (nombre || '').trim() || `Menú ${menus.length + 1}`,
    comidas: dia.comidas.map(c => ({ slot: c.slot, recipeId: c.recipe.id })),
    creado: new Date().toISOString().slice(0, 10),
  };
  escribirMenusGuardados([item, ...menus]);
  return item;
}
function borrarMenu(id) {
  escribirMenusGuardados(leerMenusGuardados().filter(m => m.id !== id));
}
// Rehidrata un menú guardado con la meta ACTUAL: si el coach cambió la meta,
// las porciones se recalculan solas.
function menuADia(menu, g) {
  let dia = { comidas: [], totals: { kcal: 0, p: 0, c: 0, g: 0 }, desvio: desvioDe({ kcal: 0, p: 0, c: 0, g: 0 }, g) };
  for (const c of menu.comidas) dia = ponerComida(dia, c.slot, c.recipeId, g);
  return dia;
}

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
    const el = (<circle key={color} cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} strokeLinecap="round" transform="rotate(-90 18 18)" />);
    off += len; return el;
  };
  return (
    <div className="relative" style={{ width: size, height: size, flexShrink: 0 }}>
      {/* Trazo fino + sombra en el trazo: mismo lenguaje premium que los
          aros de la vista Hoy, con los colores de macros de la paleta. */}
      <svg width={size} height={size} viewBox="0 0 36 36" style={{ filter: 'drop-shadow(0 3px 6px rgba(60,66,42,0.18))', overflow: 'visible' }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(31,31,31,0.07)" strokeWidth="3" />
        {seg(pc, C_PROTEIN)}{seg(cc, C_CARBS)}{seg(gc, C_FAT)}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-bold num" style={{ fontSize: size * 0.2, color: TEXT, lineHeight: 1 }}>{r0(totals.kcal)}</div>
        <div className="num font-semibold" style={{ fontSize: size * 0.085, color: TEXT_LIGHT, letterSpacing: '0.03em' }}>KCAL</div>
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
// Sin bordes sólidos: tarjeta blanca con sombra suave y brillo interior
// (mismo lenguaje que las burbujas del chat del MealTracker).
const plainCard = { background: 'rgba(255,255,255,0.92)', boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset, 0 8px 24px rgba(60,70,50,0.09), 0 2px 6px rgba(60,70,50,0.05)' };

// Semáforo del día: qué tan cerca quedó de la meta.
// Entrada para el tracker a partir de una receta ya escalada. La comparten el
// detalle de la receta y las comidas de un menú: una sola forma de registrar.
function entradaDeReceta(recipe, sc, slot) {
  return {
    id: Date.now(), meal: slot || recipe.slot,
    items: sc.main.map(i => ({ name: i.n, amount: `${i.q} ${i.u}`, kcal: 0, p: 0, c: 0, g: 0, needs_quantity: false })),
    kcal: r0(sc.totals.kcal), p: r0(sc.totals.p), c: r0(sc.totals.c), g: r0(sc.totals.g),
    time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    rawInput: `receta: ${recipe.name}`, hasMissingQuantity: false,
  };
}

const NIVEL_COLOR = { bien: '#4C7A34', cerca: '#B07A1E', lejos: '#B4462F' };
const NIVEL_TEXTO = { bien: 'Cuadra con tu meta', cerca: 'Cerca de tu meta', lejos: 'Lejos de tu meta' };
const DIAS_SEM = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function MenuTotales({ dia, g, chico = false }) {
  const d = dia.desvio;
  const col = NIVEL_COLOR[d.nivel];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="num font-bold" style={{ color: TEXT, fontSize: chico ? 12 : 15 }}>
        {r0(dia.totals.kcal)}<span className="font-semibold" style={{ color: TEXT_LIGHT, fontSize: chico ? 9 : 10 }}> kcal</span>
      </span>
      <span className="num font-bold" style={{ color: C_PROTEIN, fontSize: chico ? 11 : 12 }}>P{r0(dia.totals.p)}</span>
      <span className="num font-bold" style={{ color: C_CARBS, fontSize: chico ? 11 : 12 }}>C{r0(dia.totals.c)}</span>
      <span className="num font-bold" style={{ color: C_FAT, fontSize: chico ? 11 : 12 }}>G{r0(dia.totals.g)}</span>
      <span className="px-2 py-0.5 rounded-full font-bold tracking-[0.03em] uppercase"
        style={{ background: `${col}1A`, color: col, fontSize: 9 }}>
        {d.kcal > 0 ? '+' : ''}{d.kcal}% {chico ? '' : `· ${NIVEL_TEXTO[d.nivel]}`}
      </span>
    </div>
  );
}

// Una comida dentro de un menú. Tocarla abre la receta completa; los botones
// de la derecha cambian el plato o lo registran sin salir del menú.
function MenuComida({ c, onAbrir, onCambiar, onRegistrar, onQuitar, registrada }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl px-2.5 py-2" style={{ background: SURFACE_2 }}>
      <button onClick={() => onAbrir?.(c.recipe.id)}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left active:scale-[0.99] transition">
        <span className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 38, height: 38, background: '#fff', fontSize: 20 }}>{c.recipe.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[9.5px] font-bold tracking-[0.05em] uppercase" style={{ color: ACCENT }}>{SLOT_LABELS[c.slot]}</span>
          <span className="block font-bold text-[13px] truncate" style={{ color: TEXT }}>{c.recipe.name}</span>
          <span className="flex items-center gap-2 text-[10.5px] num font-semibold mt-0.5">
            <span style={{ color: TEXT_MUTED }}>{r0(c.sc.totals.kcal)} kcal</span>
            <span style={{ color: C_PROTEIN }}>P{r0(c.sc.totals.p)}</span>
            <span className="flex items-center gap-0.5" style={{ color: TEXT_LIGHT }}><Clock size={9} />{c.recipe.time}</span>
          </span>
        </span>
      </button>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onCambiar && (
          <button onClick={() => onCambiar(c.slot)} title="Cambiar este plato" aria-label="Cambiar este plato"
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition"
            style={{ background: '#fff', color: TEXT_MUTED }}><RotateCcw size={14} /></button>
        )}
        {onQuitar && (
          <button onClick={() => onQuitar(c.slot)} title="Quitar" aria-label="Quitar"
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition"
            style={{ background: '#fff', color: TEXT_MUTED }}><X size={14} /></button>
        )}
        {onRegistrar && (
          <button onClick={() => onRegistrar(c)} title="Registrar esta comida" aria-label="Registrar esta comida"
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition"
            style={{ background: registrada ? ACCENT : '#fff', color: registrada ? '#fff' : ACCENT_DARK }}>
            <Check size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// Elegir receta para un hueco concreto del día (armador manual).
function SlotPicker({ slot, g, opts, onElegir, onCerrar }) {
  const [q, setQ] = useState('');
  const share = (SPLIT[slot] || 0.3);
  const lista = useMemo(() => {
    const base = recetasPara(slot, opts);
    const filtradas = q.trim() ? base.filter(r => norm(r.name).includes(norm(q)) || r.main.some(i => norm(i.n).includes(norm(q)))) : base;
    return filtradas.map(r => ({ r, sc: scale(r, g.p * share) }))
      .sort((a, b) => a.r.name.localeCompare(b.r.name));
  }, [slot, q, opts, g]);

  return (
    <div className="fixed inset-0 z-[41] flex flex-col" style={{ background: BG, fontFamily: FONT_UI }}>
      <div className="flex items-center gap-2 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 62px)', paddingBottom: 10 }}>
        <div className="flex-1">
          <div className="text-[9.5px] font-bold tracking-[0.06em] uppercase" style={{ color: ACCENT }}>Elegir para</div>
          <div className="font-bold text-[17px]" style={{ color: TEXT }}>{SLOT_LABELS[slot]}</div>
        </div>
        <button onClick={onCerrar} aria-label="Cerrar"
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90" style={{ ...plainCard, color: TEXT }}>
          <X size={17} />
        </button>
      </div>
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={plainCard}>
          <Search size={16} style={{ color: TEXT_LIGHT, flexShrink: 0 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receta o ingrediente…"
            className="flex-1 bg-transparent outline-none text-[14px]" style={{ color: TEXT }} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-2" style={{ paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 0px))' }}>
        {lista.map(({ r, sc }) => (
          <button key={r.id} onClick={() => { haptic(8); onElegir(r.id); }}
            className="w-full text-left rounded-[18px] p-2.5 flex items-center gap-2.5 active:scale-[0.99] transition"
            style={cardStyle}>
            <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: SURFACE_2, fontSize: 21 }}>{r.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-[13.5px] truncate" style={{ color: TEXT }}>{r.name}</span>
              <span className="flex items-center gap-2 text-[10.5px] num font-semibold mt-0.5">
                <span style={{ color: TEXT_MUTED }}>{r0(sc.totals.kcal)} kcal</span>
                <span style={{ color: C_PROTEIN }}>P{r0(sc.totals.p)}</span>
                <span className="flex items-center gap-0.5" style={{ color: TEXT_LIGHT }}><Clock size={9} />{r.time}</span>
              </span>
            </span>
          </button>
        ))}
        {lista.length === 0 && (
          <div className="text-center py-10 text-[13px]" style={{ color: TEXT_LIGHT }}>
            Ninguna receta encaja con lo que buscas y los filtros que pusiste.
          </div>
        )}
      </div>
    </div>
  );
}

export default function Recetario({ goals, consumed, onClose, onRegister, onChangeGoal, scrollSignal }) {
  // El modo global "Ajustar recetas a mi día" se eliminó: confundía ("¿no
  // deberían venir TODAS ajustadas al día?"). Ahora toda receta llega
  // ajustada a su comida dentro de la meta, y DENTRO del detalle aparece la
  // opción "Adaptar a lo que me queda hoy" cuando ya se registró comida.
  const [fitRemaining, setFitRemaining] = useState(false);
  const [filterSlot, setFilterSlot] = useState('todas');
  const [sort, setSort] = useState('reco'); // reco | rapidos | economicos | proteina
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [manualK, setManualK] = useState(null);
  const [registered, setRegistered] = useState(false);
  // ── Sección Menús ──
  const [vista, setVista] = useState('inicio');         // inicio | recetas | menus
  const [mercado, setMercado] = useState(null);         // { titulo, dias } de la lista de compras
  const [copiado, setCopiado] = useState(false);
  const [menuTab, setMenuTab] = useState('dia');        // dia | semana | mios
  const [menuSeed, setMenuSeed] = useState(() => Math.floor(Math.random() * 1e6) + 1);
  const [evitar, setEvitar] = useState([]);
  const [maxMin, setMaxMin] = useState(0);
  const [diaEdit, setDiaEdit] = useState(null);         // el día tras cambiar platos a mano
  const [misMenus, setMisMenus] = useState(() => leerMenusGuardados());
  const [armando, setArmando] = useState(null);         // día en construcción (armador manual)
  const [pickerSlot, setPickerSlot] = useState(null);
  const [registradas, setRegistradas] = useState({});
  const [diaSemana, setDiaSemana] = useState(0);
  const rootRef = useRef(null);
  const detailRef = useRef(null);

  // Re-tap en la pestaña Recetario (señal del MealTracker): volver al
  // principio de la página — del detalle si hay receta abierta, o de la lista.
  useEffect(() => {
    if (!scrollSignal) return;
    const el = detailRef.current || rootRef.current;
    el?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [scrollSignal]);

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

  // Porción objetivo: por defecto la comida típica dentro de la meta; con
  // "adaptar a lo que me queda" (solo detalle), lo restante del día.
  const targetP = (slot, fit = false) => {
    if (fit) return remaining.p > 20 ? remaining.p : g.p * (SPLIT[slot] || 0.3);
    return g.p * (SPLIT[slot] || 0.3);
  };
  const hasEatenToday = (consumed?.kcal || 0) >= 50;

  const searching = query.trim().length > 0;
  const list = useMemo(() => {
    let recs = RECIPES;
    if (searching) {
      const q = norm(query);
      recs = RECIPES.filter(r => norm(r.name).includes(q) || r.main.some(i => norm(i.n).includes(q)) || r.season.some(s => norm(s).includes(q)));
    } else if (filterSlot !== 'todas') {
      recs = RECIPES.filter(r => slotMatches(r.slot, filterSlot));
    }
    const sorted = [...recs];
    if (sort === 'rapidos') sorted.sort((a, b) => META[a.id].min - META[b.id].min);
    else if (sort === 'economicos') sorted.sort((a, b) => META[a.id].cost - META[b.id].cost);
    else if (sort === 'proteina') sorted.sort((a, b) => b.totals.p - a.totals.p);
    return sorted.map(r => ({ recipe: r, sc: scale(r, targetP(r.slot)) }));
  }, [filterSlot, query, sort, remaining, g]);

  const open = openId ? RECIPES.find(r => r.id === openId) : null;
  const detail = useMemo(() => {
    if (!open) return null;
    if (manualK != null) return scale(open, open.totals.p * manualK);
    return scale(open, targetP(open.slot, fitRemaining));
  }, [open, manualK, fitRemaining, remaining, g]);
  // Factor de la porción SUGERIDA (sin ajuste manual): referencia del %
  const kSuggested = useMemo(() => open ? scale(open, targetP(open.slot, fitRemaining)).k : 1, [open, fitRemaining, remaining, g]);

  const handleRegister = () => {
    if (!open || !detail) return;
    haptic(15);
    onRegister?.(entradaDeReceta(open, detail, open.slot));
    setRegistered(true);
    setTimeout(() => { setRegistered(false); setOpenId(null); setManualK(null); setFitRemaining(false); }, 950);
  };

  // ── Menús: propuestas derivadas de la meta y los filtros ──
  const menuOpts = useMemo(() => ({ evitar, maxMin }), [evitar, maxMin]);
  const diaPropuesto = useMemo(() => generarDia(g, menuOpts, menuSeed), [g, menuOpts, menuSeed]);
  const semana = useMemo(() => generarSemana(g, menuOpts, menuSeed), [g, menuOpts, menuSeed]);
  // Los cambios a mano valen para ESA propuesta: al pedir otra o mover un
  // filtro se descartan, si no la pantalla mostraría un día que ya no existe.
  useEffect(() => { setDiaEdit(null); setRegistradas({}); }, [menuSeed, evitar, maxMin, g.kcal, g.p]);
  const diaActivo = diaEdit || diaPropuesto;

  const otraPropuesta = () => { haptic(8); setMenuSeed(Math.floor(Math.random() * 1e6) + 1); };
  const toggleEvitar = (a) => { haptic(4); setEvitar(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]); };
  const cambiarPlato = (slot) => { haptic(6); setDiaEdit(cambiarComida(diaActivo, slot, g, menuOpts, Date.now())); };

  const registrarComida = (c) => {
    haptic(15);
    onRegister?.(entradaDeReceta(c.recipe, c.sc, c.slot));
    setRegistradas(prev => ({ ...prev, [`${c.slot}:${c.recipe.id}`]: true }));
  };

  const guardarEsteMenu = (dia) => {
    if (!dia || !dia.comidas.length) return;
    const nombre = window.prompt('Ponle un nombre a este menú', `Menú del ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'short' })}`);
    if (nombre === null) return;                    // canceló
    guardarMenu(nombre, dia);
    setMisMenus(leerMenusGuardados());
    haptic(12);
    setMenuTab('mios');
  };
  const eliminarMenu = (id, nombre) => {
    if (!window.confirm(`¿Borrar "${nombre}"?`)) return;
    borrarMenu(id);
    setMisMenus(leerMenusGuardados());
  };

  const abrirMercado = (titulo, dias) => { haptic(8); setMercado({ titulo, dias }); };
  const copiarMercado = async () => {
    if (!mercado) return;
    const texto = listaMercadoTexto(listaMercado(mercado.dias), mercado.titulo);
    try {
      await navigator.clipboard.writeText(texto);
      haptic(12);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch (e) {
      // Sin permiso de portapapeles (Safari en algunos casos): al menos que
      // se pueda seleccionar y copiar a mano.
      window.prompt('Copia tu lista:', texto);
    }
  };

  const diaVacio = () => ({ comidas: [], totals: { kcal: 0, p: 0, c: 0, g: 0 }, desvio: desvioDe({ kcal: 0, p: 0, c: 0, g: 0 }, g) });
  const abrirArmador = (base) => { haptic(8); setArmando(base || diaVacio()); };

  const sectionLabel = (t) => <div className="text-[11px] tracking-[0.04em] uppercase font-semibold mb-2.5" style={{ color: ACCENT }}>{t}</div>;

  // ───────────────────────── DETALLE (overlay sobre la lista) ─────────────────────────
  // Sin header negro: vive BAJO la píldora de marca y la barra de navegación
  // del MealTracker (z-39 < 45/50), con los mismos fondos y difuminados de
  // las demás vistas. El "atrás" es un botón flotante circular arriba a la
  // derecha (la píldora ocupa la izquierda).
  const detailOverlay = (open && detail) ? (
      <div ref={detailRef} className="fixed inset-0 z-[39] overflow-y-auto rec-slide-in" style={{ background: BG, fontFamily: FONT_UI }}>
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: BG_STAINS }} />
        <div className="fixed left-0 right-0 top-0 pointer-events-none" style={{
          zIndex: 2,
          height: 'calc(env(safe-area-inset-top, 0px) + 66px)',
          background: 'linear-gradient(180deg, rgba(237,236,229,0.95) 25%, rgba(237,236,229,0.86) 55%, rgba(237,236,229,0) 100%)',
        }} />
        <div className="fixed left-0 right-0 bottom-0 pointer-events-none" style={{
          zIndex: 2,
          height: 'calc(168px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(0deg, #EDECE5 0%, #EDECE5 48%, rgba(237,236,229,0.72) 68%, rgba(237,236,229,0.32) 85%, rgba(237,236,229,0) 100%)',
        }} />
        <button
          onClick={() => { haptic(6); setOpenId(null); setManualK(null); setFitRemaining(false); }}
          aria-label="Volver al recetario"
          className="fixed rounded-full flex items-center justify-center active:scale-90 transition"
          style={{
            zIndex: 10,
            top: 'calc(env(safe-area-inset-top, 0px) + 10px)', right: '16px',
            width: '38px', height: '38px',
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 6px 18px rgba(60,70,50,0.16)',
          }}>
          <ChevronLeft size={20} style={{ color: TEXT }} />
        </button>

        <div className="relative max-w-xl mx-auto px-4 space-y-3.5" style={{
          zIndex: 1,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 58px)',
          paddingBottom: 'calc(170px + env(safe-area-inset-bottom, 0px))',
        }}>
          <div style={{ color: TEXT, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{open.name}</div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 46, height: 46, background: SURFACE_2, fontSize: 24 }}>{open.icon}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] tracking-[0.04em] uppercase font-bold px-2.5 py-1 rounded-full" style={{ background: ACCENT_PASTEL, color: ACCENT_DARK }}>{displaySlot(open.slot)}</span>
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
              <span>{fitRemaining ? `Adaptado a lo que te queda disponible hoy (${r0(remaining.kcal)} kcal · ${r0(remaining.p)}g de proteína).` : `Ajustado a tu ${displaySlot(open.slot).toLowerCase()} (~${Math.round((SPLIT[open.slot] || 0.3) * 100)}% de tu meta).`} Las porciones se recalculan solas si cambia tu meta.</span>
            </div>
            {/* Si YA registró comida hoy, la receta puede adaptarse a lo que
                le queda del día — la decisión vive AQUÍ, dentro de la receta,
                no en un modo global confuso de la lista. */}
            {/* Cantidad — sin slider técnico: botones simples de − / +
                sobre la porción sugerida (pasos de 15%, entre 50% y 200%).
                El donut y los totales de arriba se actualizan en vivo. */}
            <div className="flex items-center gap-2 mt-3">
              <div>
                <div className="text-[11.5px] font-semibold" style={{ color: TEXT_MUTED }}>Cantidad de la porción</div>
                <div className="text-[10.5px]" style={{ color: TEXT_LIGHT }}>La sugerida ya cuadra con tu meta</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => { haptic(6); const base = manualK ?? detail.k; setManualK(Math.max(kSuggested * 0.5, +(base / 1.15).toFixed(3))); }}
                  aria-label="Menos porción"
                  className="rounded-full flex items-center justify-center active:scale-90 transition font-bold"
                  style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.95)', color: TEXT, fontSize: 18, boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 3px 10px rgba(60,70,50,0.12)' }}>−</button>
                <span className="num text-[12.5px] font-bold" style={{ color: TEXT, minWidth: 42, textAlign: 'center' }}>
                  {manualK == null ? 'normal' : `${Math.round((manualK / (kSuggested || 1)) * 100)}%`}
                </span>
                <button
                  onClick={() => { haptic(6); const base = manualK ?? detail.k; setManualK(Math.min(kSuggested * 2, +(base * 1.15).toFixed(3))); }}
                  aria-label="Más porción"
                  className="rounded-full flex items-center justify-center active:scale-90 transition font-bold"
                  style={{ width: 34, height: 34, background: '#1F1F1F', color: '#FFF', fontSize: 17, boxShadow: '0 3px 10px rgba(0,0,0,0.2)' }}>+</button>
              </div>
            </div>
            {manualK != null && (
              <button onClick={() => { haptic(6); setManualK(null); }} className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>
                <RotateCcw size={11} /> Volver a la porción sugerida
              </button>
            )}
            {hasEatenToday && (
              <button
                onClick={() => { haptic(8); setManualK(null); setFitRemaining(f => !f); }}
                className="mt-3 w-full py-2.5 rounded-full text-[12.5px] font-semibold active:scale-[0.98] transition flex items-center justify-center gap-1.5"
                style={fitRemaining
                  ? { background: ACCENT_PASTEL, color: ACCENT_DARK }
                  : { background: 'rgba(255,255,255,0.9)', color: TEXT_MUTED, boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 3px 10px rgba(60,70,50,0.10)' }}>
                {fitRemaining
                  ? <><Check size={14} /> Adaptada a lo que te queda · volver a porción normal</>
                  : <>Adaptar a lo que me queda del día ({r0(remaining.kcal)} kcal)</>}
              </button>
            )}
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

        </div>

        {/* Botón de registrar ARRIBA de la barra de navegación (antes en
            bottom-0 quedaba escondido detrás de ella). El fade inferior de
            z-2 ya funde el contenido debajo. */}
        <div className="fixed left-0 right-0 px-4 z-10" style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-xl mx-auto">
            <button onClick={handleRegister} disabled={registered} className="w-full py-4 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition" style={{ background: '#1F1F1F', color: '#FFF', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
              {registered ? <><Check size={18} /> Registrado en tu día</> : 'Registrar en mi día'}
            </button>
          </div>
        </div>
      </div>
  ) : null;

  // Criterio de uso, arriba del todo: la receta es una guía, no una regla.
  // Es lo que evita que alguien abandone porque le faltó un ingrediente
  // secundario — y a la vez marca el límite (los primarios sostienen la receta).
  const avisoIngredientes = (
    <div className="rounded-[20px] px-3.5 py-3 flex gap-2.5" style={{
      background: 'rgba(255,255,255,0.82)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset, 0 6px 18px rgba(60,70,50,0.07)',
      borderLeft: `3px solid ${ACCENT}`,
    }}>
      <Info size={15} style={{ color: ACCENT, flexShrink: 0, marginTop: 1 }} />
      <div className="text-[11.5px] leading-[1.5]" style={{ color: TEXT_MUTED }}>
        <span className="font-bold" style={{ color: TEXT }}>Usa los ingredientes primarios.</span>{' '}
        Los secundarios puedes agregarlos u omitirlos según tu preferencia, manteniendo la{' '}
        <span className="font-semibold" style={{ color: ACCENT_DARK }}>esencia de la receta</span>.
      </div>
    </div>
  );

  // ───────────────────────── VISTA MENÚS ─────────────────────────
  // El recetario responde "qué cocino"; los menús responden "qué como hoy":
  // desayuno, almuerzo y cena que SUMADOS caen en la meta.
  const tabBtn = (k, label, activo, set) => (
    <button key={k} onClick={() => { haptic(4); set(k); }}
      className="text-[12.5px] whitespace-nowrap transition active:scale-95"
      style={{
        color: activo ? TEXT : TEXT_MUTED,
        fontWeight: activo ? 700 : 500,
        borderBottom: activo ? `2px solid ${ACCENT}` : '2px solid transparent',
        paddingBottom: '1px',
      }}>{label}</button>
  );

  const filtrosMenu = (
    <div className="space-y-2.5">
      <div>
        <div className="text-[10px] tracking-[0.05em] uppercase font-bold mb-1.5 px-1" style={{ color: TEXT_MUTED }}>Evitar en el menú</div>
        <div className="flex flex-wrap gap-1.5 px-1">
          {ALERGENOS.map(a => {
            const on = evitar.includes(a);
            return (
              <button key={a} onClick={() => toggleEvitar(a)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold active:scale-95 transition"
                style={{
                  background: on ? ACCENT : 'rgba(255,255,255,0.92)',
                  color: on ? '#fff' : TEXT_MUTED,
                  boxShadow: on ? 'none' : '0 1px 4px rgba(60,70,50,0.08)',
                }}>{on ? '✕ ' : ''}{a}</button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-[10px] tracking-[0.05em] uppercase font-bold mb-1 px-1" style={{ color: TEXT_MUTED }}>Tiempo máximo por receta</div>
        <div className="flex items-center flex-wrap px-1" style={{ rowGap: '6px' }}>
          {[{ v: 0, l: 'Sin límite' }, { v: 10, l: '10 min' }, { v: 15, l: '15 min' }, { v: 25, l: '25 min' }].map((o, i) => (
            <React.Fragment key={o.v}>
              {i > 0 && <span style={{ width: 1, height: 12, background: BORDER, margin: '0 9px', flexShrink: 0 }} />}
              <button onClick={() => { haptic(4); setMaxMin(o.v); }}
                className="text-[12.5px] whitespace-nowrap transition active:scale-95"
                style={{
                  color: maxMin === o.v ? TEXT : TEXT_MUTED,
                  fontWeight: maxMin === o.v ? 700 : 500,
                  borderBottom: maxMin === o.v ? `2px solid ${ACCENT}` : '2px solid transparent',
                  paddingBottom: '1px',
                }}>{o.l}</button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  const vistaMenus = (
    <>
      {/* Qué es esto, en dos líneas. Sin esto la gente no entendía que la
          sección son las MISMAS recetas repartidas en un día o una semana. */}
      <div className="rounded-[20px] p-3.5" style={cardStyle}>
        <div className="font-bold text-[15px]" style={{ color: TEXT }}>🗓️ Organiza qué comer</div>
        <div className="text-[12px] leading-[1.5] mt-1" style={{ color: TEXT_MUTED }}>
          Las mismas recetas, repartidas en desayuno, almuerzo y cena para que sumadas cuadren con tu meta.
          Sirve de <span className="font-semibold" style={{ color: ACCENT_DARK }}>guía</span> — no es obligatorio seguirla al pie de la letra.
        </div>
        <div className="mt-2.5 space-y-1">
          {[
            ['1', 'Elige un día suelto o la semana completa'],
            ['2', 'Cambia los platos que no te convenzan, o arma el tuyo'],
            ['3', 'Llévate la lista de mercado con todo lo que hay que comprar'],
          ].map(([n, txt]) => (
            <div key={n} className="flex items-start gap-2 text-[11.5px]" style={{ color: TEXT_MUTED }}>
              <span className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
                style={{ width: 16, height: 16, background: ACCENT_PASTEL, color: ACCENT_DARK, fontSize: 9, marginTop: 1 }}>{n}</span>
              <span>{txt}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center flex-wrap px-1" style={{ rowGap: '6px' }}>
        {[['dia', 'Un día'], ['semana', 'La semana'], ['mios', `Mis menús${misMenus.length ? ` (${misMenus.length})` : ''}`]].map(([k, l], i) => (
          <React.Fragment key={k}>
            {i > 0 && <span style={{ width: 1, height: 12, background: BORDER, margin: '0 9px', flexShrink: 0 }} />}
            {tabBtn(k, l, menuTab === k, setMenuTab)}
          </React.Fragment>
        ))}
      </div>

      {menuTab !== 'mios' && filtrosMenu}

      {/* ── UN DÍA ── */}
      {menuTab === 'dia' && (
        <div className="rounded-[22px] p-3.5 space-y-3" style={cardStyle}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[9.5px] font-bold tracking-[0.06em] uppercase" style={{ color: ACCENT }}>Propuesta del día</div>
              <div className="mt-1"><MenuTotales dia={diaActivo} g={g} /></div>
              <div className="text-[10.5px] mt-1" style={{ color: TEXT_LIGHT }}>Tu meta: {g.kcal} kcal · P{g.p} C{g.c} G{g.g}</div>
            </div>
            <button onClick={otraPropuesta}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11.5px] font-bold active:scale-95 transition flex-shrink-0"
              style={{ background: ACCENT_PASTEL, color: ACCENT_DARK }}>
              <RotateCcw size={13} /> Otro día
            </button>
          </div>

          <div className="space-y-2">
            {diaActivo.comidas.map(c => (
              <MenuComida key={c.slot} c={c}
                onAbrir={(id) => { haptic(8); setOpenId(id); setManualK(null); setFitRemaining(false); }}
                onCambiar={cambiarPlato}
                onRegistrar={registrarComida}
                registrada={!!registradas[`${c.slot}:${c.recipe.id}`]} />
            ))}
            {diaActivo.comidas.length === 0 && (
              <div className="text-center py-8 text-[13px]" style={{ color: TEXT_LIGHT }}>
                Con esos filtros no queda ninguna receta. Quita alguno para volver a ver propuestas.
              </div>
            )}
          </div>

          {diaActivo.comidas.length > 0 && (
            <>
              <button onClick={() => abrirMercado('Mercado del día', [diaActivo])}
                className="w-full py-2.5 rounded-2xl text-[12.5px] font-bold active:scale-[0.98] transition flex items-center justify-center gap-1.5"
                style={{ background: ACCENT, color: '#fff' }}>
                <ShoppingCart size={14} /> Ver lista de mercado
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => guardarEsteMenu(diaActivo)}
                  className="flex-1 py-2.5 rounded-2xl text-[12.5px] font-bold active:scale-[0.98] transition"
                  style={{ background: SURFACE_2, color: TEXT }}>Guardar este menú</button>
                <button onClick={() => abrirArmador(diaActivo)}
                  className="flex-1 py-2.5 rounded-2xl text-[12.5px] font-bold active:scale-[0.98] transition"
                  style={{ background: SURFACE_2, color: TEXT }}>Ajustarlo yo</button>
              </div>
              {/* El registro va al final a propósito: esto es una guía de qué
                  comer, no un formulario. Registrar es lo último, y solo si
                  de verdad te lo comiste. */}
              <div className="pt-1 mt-1" style={{ borderTop: `1px solid ${BORDER}` }}>
                <div className="text-[10.5px] leading-[1.5] pt-2" style={{ color: TEXT_LIGHT }}>
                  Toca un plato para ver la receta completa · <RotateCcw size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> cambia solo ese plato
                  <br />
                  <span style={{ color: TEXT_MUTED }}>¿Ya te lo comiste? El <Check size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> de cada comida la suma a tu día en el tracking.</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── LA SEMANA ── */}
      {menuTab === 'semana' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="text-[11px]" style={{ color: TEXT_MUTED }}>Siete días sin repetir plato de un día para otro.</div>
            <button onClick={otraPropuesta}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold active:scale-95 transition flex-shrink-0"
              style={{ background: ACCENT_PASTEL, color: ACCENT_DARK }}>
              <RotateCcw size={13} /> Otra semana
            </button>
          </div>
          <button onClick={() => abrirMercado('Mercado de la semana', semana)}
            className="w-full py-2.5 rounded-2xl text-[12.5px] font-bold active:scale-[0.98] transition flex items-center justify-center gap-1.5"
            style={{ background: ACCENT, color: '#fff' }}>
            <ShoppingCart size={14} /> Lista de mercado de los 7 días
          </button>
          {semana.map((d, i) => {
            const abierto = diaSemana === i;
            return (
              <div key={i} className="rounded-[20px] overflow-hidden" style={cardStyle}>
                <button onClick={() => { haptic(5); setDiaSemana(abierto ? -1 : i); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left active:scale-[0.995] transition">
                  <span className="font-bold text-[13.5px] flex-shrink-0" style={{ color: TEXT, minWidth: 74 }}>{DIAS_SEM[i]}</span>
                  <span className="flex-1 min-w-0">
                    {!abierto && (
                      <span className="block text-[11px] truncate" style={{ color: TEXT_MUTED }}>
                        {d.comidas.map(c => c.recipe.icon + ' ' + c.recipe.name).join(' · ')}
                      </span>
                    )}
                    {abierto && <MenuTotales dia={d} g={g} chico />}
                  </span>
                  <span className="num text-[11px] font-bold flex-shrink-0" style={{ color: TEXT_LIGHT }}>{r0(d.totals.kcal)}</span>
                </button>
                {abierto && (
                  <div className="px-3 pb-3 space-y-2">
                    {d.comidas.map(c => (
                      <MenuComida key={c.slot} c={c}
                        onAbrir={(id) => { haptic(8); setOpenId(id); setManualK(null); setFitRemaining(false); }}
                        onRegistrar={registrarComida}
                        registrada={!!registradas[`${c.slot}:${c.recipe.id}`]} />
                    ))}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button onClick={() => guardarEsteMenu(d)}
                        className="flex-1 py-2 rounded-2xl text-[12px] font-bold active:scale-[0.98] transition"
                        style={{ background: ACCENT, color: '#fff' }}>Guardar el {DIAS_SEM[i].toLowerCase()}</button>
                      <button onClick={() => abrirArmador(d)}
                        className="px-3 py-2 rounded-2xl text-[12px] font-bold active:scale-[0.98] transition"
                        style={{ background: SURFACE_2, color: TEXT }}>Ajustarlo</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MIS MENÚS ── */}
      {menuTab === 'mios' && (
        <div className="space-y-2.5">
          <button onClick={() => abrirArmador(null)}
            className="w-full py-3 rounded-2xl text-[13px] font-bold active:scale-[0.98] transition"
            style={{ background: ACCENT, color: '#fff' }}>+ Armar un menú desde cero</button>

          {misMenus.length === 0 && (
            <div className="text-center py-8 text-[12.5px] px-6" style={{ color: TEXT_LIGHT }}>
              Todavía no has guardado ninguno. Puedes armarlo tú desde cero, o guardar una propuesta de “Un día” y ajustarla a tu gusto.
            </div>
          )}

          {misMenus.map(m => {
            const d = menuADia(m, g);
            return (
              <div key={m.id} className="rounded-[20px] p-3.5 space-y-2.5" style={cardStyle}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-[14px] truncate" style={{ color: TEXT }}>{m.nombre}</div>
                    <div className="mt-1"><MenuTotales dia={d} g={g} chico /></div>
                  </div>
                  <button onClick={() => eliminarMenu(m.id, m.nombre)} aria-label="Borrar menú" title="Borrar menú"
                    className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 flex-shrink-0"
                    style={{ background: SURFACE_2, color: TEXT_MUTED }}><X size={15} /></button>
                </div>
                <div className="space-y-2">
                  {d.comidas.map(c => (
                    <MenuComida key={c.slot} c={c}
                      onAbrir={(id) => { haptic(8); setOpenId(id); setManualK(null); setFitRemaining(false); }}
                      onRegistrar={registrarComida}
                      registrada={!!registradas[`${c.slot}:${c.recipe.id}`]} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => abrirMercado(`Mercado · ${m.nombre}`, [d])}
                    className="flex-1 py-2 rounded-2xl text-[12px] font-bold active:scale-[0.98] transition flex items-center justify-center gap-1.5"
                    style={{ background: ACCENT, color: '#fff' }}><ShoppingCart size={13} /> Mercado</button>
                  <button onClick={() => abrirArmador(d)}
                    className="flex-1 py-2 rounded-2xl text-[12px] font-bold active:scale-[0.98] transition"
                    style={{ background: SURFACE_2, color: TEXT }}>Editar</button>
                </div>
              </div>
            );
          })}
          {misMenus.length > 0 && (
            <div className="text-[10.5px] text-center px-4" style={{ color: TEXT_LIGHT }}>
              Se guardan en este teléfono. Las porciones se recalculan solas si tu coach cambia tu meta.
            </div>
          )}
        </div>
      )}
    </>
  );

  // ── Lista de mercado (overlay) ──
  const mercadoOverlay = mercado ? (() => {
    const L = listaMercado(mercado.dias);
    return (
      <div className="fixed inset-0 z-[42] overflow-y-auto rec-slide-in" style={{ background: BG, fontFamily: FONT_UI }}>
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: BG_STAINS }} />
        <div className="relative max-w-xl mx-auto px-4 space-y-3" style={{
          zIndex: 1,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 62px)',
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
        }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[9.5px] font-bold tracking-[0.06em] uppercase" style={{ color: ACCENT }}>Lista de mercado</div>
              <div className="font-bold text-[19px] leading-tight" style={{ color: TEXT }}>{mercado.titulo}</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>
                {L.items.length} ingrediente{L.items.length === 1 ? '' : 's'} · cantidades ya sumadas de todas las comidas
              </div>
            </div>
            <button onClick={() => setMercado(null)} aria-label="Cerrar"
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 flex-shrink-0" style={{ ...plainCard, color: TEXT }}>
              <X size={17} />
            </button>
          </div>

          <button onClick={copiarMercado}
            className="w-full py-2.5 rounded-2xl text-[12.5px] font-bold active:scale-[0.98] transition flex items-center justify-center gap-1.5"
            style={{ background: copiado ? ACCENT_DARK : ACCENT, color: '#fff' }}>
            {copiado ? <><Check size={14} /> Copiada</> : <><Copy size={14} /> Copiar la lista</>}
          </button>

          <div className="rounded-[20px] p-3.5 space-y-1.5" style={cardStyle}>
            <div className="text-[10px] tracking-[0.05em] uppercase font-bold mb-1" style={{ color: ACCENT }}>Para comprar</div>
            {L.items.map(i => (
              <div key={i.n + i.u} className="flex items-baseline gap-2 py-1" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <span className="flex-1 min-w-0 text-[13px]" style={{ color: TEXT }}>{i.n}</span>
                <span className="num text-[13px] font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>{i.q} {i.u}</span>
              </div>
            ))}
            {L.items.length === 0 && <div className="text-[12.5px] py-2" style={{ color: TEXT_LIGHT }}>Este menú aún no tiene comidas.</div>}
          </div>

          {L.despensa.length > 0 && (
            <div className="rounded-[20px] p-3.5" style={plainCard}>
              <div className="text-[10px] tracking-[0.05em] uppercase font-bold mb-1.5" style={{ color: TEXT_MUTED }}>De despensa · revisa si te queda</div>
              <div className="text-[12px] leading-[1.6]" style={{ color: TEXT_MUTED }}>{L.despensa.join(' · ')}</div>
            </div>
          )}

          <div className="text-[10.5px] text-center px-4" style={{ color: TEXT_LIGHT }}>
            Las cantidades vienen redondeadas para comprar, no al gramo exacto. Si cambias un plato, vuelve a abrir la lista.
          </div>
        </div>
      </div>
    );
  })() : null;

  // ── Armador manual (overlay) ──
  const armadorOverlay = armando ? (
    <div className="fixed inset-0 z-[40] overflow-y-auto rec-slide-in" style={{ background: BG, fontFamily: FONT_UI }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: BG_STAINS }} />
      <div className="relative max-w-xl mx-auto px-4 space-y-3" style={{
        zIndex: 1,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 62px)',
        paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[9.5px] font-bold tracking-[0.06em] uppercase" style={{ color: ACCENT }}>Armar menú</div>
            <div className="font-bold text-[19px]" style={{ color: TEXT }}>Tu día, a tu manera</div>
          </div>
          <button onClick={() => setArmando(null)} aria-label="Cerrar"
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 flex-shrink-0" style={{ ...plainCard, color: TEXT }}>
            <X size={17} />
          </button>
        </div>

        <div className="rounded-[20px] p-3.5" style={cardStyle}>
          <MenuTotales dia={armando} g={g} />
          <div className="text-[10.5px] mt-1" style={{ color: TEXT_LIGHT }}>Tu meta: {g.kcal} kcal · P{g.p} C{g.c} G{g.g}</div>
        </div>

        <div className="space-y-2">
          {SLOT_ORDER.map(slot => {
            const c = armando.comidas.find(x => x.slot === slot);
            if (c) {
              return (
                <MenuComida key={slot} c={c}
                  onAbrir={(id) => { haptic(8); setOpenId(id); setManualK(null); setFitRemaining(false); }}
                  onCambiar={() => setPickerSlot(slot)}
                  onQuitar={(sl) => { haptic(6); setArmando(quitarComida(armando, sl, g)); }} />
              );
            }
            return (
              <button key={slot} onClick={() => { haptic(6); setPickerSlot(slot); }}
                className="w-full rounded-2xl px-3.5 py-3 text-left active:scale-[0.99] transition flex items-center gap-2"
                style={{ background: 'rgba(255,255,255,0.55)', border: `1.5px dashed ${BORDER}` }}>
                <span className="text-[9.5px] font-bold tracking-[0.05em] uppercase" style={{ color: ACCENT }}>{SLOT_LABELS[slot]}</span>
                <span className="text-[12.5px] font-semibold ml-auto" style={{ color: TEXT_MUTED }}>+ Elegir receta</span>
              </button>
            );
          })}
        </div>

        <button onClick={() => { guardarEsteMenu(armando); setArmando(null); }}
          disabled={!armando.comidas.length}
          className="w-full py-3 rounded-2xl text-[13px] font-bold active:scale-[0.98] transition"
          style={{ background: armando.comidas.length ? ACCENT : BORDER, color: '#fff' }}>
          Guardar menú
        </button>
        <div className="text-[10.5px] text-center" style={{ color: TEXT_LIGHT }}>
          Cada receta se ajusta sola al tamaño que le toca dentro de tu meta.
        </div>
      </div>
      {pickerSlot && (
        <SlotPicker slot={pickerSlot} g={g} opts={menuOpts}
          onElegir={(id) => { setArmando(ponerComida(armando, pickerSlot, id, g)); setPickerSlot(null); }}
          onCerrar={() => setPickerSlot(null)} />
      )}
    </div>
  ) : null;

  // ───────────────────────── LISTA ─────────────────────────
  return (
    // z-38: DEBAJO de la barra de navegación inferior (z-45) y de la
    // píldora de marca (z-50) del MealTracker — navegar desde la barra
    // cierra el Recetario, así que aquí no hay botón "atrás". El fondo usa
    // el mismo degradado orgánico de la vista Hoy (una sola app).
    <div ref={rootRef} className="fixed inset-0 z-[38] overflow-y-auto rec-slide-in" style={{ background: BG, fontFamily: FONT_UI }}>
      {/* Mismo degradado orgánico de la vista Hoy — capa fixed aparte (iOS
          ignora background-attachment en contenedores con scroll). */}
      <div className="fixed inset-0 pointer-events-none" style={{
        zIndex: 0,
        background: BG_STAINS,
      }} />
      {/* DIFUMINADOS de scroll: el contenido se desvanece bajo la píldora de
          marca (arriba) y antes de la barra de navegación (abajo) en lugar de
          "chocar" con ellas. zIndex 2 > contenido (1); la píldora y la barra
          viven en el MealTracker por encima de todo el Recetario. */}
      <div className="fixed left-0 right-0 top-0 pointer-events-none" style={{
        zIndex: 2,
        height: 'calc(env(safe-area-inset-top, 0px) + 66px)',
        background: 'linear-gradient(180deg, #EDECE5 25%, rgba(237,236,229,0.88) 55%, rgba(237,236,229,0) 100%)',
      }} />
      <div className="fixed left-0 right-0 bottom-0 pointer-events-none" style={{
        zIndex: 2,
        height: 'calc(128px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(0deg, #EDECE5 0%, #EDECE5 48%, rgba(237,236,229,0.72) 68%, rgba(237,236,229,0.32) 85%, rgba(237,236,229,0) 100%)',
      }} />
      <style>{`
        .rec-range { -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:999px; background:${BORDER}; outline:none; }
        .rec-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:24px; height:24px; border-radius:50%; background:#1F1F1F; border:3px solid #fff; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.3); }
        .rec-range::-moz-range-thumb { width:24px; height:24px; border-radius:50%; background:#1F1F1F; border:3px solid #fff; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.3); }
        button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        @keyframes recSlideIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .rec-slide-in { animation: recSlideIn 0.24s cubic-bezier(0.2, 0, 0, 1); }
      `}</style>
      {/* Sin header negro ni botón "atrás": la píldora de marca flota arriba
          (viene del MealTracker) y se vuelve con la barra de navegación.
          El paddingTop despeja esa píldora; el paddingBottom, la barra. */}
      {/* Portada del recetario: una franja de foto de extremo a extremo, baja
          (150px) para no robarle sitio a las recetas. La imagen va en
          public/recetario-hero.jpg; si no está, queda el degradado oliva y
          nada se rompe. El texto va encima, siempre legible. */}
      <div className="relative w-full overflow-hidden" style={{
        zIndex: 1,
        height: 'calc(env(safe-area-inset-top, 0px) + 150px)',
        background: 'linear-gradient(135deg, #3A4126 0%, #4A5238 55%, #6B7350 100%)',
      }}>
        <img
          src="/recetario-hero.jpg"
          alt=""
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center center',
            filter: 'saturate(0.86) brightness(0.82)',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(18,18,17,0.34) 0%, rgba(18,18,17,0.48) 55%, rgba(18,18,17,0.62) 100%)',
        }} />
        <div className="relative max-w-xl mx-auto px-4 h-full flex flex-col justify-end" style={{
          paddingBottom: '16px',
        }}>
          <div className="text-[10.5px] font-bold uppercase" style={{ color: '#DCE2C4', letterSpacing: '0.16em', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Entrena con Método</div>
          <div style={{
            color: '#FFFFFF', fontFamily: FONT_DISPLAY, fontWeight: 400,
            fontSize: '34px', letterSpacing: '0.02em', marginTop: '4px', lineHeight: 0.96,
            textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 4px 24px rgba(0,0,0,0.55)',
          }}>Recetario</div>
          <div style={{ width: 44, height: 2, borderRadius: 2, background: ACCENT_PASTEL, marginTop: 8, opacity: 0.9 }} />
        </div>
      </div>

      <div className="relative max-w-xl mx-auto px-4 space-y-3.5" style={{
        zIndex: 1,
        paddingTop: '16px',
        paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 0px))',
      }}>
        {/* Meta nutricional — píldora compacta de UNA fila (la meta la
            administra el coach desde el CRM; aquí solo se consulta). */}
        <div className="rounded-full px-4 py-2.5 flex items-center gap-2" style={cardStyle}>
          <span className="text-[9.5px] tracking-[0.05em] uppercase font-bold flex-shrink-0" style={{ color: ACCENT }}>Tu meta de hoy</span>
          <div className="ml-auto flex items-center gap-2.5 num text-[12px] font-bold whitespace-nowrap">
            <span style={{ color: TEXT }}>{g.kcal}<span className="text-[9px] font-semibold" style={{ color: TEXT_LIGHT }}> kcal</span></span>
            <span style={{ color: C_PROTEIN }}>P{g.p}</span>
            <span style={{ color: C_CARBS }}>C{g.c}</span>
            <span style={{ color: C_FAT }}>G{g.g}</span>
          </div>
        </div>

        {/* Portada: DOS caminos y nada más. Antes se entraba a un muro de
            buscador, filtros y tarjetas y no se sabía por dónde empezar.
            Ahora se elige primero qué se viene a hacer. */}
        {vista === 'inicio' && (
          <>
            {avisoIngredientes}
            <button onClick={() => { haptic(8); setVista('recetas'); }}
              className="w-full text-left rounded-[22px] p-4 active:scale-[0.99] transition flex items-center gap-3.5"
              style={cardStyle}>
              <span className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{ width: 52, height: 52, background: SURFACE_2, fontSize: 26 }}>🍳</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[16px]" style={{ color: TEXT }}>Recetas</span>
                <span className="block text-[12px] leading-[1.45] mt-0.5" style={{ color: TEXT_MUTED }}>
                  Busca una receta y cocínala. {RECIPES.length} recetas, cada una ajustada al tamaño que le toca dentro de tu meta.
                </span>
              </span>
              <span style={{ color: TEXT_LIGHT, transform: 'rotate(180deg)', flexShrink: 0 }}><ChevronLeft size={20} /></span>
            </button>

            <button onClick={() => { haptic(8); setVista('menus'); }}
              className="w-full text-left rounded-[22px] p-4 active:scale-[0.99] transition flex items-center gap-3.5"
              style={cardStyle}>
              <span className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{ width: 52, height: 52, background: ACCENT_PASTEL, fontSize: 26 }}>🗓️</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[16px]" style={{ color: TEXT }}>Organiza tu día o tu semana</span>
                <span className="block text-[12px] leading-[1.45] mt-0.5" style={{ color: TEXT_MUTED }}>
                  Esas mismas recetas repartidas en desayuno, almuerzo y cena — para saber qué comer y llevarte la lista de mercado.
                </span>
              </span>
              <span style={{ color: TEXT_LIGHT, transform: 'rotate(180deg)', flexShrink: 0 }}><ChevronLeft size={20} /></span>
            </button>

            <div className="text-[11px] text-center px-4 pt-1" style={{ color: TEXT_LIGHT }}>
              Puedes moverte entre las dos cuando quieras.
            </div>
          </>
        )}

        {vista !== 'inicio' && (
          <button onClick={() => { haptic(5); setVista('inicio'); }}
            className="flex items-center gap-1 text-[12.5px] font-semibold active:scale-95 transition self-start"
            style={{ color: TEXT_MUTED }}>
            <ChevronLeft size={15} /> Recetario
          </button>
        )}

        {vista === 'recetas' && avisoIngredientes}

        {vista === 'menus' && vistaMenus}

        {vista === 'recetas' && (<>
        {/* Buscador */}
        <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={plainCard}>
          <Search size={16} style={{ color: TEXT_LIGHT, flexShrink: 0 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar receta o ingrediente…" className="flex-1 bg-transparent outline-none text-[14px]" style={{ color: TEXT }} />
          {query && <button onClick={() => setQuery('')} className="p-0.5 rounded-full active:scale-90"><X size={15} style={{ color: TEXT_LIGHT }} /></button>}
        </div>

        {/* El toggle de modo se eliminó: todas las recetas vienen ajustadas
            a su comida dentro de la meta, y "adaptar a lo que me queda hoy"
            vive dentro de cada receta cuando ya se registró comida. Menos
            botones = un solo camino claro: busca o filtra, y abre. */}

        {/* Filtros como TEXTO clicable separado por líneas — ya había
            demasiados rectángulos ovalados y confundían. La opción activa
            va en grafito con subrayado oliva; el resto en gris. Todo cabe
            sin scroll horizontal hasta en un iPhone SE. */}
        {!searching && (
          <>
            <div>
              <div className="text-[10px] tracking-[0.05em] uppercase font-bold mb-1 px-1" style={{ color: TEXT_MUTED }}>Filtrar según tipo de comida</div>
              <div className="flex items-center flex-wrap px-1" style={{ rowGap: '6px' }}>
                {SLOT_FILTERS.map((f, i) => (
                  <React.Fragment key={f.key}>
                    {i > 0 && <span style={{ width: 1, height: 12, background: BORDER, margin: '0 9px', flexShrink: 0 }} />}
                    <button onClick={() => { haptic(4); setFilterSlot(f.key); }}
                      className="text-[12.5px] whitespace-nowrap transition active:scale-95"
                      style={{
                        color: filterSlot === f.key ? TEXT : TEXT_MUTED,
                        fontWeight: filterSlot === f.key ? 700 : 500,
                        borderBottom: filterSlot === f.key ? `2px solid ${ACCENT}` : '2px solid transparent',
                        paddingBottom: '1px',
                      }}>{f.label}</button>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.05em] uppercase font-bold mb-1 px-1" style={{ color: TEXT_MUTED }}>Ordenar según</div>
              <div className="flex items-center flex-wrap px-1" style={{ rowGap: '6px' }}>
                {[{ k: 'reco', l: 'Recomendadas' }, { k: 'rapidos', l: 'Rápidas' }, { k: 'economicos', l: 'Económicas' }, { k: 'proteina', l: 'Alta proteína' }].map((o, i) => (
                  <React.Fragment key={o.k}>
                    {i > 0 && <span style={{ width: 1, height: 12, background: BORDER, margin: '0 9px', flexShrink: 0 }} />}
                    <button onClick={() => { haptic(4); setSort(o.k); }}
                      className="text-[12.5px] whitespace-nowrap transition active:scale-95"
                      style={{
                        color: sort === o.k ? TEXT : TEXT_MUTED,
                        fontWeight: sort === o.k ? 700 : 500,
                        borderBottom: sort === o.k ? `2px solid ${ACCENT}` : '2px solid transparent',
                        paddingBottom: '1px',
                      }}>{o.l}</button>
                  </React.Fragment>
                ))}
              </div>
            </div>
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
                setFitRemaining(false);
              })}
              onClick={(e) => e.preventDefault()}
              className="w-full text-left rounded-[20px] p-3 active:scale-[0.99] transition flex items-center gap-3"
              style={{ ...cardStyle, touchAction: 'manipulation' }}>
              <div className="flex items-center justify-center rounded-xl" style={{ width: 46, height: 46, background: SURFACE_2, fontSize: 24, flexShrink: 0 }}>{recipe.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14.5px] truncate" style={{ color: TEXT }}>{recipe.name}</div>
                <div className="flex items-center gap-2 text-[10.5px] mt-1" style={{ color: TEXT_MUTED }}>
                  <span className="px-2 py-0.5 rounded-full font-bold tracking-[0.03em] uppercase" style={{ background: ACCENT_PASTEL, color: ACCENT_DARK, fontSize: 10 }}>{displaySlot(recipe.slot)}</span>
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
            Cada receta se ajusta a su comida dentro de tu meta — y al abrirla puedes adaptarla a lo que te queda del día
          </div>
        )}
        </>)}
      </div>
      {mercadoOverlay}
      {armadorOverlay}
      {detailOverlay}
    </div>
  );
}
