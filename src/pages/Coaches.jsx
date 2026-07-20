import React from 'react';
import {
  BarChart3, ClipboardList, FileVideo, MessagesSquare,
  Network, Send, ShieldCheck, UsersRound
} from 'lucide-react';
import SitePage from '../components/SitePage.jsx';

const tools = [
  [UsersRound, 'Team Training Circles', 'Create private spaces for school teams, AAU programs, training groups, or individual clients.'],
  [Send, 'Workout assignments', 'Recommend structured workouts to the full group or assign development priorities to individual players.'],
  [BarChart3, 'Consistency dashboard', 'See participation, completed workouts, streaks, and overall engagement beyond scheduled practice.'],
  [ClipboardList, 'Individual development plans', 'Organize player-specific priorities and update them as strengths, weaknesses, and roles change.'],
  [MessagesSquare, 'Guided communication', 'Provide feedback, answer training questions, and reinforce important coaching points.'],
  [FileVideo, 'Film and skill feedback', 'Use submitted clips or performance results to give players more useful direction.'],
];

export default function Coaches() {
  return (
    <SitePage
      eyebrow="For Coaches and Trainers"
      title="Keep Players Accountable Beyond Practice."
      intro="CourtStreak helps coaches and trainers organize development plans, assign purposeful work, follow player consistency, and provide guidance between in-person sessions."
      primaryLabel="Create a Coach Account"
      secondaryLabel="Explore Team Plans"
      secondaryHref="/courtstreak-site/pricing"
    >
      <section className="section site-content-section">
        <div className="section-heading center">
          <p className="eyebrow">Coach Tools</p>
          <h2>Extend your development system beyond the gym.</h2>
          <p>
            Give players clear expectations outside practice while keeping training,
            communication, and accountability organized in one place.
          </p>
        </div>

        <div className="site-feature-grid three-column">
          {tools.map(([Icon, title, text]) => (
            <article className="site-feature-card" key={title}>
              <span className="site-icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section site-split-section">
        <div className="site-highlight-card">
          <Network size={32} />
          <p className="eyebrow">Example Team Workflow</p>
          <h3>One system for weekly accountability.</h3>
          <ul>
            <li>Coach creates a private team circle</li>
            <li>Players receive a weekly development focus</li>
            <li>Workouts are completed outside practice</li>
            <li>Results and consistency appear in the dashboard</li>
            <li>Coach sends recognition or corrective feedback</li>
            <li>Training priorities adjust throughout the season</li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">Designed for Different Programs</p>
          <h2>Use CourtStreak with the group you already lead.</h2>
          <div className="site-program-grid">
            <div><strong>School Teams</strong><span>Offseason and in-season accountability.</span></div>
            <div><strong>AAU Programs</strong><span>Development between tournaments and practices.</span></div>
            <div><strong>Private Trainers</strong><span>Client programming, feedback, and retention.</span></div>
            <div><strong>Small Groups</strong><span>Challenges, shared goals, and progress tracking.</span></div>
          </div>
          <p className="site-note"><ShieldCheck size={18} /> Team spaces remain private to invited members.</p>
        </div>
      </section>
    </SitePage>
  );
}
