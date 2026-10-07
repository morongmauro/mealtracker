// ─────────────────────────────────────────────────────────────────────────
// VIDEO DEL EJERCICIO, LIMPIO · visual nueva
//
// El ejercicio en bucle, como un GIF, sin el «ruido» de YouTube:
//   · arranca solo y sin sonido; el botón de sonido lo prende y lo apaga
//     sin salir de este modo;
//   · una barrita abajo para atrasarlo o adelantarlo (y ver el tiempo);
//   · tocar el video lo pausa o lo sigue;
//   · sin el «ruido» de YouTube y sin recortar el ejercicio: el reproductor
//     es MÁS ALTO que el cuadro (el video 16:9 queda centrado, entero) y lo
//     que sobra arriba y abajo —donde YouTube pinta el título, el canal, su
//     logo y «ver en YouTube»— queda fuera del cuadro;
//   · el bucle lo hacemos aquí: un poco antes del final vuelve al inicio, así
//     no aparece la pantalla final con el siguiente video ni el ícono de
//     repetir;
//   · la miniatura tapa solo el arranque (el negro inicial) y la pausa.
// Se habla con el reproductor por postMessage (la API de iframes de
// YouTube), sin cargar ningún script extra.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { SpeakerSimpleSlash, SpeakerSimpleHigh, Play } from '@phosphor-icons/react';

// La barrita: delgada, con las puntas redondas y lo ya visto en blanco.
const CSS_VL = `@keyframes vl-gira { to { transform: rotate(360deg) } }
.vl-barra { -webkit-appearance: none; appearance: none; height: 16px; margin: 0; background: transparent; cursor: pointer; }
.vl-barra::-webkit-slider-runnable-track { height: 4px; border-radius: 99px; background: linear-gradient(90deg, #fff var(--vl-p), rgba(255,255,255,.35) var(--vl-p)); }
.vl-barra::-moz-range-track { height: 4px; border-radius: 99px; background: rgba(255,255,255,.35); }
.vl-barra::-moz-range-progress { height: 4px; border-radius: 99px; background: #fff; }
.vl-barra::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; margin-top: -4px; border-radius: 99px; background: #fff; border: 0; box-shadow: 0 1px 3px rgba(0,0,0,.35); }
.vl-barra::-moz-range-thumb { width: 12px; height: 12px; border-radius: 99px; background: #fff; border: 0; }`;

