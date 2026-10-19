// ─────────────────────────────────────────────────────────────────────────
// VISTA COMPACTA · la barra de tres, la hoja «Más» y la cabecera corta
//
// Abajo solo Entrenamiento, Alimentación y «Más». Lo demás (Dash,
// Aprendizaje, Galería, el Hoy de comida, Recetario, Calendario de comidas,
// Comunidad, Configuración) vive en «Más», agrupado por sección, y al final
// de «Más» está el cambio a la vista completa, siempre a mano.
// Ver vistaApp.js para quién la ve y cómo se guarda.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Barbell, ForkKnife, SquaresFour, ChartLineUp, GraduationCap, UsersThree, ChatCircle, GearSix, FilmStrip, Sun, BookOpenText, CalendarBlank } from '@phosphor-icons/react';
import { Hoja } from './entrenoUI.jsx';
import { AnilloMarca } from './GraficasV2.jsx';
import { SECCION, DASH_AZUL, TEXT, TEXT_MUTED } from './theme.js';

const SOMBRA = '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.07)';

// ── La barra ───────────────────────────────────────────────────────────────
// activa: 'entreno' | 'comida' | 'mas'
export function BarraCompacta({ activa, alEntreno, alComida, alMas, barRef, oculta, entrenoOn = true }) {
  const items = [
    ...(entrenoOn ? [{ id: 'entreno', label: 'Entreno', Icono: Barbell, tinta: SECCION.entreno.tint, color: SECCION.entreno.ink, alTocar: alEntreno }] : []),
    { id: 'comida', label: 'Comida', Icono: ForkKnife, tinta: SECCION.comida.tint, color: SECCION.comida.ink, alTocar: alComida },
    { id: 'mas', label: 'Más', Icono: SquaresFour, tinta: 'rgba(118,118,128,0.14)', color: TEXT, alTocar: alMas },
  ];
  return (
    <div ref={barRef} data-barra-compacta className="fixed left-0 right-0 bottom-0" style={{
      zIndex: 45, pointerEvents: 'none', display: oculta ? 'none' : 'block',
      padding: '0 10px calc(10px + env(safe-area-inset-bottom, 0px))',
    }}>
      <nav aria-label="Secciones" style={{
        pointerEvents: 'auto', maxWidth: 460, margin: '0 auto', borderRadius: 999, padding: 5,
        display: 'flex', gap: 4, alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.60))',
        WebkitBackdropFilter: 'blur(26px) saturate(160%)', backdropFilter: 'blur(26px) saturate(160%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 30px rgba(40,44,30,0.14), 0 1px 3px rgba(40,44,30,0.08)',
      }}>
        {items.map(({ id, label, Icono, tinta, color, alTocar }) => {
          const on = activa === id;
          return (
            <button key={id} data-compacta-boton={id} data-activo={on ? '1' : '0'} onClick={alTocar} aria-label={label} aria-current={on ? 'page' : undefined}
              style={{
                flex: 1, height: 52, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: on ? tinta : 'transparent', color: on ? color : '#6A6860',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              }}>
              <Icono size={22} weight={on ? 'fill' : 'regular'} />
              <span style={{ fontSize: 11.5, fontWeight: 750 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ── La hoja «Más» ──────────────────────────────────────────────────────────
// grupos: [{ titulo, items: [{ id, label, Icono, tinta, color, alTocar | href }] }]
export function HojaMas({ abierta, alCerrar, grupos, alVerCompleta }) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Más" alto="82vh">
      <div data-hoja-mas>
        {grupos.filter(g => g.items.length).map(g => (
          <div key={g.titulo} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: TEXT_MUTED, textTransform: 'uppercase', margin: '2px 2px 8px' }}>{g.titulo}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 9 }}>
              {g.items.map(it => {
                const Tag = it.href ? 'a' : 'button';
                return (
                  <Tag key={it.id} data-mas={it.id}
                    {...(it.href ? { href: it.href, target: '_blank', rel: 'noopener noreferrer', onClick: alCerrar } : { onClick: () => { alCerrar(); it.alTocar(); } })}
                    style={{
                      background: '#FFFFFF', borderRadius: 18, padding: '12px 10px 11px', border: 'none', boxShadow: SOMBRA,
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, minHeight: 82,
                      fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, lineHeight: 1.15, color: TEXT, textAlign: 'left',
                      cursor: 'pointer', textDecoration: 'none', WebkitTapHighlightColor: 'transparent',
                    }}>
                    <span style={{ width: 34, height: 34, borderRadius: 11, background: it.tinta, color: it.color, display: 'grid', placeItems: 'center' }}>
                      <it.Icono size={20} />
                    </span>
                    {it.label}
                  </Tag>
                );
              })}
            </div>
          </div>
        ))}
        <button data-ver-completa onClick={() => { alCerrar(); alVerCompleta(); }} style={{
          width: '100%', marginTop: 4, background: '#FFFFFF', borderRadius: 16, padding: '14px 16px', border: 'none', boxShadow: SOMBRA,
          display: 'flex', alignItems: 'center', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: TEXT, cursor: 'pointer',
        }}>
          Vista compacta
          <span style={{ marginLeft: 'auto', color: DASH_AZUL.base }}>Ver la completa</span>
        </button>
      </div>
    </Hoja>
  );
}

