// ─────────────────────────────────────────────────────────────────────────
// NOVEDADES POR SECCIÓN · el puntito de color en la barra (visual nueva)
//
// Cada sección tiene una «firma» de lo que hay: el plan de entrenamiento, la
// meta de comida, las publicaciones de la comunidad. Si la firma cambió desde
// la última vez que la persona entró a esa sección, hay novedad y sale el
// puntito hasta que entre.
//
// La primera vez (sin nada guardado) no hay novedad: se guarda lo que hay.
// Si no hay almacenamiento, nunca hay punto (mejor eso que uno que no se va).
// ─────────────────────────────────────────────────────────────────────────
const K = (sec) => `mt:nov:${sec}`;

export function hayNovedad(sec, firma) {
  if (firma == null || firma === '') return false;
  let v;
  try { v = localStorage.getItem(K(sec)); } catch (e) { return false; }
  if (v === null) { marcarVisto(sec, firma); return false; }
  return v !== String(firma);
}

export function marcarVisto(sec, firma) {
  if (firma == null || firma === '') return;
  try { localStorage.setItem(K(sec), String(firma)); } catch (e) { /* sin almacenamiento */ }
}
