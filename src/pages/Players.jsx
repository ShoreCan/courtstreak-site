import React from 'react';
import {
  Activity, Award, BarChart3, CircleHelp, ClipboardCheck, Dumbbell,
  Flame, Goal, MessageCircle, PlayCircle, RefreshCw, Target, Users
} from 'lucide-react';
import SitePage from '../components/SitePage.jsx';

const features = [
  [Target, 'Personalized development roadmap', 'Training recommendations are organized around the player’s position, goals, skill level, schedule, and available equipment.'],
  [ClipboardCheck, 'Structured weekly plan', 'Players receive a clear plan instead of randomly choosing drills or wondering what to work on next.'],
  [PlayCircle, 'Professional demonstrations', 'Every workout is supported by clear video instruction, coaching points, and measurable performance targets.'],
  [MessageCircle, 'Live coaching feedback', 'Players can submit questions, receive guidance, and get feedback that helps them correct mistakes and progress.'],
  [RefreshCw, 'Plan adjustments', 'Training plans can evolve as players improve, complete assessments, or identify new development priorities.'],
  [Flame, 'Streaks and accountability', 'Completed workouts build streaks, unlock milestones, and create a reason to consistently show up.'],
  [Users, 'Training Circles', 'Share progress privately with friends, family, teammates, coaches, or trainers.'],
  [BarChart3, 'Progress tracking', 'Track workout completion, personal records, consistency, challenges, and long-term development.'],
];

export default function Players() {
  return (
    <SitePage
      eyebrow="For Players"
      title="Train With a Plan Built Around Your Development."
      intro="CourtStreak combines personalized training, professional instruction, live guidance, accountability, and progress tracking in one complete player-development membership."
      secondaryLabel="See Membership"
      secondaryHref="/courtstreak-site/pricing"
    >
      <section className="section site-content-section">
        <div className="section-heading center">
          <p className="eyebrow">More Than Workouts</p>
          <h2>Everything needed to train with purpose.</h2>
          <p>
            CourtStreak does not leave players alone with a video library. The platform
            helps each player understand what to work on, how to perform it, and how to progress.
          </p>
        </div>

        <div className="site-feature-grid">
          {features.map(([Icon, title, text]) => (
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
          <p className="eyebrow">Your Development Process</p>
          <h2>A clear path from assessment to improvement.</h2>
          <div className="site-step-list">
            <div><strong>1</strong><span><b>Set your goals.</b> Tell CourtStreak what you want to improve, your position, level, schedule, and equipment.</span></div>
            <div><strong>2</strong><span><b>Receive your plan.</b> Follow structured workouts and weekly priorities built around your development needs.</span></div>
            <div><strong>3</strong><span><b>Train and record.</b> Complete workouts, submit results, build streaks, and track personal records.</span></div>
            <div><strong>4</strong><span><b>Get guidance.</b> Ask questions, receive feedback, and adjust your plan as you improve.</span></div>
          </div>
        </div>

        <div className="site-highlight-card">
          <Activity size={30} />
          <p className="eyebrow">Sample Weekly Focus</p>
          <h3>Point Guard Development</h3>
          <ul>
            <li>Ball-control assessment</li>
            <li>Change-of-pace workout</li>
            <li>Finishing through contact</li>
            <li>Decision-making film study</li>
            <li>Live feedback checkpoint</li>
            <li>Competitive weekend challenge</li>
          </ul>
        </div>
      </section>

      <section className="section site-value-strip">
        <div><Award /><strong>Badges</strong><span>Recognize consistency and milestones.</span></div>
        <div><Goal /><strong>Challenges</strong><span>Compete with people who push you.</span></div>
        <div><Dumbbell /><strong>Progression</strong><span>Advance as your skills improve.</span></div>
        <div><CircleHelp /><strong>Support</strong><span>Get help when questions come up.</span></div>
      </section>
    </SitePage>
  );
}
