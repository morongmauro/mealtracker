// Red de seguridad: si algo revienta al pintar la app, React desmonta TODO y
// el cliente ve una pantalla en blanco sin salida. Con esto ve un aviso y un
// botón para recargar. La primera vez recarga solo (casi siempre es un
// archivo viejo tras una actualización); si vuelve a fallar, se queda el aviso.
import React from 'react';

const CLAVE = 'mt:salvavidas';

export default class Salvavidas extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) {
    try { console.error('[salvavidas]', error); } catch (e) {}
    try {
      if (!sessionStorage.getItem(CLAVE)) { sessionStorage.setItem(CLAVE, '1'); window.location.reload(); }
    } catch (e) {}
    document.body.classList.add('app-ready');   // que el splash no tape el aviso
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#EDECE5',
        fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1F1F1F', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 320 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Algo no cargó bien</div>
          <div style={{ fontSize: 15, color: '#6B6B6B', marginTop: 8, lineHeight: 1.45 }}>
            Tus datos están a salvo. Recarga la app; si sigue igual, avísale a tu coach.
          </div>
          <button onClick={() => { try { sessionStorage.removeItem(CLAVE); } catch (e) {} window.location.reload(); }} style={{
            marginTop: 18, border: 'none', background: '#1F1F1F', color: '#fff', borderRadius: 999,
            padding: '12px 22px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          }}>Recargar</button>
        </div>
      </div>
    );
  }
}
