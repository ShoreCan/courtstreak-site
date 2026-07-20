import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Flame,
  Medal,
  Play,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import './styles.css';

const drills = [
  { name: 'Tight Handle Series', type: 'Ball Handling', xp: 250, time: '12 min', status: 'Today' },
  { name: 'First-Step Footwork', type: 'Footwork', xp: 180, time: '9 min', status: 'Next' },
  { name: 'Rim Pressure Finishes', type: 'Finishing', xp: 220, time: '14 min', status: 'Locked' },
];

const leaderboard = [
  { rank: 1, name: 'Trey R.', xp: '18,220', tag: 'Legend pace' },
  { rank: 2, name: 'Jordan M.', xp: '17,900', tag: '32-day streak' },
  { rank: 3, name: 'Mason K.', xp: '17,350', tag: 'Handle king' },
  { rank: 4, name: 'Ari T.', xp: '16,880', tag: 'Clutch finisher' },
];

const features = [
  {
    icon: Camera,
    title: 'Train with guided reps',
    copy: 'Daily workouts give players a clear plan for handles, footwork, finishing, shooting, and game-ready movement.',
  },
  {
    icon: BarChart3,
    title: 'Track progress over time',
    copy: 'Streaks, XP, skill ratings, and workout history make improvement visible every time an athlete logs in.',
  },
  {
    icon: Users,
    title: 'Compete with your community',
    copy: 'Players can climb leaderboards, join weekly challenges, and eventually challenge teammates head-to-head.',
  },
];

