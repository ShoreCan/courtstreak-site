import React from 'react';

const reviews = [
  ['Parent', 'My son asks to train now because he does not want to lose his streak.'],
  ['High School Player', 'The challenges make workouts feel competitive instead of boring.'],
  ['Coach', 'This gives players accountability outside of practice.'],
];

export default function Testimonials() {
  return (
    <section id="reviews" className="section">
      <div className="section-heading">
        <p className="eyebrow">Testimonials</p>
        <h2>Designed to earn trust from players, parents, and coaches.</h2>
      </div>

      <div className="feature-grid">
        {reviews.map(([name, quote]) => (
          <article className="testimonial" key={name}>
            <div className="stars">★★★★★</div>
            <p>“{quote}”</p>
            <strong>{name}</strong>
          </article>
        ))}
      </div>

      <div className="review-cta">
        <h3>Love CourtStreak?</h3>
        <p>Future users will be able to leave reviews and share success stories.</p>
        <a href="#join">Leave a review</a>
      </div>
    </section>
  );
}
