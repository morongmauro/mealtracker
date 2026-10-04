// El recorrido guiado de la app (RecorridoApp.jsx): si sale solo y si esta
// persona ya lo hizo. Aparte del componente para no cargarlo al abrir la app.
//
// RECORRIDO_AUTO: apagado hasta que el coach diga. Prendido, a quien entra
// con la visual nueva y no lo ha hecho le sale al abrir la app.
export const RECORRIDO_AUTO = false;
export const CLAVE_RECORRIDO = 'mt:recorridoHecho';
export const recorridoHecho = () => { try { return !!localStorage.getItem(CLAVE_RECORRIDO); } catch (e) { return true; } };
