import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

export default function RequireMembership({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      if (!supabase) {
        if (active) setStatus('error');
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        setStatus('logged-out');
        return;
      }

      const {
        data: hasActiveMembership,
        error: membershipError,
      } = await supabase.rpc('has_active_courtstreak_membership');

      if (!active) return;

      if (membershipError) {
        console.error(
          'Could not verify CourtStreak membership:',
          membershipError
        );
        setStatus('error');
        return;
      }

      setStatus(hasActiveMembership ? 'active' : 'unpaid');
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <main className="cs-welcome-page">
        <section className="cs-welcome-card">
          <p className="cs-auth-eyebrow">COURTSTREAK</p>
          <h1>Loading your membership.</h1>
          <p className="cs-welcome-lead">
            Getting your CourtStreak experience ready.
          </p>
        </section>
      </main>
    );
  }

  if (status === 'logged-out') {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (status === 'unpaid') {
    return <Navigate to="/pricing?checkout=membership" replace />;
  }

  if (status === 'error') {
    return (
      <main className="cs-welcome-page">
        <section className="cs-welcome-card">
          <p className="cs-auth-eyebrow">COURTSTREAK</p>
          <h1>We couldn't verify your membership.</h1>
          <p className="cs-welcome-lead">
            Please refresh the page and try again.
          </p>
        </section>
      </main>
    );
  }

  return children;
}