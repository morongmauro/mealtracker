// ─────────────────────────────────────────────────────────────────────────
// VIBRACIÓN CON JERARQUÍA (lote 25, a prueba: solo vibra si lote25())
//
//   tic   → lo cotidiano: barra, selectores, abrir/cerrar hojas, tocar un aro
//   medio → lo que confirma: marcar una serie, soltar al arrastrar
//   doble → fin del descanso
//   logro → terminar el entrenamiento
//
// Android: navigator.vibrate. iPhone: Safari no la tiene; el «tic» nativo de
// iOS 18 sale al tocar un interruptor del sistema (<input type=checkbox
// switch>), así que se toca uno invisible. Solo funciona dentro de un toque
// del usuario (no desde un temporizador, como el fin del descanso).
// ─────────────────────────────────────────────────────────────────────────
import { lote25 } from './vistaApp.js';

const PATRONES = { tic: 8, medio: 16, doble: [12, 60, 12], logro: [14, 50, 14, 50, 28] };

let interruptor = null;
function ticIOS() {
  try {
    // Tocar el interruptor le quita el foco a lo que se está escribiendo y el
    // teclado se cierra: escribiendo, el iPhone no vibra.
    const foco = document.activeElement;
    if (foco && (foco.tagName === 'TEXTAREA' || foco.tagName === 'INPUT' || foco.isContentEditable) && foco.type !== 'checkbox') return;
    if (!interruptor) {
      const label = document.createElement('label');
      label.setAttribute('aria-hidden', 'true');
      label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      label.appendChild(input);
      document.body.appendChild(label);
      interruptor = label;
    }
    interruptor.click();
  } catch (e) { /* sin háptica: no pasa nada */ }
}

export function vibrar(tipo = 'tic') {
  if (typeof window === 'undefined' || !lote25()) return;
  const patron = PATRONES[tipo] ?? PATRONES.tic;
  if (window.navigator && typeof window.navigator.vibrate === 'function') {
    try { window.navigator.vibrate(patron); return; } catch (e) { /* sigue con iOS */ }
  }
  // iOS: un tic por golpe (los patrones largos se sienten como dos tics).
  ticIOS();
  if (Array.isArray(patron) && patron.length > 2) setTimeout(ticIOS, (patron[0] || 0) + (patron[1] || 0));
}
