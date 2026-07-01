import React, { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import AppPreview from '../components/AppPreview.jsx';
import ChallengeHub from '../components/ChallengeHub.jsx';
import ParentTrust from '../components/ParentTrust.jsx';
import Mission from '../components/Mission.jsx';
import Testimonials from '../components/Testimonials.jsx';
import FAQ from '../components/FAQ.jsx';
import CoachDashboard from '../components/CoachDashboard.jsx';
import ContactSupport from '../components/ContactSupport.jsx';
import Pricing from '../components/Pricing.jsx';
import DownloadCTA from '../components/DownloadCTA.jsx';
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

      <section className="section visual-preview-section">
        <div className="section-heading center">
          <p className="eyebrow">CourtStreak App Preview</p>
          <h2>See the full training experience in one glance.</h2>
          <p>
            Daily workouts, streaks, challenges, training circles, leaderboards,
            badges, and coach tools all come together inside one clean player experience.
          </p>
        </div>

        <div className="visual-preview-frame">
          <img
            src="/courtstreak-site/images/courtstreak-app-preview.png"
            alt="CourtStreak app preview"
          />
        </div>
      </section>

      <ChallengeHub />
      <Mission />
      <ParentTrust />
      <Testimonials />
      <CoachDashboard />
      <ContactSupport />
      <FAQ />
      <Pricing />
      <DownloadCTA />
      <Footer />
    </main>
  );
}
