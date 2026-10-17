// ─────────────────────────────────────────────────────────────────────────
// RECONOCIMIENTO · un solo sistema para entreno, comida y aprendizaje
//
// La ilustración es el dato: el blob del módulo (la misma forma de las
// cabeceras) con el número grande adentro, las manchas de la sección detrás
// y la semana (o la fase) en puntos. Nada de objeto ni de personaje: lo que
// se celebra es lo que hizo. Al entrar, el número cuenta desde cero, los
// puntos se encienden uno a uno y el blob respira una vez. Debajo, la voz
// del coach y tres cifras que importan. Un botón, un enlace.
//
// `grande`: con portada y puntos. Es la de siempre al terminar un entreno,
// al entrar el día en meta y en aprendizaje. Sin él, la versión corta.
// `especial`: la semana completa (todo el entreno planeado, o cinco días en
// meta de comida): sello «Semana completa» en la portada y más confeti.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import Blob from './Blob.jsx';
import { Conteo, Confeti, asegurarCSS, vibrar } from './Celebraciones.jsx';
import { TEMAS } from './CabeceraHoy.jsx';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';

export const COLOR_MODULO = { entreno: '#5F6670', comida: '#46965A', aprende: '#EE8434' };
export const TONO_MODULO = { entreno: '#C9CED6', comida: '#BFE3C7', aprende: '#FBDCC2' };
const CONFETI = {
  entreno: ['#5F6670', '#C9CED6', '#F2C94C', '#F4DC93', '#FFFFFF'],
  comida: ['#46965A', '#7CC492', '#F2C14E', '#F6E2A0', '#A8D5B3'],
  aprende: ['#EE8434', '#F6B98C', '#F2C94C', '#FBDCC2', '#A9C6EE'],
};

const CSS = `
@keyframes rc-fondo { from { opacity: 0 } to { opacity: 1 } }
@keyframes rc-sube { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: none } }
@keyframes rc-respira { 0% { transform: scale(.9); opacity: 0 } 55% { transform: scale(1.04); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
@keyframes rc-punto { from { transform: scale(.3); opacity: 0 } to { transform: scale(1); opacity: 1 } }
[data-reconocimiento] { animation: rc-fondo .22s ease both }
[data-reconocimiento] .rc-tarjeta { animation: rc-sube .42s cubic-bezier(.2,.8,.2,1) both }
[data-reconocimiento] .rc-blob { animation: rc-respira .9s .1s cubic-bezier(.2,.8,.2,1) both }
[data-reconocimiento] .rc-p { animation: rc-punto .32s cubic-bezier(.2,.9,.3,1.3) both }
[data-reconocimiento] .rc-btn:active { transform: scale(.985) }
@media (prefers-reduced-motion: reduce) { [data-reconocimiento], [data-reconocimiento] * { animation: none !important } }`;

const estiloBoton = {
  width: '100%', marginTop: 16, padding: '15px 18px', borderRadius: 16, border: 0,
  background: TEXT, color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
};
const estiloEnlace = {
  width: '100%', marginTop: 4, padding: '12px 0 2px', border: 0, background: 'transparent',
  color: '#3C7BD6', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};

