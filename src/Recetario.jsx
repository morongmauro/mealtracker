import React, { useState, useMemo } from 'react';
import { ChevronLeft, Search, SlidersHorizontal as Sliders, RotateCcw, Check, Info, Clock, AlertTriangle, X } from 'lucide-react';

// ── Paleta y tokens espejo de MealTracker ──
const ACCENT = '#8A9558';
const ACCENT_DARK = '#4A5238';
const ACCENT_PASTEL = '#D4DAB8';
const ACCENT_LIGHT = '#F1F3E5';
const C_PROTEIN = '#D77A61';
const C_CARBS = '#D4B581';
const C_FAT = '#6B7A8F';
const BG = '#F9F7F1';
const SURFACE = '#FFFFFF';
const SURFACE_2 = '#EFEBE0';
const BORDER = '#E2DECC';
const TEXT = '#1F1F1F';
const TEXT_MUTED = '#6B6B6B';
const TEXT_LIGHT = '#9A9A9A';
const FONT_UI = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
const GLASS_BG = 'rgba(255,255,255,0.72)';
const GLASS_BORDER = '1px solid rgba(255,255,255,0.85)';
const GLASS_SHADOW = '0 1px 0 rgba(255,255,255,0.7) inset, 0 10px 30px rgba(60,70,50,0.10), 0 2px 8px rgba(60,70,50,0.05)';

const haptic = (p = 10) => { if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(p); };
const r0 = (n) => Math.round(Number(n) || 0);
const round5 = (n) => Math.round((Number(n) || 0) / 5) * 5;
const roundHalf = (n) => Math.round((Number(n) || 0) * 2) / 2;
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const SPLIT = { desayuno: 0.25, almuerzo: 0.35, cena: 0.30, snack: 0.10 };
const SLOT_LABELS = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena', snack: 'Snack' };
const SLOT_ORDER = ['desayuno', 'almuerzo', 'cena', 'snack'];

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
    if (i.u === 'g') q = round5(q);
    else if (i.u === 'unidades') q = Math.max(1, Math.round(q));
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

