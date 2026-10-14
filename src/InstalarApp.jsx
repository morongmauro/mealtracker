// ─────────────────────────────────────────────────────────────────────────
// INSTALAR LA APP (teléfono)
//
// Cuando la app corre en una pestaña del navegador (no desde su ícono), el
// Dash muestra esta tarjeta: un botón «Instalar» que usa el pase del
// navegador (beforeinstallprompt, guardado en index.html) y, si el navegador
// no lo da, los pasos exactos para ese navegador. Al instalarse, desaparece.
//
// Por qué importa: en Samsung Internet, «Agregar página a → Pantalla de
// inicio» sin que la app sea «instalable» crea un ACCESO DIRECTO (ícono con
// la insignia del navegador) que abre con la barra de direcciones. Con el
// botón de aquí, el teléfono instala la app de verdad.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { DeviceMobile } from '@phosphor-icons/react';
import { TEXT, TEXT_MUTED } from './theme.js';
import { enVerComo } from './verComo.js';

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
export const esIphone = () => /iPhone|iPad|iPod/i.test(ua());
export const esAndroid = () => /Android/i.test(ua());
const esSamsung = () => /SamsungBrowser/i.test(ua());
const esChrome = () => /Chrome\//i.test(ua()) && !/Edg|OPR|SamsungBrowser/i.test(ua());

// ¿Corre instalada (desde su ícono, a pantalla completa)?
export const appInstalada = () => {
  try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || !!window.__pwaInstalada; } catch (e) { return false; }
};

// ¿Hay que ofrecer instalarla? Solo en teléfonos, en una pestaña del
// navegador, y no cuando el coach mira como cliente.
export const hayQueInstalar = () => (esAndroid() || esIphone()) && !appInstalada() && !enVerComo();

export function usePaseInstalar() {
  const [pase, setPase] = useState(() => (typeof window !== 'undefined' ? window.__pwaPrompt || null : null));
  const [instalada, setInstalada] = useState(appInstalada);
  useEffect(() => {
    const llego = () => setPase(window.__pwaPrompt || null);
    const listo = () => { setPase(null); setInstalada(true); };
    window.addEventListener('mt:instalable', llego);
    window.addEventListener('mt:instalada', listo);
    return () => { window.removeEventListener('mt:instalable', llego); window.removeEventListener('mt:instalada', listo); };
  }, []);
  const instalar = async () => {
    if (!pase) return false;
    try {
      pase.prompt();
      const r = await pase.userChoice;
      if (r && r.outcome === 'accepted') { setInstalada(true); try { localStorage.setItem('mt:pwaNuevaAt', new Date().toISOString()); } catch (e) { /* nada */ } }
      window.__pwaPrompt = null; setPase(null);
      return !!(r && r.outcome === 'accepted');
    } catch (e) { return false; }
  };
  return { pase, instalada, instalar };
}

// Los pasos para este navegador, cuando no hay pase.
export function pasosInstalar() {
  if (esIphone()) return [<>En Safari toca <b>Compartir</b> (el cuadrito con la flecha) y luego <b>Agregar a inicio</b>.</>];
  if (esSamsung()) return [<>Toca el menú <b>≡</b> (abajo a la derecha).</>, <>Toca <b>Agregar página a</b> → <b>Pantalla de inicio</b>.</>, <>En la ventana, toca <b>Instalar</b> (no «Agregar»).</>];
  if (esChrome()) return [<>Toca el menú <b>⋮</b> (arriba a la derecha).</>, <>Toca <b>Instalar aplicación</b> (o <b>Agregar a pantalla principal</b> → <b>Instalar</b>).</>];
  return [<>Abre esta dirección en <b>Chrome</b>.</>, <>Toca el menú <b>⋮</b> → <b>Instalar aplicación</b>.</>];
}

// La tarjeta del Dash (y de Ajustes, con `enHoja`).
export default function AvisoInstalar({ enHoja = false }) {
  const { pase, instalada, instalar } = usePaseInstalar();
  if (instalada || (!enHoja && !hayQueInstalar())) return null;
  const pasos = pasosInstalar();
  return (
    <div data-instalar-app style={{
      marginTop: enHoja ? 14 : 14, padding: '14px 16px', borderRadius: 22, background: '#FFFFFF',
      boxShadow: enHoja ? 'none' : '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)',
      border: enHoja ? '1px solid #EFEBE3' : 'none',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ width: 40, height: 40, borderRadius: 99, background: '#E6EEF9', color: '#2F6CC4', display: 'grid', placeItems: 'center', flex: 'none' }}><DeviceMobile size={22} weight="fill" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 750, color: TEXT, letterSpacing: '-0.01em' }}>Instala la app en tu teléfono</div>
          <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2, lineHeight: 1.4 }}>Se abre desde su ícono, a pantalla completa y sin la barra del navegador.</div>
        </div>
      </div>
      {pase ? (
        <button data-instalar onClick={instalar} style={{
          width: '100%', marginTop: 12, border: 'none', borderRadius: 999, padding: '12px 18px', fontFamily: 'inherit',
          fontSize: 15, fontWeight: 700, cursor: 'pointer', background: TEXT, color: '#fff',
        }}>Instalar</button>
      ) : (
        <ol data-pasos style={{ margin: '12px 0 0', padding: '12px 14px 12px 30px', borderRadius: 16, background: '#F4F1EB', fontSize: 14, color: TEXT, lineHeight: 1.5 }}>
          {pasos.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
      )}
      <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 10, lineHeight: 1.45 }}>
        ¿Ya tienes un ícono que abre con la barra de direcciones arriba? Era un acceso directo, no la app: bórralo e instálala desde aquí.
      </div>
    </div>
  );
}
