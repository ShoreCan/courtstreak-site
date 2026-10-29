import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import {accountAccessStatus,safeAccountReturn} from '../lib/accountFlow.mjs';

export default function RequireAccount({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let active = true;
    if (!supabase) { setStatus('error'); return; }
    supabase.auth.getUser().then(({ data, error }) => {
      if (active) setStatus(accountAccessStatus({data,error}));
    }).catch(() => { if (active) setStatus('error'); });
    const timeout=setTimeout(()=>{if(active)setStatus(value=>value==='loading'?'error':value);},15000);
    const {data}=supabase.auth.onAuthStateChange(event=>{if(active&&event==='SIGNED_OUT')setStatus('logged-out');});
    return () => { active = false; clearTimeout(timeout);data.subscription.unsubscribe(); };
  }, []);
  const next=safeAccountReturn(location.pathname+location.search+location.hash);
  if (status === 'logged-out') return <Navigate to={next?`/login?next=${encodeURIComponent(next)}`:'/login'} state={{from:next}} replace />;
  if (status !== 'ready') return <main className="cs-welcome-page"><section className="cs-welcome-card"><h1>{status === 'error' ? 'Account access could not be checked.' : 'Loading your account…'}</h1>{status === 'error' && <button onClick={() => window.location.reload()}>Try again</button>}</section></main>;
  return children;
}