function App() {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const completion = useMemo(() => 73, []);

  function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim()) return;
    setJoined(true);
  }

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#top" aria-label="CourtStreak home">
          <span className="brand-mark">CS</span>
          <span>CourtStreak</span>
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#dashboard">Dashboard</a>
          <a href="#teams">Teams</a>
          <a href="#pricing">Pricing</a>
        </div>
        <a className="nav-cta" href="#join">Create Account</a>
      </nav>

      <section id="top" className="hero section-grid">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={16} /> Daily basketball skill development</p>
          <h1>The training app that keeps hoopers coming back.</h1>
          <p className="hero-text">
            CourtStreak turns workouts into a daily habit with guided drills, streaks, badges, leaderboards, and weekly challenges built for competitive basketball players.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#join">Start building your streak <ArrowRight size={18} /></a>
            <a className="button secondary" href="#demo"><Play size={18} /> View app preview</a>
          </div>
          <div className="trust-row" aria-label="CourtStreak highlights">
            <span><CheckCircle2 size={16} /> Mobile-first web app</span>
            <span><CheckCircle2 size={16} /> Email login ready</span>
            <span><CheckCircle2 size={16} /> Built for teams</span>
          </div>
        </div>

        <div className="phone-card" id="demo" aria-label="CourtStreak mobile dashboard preview">
          <div className="phone-top">
            <span></span><span></span><span></span>
          </div>
          <div className="app-header">
            <div>
              <p>Good evening, Trey</p>
              <h2>Day 16</h2>
            </div>
            <div className="streak-pill"><Flame size={16} /> 16</div>
          </div>
          <div className="progress-card">
            <div className="progress-info">
              <span>Today’s workout</span>
              <strong>{completion}% complete</strong>
            </div>
            <div className="progress-track"><div style={{ width: `${completion}%` }} /></div>
          </div>
          <div className="drill-list">
            {drills.map((drill) => (
              <div className="drill-item" key={drill.name}>
                <div>
                  <strong>{drill.name}</strong>
                  <span>{drill.type} • {drill.time}</span>
                </div>
                <span className={`status ${drill.status.toLowerCase()}`}>{drill.status}</span>
              </div>
            ))}
          </div>
          <div className="stats-row">
            <div><Trophy size={18} /><strong>Gold III</strong><span>Rank</span></div>
            <div><Zap size={18} /><strong>13,420</strong><span>XP</span></div>
            <div><Medal size={18} /><strong>8</strong><span>Badges</span></div>
          </div>
        </div>
      </section>

      <section id="story" className="story-card">
        <div className="story-image" role="img" aria-label="Founder photo placeholder">
          <span>Add founder photo here</span>
        </div>
        <div>
          <p className="eyebrow"><ShieldCheck size={16} /> Player-led training</p>
          <h2>Built by a point guard who understands the grind.</h2>
          <p>
            Add your image here so visitors can put a face to the name. This section should tell players why CourtStreak exists: better habits, better reps, and a real community to compete with.
          </p>
        </div>
      </section>

      <section id="features" className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Inspired by elite training apps</p>
          <h2>Features that make training measurable, competitive, and repeatable.</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="feature-card" key={feature.title}>
                <Icon size={24} />
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="challenge-hub" className="split-section challenge-hub">
        <div>
          <p className="eyebrow"><Users size={16} /> Private competition</p>
          <h2>Challenge friends directly or compete inside your team group.</h2>
          <p>
            CourtStreak is not just a public leaderboard. Players can send direct challenges to friends, create teammate rivalries, and keep team-only competitions separate from the main community.
          </p>
          <div className="mini-grid">
            <span>1v1 direct challenges</span>
            <span>Team group chats</span>
            <span>Friend leaderboards</span>
            <span>Rematch requests</span>
          </div>
        </div>
        <div className="leaderboard-card chat-card">
          <div className="card-title">
            <h3>Team chat preview</h3>
            <span>Live concept</span>
          </div>
          <div className="chat-bubble left"><strong>Jordan</strong><p>Beat my 2-ball score. 60 reps in 30 seconds.</p></div>
          <div className="chat-bubble right"><strong>You</strong><p>Accepted. I’m sending my score tonight.</p></div>
          <div className="chat-bubble left"><strong>Coach</strong><p>Team challenge: 500 makes this week. Top 3 earn bonus XP.</p></div>
        </div>
      </section>

      <section id="dashboard" className="split-section">
        <div>
          <p className="eyebrow"><CalendarCheck size={16} /> Weekly challenge</p>
          <h2>One challenge each week. One leaderboard everyone cares about.</h2>
          <p>
            CourtStreak should feel simple: open the link, see today’s work, complete the drill, protect the streak, and move up the leaderboard.
          </p>
          <div className="challenge-card">
            <span>This week</span>
            <h3>2-Ball Pound Dribbles</h3>
            <p>Goal: 60 reps in 30 seconds</p>
            <div className="reward-row"><BadgeCheck size={18} /> +500 XP • Exclusive badge</div>
          </div>
        </div>
        <div className="leaderboard-card">
          <div className="card-title">
            <h3>Community leaderboard</h3>
            <span>Season 01</span>
          </div>
          {leaderboard.map((player) => (
            <div className="leader-row" key={player.name}>
              <span className="rank">#{player.rank}</span>
              <div>
                <strong>{player.name}</strong>
                <small>{player.tag}</small>
              </div>
              <span>{player.xp} XP</span>
            </div>
          ))}
        </div>
      </section>

      <section id="teams" className="section-block team-band">
        <div>
          <p className="eyebrow"><Users size={16} /> For teams, trainers, camps, and communities</p>
          <h2>Eventually, CourtStreak becomes more than a player app.</h2>
          <p>
            The next layer is a coach dashboard where trainers can assign workouts, host team challenges, track completion, and see who is really putting in the work.
          </p>
        </div>
        <div className="mini-grid">
          <span>Team invite links</span>
          <span>Private leaderboards</span>
          <span>Assigned workouts</span>
          <span>Progress history</span>
        </div>
      </section>

      <section id="reviews" className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Reviews and testimonials</p>
          <h2>Designed to earn trust from players, parents, and coaches.</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>★★★★★</h3>
            <p>“CourtStreak makes training simple, competitive, and easy for my son to follow.”</p>
            <strong>Parent of middle school player</strong>
          </article>
          <article className="feature-card">
            <h3>★★★★★</h3>
            <p>“The streaks and challenges make me want to train every day.”</p>
            <strong>High school guard</strong>
          </article>
          <article className="feature-card">
            <h3>★★★★★</h3>
            <p>“This is the accountability piece young players need outside of practice.”</p>
            <strong>Basketball trainer</strong>
          </article>
        </div>
        <div className="review-box">
          <h3>Love CourtStreak?</h3>
          <p>Future users will be able to leave reviews, share success stories, and help other families see the value of the platform.</p>
          <a className="button secondary" href="#join">Leave a review</a>
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <div className="pricing-card">
          <p className="eyebrow">Beta membership</p>
          <h2>$49.99/month</h2>
          <p>Unlimited daily drills, weekly challenges, streak tracking, XP, badges, and leaderboard access.</p>
          <a className="button primary full" href="#join">Join the beta</a>
        </div>
        <form id="join" className="signup-card" onSubmit={handleSubmit}>
          <h2>Get early access</h2>
          <p>Collect emails now. Add real authentication, payments, and database features later.</p>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="player@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="button primary full" type="submit">Save my spot</button>
          {joined && <p className="success">You’re on the CourtStreak beta list.</p>}
        </form>
      </section>

      <footer>
        <strong>CourtStreak</strong>
        <span>Train daily. Protect the streak. Compete everywhere.</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
