// ─────────────────────────────────────────────────────────────────────────
// TABLA CANÓNICA DE ALIMENTOS — la capa determinística del tracker.
//
// El problema que resuelve: la IA estima macros "de memoria" (valores tipo
// USDA aprendidos), y la memoria varía entre consultas — la misma "arepa
// mediana" daba 140 kcal un día y 155 otro, para un cliente 137 y para su
// novia 150. Individualmente es ruido (±5-10%), pero sumado en 4 comidas
// son 100-150 kcal/día de baile.
//
// La solución: los alimentos BÁSICOS de esta tabla tienen macros FIJOS
// (por 100 g, cocidos donde aplica, referencia USDA FoodData Central).
// Cuando el modelo devuelve un item cuyo nombre coincide con la tabla y
// su cantidad es determinable (gramos explícitos o unidades con peso
// estándar), los macros se RECALCULAN desde aquí — el mismo número para
// todos los clientes, todos los días. Lo que no está en la tabla (platos
// compuestos, comida de restaurante) lo sigue estimando la IA con
// temperature 0.
//
// CÓMO EDITARLA (coach): agrega o ajusta entradas libremente. `per100` son
// macros por 100 g; `unidad` es el peso en gramos de UNA unidad natural
// del alimento (1 huevo, 1 arepa...) para cuando el cliente no da gramos;
// `aliases` son los nombres con los que el modelo/cliente suele llamarlo
// (en minúscula, sin tildes no hace falta — se normaliza solo). El match
// es EXACTO contra nombre o alias: mejor pocos alias correctos que
// contains() adivinando ("arroz con leche" NO debe matchear "arroz").
// ─────────────────────────────────────────────────────────────────────────

