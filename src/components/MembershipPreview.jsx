import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Clock, TrendingUp, Users } from 'lucide-react';
import '../membership-polish.css';
export default function MembershipPreview({ inviteCode }) {
  const query = inviteCode ? `?invite=${encodeURIComponent(inviteCode)}&accept=1` : '';
  const previewQuery = inviteCode ? `?invite=${encodeURIComponent(inviteCode)}` : '';
  return <main className="cs-membership-page">
    <div className="cs-membership-shell">
      <header className="cs-membership-heading"><span className="cs-membership-eyebrow">COURTSTREAK MEMBERSHIP</span><h1>Make the work yours.</h1><p>A plan for your training. A record of your progress. People who keep you showing up.</p></header>
      <div className="cs-membership-layout">
        <section className="cs-membership-plan" aria-label="Monthly membership plan">
          <span className="cs-membership-eyebrow">ONE PLAYER · MONTHLY</span>
          <h2>CourtStreak Membership</h2>
          <p className="cs-membership-price">$29.99 <span>/ month</span></p>
          <p className="cs-membership-muted">Monthly subscription. Manage or cancel through your Membership page.</p>
          <ul className="cs-membership-checklist">{['Guided workouts and individual drills','Save results and track improvement','Build your streak and earn XP','Unlock achievements and Training Circles'].map(text=><li key={text}><Check size={18} aria-hidden="true"/><span>{text}</span></li>)}</ul>
          <Link className="cs-membership-primary" to={`/create-account${query}`}>Create your account <ArrowRight size={18} aria-hidden="true"/></Link>
          <p className="cs-membership-small">Creating an account is free. Paid training unlocks after subscribing.</p>
          <Link className="cs-membership-text-link" to={`/pricing${query}`}>View plan details →</Link>
        </section>
        <section className="cs-membership-value" aria-label="What membership unlocks">
          <h2>Know what you’re getting.</h2>
          {[['Train with direction','Choose a workout or focus on one skill, with timers and clear coaching cues.',Clock],['See your work add up','Review recorded results, personal progress, streaks, and earned achievements.',TrendingUp],['Keep your crew close','Share selected training with your Circles and challenge the people who push you.',Users]].map(([title,body,Icon])=><article key={title}><Icon size={22} aria-hidden="true"/><div><h3>{title}</h3><p>{body}</p></div></article>)}
          <div className="cs-membership-preview-note"><strong>Explore CourtStreak before paying.</strong><p>Browse the real layout with sample data. Previewing does not start workouts or record results.</p><Link className="cs-membership-text-link" to={`/preview/train${previewQuery}`}>Keep exploring <ArrowRight size={17} aria-hidden="true"/></Link></div>
          <details className="cs-membership-tracking"><summary>How results are recorded</summary><p>Follow the guided timers and enter your clean reps. Automatic camera counting is still being tested and is not included as an available feature.</p></details>
        </section>
      </div>
    </div>
  </main>;
}
