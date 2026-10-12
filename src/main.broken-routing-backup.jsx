import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { BrowserRouter } from 'react-router-dom';\nimport App from './App.jsx';\nimport './styles.css';\n\nconst courtstreakRedirect = sessionStorage.getItem('courtstreakRedirect');

if (courtstreakRedirect) {
  sessionStorage.removeItem('courtstreakRedirect');

  const base = '/courtstreak-site';
  window.history.replaceState(
    null,
    '',
    base + courtstreakRedirect
  );
}\n\ncreateRoot(document.getElementById('root')).render(\n  <BrowserRouter basename="/courtstreak-site">\n    <App />\n  </BrowserRouter>\n);\n