// Los grupos de «Más» con sus colores, a partir de lo que hay disponible.
export function gruposMas({ entrenoOn, aprendeOn, whatsapp, ir }) {
  const T = (s) => ({ tinta: SECCION[s].tint, color: SECCION[s].ink });
  const azul = { tinta: DASH_AZUL.tint, color: DASH_AZUL.ink };
  const gris = { tinta: '#F1F1F3', color: TEXT };
  return [
    { titulo: 'Entrenamiento', items: entrenoOn ? [{ id: 'galeria', label: 'Galería de ejercicios', Icono: FilmStrip, ...T('entreno'), alTocar: () => ir('galeria') }] : [] },
    { titulo: 'Alimentación', items: [
      { id: 'comida-hoy', label: 'Tu día', Icono: Sun, ...T('comida'), alTocar: () => ir('comida-hoy') },
      { id: 'recetas', label: 'Recetario', Icono: BookOpenText, ...T('comida'), alTocar: () => ir('recetas') },
      { id: 'comida-calendario', label: 'Calendario', Icono: CalendarBlank, ...T('comida'), alTocar: () => ir('comida-calendario') },
    ] },
    { titulo: 'Tú', items: [
      { id: 'dash', label: 'Tu progreso', Icono: ChartLineUp, ...azul, alTocar: () => ir('dash') },
      ...(aprendeOn ? [{ id: 'aprende', label: 'Aprendizaje', Icono: GraduationCap, ...T('aprende'), alTocar: () => ir('aprende') }] : []),
      { id: 'comunidad', label: 'Comunidad', Icono: UsersThree, ...azul, alTocar: () => ir('comunidad') },
      ...(whatsapp ? [{ id: 'coach', label: 'Escríbele a tu coach', Icono: ChatCircle, ...gris, href: whatsapp }] : []),
      { id: 'config', label: 'Configuración', Icono: GearSix, ...gris, alTocar: () => ir('config') },
    ] },
  ];
}

// ── La cabecera corta (Entrenamiento compacto) ─────────────────────────────
// Título, el aro chico de la semana y el cambio entre las opciones.
export function CabezaCompacta({ titulo, aro, alTocarAro, opciones, activa, alElegir }) {
  return (
    <div data-cabeza-compacta style={{ margin: '4px 0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', color: TEXT, lineHeight: 1.1 }}>{titulo}</h1>
        {aro && (
          <button onClick={alTocarAro} aria-label="Tu semana" style={{ border: 'none', background: 'transparent', padding: 0, cursor: alTocarAro ? 'pointer' : 'default', flex: 'none' }}>
            <AnilloMarca frac={aro.frac} color={SECCION.entreno.base} tam={50} grosor={6} plano>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: SECCION.entreno.ink }}>{aro.centro}</span>
            </AnilloMarca>
          </button>
        )}
      </div>
      {opciones && (
        <div role="tablist" style={{ display: 'flex', background: 'rgba(118,118,128,0.14)', borderRadius: 999, padding: 3, marginTop: 14 }}>
          {opciones.map(([id, label]) => {
            const on = id === activa;
            return (
              <button key={id} role="tab" aria-selected={on} data-compacta-opcion={id} onClick={() => alElegir(id)} style={{
                flex: 1, border: 'none', borderRadius: 999, padding: '9px 0', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
                background: on ? '#FFFFFF' : 'transparent', color: on ? TEXT : '#5B5B61', boxShadow: on ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}>{label}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}
