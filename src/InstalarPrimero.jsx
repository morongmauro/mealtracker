// ─────────────────────────────────────────────────────────────────────────
// INSTALAR PRIMERO (entrada en el teléfono, antes de la cuenta)
//
// Si alguien abre el link en el navegador del teléfono y todavía no entró
// nunca (sin cuenta en este teléfono), lo primero es instalar la app. La
// cuenta se crea ya dentro de la app instalada, por dos razones:
//   · en iPhone, Safari y la app de la pantalla de inicio NO comparten la
//     sesión: si entraba en Safari, al abrir el ícono tenía que entrar de nuevo;
//   · en iPhone, las notificaciones solo funcionan con la app instalada.
//
// Android: un botón que instala directo (el pase del navegador). iPhone: los
// pasos de Safari. Dentro de Instagram/Facebook/TikTok no se puede instalar:
// le pide abrir el link en Safari o Chrome. Y siempre queda una salida chica,
// «Seguir en el navegador», para no dejar a nadie bloqueado.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Export, PlusSquare, CheckCircle, DotsThreeVertical, Copy } from '@phosphor-icons/react';
import VentanaMarca, { BotonVentana, GRAFITO, GRIS_TXT, Color, Negrita } from './VentanaMarca.jsx';
import { esIphone, usePaseInstalar, pasosInstalar } from './InstalarApp.jsx';
import { CLAVE_SALTO } from './instalarPrimeroEstado.js';
import { WHATSAPP_COACH } from './v2.js';

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
// Navegadores dentro de otras apps: desde ahí no se puede instalar.
export const enAppAjena = () => /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Line\/|Snapchat|LinkedInApp/i.test(ua());
const esChromeIphone = () => /CriOS/i.test(ua());


const Paso = ({ icono, children }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.85)', borderRadius: 16, padding: '11px 12px', marginTop: 8, fontSize: 15, lineHeight: 1.35, color: GRAFITO, textAlign: 'left' }}>
    <span style={{ flex: 'none', width: 32, height: 32, borderRadius: 10, background: '#E6EEF9', color: '#2F6CC4', display: 'grid', placeItems: 'center' }}>{icono}</span>
    <span>{children}</span>
  </div>
);

const Enlace = ({ children, ...p }) => (
  <a {...p} style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 14, color: GRIS_TXT, textDecoration: 'none', cursor: 'pointer' }}>{children}</a>
);

export default function InstalarPrimero({ alSeguir }) {
  const { pase, instalada, instalar } = usePaseInstalar();
  const [copiado, setCopiado] = useState(false);
  const iphone = esIphone();
  const ajena = enAppAjena();
  const wa = `https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent('Hola, no logro instalar la app')}`;
  const seguir = () => { try { sessionStorage.setItem(CLAVE_SALTO, '1'); } catch (e) {} alSeguir && alSeguir(); };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(location.origin + '/'); setCopiado(true); } catch (e) { setCopiado(false); }
  };
  const I = (C) => <C size={19} weight="bold" />;

  let titulo = <>Primero,<br /><Color c="azul">instala la app.</Color></>;
  let texto = <>Así se abre desde tu pantalla de inicio, a pantalla completa, y tus notificaciones funcionan.</>;
  let cuerpo;
  if (ajena) {
    titulo = <>Ábrela en<br /><Color c="azul">{iphone ? 'Safari.' : 'Chrome.'}</Color></>;
    texto = <>Desde aquí dentro no se puede instalar. Abre este enlace en <Negrita>{iphone ? 'Safari' : 'Chrome'}</Negrita> y sigue los pasos.</>;
    cuerpo = (<>
      <Paso icono={I(DotsThreeVertical)}>Toca el menú <b>⋯</b> de arriba y elige <b>Abrir en {iphone ? 'el navegador' : 'Chrome'}</b>.</Paso>
      <BotonVentana onClick={copiar} data-copiar-enlace>{copiado ? 'Enlace copiado' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Copy size={18} weight="bold" /> Copiar el enlace</span>}</BotonVentana>
    </>);
  } else if (instalada) {
    titulo = <>Listo.<br /><Color c="azul">Ábrela desde su ícono.</Color></>;
    texto = <>Ya está en tu pantalla de inicio. Ciérrala aquí y ábrela desde el ícono: ahí creas tu cuenta.</>;
    cuerpo = null;
  } else if (iphone) {
    cuerpo = (<>
      <Paso icono={I(Export)}>Toca <b>Compartir</b> {esChromeIphone() ? '(arriba, junto a la dirección)' : '(abajo en Safari; si no lo ves, toca primero ⋯)'}.</Paso>
      <Paso icono={I(PlusSquare)}>Elige <b>Añadir a pantalla de inicio</b> y toca <b>Añadir</b>.</Paso>
      <Paso icono={I(CheckCircle)}>Abre la app desde su <b>ícono</b>. Ahí creas tu cuenta.</Paso>
    </>);
  } else if (pase) {
    cuerpo = (<>
      <BotonVentana onClick={instalar} data-instalar-primero>Instalar la app</BotonVentana>
      <Paso icono={I(CheckCircle)}>Luego ábrela desde su <b>ícono</b>. Ahí creas tu cuenta.</Paso>
    </>);
  } else {
    cuerpo = (<>
      {pasosInstalar().map((p, i) => <Paso key={i} icono={i === 0 ? I(DotsThreeVertical) : I(PlusSquare)}>{p}</Paso>)}
      <Paso icono={I(CheckCircle)}>Abre la app desde su <b>ícono</b>. Ahí creas tu cuenta.</Paso>
    </>);
  }
  return (
    <VentanaMarca data-instalar-primero-ventana esquina etapa={[1, 3]} titulo={titulo} texto={texto} z={9500}>
      {cuerpo}
      <Enlace href={wa} target="_blank" rel="noopener">¿Se te complica? <b style={{ color: GRAFITO, fontWeight: 650 }}>Escríbele a tu coach</b></Enlace>
      <Enlace onClick={seguir} data-seguir-navegador><span style={{ fontSize: 12.5, opacity: 0.75 }}>Seguir en el navegador</span></Enlace>
    </VentanaMarca>
  );
}
