import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

export default function Welcome() {
  const [membershipStatus, setMembershipStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    let attempts = 0;

    async function checkMembership() {
      const { data, error } = await supabase.rpc(
        'has_active_courtstreak_membership'
      );

      if (!active) return;

      if (!error && data === true) {
        setMembershipStatus('active');
        return;
      }

      attempts += 1;

      if (attempts < 10) {
        setTimeout(checkMembership, 1500);
      } else {
        setMembershipStatus('pending');
      }
    }

    checkMembership();

    return () => {
      active = false;
    };
  }, []);

  if (membershipStatus === 'checking') {
    return (
      <main className="cs-welcome-page">
        <section className="cs-welcome-card">
          <div className="cs-welcome-icon-wrap">
            <Sparkles size={30} />
          </div>

          <p className="cs-auth-eyebrow">ACTIVATING YOUR MEMBERSHIP</p>
          <h1>Getting CourtStreak ready.</h1>

          <p className="cs-welcome-lead">
            Your payment was received. We’re activating your membership now.
          </p>
        </section>
      </main>
    );
  }

  if (membershipStatus === 'pending') {
    return (
      <main className="cs-welcome-page">
        <section className="cs-welcome-card">
          <div className="cs-welcome-icon-wrap">
            <Sparkles size={30} />
          </div>

          <p className="cs-auth-eyebrow">MEMBERSHIP PROCESSING</p>
          <h1>Almost there.</h1>

          <p className="cs-welcome-lead">
            Your membership is still being confirmed. Please refresh this page
            in a moment.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="cs-welcome-page">
      <section className="cs-welcome-card">
        <div className="cs-welcome-icon-wrap">
          <Sparkles size={30} />
        </div>

        <p className="cs-auth-eyebrow">WELCOME TO COURTSTREAK</p>

        <h1>You’re officially in.</h1>

        <p className="cs-welcome-lead">
          Your CourtStreak membership is active. You now have everything you
          need to train with purpose, stay consistent, track your progress,
          and keep pushing your game forward.
        </p>

        <div className="cs-welcome-highlight">
          <Flame size={24} />

          <div>
            <strong>Your streak starts today.</strong>
            <span>
              This is the first step in building the habits that build your game.
            </span>
          </div>
        </div>

        <div className="cs-welcome-benefits">
          <div>
            <CheckCircle2 size={20} />
            <span>Structured ball-handling and footwork training</span>
          </div>

          <div>
            <CheckCircle2 size={20} />
            <span>Streaks, XP, personal records, and progress tracking</span>
          </div>

          <div>
            <CheckCircle2 size={20} />
            <span>Challenges, leaderboards, and private Training Circles</span>
          </div>
        </div>

        <Link className="site-primary-button cs-welcome-button" to="/dashboard">
          Start Your CourtStreak
        </Link>

        <p className="cs-welcome-footer">
          Welcome to the CourtStreak family.
        </p>
      </section>
    </main>
  );
}