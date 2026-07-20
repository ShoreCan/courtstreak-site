import React from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function SitePage({
  eyebrow,
  title,
  intro,
  primaryLabel = 'Create Account',
  primaryHref = '/courtstreak-site/#join',
  secondaryLabel,
  secondaryHref,
  children,
}) {
  return (
    <main className="site-page">
      <Navbar />

      <section className="site-page-hero">
        <div className="site-page-hero-inner">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="site-page-intro">{intro}</p>

          <div className="site-page-actions">
            <a className="site-primary-button" href={primaryHref}>{primaryLabel}</a>
            {secondaryLabel && secondaryHref && (
              <a className="site-secondary-button" href={secondaryHref}>{secondaryLabel}</a>
            )}
          </div>
        </div>
      </section>

      {children}

      <section className="site-page-final">
        <div>
          <p className="eyebrow">Start Your Development Plan</p>
          <h2>More structure. More accountability. More purposeful training.</h2>
          <p>
            Create your CourtStreak account and begin building a development plan
            designed around your goals.
          </p>
        </div>
        <a className="site-primary-button" href="/courtstreak-site/#join">
          Create Account
        </a>
      </section>

      <Footer />
    </main>
  );
}
