import React from 'react';
import { BadgeCheck, Camera, MessageSquareQuote, Star, Video } from 'lucide-react';
import SitePage from '../components/SitePage.jsx';

export default function Reviews() {
  return (
    <SitePage
      eyebrow="CourtStreak Reviews"
      title="Real Experiences From Players, Parents, and Coaches."
      intro="This page is reserved for verified CourtStreak member experiences. Placeholder testimonials will not be presented as real customer reviews."
      secondaryLabel="Learn How It Works"
      secondaryHref="/courtstreak-site/players"
    >
      <section className="section site-content-section">
        <div className="site-review-empty">
          <span className="site-icon large"><MessageSquareQuote size={30} /></span>
          <p className="eyebrow">Verified Member Stories</p>
          <h2>Reviews will appear here after members begin using CourtStreak.</h2>
          <p>
            Future reviews will identify the reviewer’s role and will only be published
            with permission. CourtStreak will prioritize specific, honest experiences
            over generic promotional quotes.
          </p>
        </div>

        <div className="site-feature-grid three-column review-types">
          <article className="site-feature-card">
            <Star />
            <h3>Player Reviews</h3>
            <p>Training consistency, skill development, confidence, and experience using the platform.</p>
          </article>
          <article className="site-feature-card">
            <BadgeCheck />
            <h3>Parent Reviews</h3>
            <p>Value, support, progress visibility, structure, and the player’s level of engagement.</p>
          </article>
          <article className="site-feature-card">
            <Camera />
            <h3>Coach Reviews</h3>
            <p>Accountability, team use, player development, communication, and training organization.</p>
          </article>
        </div>
      </section>

      <section className="section site-value-strip">
        <div><BadgeCheck /><strong>Verified</strong><span>Reviews tied to real member experiences.</span></div>
        <div><MessageSquareQuote /><strong>Specific</strong><span>Useful details rather than vague praise.</span></div>
        <div><Video /><strong>Video Stories</strong><span>Optional testimonials with permission.</span></div>
        <div><Camera /><strong>Progress Stories</strong><span>Member milestones and development journeys.</span></div>
      </section>
    </SitePage>
  );
}
