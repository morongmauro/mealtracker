// ─────────────────────────────────────────────────────────────────────────
// LISTA DE CLIENTES AUTORIZADOS
//
// Para agregar o quitar un cliente: edita SOLO este archivo (en GitHub:
// abrir el archivo → ícono de lápiz → agregar/quitar la línea → Commit).
// Vercel despliega solo en ~1 minuto. No hay que tocar ningún otro archivo.
//
// Formato: 'Nombre Apellido', entre comillas y con coma al final.
// No importan mayúsculas/minúsculas ni tildes al validar.
// ─────────────────────────────────────────────────────────────────────────

export const AUTHORIZED_CLIENTS = [
  'Mauro Morón',
  'Alejandro Aguirre',
  'Amauri Barbosa',
  'Andrea Angulo',
  'Andres Yepes',
  'Carlos Martinez',
  'Carlos Pirela',
  'David Forero',
  'Alejandra Borbón',
  'Juan Sebastian Mariño',
  'Camilo Castro',
  'Diana Tovar',
  'Julio Dieguez',
  'Laura Lorena Cardenas',  
  'Mateo Bermudez',
  'Sergio Cuellar',
  'Amalia Rodriguez',
  'Salvador Montoya',
  'Maria Alejandra Gonzales',
  'Natalia Samper',
  'Alejandro Machado',
];

// ─────────────────────────────────────────────────────────────────────────
// CENTRO DE RECURSOS ("Aprendizaje")
//
// DEFAULT_RESOURCES_URL: pega aquí la URL de tu centro de recursos
// (la app desplegada de centrorecursosentrenametodo en Vercel, p. ej.
// 'https://centrorecursosentrenametodo.vercel.app'). Con eso, TODOS los
// clientes ven el botón "Aprendizaje" y entran directo a SU sesión del
// centro con su avance (la app agrega su identidad al link: mt_name +
// mt_user, y el centro abre sesión solo, sin segundo login).
//
// CLIENT_RESOURCES permite sobreescribir el link para un cliente puntual.
// Formato: 'Nombre Apellido': 'https://…',  (el nombre debe coincidir con
// el de la lista de arriba; mayúsculas y tildes no importan al buscar).
// Si un cliente no tiene link aquí, se usa DEFAULT_RESOURCES_URL; si esa
// también está vacía, el botón no aparece para ese cliente.
// ─────────────────────────────────────────────────────────────────────────

export const DEFAULT_RESOURCES_URL = 'https://centrorecursosentrenametodo.vercel.app';

export const CLIENT_RESOURCES = {
  // Ejemplo:
  // 'Mauro Morón': 'https://notion.so/centro-de-recursos-mauro',
};

// ─────────────────────────────────────────────────────────────────────────
// MÓDULO DE ENTRENAMIENTO ("Entrena")  ·  EN PRUEBA
//
// El tercer módulo del ecosistema: el cliente ve su calendario de entrenos,
// abre la rutina del día y marca reps y pesos. Todavía se está armando, así
// que NO se le muestra a todo el mundo: solo a quien esté en la lista de
// abajo. El resto de clientes no ve el botón ni sabe que existe — y ni
// siquiera descarga el código del módulo.
//
// TRAINING_BETA: quiénes lo ven. Un nombre por línea, igual que la lista de
// clientes de arriba (mayúsculas y tildes no importan al comparar). Para
// apagarlo del todo, deja la lista vacía: [].
//
// PARA ABRIRLO A TODOS más adelante: pon TRAINING_PARA_TODOS en true.
// ─────────────────────────────────────────────────────────────────────────

export const TRAINING_PARA_TODOS = false;

export const TRAINING_BETA = [
  'Mauro Morón',
];
