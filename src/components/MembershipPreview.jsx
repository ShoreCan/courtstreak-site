import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Clock, TrendingUp, Users } from 'lucide-react';
import '../membership-polish.css';
import '../preview-membership-offer.css';
export default function MembershipPreview({ inviteCode }) {
  const query = inviteCode ? `?invite=${encodeURIComponent(inviteCode)}&accept=1` : '';
  const previewQuery = inviteCode ? `?invite=${encodeURIComponent(inviteCode)}` : '';
  return <main className="cs-membership-page cs-membership-offer">
    <div className="cs-membership-shell">
      <header className="cs-membership-heading"><span className="cs-membership-eyebrow">FROM PREVIEW TO PROGRESS</span><h1>Train with purpose.</h1><p>Know what to work on. Build a streak you want to protect. Put your progress where you can see it.</p></header>
      <div className="cs-membership-layout">
        <section className="cs-membership-plan" aria-label="Monthly membership plan">
          <span className="cs-membership-eyebrow">ONE PLAYER · MONTHLY</span>
          <h2>Your game. Your next step.</h2>
          <p className="cs-membership-price">$29.99 <span>/ month</span></p>
          <p className="cs-membership-muted">Full player membership. Billed monthly. Manage or cancel anytime through your Membership page.</p>
          <ul className="cs-membership-checklist">{['10- and 20-minute guided workouts','Individual drills with clear coaching cues','Saved results, progress, streaks, and XP','Achievements, Circles, and friend challenges'].map(text=><li key={text}><Check size={18} aria-hidden="true"/><span>{text}</span></li>)}</ul>
          <Link className="cs-membership-primary" to={`/create-account${query}`}>Create your account <ArrowRight size={18} aria-hidden="true"/></Link>
          <p className="cs-membership-small">Create your account first. Choose a subscription when you’re ready to train.</p>
          <Link className="cs-membership-text-link" to={`/pricing${query}`}>View plan details →</Link>
        </section>
        <section className="cs-membership-value" aria-label="What membership unlocks">
          <h2>More than a list of drills.</h2>
          {[['Never wonder what to work on again.','Choose a structured workout or practice one skill. Follow the timer, the steps, and the coaching cues.',Clock],['Build a streak you don’t want to lose.','A completed drill supports your daily streak. Finish a full workout to build your workout record and weekly goal.',TrendingUp],['Compete with the people who push you.','Bring your friends or teammates into a private Circle. Share selected training and challenge each other to keep showing up.',Users]].map(([title,body,Icon])=><article key={title}><Icon size={22} aria-hidden="true"/><div><h3>{title}</h3><p>{body}</p></div></article>)}
          <div className="cs-membership-preview-note"><strong>See the experience. Then decide.</strong><p>Browse the real layout with sample data. Previewing does not start workouts or record results.</p><Link className="cs-membership-text-link" to={`/preview/train${previewQuery}`}>Explore CourtStreak <ArrowRight size={17} aria-hidden="true"/></Link></div>
          <details className="cs-membership-tracking"><summary>What happens after I create an account?</summary><p>Creating an account does not charge you. Subscribe to unlock training and saving your own results. Preview stats are fictional and do not become your personal progress.</p></details>
          <details className="cs-membership-tracking"><summary>Does it count my reps automatically?</summary><p>Follow the guided timers and enter your clean reps. Automatic camera counting is still being tested and is not included as an available feature.</p></details>
        </section>
      </div>
    </div>
  </main>;
}
