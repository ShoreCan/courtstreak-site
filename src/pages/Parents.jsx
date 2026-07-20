import React from 'react';
import {
  BadgeCheck, CalendarCheck, Eye, HeartHandshake, LockKeyhole,
  MessageSquareText, ShieldCheck, UserRoundCheck
} from 'lucide-react';
import SitePage from '../components/SitePage.jsx';

const parentBenefits = [
  [CalendarCheck, 'A plan your player can follow', 'CourtStreak removes the pressure of finding drills and organizing an effective weekly training schedule.'],
  [Eye, 'Visible consistency', 'Parents can follow completed workouts, streaks, progress, and milestones when invited to the player’s Family Training Circle.'],
  [UserRoundCheck, 'Development matched to the player', 'Recommendations account for age, experience, goals, position, schedule, and available equipment.'],
  [MessageSquareText, 'Access to guidance', 'Membership includes support, coaching feedback, and opportunities to ask questions instead of relying only on videos.'],
  [LockKeyhole, 'Private sharing', 'Players choose which Training Circles can see their activity. Progress does not need to be posted publicly.'],
  [HeartHandshake, 'Encouragement without constant reminders', 'The streak, challenge, and progress systems help players take greater ownership of their consistency.'],
];

export default function Parents() {
  return (
    <SitePage
      eyebrow="For Parents"
      title="Give Your Player a Plan They Can Actually Follow."
      intro="CourtStreak helps young athletes train consistently with structured plans, professional instruction, guided support, and progress visibility for the people supporting them."
      primaryLabel="Create a Player Account"
      secondaryLabel="View Pricing"
      secondaryHref="/courtstreak-site/pricing"
    >
      <section className="section site-content-section">
        <div className="section-heading center">
          <p className="eyebrow">Built for Player Development</p>
          <h2>You should know what your membership is helping provide.</h2>
          <p>
            CourtStreak is designed to give players more direction and give parents
            greater confidence that training time is purposeful.
          </p>
        </div>

        <div className="site-feature-grid three-column">
          {parentBenefits.map(([Icon, title, text]) => (
            <article className="site-feature-card" key={title}>
              <span className="site-icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section site-split-section">
        <div>
          <p className="eyebrow">What Parents Receive</p>
          <h2>Support without having to become the trainer.</h2>
          <ul className="site-check-list">
            <li>Player onboarding and goal setting</li>
            <li>Recommended development pathway</li>
            <li>Structured weekly training schedule</li>
            <li>Professional drill demonstrations</li>
            <li>Progress and consistency visibility</li>
            <li>Private Family Training Circle</li>
            <li>Coaching support and live feedback</li>
            <li>Plan adjustments as the player develops</li>
          </ul>
        </div>

        <div className="site-highlight-card">
          <ShieldCheck size={32} />
          <p className="eyebrow">Parent Confidence</p>
          <h3>Clear, private, and development-focused.</h3>
          <p>
            CourtStreak is intended to help players build productive habits without
            turning their training into a fully public social feed.
          </p>
          <div className="site-mini-points">
            <span><BadgeCheck size={17} /> Age-aware recommendations</span>
            <span><BadgeCheck size={17} /> Private progress sharing</span>
            <span><BadgeCheck size={17} /> Clear membership support</span>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
