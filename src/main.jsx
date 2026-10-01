import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

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
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