const cardStyle = { background: GLASS_BG, backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', border: GLASS_BORDER, boxShadow: GLASS_SHADOW };
const plainCard = { background: SURFACE, border: `1px solid ${BORDER}` };

export default function Recetario({ goals, consumed, onClose, onRegister, onChangeGoal }) {
  const [mode, setMode] = useState('comida');
  const [filterSlot, setFilterSlot] = useState('todas');
  const [sort, setSort] = useState('reco'); // reco | rapidos | economicos | proteina
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [manualK, setManualK] = useState(null);
  const [registered, setRegistered] = useState(false);

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
      recs = RECIPES.filter(r => r.slot === filterSlot);
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

  const blobs = (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <div className="absolute" style={{ top: '-12%', left: '-18%', width: '72%', height: '52%', background: 'radial-gradient(circle, rgba(247,243,232,0.95), transparent 65%)', filter: 'blur(70px)' }} />
      <div className="absolute" style={{ top: '2%', right: '-22%', width: '60%', height: '50%', background: `radial-gradient(circle, ${ACCENT_PASTEL}55, transparent 65%)`, filter: 'blur(85px)' }} />
      <div className="absolute" style={{ top: '40%', left: '4%', width: '55%', height: '46%', background: `radial-gradient(circle, #F2CBBE40, transparent 70%)`, filter: 'blur(90px)' }} />
      <div className="absolute" style={{ bottom: '4%', right: '-12%', width: '52%', height: '46%', background: `radial-gradient(circle, #CDD2DB38, transparent 70%)`, filter: 'blur(95px)' }} />
    </div>
  );

  const sectionLabel = (t) => <div className="text-[11px] tracking-[0.16em] uppercase font-semibold mb-2.5" style={{ color: ACCENT }}>{t}</div>;

  // ───────────────────────── DETALLE ─────────────────────────
  if (open && detail) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ background: BG, fontFamily: FONT_UI }}>
        {blobs}
        <div className="sticky top-0 z-20 flex items-center gap-2 px-4 py-3" style={{ background: '#1F1F1F', color: '#FFF' }}>
          <button onClick={() => { haptic(6); setOpenId(null); setManualK(null); }} className="p-1.5 -ml-1.5 rounded-full active:scale-90"><ChevronLeft size={22} /></button>
          <span className="font-semibold text-[15px] truncate">{open.name}</span>
        </div>

        <div className="relative max-w-xl mx-auto px-4 pt-4 pb-32 space-y-3.5" style={{ zIndex: 1 }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 46, height: 46, background: SURFACE_2, fontSize: 24 }}>{open.icon}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] tracking-[0.16em] uppercase font-bold px-2.5 py-1 rounded-full" style={{ background: ACCENT_PASTEL, color: ACCENT_DARK }}>{SLOT_LABELS[open.slot]}</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: SURFACE_2, color: TEXT_MUTED }}><Clock size={11} /> {open.time}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: SURFACE_2, color: TEXT_MUTED }}><CostTag cost={META[open.id].cost} /> {COST_LABELS[META[open.id].cost]}</span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: SURFACE_2, color: TEXT_MUTED }}>{META[open.id].diff}</span>
              {isHighProtein(open) && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#F7E3DC', color: C_PROTEIN }}>Alta proteína</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full w-fit" style={{ background: '#FBEEE8', color: '#B8732B' }}><AlertTriangle size={11} /> Contiene: {open.allergens.join(', ')}</div>

          {/* Tu porción */}
          <div className="rounded-3xl p-4" style={cardStyle}>
            {sectionLabel('Tu porción')}
            <div className="flex items-center gap-4">
              <MacroDonut totals={detail.totals} size={92} />
              <MacroLegend totals={detail.totals} />
            </div>
            <div className="text-[11.5px] mt-3 flex items-start gap-1.5" style={{ color: TEXT_MUTED }}>
              <Info size={13} style={{ color: ACCENT, marginTop: 1, flexShrink: 0 }} />
              <span>{mode === 'dia' ? 'Ajustado a lo que te queda hoy.' : `Ajustado a tu ${SLOT_LABELS[open.slot].toLowerCase()} (~${Math.round((SPLIT[open.slot] || 0.3) * 100)}% de tu meta).`} Las porciones se recalculan solas si cambia tu meta.</span>
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
          <div className="rounded-3xl p-4" style={plainCard}>
            {sectionLabel('Para realzar')}
            {open.season.map((s, idx) => (
              <div key={idx} className="flex items-start gap-2 py-1 text-[13.5px]" style={{ color: TEXT }}>
                <span style={{ color: ACCENT, lineHeight: 1.2 }}>·</span><span>{s}</span>
              </div>
            ))}
          </div>

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
            <input type="range" min="0.5" max="2" step="0.05" value={manualK ?? detail.k} onChange={(e) => setManualK(parseFloat(e.target.value))} className="w-full" style={{ accentColor: TEXT }} />
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
    );
  }

  // ───────────────────────── LISTA ─────────────────────────
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ background: BG, fontFamily: FONT_UI }}>
      {blobs}
      <div className="sticky top-0 z-20 px-4 py-3" style={{ background: '#1F1F1F', color: '#FFF' }}>
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <button onClick={() => { haptic(6); onClose?.(); }} className="flex items-center gap-1 p-1.5 -ml-1.5 rounded-full active:scale-90">
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
                <div className="text-[9.5px] uppercase tracking-wider font-semibold mt-1" style={{ color: TEXT_MUTED }}>{m.l}</div>
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
          <>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {['todas', ...SLOT_ORDER].map(s => (
                <button key={s} onClick={() => { haptic(4); setFilterSlot(s); }} className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition" style={{ background: filterSlot === s ? '#1F1F1F' : SURFACE, color: filterSlot === s ? '#FFF' : TEXT_MUTED, border: `1px solid ${filterSlot === s ? '#1F1F1F' : BORDER}` }}>{s === 'todas' ? 'Todas' : SLOT_LABELS[s]}</button>
              ))}
            </div>
            <div className="-mt-1.5 px-1 text-[11.5px]" style={{ color: TEXT_MUTED }}>
              <b style={{ color: TEXT }}>Desayuno, almuerzo, cena y snack</b> son sugerencias del momento ideal para cada receta — válidas cuando te queden mejor. Lo importante es que sea balanceada y alineada a tu meta.
            </div>
          </>
        )}

        {/* Filtros rápidos / ordenar */}
        {!searching && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[{ k: 'reco', l: 'Recomendado' }, { k: 'rapidos', l: '⚡ Más rápidos' }, { k: 'economicos', l: '💰 Más económicos' }, { k: 'proteina', l: '💪 Alta proteína' }].map(o => (
                <button key={o.k} onClick={() => { haptic(4); setSort(o.k); }} className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition" style={{ background: sort === o.k ? '#1F1F1F' : SURFACE, color: sort === o.k ? '#FFF' : TEXT_MUTED, border: `1px solid ${sort === o.k ? '#1F1F1F' : BORDER}` }}>{o.l}</button>
              ))}
            </div>
            <div className="-mt-1.5 px-1 text-[11.5px]" style={{ color: TEXT_MUTED }}>{SORT_NOTES[sort]}</div>
          </>
        )}

        {/* Cards */}
        <div className="space-y-2.5">
          {list.map(({ recipe, sc }) => (
            <button key={recipe.id} onClick={() => { haptic(8); setOpenId(recipe.id); setManualK(null); }} className="w-full text-left rounded-2xl p-3 active:scale-[0.99] transition flex items-center gap-3" style={cardStyle}>
              <div className="flex items-center justify-center rounded-xl" style={{ width: 46, height: 46, background: SURFACE_2, fontSize: 24, flexShrink: 0 }}>{recipe.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14.5px] truncate" style={{ color: TEXT }}>{recipe.name}</div>
                <div className="flex items-center gap-2 text-[10.5px] mt-1" style={{ color: TEXT_MUTED }}>
                  <span className="px-2 py-0.5 rounded-full font-bold tracking-[0.12em] uppercase" style={{ background: ACCENT_PASTEL, color: ACCENT_DARK, fontSize: 9 }}>{SLOT_LABELS[recipe.slot]}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {recipe.time}</span>
                  <CostTag cost={META[recipe.id].cost} />
                  {isHighProtein(recipe) && <span className="font-semibold" style={{ color: C_PROTEIN, fontSize: 9.5 }}>· Alta proteína</span>}
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
              {searching ? `Sin resultados para “${query}”.` : `Aún no hay recetas sugeridas para ${SLOT_LABELS[filterSlot]?.toLowerCase() || 'esta comida'}. Pronto agregamos más.`}
            </div>
          )}
        </div>

        {!searching && (
          <div className="text-[11px] text-center pt-1" style={{ color: TEXT_LIGHT }}>
            {mode === 'dia' ? `Ajustadas a lo que te queda hoy · ${r0(remaining.p)}g proteína · ${r0(remaining.kcal)} kcal` : 'Cada receta se ajusta a su comida dentro de tu meta'}
          </div>
        )}
      </div>
    </div>
  );
}
