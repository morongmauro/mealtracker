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
// CENTRO DE RECURSOS POR CLIENTE ("Material de aprendizaje")
//
// Pega el link del centro de recursos de cada cliente (Notion, Drive, web…).
// El botón "Aprender" del header y el chip de Herramientas llevan a SU link.
// Se edita igual que la lista de arriba: lápiz en GitHub → commit.
//
// Formato: 'Nombre Apellido': 'https://…',  (el nombre debe coincidir con
// el de la lista de arriba; mayúsculas y tildes no importan al buscar).
// Si un cliente no tiene link aquí, se usa DEFAULT_RESOURCES_URL; si esa
// también está vacía, el botón no aparece para ese cliente.
// ─────────────────────────────────────────────────────────────────────────

export const DEFAULT_RESOURCES_URL = '';

export const CLIENT_RESOURCES = {
  // Ejemplo:
  // 'Mauro Morón': 'https://notion.so/centro-de-recursos-mauro',
};
