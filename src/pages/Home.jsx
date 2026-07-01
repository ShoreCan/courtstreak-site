import React, { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import AppPreview from '../components/AppPreview.jsx';
import ChallengeHub from '../components/ChallengeHub.jsx';
import ParentTrust from '../components/ParentTrust.jsx';
import Testimonials from '../components/Testimonials.jsx';
import Pricing from '../components/Pricing.jsx';
import Footer from '../components/Footer.jsx';

export default function Home() {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setJoined(true);
  }

  return (
    <main>
      <Navbar />
      <Hero email={email} setEmail={setEmail} joined={joined} handleSubmit={handleSubmit} />
      <AppPreview />
      <ChallengeHub />
      <ParentTrust />
      <Testimonials />
      <Pricing />
      <Footer />
    </main>
  );
}
