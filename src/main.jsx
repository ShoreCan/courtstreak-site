// CourtStreak quality update v1
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';
import './player-app-ui.css';
import './quality-polish.css';
import './iphone-polish.css';

function NavigationReset() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

const courtstreakRedirect = sessionStorage.getItem('courtstreakRedirect');

if (courtstreakRedirect) {
  sessionStorage.removeItem('courtstreakRedirect');

  window.history.replaceState(
    null,
    '',
    '/courtstreak-site' + courtstreakRedirect
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/courtstreak-site">
      <NavigationReset />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
