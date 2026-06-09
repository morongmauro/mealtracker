import React from 'react';
import ReactDOM from 'react-dom/client';
import MealTracker from './MealTracker.jsx';
import CoachDashboard from './CoachDashboard.jsx';

// Ruteo simple: si la URL arranca con /coach, renderiza el dashboard.
// Cualquier otra ruta renderiza la app del cliente.
const path = (typeof window !== 'undefined' && window.location.pathname) || '/';
const isCoach = path === '/coach' || path.startsWith('/coach/');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isCoach ? <CoachDashboard /> : <MealTracker />}
  </React.StrictMode>
);