export const FOODS = {
  // ── Proteínas animales (cocidas) ──
  'pechuga de pollo': { per100: { kcal: 165, p: 31, c: 0, g: 3.6 }, aliases: ['pollo', 'pechuga', 'pollo a la plancha', 'pechuga de pollo a la plancha', 'pollo cocido', 'pechuga cocida', 'pollo desmechado', 'pechuga de pollo cocida'] },
  'muslo de pollo': { per100: { kcal: 209, p: 26, c: 0, g: 11 }, aliases: ['muslo', 'pierna de pollo', 'contramuslo', 'pernil de pollo'] },
  'carne de res magra': { per100: { kcal: 217, p: 26, c: 0, g: 12 }, aliases: ['carne de res', 'carne', 'res', 'carne magra', 'carne asada', 'carne desmechada', 'carne molida magra'] },
  'lomo de cerdo': { per100: { kcal: 196, p: 27, c: 0, g: 9 }, aliases: ['cerdo', 'lomo de cerdo cocido', 'cerdo magro'] },
  'pescado blanco': { per100: { kcal: 128, p: 26, c: 0, g: 2.7 }, aliases: ['tilapia', 'mojarra', 'merluza', 'pescado', 'filete de pescado', 'basa'] },
  'salmon': { per100: { kcal: 206, p: 22, c: 0, g: 12 }, aliases: ['salmón', 'salmon cocido', 'salmón a la plancha'] },
  'atun en agua': { per100: { kcal: 116, p: 26, c: 0, g: 1 }, aliases: ['atún', 'atun', 'atún en agua', 'atun en lata', 'atún en lata', 'lata de atún'] },
  'camarones': { per100: { kcal: 99, p: 24, c: 0.2, g: 0.3 }, aliases: ['camarón', 'camaron', 'camarones cocidos'] },
  'huevo': { per100: { kcal: 143, p: 12.6, c: 0.7, g: 9.5 }, unidad: 50, aliases: ['huevos', 'huevo entero', 'huevo cocido', 'huevo revuelto', 'huevos revueltos', 'huevo frito', 'huevos cocidos'] },
  'clara de huevo': { per100: { kcal: 52, p: 11, c: 0.7, g: 0.2 }, unidad: 33, aliases: ['claras', 'clara', 'claras de huevo'] },
  'jamon de pavo': { per100: { kcal: 104, p: 17, c: 2, g: 3 }, aliases: ['jamón de pavo', 'pechuga de pavo', 'jamón de pechuga de pavo', 'tajada de jamón de pavo'] },

  // ── Carbohidratos (cocidos) ──
  'arroz blanco cocido': { per100: { kcal: 130, p: 2.7, c: 28, g: 0.3 }, aliases: ['arroz', 'arroz blanco', 'arroz cocido'] },
  'arroz integral cocido': { per100: { kcal: 123, p: 2.7, c: 25.6, g: 1 }, aliases: ['arroz integral'] },
  'pasta cocida': { per100: { kcal: 158, p: 5.8, c: 31, g: 0.9 }, aliases: ['pasta', 'espagueti', 'spaguetti', 'macarrones', 'fideos'] },
  'papa cocida': { per100: { kcal: 87, p: 1.9, c: 20, g: 0.1 }, aliases: ['papa', 'papas', 'papa salada', 'papas cocidas', 'papa al vapor'] },
  'papa criolla cocida': { per100: { kcal: 85, p: 2, c: 19, g: 0.1 }, aliases: ['papa criolla', 'papas criollas'] },
  'yuca cocida': { per100: { kcal: 160, p: 1.4, c: 38, g: 0.3 }, aliases: ['yuca'] },
  'platano maduro cocido': { per100: { kcal: 122, p: 0.8, c: 32, g: 0.2 }, aliases: ['plátano', 'platano', 'plátano maduro', 'tajadas de maduro', 'maduro'] },
  'arepa de maiz': { per100: { kcal: 220, p: 4.6, c: 45, g: 1.8 }, unidad: 75, aliases: ['arepa', 'arepas', 'arepa blanca', 'arepa de maíz', 'arepa asada'] },
  'pan blanco': { per100: { kcal: 265, p: 9, c: 49, g: 3.2 }, unidad: 30, aliases: ['pan', 'tajada de pan', 'pan tajado'] },
  'pan integral': { per100: { kcal: 247, p: 13, c: 41, g: 3.4 }, unidad: 30, aliases: ['tostada integral', 'pan tajado integral', 'tajada de pan integral', 'tostada de pan integral'] },
  'avena en hojuelas': { per100: { kcal: 379, p: 13, c: 67, g: 6.5 }, aliases: ['avena', 'hojuelas de avena', 'avena cruda'] },
  'frijoles cocidos': { per100: { kcal: 127, p: 8.7, c: 22.8, g: 0.5 }, aliases: ['frijol', 'frijoles', 'fríjoles', 'frijoles rojos'] },
  'lentejas cocidas': { per100: { kcal: 116, p: 9, c: 20, g: 0.4 }, aliases: ['lentejas', 'lenteja'] },
  'garbanzos cocidos': { per100: { kcal: 164, p: 8.9, c: 27, g: 2.6 }, aliases: ['garbanzos', 'garbanzo'] },
  'maiz cocido': { per100: { kcal: 96, p: 3.4, c: 21, g: 1.5 }, aliases: ['maíz', 'maiz', 'maíz al vapor', 'maiz al vapor', 'maíz dulce', 'mazorca desgranada'] },
  'quinua cocida': { per100: { kcal: 120, p: 4.4, c: 21, g: 1.9 }, aliases: ['quinua', 'quinoa'] },
  'galleta de arroz': { per100: { kcal: 387, p: 8, c: 82, g: 3 }, unidad: 9, aliases: ['galletas de arroz', 'tortitas de arroz'] },

  // ── Frutas y verduras ──
  'banano': { per100: { kcal: 89, p: 1.1, c: 23, g: 0.3 }, unidad: 120, aliases: ['banana', 'bananos', 'guineo'] },
  'manzana': { per100: { kcal: 52, p: 0.3, c: 14, g: 0.2 }, unidad: 180, aliases: ['manzanas'] },
  'naranja': { per100: { kcal: 47, p: 0.9, c: 12, g: 0.1 }, unidad: 130, aliases: ['naranjas', 'mandarina', 'mandarinas'] },
  'fresas': { per100: { kcal: 32, p: 0.7, c: 7.7, g: 0.3 }, aliases: ['fresa', 'frutillas'] },
  'papaya': { per100: { kcal: 43, p: 0.5, c: 11, g: 0.3 }, aliases: [] },
  'pina': { per100: { kcal: 50, p: 0.5, c: 13, g: 0.1 }, aliases: ['piña'] },
  'mango': { per100: { kcal: 60, p: 0.8, c: 15, g: 0.4 }, aliases: ['mangos'] },
  'aguacate': { per100: { kcal: 160, p: 2, c: 8.5, g: 14.7 }, unidad: 70, aliases: ['palta', 'medio aguacate'] },
  'tomate': { per100: { kcal: 18, p: 0.9, c: 3.9, g: 0.2 }, unidad: 120, aliases: ['tomates', 'tomate chonto'] },
  'ensalada verde': { per100: { kcal: 17, p: 1.2, c: 3.3, g: 0.2 }, aliases: ['lechuga', 'ensalada', 'mix de hojas verdes', 'hojas verdes'] },
  'zanahoria': { per100: { kcal: 41, p: 0.9, c: 9.6, g: 0.2 }, unidad: 70, aliases: ['zanahorias', 'zanahoria rallada'] },
  'brocoli cocido': { per100: { kcal: 35, p: 2.4, c: 7.2, g: 0.4 }, aliases: ['brócoli', 'brocoli', 'brócoli al vapor'] },
  'ahuyama cocida': { per100: { kcal: 26, p: 1, c: 6.5, g: 0.1 }, aliases: ['ahuyama', 'auyama', 'zapallo', 'calabaza'] },

  // ── Lácteos ──
  'leche entera': { per100: { kcal: 61, p: 3.2, c: 4.8, g: 3.3 }, aliases: ['leche'] },
  'leche descremada': { per100: { kcal: 34, p: 3.4, c: 5, g: 0.1 }, aliases: ['leche deslactosada descremada', 'leche light'] },
  'leche deslactosada': { per100: { kcal: 58, p: 3.1, c: 4.7, g: 3 }, aliases: [] },
  'yogur griego': { per100: { kcal: 59, p: 10, c: 3.6, g: 0.4 }, aliases: ['yogurt griego', 'yogur griego natural', 'yogurt griego natural'] },
  'yogur natural': { per100: { kcal: 61, p: 3.5, c: 4.7, g: 3.3 }, aliases: ['yogurt', 'yogur', 'yogurt natural'] },
  'queso fresco': { per100: { kcal: 250, p: 18, c: 3, g: 19 }, aliases: ['queso', 'queso campesino', 'quesito', 'queso blanco', 'tajada de queso'] },
  'queso mozzarella': { per100: { kcal: 300, p: 22, c: 2.2, g: 22 }, aliases: ['mozzarella', 'queso doble crema'] },

  // ── Grasas y otros ──
  'aceite': { per100: { kcal: 884, p: 0, c: 0, g: 100 }, unidad: 14, aliases: ['aceite de oliva', 'aceite vegetal', 'aceite de canola', 'cucharada de aceite'] },
  'mantequilla': { per100: { kcal: 717, p: 0.9, c: 0.1, g: 81 }, unidad: 5, aliases: ['cucharadita de mantequilla'] },
  'mantequilla ghee': { per100: { kcal: 876, p: 0, c: 0, g: 99.5 }, unidad: 5, aliases: ['ghee', 'gui', 'mantequilla clarificada'] },
  'mantequilla de mani': { per100: { kcal: 588, p: 25, c: 20, g: 50 }, unidad: 16, aliases: ['mantequilla de maní', 'crema de maní', 'crema de mani', 'peanut butter'] },
  'nueces': { per100: { kcal: 654, p: 15, c: 14, g: 65 }, aliases: ['nuez'] },
  'almendras': { per100: { kcal: 579, p: 21, c: 22, g: 50 }, aliases: ['almendra'] },
  'proteina en polvo': { per100: { kcal: 375, p: 75, c: 12.5, g: 6 }, unidad: 30, aliases: ['proteína', 'proteina', 'whey', 'whey protein', 'scoop de proteína', 'scoop de proteina', 'batido de proteína'] },
  'cafe negro': { per100: { kcal: 2, p: 0.1, c: 0, g: 0 }, aliases: ['café', 'cafe', 'café negro', 'tinto', 'americano', 'café americano'] },
  'azucar': { per100: { kcal: 387, p: 0, c: 100, g: 0 }, unidad: 4, aliases: ['azúcar', 'cucharadita de azúcar'] },
  'miel': { per100: { kcal: 304, p: 0.3, c: 82, g: 0 }, unidad: 7, aliases: ['miel de abejas'] },
};

