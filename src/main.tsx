import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { getMatchDetail, getTeamSchedule } from './api/espn';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}

// Console hooks for checking ratings on live data: __dida.getMatchDetail('soccer', 'esp.1', id)
(window as unknown as { __dida: unknown }).__dida = { getMatchDetail, getTeamSchedule };
