import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import BallHandling from './pages/BallHandling.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/training/ball-handling" element={<BallHandling />} />
    </Routes>
  );
}