const mmss = (s) => { const t = Math.max(0, Math.floor(s || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

// Lo que el reproductor tiene de más arriba y abajo (fuera del cuadro).
const SOBRA = 72;

export default function VideoLimpio({ src, miniatura, titulo }) {
  const marco = useRef(null);
  const [listo, setListo] = useState(false);      // ya está reproduciendo (y pasó el título de YouTube)
  const [pausado, setPausado] = useState(false);
  const [sonido, setSonido] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const arrastrando = useRef(false);
  const url = src + (src.includes('?') ? '&' : '?') + 'enablejsapi=1&origin=' + encodeURIComponent(window.location.origin);
  const inicio = Number((src.match(/[?&]start=(\d+)/) || [])[1]) || 0;
  const durRef = useRef(0);

  const mandar = (func, args = []) => {
    try { marco.current && marco.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch (e) { /* sin reproductor */ }
  };

  useEffect(() => {
    let tapa = null;
    const alMensaje = (ev) => {
      if (!marco.current || ev.source !== marco.current.contentWindow) return;
      let d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (e) { return; }
      if (!d || (d.event !== 'infoDelivery' && d.event !== 'onStateChange' && d.event !== 'initialDelivery')) return;
      const info = d.event === 'onStateChange' ? { playerState: d.info } : (d.info || {});
      if (info.duration) { setDur(info.duration); durRef.current = info.duration; }
      if (info.currentTime != null && !arrastrando.current) setT(info.currentTime);
      // El bucle propio: antes de que termine, de vuelta al inicio.
      const d0 = durRef.current;
      if ((info.currentTime != null && d0 && info.currentTime >= d0 - 0.6) || info.playerState === 0) {
        mandar('seekTo', [inicio, true]); mandar('playVideo');
      }
      if (info.playerState === 1) {
        setPausado(false);
        // Lo de YouTube queda fuera del cuadro: solo hay que tapar el negro
        // del arranque.
        if (!tapa) tapa = setTimeout(() => setListo(true), 250);
      } else if (info.playerState === 2) setPausado(true);
    };
    window.addEventListener('message', alMensaje);
    // Pedirle al reproductor que nos cuente cómo va.
    const escuchar = () => { try { marco.current && marco.current.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'v' }), '*'); } catch (e) { /* nada */ } };
    const iv = setInterval(escuchar, 500);
    // Si el reproductor no responde, igual se destapa a los 1,2 s.
    const respaldo = setTimeout(() => setListo(true), 1200);
    return () => { window.removeEventListener('message', alMensaje); clearInterval(iv); clearTimeout(tapa); clearTimeout(respaldo); };
  }, [src]);

  // Al darle play, el botón y la tapa se van AL INSTANTE (un video de 13 s no
  // puede quedar 4 s tapado); tocar otra vez lo pausa y vuelve el botón.
  const alternarPausa = () => { if (pausado) { mandar('playVideo'); setPausado(false); setListo(true); } else { mandar('pauseVideo'); setPausado(true); } };
  const alternarSonido = () => { if (sonido) mandar('mute'); else { mandar('unMute'); mandar('setVolume', [100]); } setSonido(!sonido); };
  const tapado = !listo || pausado;

  return (
    <div data-video-limpio style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '16 / 9', background: '#000' }}>
      <iframe ref={marco} src={url} title={titulo} tabIndex={-1}
        allow="autoplay; encrypted-media; picture-in-picture"
        style={{ position: 'absolute', left: 0, width: '100%', top: -SOBRA, height: `calc(100% + ${2 * SOBRA}px)`, border: 'none', pointerEvents: 'none' }} />
      {/* La tapa: la miniatura mientras arranca o está en pausa */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, background: miniatura ? `#000 url(${miniatura}) center / cover` : '#000',
        opacity: tapado ? 1 : 0, transition: tapado ? 'opacity .2s ease' : 'opacity .12s ease', pointerEvents: 'none',
      }} />
      {/* Toque: pausa / sigue */}
      <button data-video-pausa onClick={alternarPausa} aria-label={pausado ? 'Seguir' : 'Pausar'} style={{ position: 'absolute', inset: 0, border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
        {pausado && <span style={{ width: 54, height: 54, borderRadius: 99, background: 'rgba(255,255,255,0.94)', display: 'grid', placeItems: 'center' }}><Play size={24} weight="fill" color="#1F1F1F" /></span>}
        {!listo && !pausado && <span style={{ width: 24, height: 24, borderRadius: 99, border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'vl-gira .8s linear infinite' }} />}
      </button>
      <style>{CSS_VL}</style>
      {/* Abajo: tiempo, barrita y sonido */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 10px 8px', display: 'flex', alignItems: 'center', gap: 9,
        background: 'linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,0))' }}>
        <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', minWidth: 30 }}>{mmss(t)}</span>
        <input data-video-barra type="range" min={0} max={Math.max(1, Math.round(dur))} step={0.5} value={Math.min(t, dur || t)} aria-label="Mover el video"
          onPointerDown={() => { arrastrando.current = true; }}
          onChange={ev => { const v = Number(ev.target.value); setT(v); mandar('seekTo', [v, true]); }}
          onPointerUp={() => { arrastrando.current = false; }}
          className="vl-barra" style={{ flex: 1, '--vl-p': `${dur ? Math.min(100, (t / dur) * 100) : 0}%` }} />
        <button data-video-sonido onClick={alternarSonido} aria-label={sonido ? 'Quitar sonido' : 'Poner sonido'} style={{
          width: 32, height: 32, flex: 'none', borderRadius: 99, border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center',
          background: 'rgba(20,20,18,0.62)', color: '#fff', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)',
        }}>{sonido ? <SpeakerSimpleHigh size={17} weight="fill" /> : <SpeakerSimpleSlash size={17} weight="fill" />}</button>
      </div>
    </div>
  );
}
