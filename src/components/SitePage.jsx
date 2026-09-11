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
  finalEyebrow = 'Start Your Development Plan',
  finalTitle = 'More structure. More accountability. More purposeful training.',
  finalText = 'Create your CourtStreak account and begin building a development plan designed around your goals.',
  finalButtonLabel = 'Create Account',
  finalButtonHref = '/courtstreak-site/#join',
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
    <p className="eyebrow">{finalEyebrow}</p>
    <h2>{finalTitle}</h2>
    <p>{finalText}</p>
  </div>

  <a className="site-primary-button" href={finalButtonHref}>
    {finalButtonLabel}
  </a>
</section>

      <Footer />
    </main>
  );
}
