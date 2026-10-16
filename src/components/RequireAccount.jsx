import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import {safeHubNext} from '../hub/api.js';

export default function RequireAccount({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let active = true;
    if (!supabase) { setStatus('error'); return; }
    supabase.auth.getUser().then(({ data, error }) => {
      if (active) setStatus(!error && data?.user ? 'ready' : 'logged-out');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, []);
  if (status === 'logged-out') return <Navigate to={safeHubNext(location.pathname+location.search)?`/login?next=${encodeURIComponent(location.pathname+location.search)}`:'/login'} state={{ from: location.pathname + location.search }} replace />;
  if (status !== 'ready') return <main className="cs-welcome-page"><section className="cs-welcome-card"><h1>{status === 'error' ? 'Account access could not be checked.' : 'Loading your account…'}</h1>{status === 'error' && <button onClick={() => window.location.reload()}>Try again</button>}</section></main>;
  return children;
}
