import React from 'react';

const steps = [
  ['01', 'Structure', 'Know exactly what to work on.'],
  ['02', 'Consistency', 'Build a habit you want to keep.'],
  ['03', 'Accountability', 'Train with people who push you.'],
  ['04', 'Confidence', 'See the work turn into progress.'],
];

export default function WhyItWorks() {
  return (
    <section id="why-it-works" className="section why-section">
      <div className="section-heading center">
        <p className="eyebrow">Why CourtStreak Works</p>
        <h2>Simple system. Better habits. Real improvement.</h2>
      </div>

      <div className="why-flow">
        {steps.map(([number, title, copy]) => (
          <div className="why-step" key={title}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