// numero: { valor, sufijo, pie } · puntos: ['hecho' | 'hoy' | 'nada', …] ·
// titulo: una o dos líneas · chips: [[cifra, qué], …] (hasta tres) ·
// boton: { texto, onClick } · enlace: { texto, onClick } · attrs: atributos
// extra del fondo (data-… para las pruebas).
export default function Reconocimiento({
  tema = 'entreno', grande = false, especial = false, confeti = true, numero = null, puntos = null,
  etiqueta = '', titulo = [], linea = '', chips = [], boton = { texto: 'Seguir' }, enlace = null,
  attrs = {}, children = null, alCerrar,
}) {
  useEffect(() => { asegurarCSS(); vibrar([20, 50, 20, 50, 40]); }, []);
  const t = TEMAS[tema] || TEMAS.entreno;
  const color = COLOR_MODULO[tema] || COLOR_MODULO.entreno;
  const tono = TONO_MODULO[tema] || TONO_MODULO.entreno;
  const lineas = Array.isArray(titulo) ? titulo.filter(Boolean) : [titulo];
  const mancha = (c, extra) => ({ position: 'absolute', borderRadius: '50%', background: `radial-gradient(closest-side, ${c}, ${c}00)`, ...extra });
  return (
    <div data-reconocimiento={tema} data-grande={grande ? '1' : undefined} data-especial={especial ? '1' : undefined} {...attrs} onClick={alCerrar} style={{
      position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(31,31,28,0.42)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 14px',
    }}>
      <style>{CSS}</style>
      {confeti && <Confeti y="30%" piezas={especial ? 70 : 34} colores={CONFETI[tema] || CONFETI.entreno} />}
      <div className="rc-tarjeta" onClick={e => e.stopPropagation()} style={{
        background: '#FFFFFF', borderRadius: 30, maxWidth: 400, width: '100%', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,.26)', maxHeight: '90vh', overflowY: 'auto', fontFamily: 'inherit',
      }}>
        {grande && (
          <div data-rc-portada style={{ position: 'relative', height: especial ? 214 : 200, overflow: 'hidden', background: t.base }}>
            <div style={mancha(t.m1, { width: 260, height: 260, right: -90, top: -110 })} />
            <div style={mancha(t.m2, { width: 220, height: 220, left: -80, bottom: -110 })} />
            <div style={mancha(`${t.m3}BF`, { width: 180, height: 180, right: -40, bottom: -90 })} />
            {especial && (
              <div data-rc-sello style={{
                position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px 6px 9px', borderRadius: 999,
                background: 'rgba(255,255,255,.94)', boxShadow: '0 4px 14px rgba(0,0,0,.12)', whiteSpace: 'nowrap',
                fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: TEXT,
              }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#F2C94C', display: 'grid', placeItems: 'center', fontSize: 11 }}>★</span>
                SEMANA COMPLETA
              </div>
            )}
            <div className="rc-blob" style={{ position: 'absolute', left: '50%', top: especial ? '56%' : '50%', width: 150, height: 150, margin: '-75px 0 0 -75px' }}>
              <Blob color={color} tam={150} />
              {numero && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', textAlign: 'center' }}>
                  <div>
                    <b data-rc-numero style={{ display: 'block', fontSize: 54, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {typeof numero.valor === 'number' ? <Conteo valor={numero.valor} ms={900} /> : numero.valor}{numero.sufijo || ''}
                    </b>
                    {numero.pie && <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', marginTop: 4 }}>{numero.pie}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Sin puntos debajo del blob: parecían de un carrusel (algo que se
            desliza) y el número del blob ya dice cómo va la semana. */}
        <div style={{ padding: grande ? '18px 22px 20px' : '22px 22px 20px' }}>
          {etiqueta && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: TEXT_MUTED }}>{etiqueta}</div>}
          <div data-rc-titulo style={{ fontSize: 27, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.06, marginTop: 6 }}>
            {lineas.map((l, i) => <div key={i}>{l}</div>)}
          </div>
          {linea && <div data-rc-linea style={{ fontSize: 15.5, fontWeight: 700, color: t.tinta, lineHeight: 1.3, marginTop: 8 }}>{linea}</div>}
          {chips.length > 0 && (
            <div data-rc-chips style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {chips.map(([b, s], i) => (
                <div key={i} data-rc-chip style={{ flex: 1, minWidth: 0, background: '#F3F1EB', borderRadius: 16, padding: '10px 12px' }}>
                  <b style={{ display: 'block', fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: TEXT, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{b}</b>
                  <span style={{ fontSize: 11.5, color: TEXT_MUTED, lineHeight: 1.25, display: 'block' }}>{s}</span>
                </div>
              ))}
            </div>
          )}
          {children}
          <button data-rc-boton className="rc-btn" onClick={boton.onClick || alCerrar} style={estiloBoton}>{boton.texto || 'Seguir'}</button>
          {enlace && <button data-rc-enlace onClick={enlace.onClick || alCerrar} style={estiloEnlace}>{enlace.icono || null}{enlace.texto}</button>}
        </div>
      </div>
    </div>
  );
}

export const colorTexto = { TEXT, TEXT_LIGHT };