// ── Normalización y matching ────────────────────────────────────────────
const norm = (s) => String(s || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

let INDEX = null;
function buildIndex() {
  INDEX = new Map();
  for (const [key, def] of Object.entries(FOODS)) {
    INDEX.set(norm(key), key);
    for (const a of def.aliases || []) INDEX.set(norm(a), key);
  }
}

// Si el item coincide con la tabla y su cantidad es determinable, devuelve
// el item con macros RECALCULADOS desde la tabla (con `canon: true` como
// marca). Si no hay match o la cantidad es ambigua, devuelve el item igual
// — la estimación de la IA se respeta. NUNCA lanza: ante cualquier duda,
// deja el item como vino.
// `crudo` (visual nueva, por ahora solo Mauro): si el cliente pesó en CRUDO,
// la tabla (que es de lo cocido, como se come) se aplica a los gramos
// COCIDOS equivalentes que escribió el chat: «200 g crudo (≈150 g cocido)».
// Sin ese equivalente, se respeta lo que calculó el chat con los valores del
// crudo: aplicar la tabla de cocido a 200 g crudos daría de más.
export function canonicalizeItem(it, { crudo = false } = {}) {
  try {
    if (!INDEX) buildIndex();
    const key = INDEX.get(norm(it.name));
    if (!key) return it;
    const def = FOODS[key];
    const amount = String(it.amount || '');
    const texto = `${it.name} ${amount}`.toLowerCase();

    let grams = null;
    // (Solo cuando lo crudo está en la CANTIDAD: «avena cruda» como nombre
    // ya es un alimento de la tabla, con sus valores en crudo.)
    if (crudo && /\bcrud[oa]s?\b/i.test(amount)) {
      const mc = amount.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|grs|gramos)\s*cocid/i);
      if (!mc) return it;
      grams = parseFloat(mc[1].replace(',', '.'));
    }

    // 1) Gramos o mililitros explícitos ("124g", "0.5 taza (80 g)", "100ml")
    const mg = grams != null ? null : amount.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|grs|gramos|ml|cc)\b/i);
    if (mg) grams = parseFloat(mg[1].replace(',', '.'));

    // 2) Unidades naturales ("2 huevos", "1 arepa mediana") si el alimento
    //    tiene peso estándar por unidad. Tamaños ajustan el estándar.
    if (grams == null && !mg && def.unidad) {
      const mq = amount.match(/(\d+(?:[.,]\d+)?)/);
      const qty = mq ? parseFloat(mq[1].replace(',', '.')) : 1;
      let factor = 1;
      if (/grande/.test(texto)) factor = 1.3;
      else if (/pequen|chiquit/.test(texto)) factor = 0.75;
      else if (/\bmedi[oa]\b/.test(texto)) factor = 0.5; // "media arepa"
      if (qty > 0 && qty <= 30) grams = qty * def.unidad * factor;
    }

    if (grams == null || !Number.isFinite(grams) || grams <= 0 || grams > 3000) return it;

    const f = grams / 100;
    const r1 = (n) => Math.round(n * 10) / 10;
    return {
      ...it,
      kcal: Math.round(def.per100.kcal * f),
      p: r1(def.per100.p * f),
      c: r1(def.per100.c * f),
      g: r1(def.per100.g * f),
      canon: true,
    };
  } catch (e) {
    return it;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// AZÚCAR AÑADIDA — la capa determinística que protege a la fruta
//
// El problema que resuelve: el campo `sugar` de cada item debe ser SOLO
// azúcar AÑADIDA (la que alguien le echó al alimento), nunca el azúcar
// propia de la fruta entera, la verdura o el lácteo natural. El prompt ya
// lo pide, pero el modelo se equivoca: devolvía 14 g para un banano y 23 g
// para un mango, y entonces el banano aparecía en "de aquí viene tu azúcar"
// como si fuera una gaseosa. El cliente lee eso y entiende que la fruta es
// el enemigo — justo lo contrario de lo que queremos que entienda.
//
// La fructosa de la fruta entera NO es azúcar añadida: viene con fibra,
// agua y volumen, se absorbe despacio y ninguna guía (OMS, AHA) la cuenta
// en el techo de azúcares libres. Lo que sí cuenta es el azúcar que se le
// agrega a algo: la gaseosa, el jugo endulzado, el postre, la mermelada
// — y también la fruta EN ALMÍBAR o confitada, que ya no es fruta entera.
//
// Por eso esta capa no le pide nada al modelo: si el alimento está en la
// lista de comida entera y su nombre no trae ninguna marca de azúcar
// agregada, su azúcar añadida es CERO, diga lo que diga la estimación.
// ─────────────────────────────────────────────────────────────────────────

// Marcas en el nombre que sí delatan azúcar agregada. Si alguna aparece, el
// alimento deja de estar protegido aunque su base sea fruta ("piña en
// almíbar", "yogur azucarado", "fresas con leche condensada").
const MARCAS_AZUCAR_ANADIDA = [
  'con azucar', 'azucarad', 'endulzad', 'almibar', 'confitad', 'cristalizad',
  'caramelizad', 'acaramelad', 'glasead', 'con miel', 'con panela', 'con arequipe',
  'con leche condensada', 'leche condensada', 'sirope', 'jarabe', 'melao', 'melaza',
  'con mermelada', 'con chocolate', 'con nutella', 'con crema chantilly', 'con dulce',
  'en compota azucarada', 'con helado',
];

// Lo contrario: marcas que confirman que NO lleva azúcar agregada. Van antes
// que las de arriba porque "café sin azúcar" contiene "azucar" como texto.
const MARCAS_SIN_AZUCAR = [
  'sin azucar', 'sin azucares', 'sin endulzar', 'sin azúcar', 'zero', 'cero azucar',
  'light sin azucar', 'natural sin azucar',
];

// Comida entera: fruta, verdura, tubérculo, grano, legumbre, proteína, fruto
// seco y lácteo natural. Nada de esto lleva azúcar añadida por definición.
// Se compara por PALABRA, no por "contiene": así "pie de manzana" no se
// cuela por decir manzana, y "batata dulce" no se toma por un dulce.
const ALIMENTOS_ENTEROS = [
  // Frutas
  'banano', 'banana', 'bananos', 'guineo', 'platano', 'maduro', 'manzana', 'manzanas',
  'pera', 'peras', 'naranja', 'naranjas', 'mandarina', 'mandarinas', 'limon', 'lima',
  'toronja', 'pomelo', 'mango', 'mangos', 'papaya', 'pina', 'piña', 'sandia', 'melon',
  'uva', 'uvas', 'fresa', 'fresas', 'frutilla', 'frutillas', 'mora', 'moras',
  'arandano', 'arandanos', 'frambuesa', 'frambuesas', 'kiwi', 'kiwis', 'durazno',
  'duraznos', 'melocoton', 'ciruela', 'ciruelas', 'cereza', 'cerezas', 'granadilla',
  'maracuya', 'lulo', 'guayaba', 'guanabana', 'curuba', 'feijoa', 'tomate de arbol',
  'mamey', 'nispero', 'chirimoya', 'higo', 'higos', 'datil', 'datiles', 'coco',
  'aguacate', 'palta', 'fruta', 'frutas', 'ensalada de frutas', 'macedonia',
  // Verduras y hortalizas
  'tomate', 'tomates', 'lechuga', 'espinaca', 'espinacas', 'acelga', 'kale', 'rucula',
  'brocoli', 'coliflor', 'repollo', 'col', 'zanahoria', 'zanahorias', 'pepino',
  'calabacin', 'zapallo', 'ahuyama', 'auyama', 'calabaza', 'berenjena', 'pimenton',
  'pimiento', 'cebolla', 'ajo', 'apio', 'esparragos', 'habichuela', 'habichuelas',
  'arveja', 'arvejas', 'champinon', 'champinones', 'hongos', 'remolacha', 'rabano',
  'verdura', 'verduras', 'vegetales', 'ensalada', 'hojas verdes', 'mix de hojas verdes',
  // Tubérculos y granos
  'papa', 'papas', 'papa criolla', 'papas criollas', 'yuca', 'batata', 'camote',
  'name', 'arracacha', 'arroz', 'arroz integral', 'quinua', 'quinoa', 'avena',
  'maiz', 'mazorca', 'pasta', 'espagueti', 'fideos', 'macarrones', 'cuscus', 'bulgur',
  // Legumbres
  'frijol', 'frijoles', 'lenteja', 'lentejas', 'garbanzo', 'garbanzos', 'haba', 'habas',
  'soya', 'edamame',
  // Proteína animal
  'pollo', 'pechuga', 'muslo', 'pierna de pollo', 'pavo', 'carne', 'res', 'lomo',
  'cerdo', 'pescado', 'salmon', 'atun', 'tilapia', 'mojarra', 'trucha', 'sardina',
  'camaron', 'camarones', 'huevo', 'huevos', 'clara', 'claras',
  // Frutos secos y semillas (naturales)
  'almendra', 'almendras', 'nuez', 'nueces', 'mani', 'cacahuate', 'marañon', 'maranon',
  'pistacho', 'pistachos', 'avellana', 'avellanas', 'chia', 'linaza', 'ajonjoli',
  'semillas', 'girasol', 'auyamas',
  // Lácteos naturales
  'leche', 'yogur', 'yogurt', 'kefir', 'queso', 'quesito', 'cuajada', 'requeson',
  'yogur griego', 'yogurt griego', 'yogur natural', 'yogurt natural',
  // Grasas y básicos
  'aceite', 'aceite de oliva', 'mantequilla', 'ghee', 'agua', 'cafe', 'tinto', 'te',
  'aromatica', 'infusion',
];

// Palabras y frases que, si aparecen, cancelan la protección: son productos
// donde el azúcar añadida es la regla, aunque el nombre mencione una fruta
// ("jugo de mango", "torta de banano", "yogur de fresa").
const VETO_PALABRAS = new Set([
  'jugo', 'zumo', 'batido', 'smoothie', 'malteada', 'gaseosa', 'refresco', 'soda',
  'coca', 'pepsi', 'limonada', 'torta', 'pastel', 'ponque', 'galleta', 'galletas',
  'helado', 'postre', 'dulce', 'dulces', 'bombon', 'chocolatina', 'chocolate',
  'mermelada', 'arequipe', 'manjar', 'compota', 'nectar', 'cereal', 'granola',
  'barra', 'barrita', 'panela', 'azucar', 'miel', 'flan', 'gelatina', 'brownie',
  'muffin', 'donut', 'dona', 'churro', 'bocadillo', 'obleas', 'ketchup', 'salsa',
].map(norm));

// Frases (dos o más palabras) que vetan por coincidencia de texto.
const VETO_FRASES = [
  'empanada dulce', 'avena en leche', 'arroz con leche', 'leche condensada',
  'fruta en almibar', 'cereal de caja', 'leche saborizada', 'leche de sabor',
].map(norm);

// Un yogur "de algo" casi siempre viene endulzado ("yogur de fresa"), salvo
// cuando el "de" indica el origen de la leche. El yogur natural y el griego
// no entran aquí: no llevan la preposición.
const VETO_REGEX = [
  /\byogur(?:t)?\s+de\s+(?!cabra|oveja|bufala|vaca)/,
  /\bleche\s+de\s+sabor/,
];

// Excepciones: llevan una palabra vetada pero son comida entera. El "dulce"
// de "maíz dulce" o "batata dulce" es la variedad, no azúcar agregada.
const ENTEROS_PESE_AL_VETO = [
  'maiz dulce', 'mazorca dulce', 'batata dulce', 'papa dulce', 'camote dulce',
  'aji dulce', 'pimenton dulce', 'pimiento dulce', 'platano dulce', 'limon dulce',
  // Un jugo exprimido en casa no lleva azúcar agregada. Es lo que dice la
  // propia app ("gaseosas, jugos ENDULZADOS"): el jugo de caja o con azúcar
  // sí cuenta, el que alguien exprimió no. Sin esta excepción, "jugo natural
  // de naranja" entraba como azúcar añadida por la palabra "jugo".
  'jugo natural', 'zumo natural', 'jugo exprimido', 'jugo recien exprimido',
  'jugo en agua sin azucar', 'jugo de limon',
].map(norm);

let _INDEX_ENTEROS = null;
function indiceEnteros() {
  if (!_INDEX_ENTEROS) _INDEX_ENTEROS = new Set(ALIMENTOS_ENTEROS.map(norm));
  return _INDEX_ENTEROS;
}

// ¿El nombre de este alimento es comida entera sin azúcar agregada?
// Devuelve true solo cuando estamos SEGUROS: ante la duda, false y se
// respeta lo que haya estimado el modelo.
export function esComidaEnteraSinAzucarAnadida(nombre) {
  const n = norm(nombre);
  if (!n) return false;
  // "sin azúcar" / "zero" protege cualquier cosa, sea entera o no.
  if (MARCAS_SIN_AZUCAR.some(m => n.includes(norm(m)))) return true;
  // Una marca de azúcar agregada rompe la protección aunque la base sea fruta.
  if (MARCAS_AZUCAR_ANADIDA.some(m => n.includes(norm(m)))) return false;
  if (ENTEROS_PESE_AL_VETO.some(f => n.includes(f))) return true;
  const set = indiceEnteros();
  // Nombre completo ("banano", "pechuga de pollo a la plancha" → se parte)
  if (set.has(n)) return true;
  // Por palabras: basta con que UNA palabra significativa sea comida entera
  // y ninguna palabra delate un producto azucarado. Así "banano maduro" y
  // "mango en trozos" pasan, y "torta de banano" no (torta está vetada).
  if (VETO_FRASES.some(f => n.includes(f))) return false;
  if (VETO_REGEX.some(re => re.test(n))) return false;
  const palabras = n.split(' ').filter(Boolean);
  if (!palabras.length) return false;
  if (palabras.some(p => VETO_PALABRAS.has(p))) return false;
  return palabras.some(p => set.has(p));
}


// El número final de azúcar añadida de un item. Si es comida entera, CERO;
// si no, lo que venga estimado (o null si no vino nada).
export function azucarAnadidaDeItem(it) {
  const declarada = Number(it && it.sugar);
  const hay = it && it.sugar != null && Number.isFinite(declarada);
  if (esComidaEnteraSinAzucarAnadida(it && it.name)) return 0;
  return hay ? Math.max(0, declarada) : null;
}
