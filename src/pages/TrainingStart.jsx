import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import '../customer-preview.css';
import '../training-start-premium.css';

export default function TrainingStart({ previewOnly = false }) {
  const navigate = useNavigate();
  const timer = useRef(null);
  const [preferences, setPreferences] = useState(null);
  const [launching, setLaunching] = useState('');

  const route = (path) =>
    previewOnly
      ? path === '/dashboard' ? '/preview/player' : `/preview${path}`
      : path;

  useEffect(() => {
    if (previewOnly) return undefined;
    let mounted = true;

    supabase?.auth.getUser()
      .then(({ data }) => {
        if (mounted) setPreferences(data?.user?.user_metadata || {});
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, [previewOnly]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const launch = (event, destination) => {
    event.preventDefault();
    if (launching) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate(route(destination));
      return;
    }

    setLaunching(destination);

    timer.current = setTimeout(() => {
      navigate(route(destination));
    }, 400);
  };

  return (
    <main className="cs-training-start cs-training-premium">
      <Link className="cs-training-back" to={route('/dashboard')}>
        ← Dashboard
      </Link>

      <header className="cs-training-heading">
        <p className="cs-preview-eyebrow">START TRAINING</p>
        <h1>Your work starts here.</h1>
        <p className="cs-training-subtitle">
          A full workout or one focused skill.
        </p>
      </header>

      <div className="cs-training-premium-grid">
        <Link
          className="cs-training-choice cs-training-workout"
          to={route('/workout')}
          onClick={(event) => launch(event, '/workout')}
          aria-disabled={Boolean(launching)}
        >
          <div className="cs-training-choice-top">
            <span className="cs-training-choice-label">01 / FULL WORKOUT</span>
            <div className="cs-training-choice-icon cs-training-choice-icon--workout" aria-hidden="true">
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <circle cx="50" cy="50" r="42" fill="#f58020" stroke="#162033" strokeWidth="4"/>
                <path d="M50 8V92 M8 50H92 M22 16Q76 50 22 84 M78 16Q24 50 78 84" fill="none" stroke="#162033" strokeWidth="4"/>
                <ellipse cx="35" cy="24" rx="16" ry="8" fill="#ffc078" opacity=".18"/>
              </svg>
            </div>
          </div>

          <div className="cs-training-choice-content">
            <span className="cs-training-choice-kicker">BUILD CONSISTENCY</span>
            <h2>Train with a plan.</h2>
            <p>
              10 or 20 minutes. Follow the plan and finish every round.
            </p>
          </div>

          <div className="cs-training-choice-footer">
            <span>CHOOSE YOUR WORKOUT</span>
            <span className="cs-training-choice-arrow" aria-hidden="true">↗</span>
          </div>
        </Link>

        <Link
          className="cs-training-choice cs-training-drills"
          to={route('/lab')}
          onClick={(event) => launch(event, '/lab')}
          aria-disabled={Boolean(launching)}
        >
          <div className="cs-training-choice-top">
            <span className="cs-training-choice-label">02 / PRACTICE A SKILL</span>
            <div className="cs-training-choice-icon cs-training-choice-icon--skill" aria-hidden="true">
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <circle cx="50" cy="50" r="33" fill="none" stroke="var(--cs-theme-copy)" strokeWidth="4"/>
                <path d="M50 17V83 M17 50H83 M28 22Q70 50 28 78 M72 22Q30 50 72 78" fill="none" stroke="var(--cs-theme-copy)" strokeWidth="4" opacity=".95"/>
              </svg>
            </div>
          </div>

          <div className="cs-training-choice-content">
            <span className="cs-training-choice-kicker">MASTER YOUR CRAFT</span>
            <h2>Own your skills.</h2>
            <p>
              Pick a drill. Watch the move. Make it yours.
            </p>
          </div>

          <div className="cs-training-choice-footer">
            <span>EXPLORE DRILLS</span>
            <span className="cs-training-choice-arrow" aria-hidden="true">↗</span>
          </div>
        </Link>
      </div>

      <div className="cs-training-bottom-note">
        <div className="cs-training-bottom-mark" aria-hidden="true">CS</div>
        <div>
          <strong>Small steps. Real progress.</strong>
          <p>
            Single drills support your daily streak. Complete a full
            workout to earn workout completion rewards.
          </p>
        </div>
      </div>

      {preferences && (
        <p className="cs-guide-note">
          Your saved level: {preferences.skill_level || 'Intermediate'}.
          {' '}Preferred session: {preferences.preferred_training_duration || '20 minutes'}.
          {' '}Choose any plan.
        </p>
      )}

      {launching && (
        <div className="cs-training-animation" aria-hidden="true">
          <div className="cs-training-animation-ball">
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <circle cx="50" cy="50" r="46" fill="#f58020" stroke="#152033" strokeWidth="4"/>
              <path
                d="M50 4V96 M4 50H96 M20 15Q78 50 20 85 M80 15Q22 50 80 85"
                fill="none"
                stroke="#172034"
                strokeWidth="4"
              />
              <ellipse cx="35" cy="22" rx="20" ry="9" fill="#ffc078" opacity=".22"/>
            </svg>
          </div>
        </div>
      )}
    </main>
  );
}
