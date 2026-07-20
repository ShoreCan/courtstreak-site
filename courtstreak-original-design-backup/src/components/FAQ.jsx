import React from 'react';

const faqs = [
  ['What is CourtStreak?', 'CourtStreak is a basketball training platform that helps players improve through daily workouts, streaks, XP, private challenges, leaderboards, and accountability.'],
  ['Who is CourtStreak for?', 'CourtStreak is built for players, parents, coaches, trainers, AAU teams, school teams, and anyone serious about basketball development.'],
  ['Can players challenge friends?', 'Yes. Players can send direct challenges to friends, teammates, or people inside their Training Circles.'],
  ['What are Training Circles?', 'Training Circles are private groups like Friends, Family, Trainer, AAU Team, or High School Team. Players can choose who sees their workouts and challenges.'],
  ['Can parents follow progress?', 'Yes. Parents can be invited into a player’s circle to see consistency, completed workouts, streaks, and progress without everything being public.'],
  ['Is CourtStreak a mobile app?', 'CourtStreak starts as a mobile-friendly website, so players can access it from any phone with a link. A dedicated app can come later.'],
  ['How much does it cost?', 'The planned membership is $49.99 per month and includes daily workouts, challenges, streaks, leaderboards, and future updates.'],
];

export default function FAQ() {
  return (
    <section id="faq" className="section faq-section">
      <div className="section-heading">
        <p className="eyebrow">FAQ</p>
        <h2>Questions parents and players usually ask first.</h2>
        <p>Clear answers before anyone signs up.</p>
      </div>

      <div className="faq-list">
        {faqs.map(([question, answer]) => (
          <details className="faq-item" key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>

      <div className="faq-visual-card">
        <h3>Questions should feel easy to answer.</h3>
        <p>
          Parents, players, and coaches should quickly understand how CourtStreak works,
          what it costs, and why it helps players stay consistent.
        </p>

        <div className="faq-mini-phone">
          <strong>Need help?</strong>
          <div>
            <strong>Training Question</strong>
            <span>Ask about drills, workouts, or progress.</span>
          </div>
          <div>
            <strong>Parent Support</strong>
            <span>Understand pricing, circles, and player progress.</span>
          </div>
          <div>
            <strong>Coach Setup</strong>
            <span>Learn how teams and challenges will work.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
