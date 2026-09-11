import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import AppPreview from '../components/AppPreview.jsx';
import ProgressCommunity from '../components/ProgressCommunity.jsx';
import Footer from '../components/Footer.jsx';

export default function Home() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [joined] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return;
    }

    navigate(
      `/create-account?email=${encodeURIComponent(cleanEmail)}`
    );
  }

  return (
    <main>
      <Navbar />

      <Hero
        email={email}
        setEmail={setEmail}
        joined={joined}
        handleSubmit={handleSubmit}
      />

      <ProgressCommunity />
<AppPreview />
      <Footer />
    </main>
  );
}