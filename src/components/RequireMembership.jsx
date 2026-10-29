import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import {getHubAccount,hubHome} from '../hub/api.js';
import { accountAccessStatus, safeAccountReturn } from '../lib/accountFlow.mjs';

export default function RequireMembership({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');
  const [managerPath,setManagerPath]=useState(null);

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

      const access = accountAccessStatus({data:{user},error:userError});
      if (access !== 'ready') {
        setStatus(access);
        return;
      }

      const account = await getHubAccount();
      if (!active) return;
      if (!['player','parent','coach'].includes(account.role)) throw new Error('Unknown account role');
      if (account.role !== 'player') { setManagerPath(hubHome(account.role)); setStatus('manager'); return; }

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

    checkAccess().catch(() => { if (active) setStatus('error'); });
    const timeout = setTimeout(() => { if (active) setStatus((value) => value === 'checking' ? 'error' : value); }, 15000);
    const {data}=supabase?.auth.onAuthStateChange(event=>{if(active&&event==='SIGNED_OUT')setStatus('logged-out');})||{};

    return () => {
      active = false;
      clearTimeout(timeout);
      data?.subscription?.unsubscribe();
    };
  }, []);

  if (status === 'manager') return <Navigate to={managerPath} replace />;

  if (status === 'checking') {
    return (
      <main className="cs-welcome-page">
        <section className="cs-welcome-card">
          <p className="cs-auth-eyebrow">COURTSTREAK</p>
          <h1>Opening your training…</h1>
        </section>
      </main>
    );
  }

  if (status === 'logged-out') {
    return (
      <Navigate
        to="/login"
        state={{ from: safeAccountReturn(location.pathname+location.search+location.hash) }}
        replace
      />
    );
  }

  if (status === 'unpaid') {
    return <Navigate to="/pricing" replace />;
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
