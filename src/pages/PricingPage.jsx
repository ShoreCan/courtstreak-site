import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, MessagesSquare, Sparkles, UserRoundCheck, UsersRound } from 'lucide-react';
import SitePage from '../components/SitePage.jsx';
import { supabase } from '../lib/supabaseClient.js';

export default function PricingPage() {
  const [searchParams] = useSearchParams();
const inviteCode = searchParams.get('invite');
const checkoutType = searchParams.get('checkout');

const [currentUser, setCurrentUser] = useState(null);
const [startingCheckout, setStartingCheckout] = useState(false);
const checkoutAttempted = useRef(false);

useEffect(() => {
  let active = true;

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (active) {
      setCurrentUser(user ?? null);
    }
  }

  checkUser();

  return () => {
    active = false;
  };
}, []);
useEffect(() => {
  if (
  !currentUser ||
  checkoutType !== 'membership' ||
  startingCheckout ||
  checkoutAttempted.current
) {
  return;
}

checkoutAttempted.current = true;

  async function startCheckout() {
    setStartingCheckout(true);

    const returnUrl =
      window.location.origin +
      import.meta.env.BASE_URL.replace(/\/$/, '');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setStartingCheckout(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke(
      'create-stripe-checkout',
      {
        body: {
          inviteCode,
          returnUrl,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (error || !data?.url) {
      console.error('Could not create Stripe Checkout:', error || data);
      alert('Could not open checkout. Please try again.');
      setStartingCheckout(false);
      return;
    }

    window.location.href = data.url;
  }

  startCheckout();
}, [currentUser, checkoutType, inviteCode, startingCheckout]);
  return (
    <SitePage
  eyebrow="CourtStreak Membership"
  title="Build the habits that build your game."
  intro="Structured ball-handling and footwork training that helps players know what to work on, stay consistent, track progress, and compete with the people who push them."
  primaryLabel="Start Your Membership"
  primaryHref="/courtstreak-site/create-account?checkout=membership"
  secondaryLabel="See What’s Included"
  secondaryHref="#membership-details"
    finalEyebrow="Ready to Start Your Streak?"
  finalTitle="Join CourtStreak — $29.99/month"
  finalText="Train with purpose, build your streak, track your progress, and compete with the people who push you to improve."
  finalButtonLabel="Create Account"
  finalButtonHref="/courtstreak-site/create-account"
>
 
     <section
  id="membership-details"
  className="section site-content-section pricing-membership-section"
>
        <div className="site-pricing-grid">
          <article className="site-price-card featured">
            <div className="site-price-top">
              <span className="site-icon"><UserRoundCheck size={24} /></span>
              <p className="eyebrow">Individual Membership</p>
              <h2>$29.99 <small>/ month</small></h2>
              <p>
  For players who want structured training, visible progress, and a reason to stay consistent.
</p>
            </div>
            <ul className="site-check-list">
  <li><Check /> Guided ball-handling and footwork training</li>
  <li><Check /> Clear, structured drills for every session</li>
  <li><Check /> Streaks and XP that reward consistency</li>
  <li><Check /> Personal records and progress tracking</li>
  <li><Check /> Weekly challenges and leaderboards</li>
  <li><Check /> Private Training Circles</li>
  <li><Check /> New drills and training content added over time</li>
</ul>
            {currentUser ? (
  <button
    type="button"
    className="site-primary-button full"
    onClick={async () => {
  const returnUrl =
    window.location.origin +
    import.meta.env.BASE_URL.replace(/\/$/, '');
const {
  data: { session },
} = await supabase.auth.getSession();

if (!session?.access_token) {
  alert('Please log in before starting your membership.');
  return;
}
  const { data, error } = await supabase.functions.invoke(
    'create-stripe-checkout',
   {
  body: {
    inviteCode,
    returnUrl,
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
}
  );

  if (error) {
    console.error('Could not create Stripe Checkout:', error);
    alert('Could not open checkout. Please try again.');
    return;
  }

  if (!data?.url) {
    console.error('Stripe Checkout URL missing:', data);
    alert('Could not open checkout. Please try again.');
    return;
  }

  window.location.href = data.url;
}}
  >
    {inviteCode ? 'Unlock CourtStreak & Join Circle' : 'Start Membership'}
  </button>
) : (
  <Link
    className="site-primary-button full"
    to={
      inviteCode
        ? `/create-account?invite=${encodeURIComponent(inviteCode)}`
        : '/create-account?checkout=membership'
    }
  >
    {inviteCode ? 'Join CourtStreak & Accept Invite' : 'Create Account'}
  </Link>
)}
          </article>

          <article className="site-price-card">
            <div className="site-price-top">
              <span className="site-icon"><UsersRound size={24} /></span>
              <p className="eyebrow">Coach and Team Plans</p>
             <div className="site-custom-price">
  <strong>Custom</strong>
  <span>Team pricing</span>
</div>
              <p>For school teams, AAU programs, private trainers, and development groups.</p>
            </div>
            <ul className="site-check-list compact">
              <li><Check /> Private team Training Circles</li>
              <li><Check /> Player invitations and organization</li>
              <li><Check /> Workout assignments</li>
              <li><Check /> Team accountability dashboard</li>
              <li><Check /> Individual development plans</li>
              <li><Check /> Coach feedback and communication</li>
              <li><Check /> Group challenges and milestones</li>
              <li><Check /> Program-level support</li>
            </ul>
            <a className="site-secondary-button full" href="/courtstreak-site/#contact">Contact CourtStreak</a>
          </article>
        </div>

       <div className="site-pricing-note">
  <Sparkles />
  <div>
    <strong>More than workouts. A reason to keep showing up.</strong>
    <p>
      CourtStreak combines structured ball-handling and footwork training with
      streaks, progress tracking, challenges, and private competition so players
      have a clear reason to stay consistent and keep improving.
    </p>
  </div>
</div>
      </section>

     <section className="section site-value-strip">
  <div>
    <UserRoundCheck />
    <strong>Train With Purpose</strong>
    <span>Know exactly what to work on when you open CourtStreak.</span>
  </div>

  <div>
    <Sparkles />
    <strong>Build Consistency</strong>
    <span>Streaks and XP give players a reason to keep showing up.</span>
  </div>

  <div>
    <MessagesSquare />
    <strong>Track Progress</strong>
    <span>See workouts, personal records, milestones, and improvement.</span>
  </div>

  <div>
    <UsersRound />
    <strong>Compete Together</strong>
    <span>Challenge friends and teammates inside private Training Circles.</span>
  </div>
</section>
    </SitePage>
  );
}
