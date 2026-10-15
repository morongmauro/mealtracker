// Visual nueva: cada sección (Dash, Entrenamiento, Aprendizaje) vive en su
// capa, y las capas quedan montadas aunque no estén al frente. Este contexto
// le dice a lo de adentro (cabeceras, objetos) si su capa está al frente:
// lo que entra con animación la repite cada vez que la capa vuelve, y no la
// gasta a escondidas. Sin proveedor (Alimentación, otros clientes) vale true.
import { createContext, useContext } from 'react';
export const CapaActiva = createContext(null);
export const useCapaActiva = () => { const v = useContext(CapaActiva); return v == null ? true : v; };
