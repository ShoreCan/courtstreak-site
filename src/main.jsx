// Restore legacy deep links before the auth client reads recovery credentials.
import './lib/bootstrapLocation.mjs';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';
import './player-app-ui.css';
import './quality-polish.css';
import './iphone-polish.css';
import './theme.css';
import './lib/appearance.mjs';
import './training-moments.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/courtstreak-site">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
