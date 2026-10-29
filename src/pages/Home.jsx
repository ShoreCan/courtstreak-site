import React from 'react';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import ProgressCommunity from '../components/ProgressCommunity.jsx';
import Footer from '../components/Footer.jsx';

export default function Home() {

  return (
    <main>
      <Navbar />

      <Hero />

      <ProgressCommunity />
      <Footer />
    </main>
  );
}