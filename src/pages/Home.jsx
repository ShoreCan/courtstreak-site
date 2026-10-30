import React from 'react';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import ProgressCommunity from '../components/ProgressCommunity.jsx';
import Footer from '../components/Footer.jsx';
import AITrainingShowcase from '../components/AITrainingShowcase.jsx';

export default function Home() {

  return (
    <main>
      <Navbar />

      <Hero />
      <AITrainingShowcase />

      <ProgressCommunity />
      <Footer />
    </main>
  );
}
