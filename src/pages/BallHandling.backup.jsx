import React from 'react';
import { ArrowRight, CheckCircle2, Clock, Lock, Play, Trophy } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const paths = [
  {
    level: 'Beginner',
    label: 'Foundation',
    color: 'green',
    sessions: 18,
    copy: 'Build control, confidence, weak-hand comfort, and clean basic moves.',
  },
  {
    level: 'Intermediate',
    label: 'Development',
    color: 'orange',
    sessions: 24,
    copy: 'Add pace, counters, combos, movement, and change-of-direction work.',
  },
  {
    level: 'Advanced',
    label: 'Mastery',
    color: 'red',
    sessions: 28,
    copy: 'Create space, handle pressure, read defenders, and attack game situations.',
  },
  {
    level: 'Pro',
    label: 'Elite Level',
    color: 'locked',
    sessions: 'Coming Soon',
    copy: 'Pro-level reads, counters, pressure decisions, and elite guard workouts.',
  },
];

const master = [
  'Ball Control',
  'Change of Pace',
  'Create Space',
  'Beat Defenders',
  'Game IQ',
];

const curriculum = [
  ['Stationary Pounds', 'Preview'],
  ['Basic Crossovers', 'Locked'],
  ['Between the Legs', 'Locked'],
  ['Behind the Back', 'Locked'],
  ['Low Pound Series', 'Locked'],
];

export default function BallHandling() {
  return (
    <main>
      <Navbar />

      <section className="training-page">
        <div className="training-breadcrumb">Training / Ball Handling</div>

        <div className="training-hero">
          <div>
            <p className="eyebrow">Training Path</p>
            <h1>Ball Handling</h1>
            <h2>Complete control. Confident game.</h2>
            <p>
              A structured progression that takes players from learning the basics
              to mastering advanced moves used by elite guards.
            </p>

            <div className="training-stats">
              <span><strong>52</strong> Sessions</span>
              <span><strong>4</strong> Levels</span>
              <span><strong>15+</strong> Hours</span>
              <span><strong>Track</strong> Progress</span>
            </div>
          </div>
        </div>

        <div className="training-heading">
          <span></span>
          <h2>The CourtStreak Path</h2>
          <span></span>
        </div>

        <div className="path-grid">
          {paths.map((path) => (
            <article className={`path-card ${path.color}`} key={path.level}>
              <div className="path-image">
                {path.color === 'locked' && <Lock size={34} />}
              </div>
              <h3>{path.level}</h3>
              <small>{path.label}</small>
              <p>{path.copy}</p>
              <div className="path-footer">
                <span>0% Complete</span>
                <span>{path.sessions} {typeof path.sessions === 'number' ? 'Sessions' : ''}</span>
              </div>
            </article>
          ))}
        </div>

        <section className="master-card">
          <h2>What You’ll Master</h2>
          <div className="master-grid">
            {master.map((item) => (
              <div key={item}>
                <CheckCircle2 size={28} />
                <strong>{item}</strong>
                <p>Train with purpose and build skills that translate to real games.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="training-details">
          <div className="preview-card">
            <p className="eyebrow">Free Preview</p>
            <h2>Stationary Pounds</h2>
            <div className="preview-meta">
              <span><Clock size={16} /> 10 Minutes</span>
              <span><Trophy size={16} /> Beginner</span>
            </div>
            <div className="video-preview">
              <Play size={34} />
            </div>
            <p>
              The key to a great handle starts with control. Build strength in your
              hands, rhythm in your dribble, and confidence with the ball.
            </p>
            <a href="#join">Watch Preview</a>
          </div>

          <div className="curriculum-card">
            <p className="eyebrow">Curriculum Overview</p>
            <div className="module-top">
              <strong>1 Foundation</strong>
              <span>18 Sessions</span>
            </div>

            {curriculum.map(([lesson, status], index) => (
              <div className="lesson-row" key={lesson}>
                <span>{index + 1}. {lesson}</span>
                <small className={status.toLowerCase()}>{status}</small>
              </div>
            ))}

            <div className="locked-module">2 Development <span>24 Sessions</span></div>
            <div className="locked-module">3 Mastery <span>28 Sessions</span></div>
            <div className="locked-module">4 Elite Level <span>Coming Soon</span></div>
          </div>
        </section>

        <section className="unlock-band">
          <div>
            <p className="eyebrow">Unlock the Full Path</p>
            <h2>Become unstoppable with the ball.</h2>
            <p>Join CourtStreak and start your ball handling journey today.</p>
          </div>
          <a href="/courtstreak-site/#join">Join the Waitlist <ArrowRight size={18} /></a>
        </section>
      </section>

      <Footer />
    </main>
  );
}
