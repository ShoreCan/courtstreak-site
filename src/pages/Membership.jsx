import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, CreditCard, Receipt, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import '../membership-polish.css';
import {billingUrl} from '../lib/billingFlow.mjs';
export default function Membership() {
  const navigate=useNavigate();
  const [subscription,setSubscription]=useState(null);
  const [loading,setLoading]=useState(true);
  const [opening,setOpening]=useState(false);
  const [errorMessage,setErrorMessage]=useState('');
  const portalPending=useRef(false);
  useEffect(()=>{
    let mounted=true;
    async function load(){
      try {
        if(!supabase)throw Error('Membership information is temporarily unavailable. Please reload or contact support.');
        const {data:auth,error:userError}=await supabase.auth.getUser();
        if(!mounted)return;
        if(userError || !auth?.user){navigate('/login');return;}
        const {data,error}=await supabase.from('subscriptions').select('status, current_period_end').eq('user_id',auth.user.id).order('current_period_end',{ascending:false,nullsFirst:false}).limit(1).maybeSingle();
        if(error)throw Error('Your membership details could not load. Please reload or contact support.');
        if(mounted)setSubscription(data);
      }catch(error){if(mounted)setErrorMessage(error.message);}
      finally{if(mounted)setLoading(false);}
    }
    load();return()=>{mounted=false;};
  },[navigate]);
  async function manage(){
    if(portalPending.current)return;
    portalPending.current=true;setOpening(true);setErrorMessage('');
    try{
      const returnUrl=window.location.origin+import.meta.env.BASE_URL+'membership';
      const {data,error}=await supabase.functions.invoke('create-customer-portal',{body:{returnUrl}});
      if(error || !billingUrl(data?.url))throw Error('Billing could not open. Please try again or contact support.');
      window.location.assign(billingUrl(data.url));
    }catch(error){setErrorMessage(error.message);}
    finally{portalPending.current=false;setOpening(false);}
  }
  const status=subscription?.status;
  const statusLabel=errorMessage && !subscription ? 'Details unavailable' : status ? status.replace(/_/g,' ') : 'No membership';
  const periodEnd=subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const date=periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : 'See billing portal';
  return <main className="cs-membership-page">
    <div className="cs-membership-shell">
      <Link className="cs-membership-back" to="/dashboard"><ArrowLeft size={18}/>Dashboard</Link>
      <header className="cs-membership-heading"><span className="cs-membership-eyebrow">ACCOUNT & BILLING</span><h1>Your membership.</h1><p>Your plan, payment details, and cancellation in one place.</p></header>
      {loading ? <p role="status">Loading your membership…</p> : <>
      {errorMessage && <p className="cs-membership-error" role="alert">{errorMessage}</p>}
      <div className="cs-membership-layout">
        <section className="cs-membership-plan" aria-label="Your plan">
          <div className="cs-membership-plan-top"><span className="cs-membership-eyebrow">COURTSTREAK MONTHLY</span><span className={`cs-membership-status ${status==='active'||status==='trialing'?'is-active':''}`}>{statusLabel}</span></div>
          <h2>Player membership</h2><p className="cs-membership-price">$29.99 <span>/ month</span></p>
          <p className="cs-membership-muted">Standard monthly plan rate. Your invoices show the amount actually charged.</p>
          <dl className="cs-membership-details"><div><dt><Users size={17}/>Plan coverage</dt><dd>1 player</dd></div><div><dt><CreditCard size={17}/>Billing schedule</dt><dd>Monthly</dd></div><div><dt><Receipt size={17}/>Current period ends</dt><dd>{subscription ? date : 'Not subscribed'}</dd></div></dl>
          {subscription ? <button className="cs-membership-primary" onClick={manage} disabled={opening}>{opening?'Opening billing…':'Manage or cancel membership'}{!opening&&<ExternalLink size={17}/>}</button> : !errorMessage ? <Link className="cs-membership-primary" to="/pricing?checkout=membership">View membership options</Link> : null}
        </section>
        <section className="cs-membership-value" aria-label="Billing help"><h2>You’re in control.</h2><article><CreditCard size={22}/><div><h3>Payment methods & invoices</h3><p>Open billing to update your payment method and view your payment history.</p></div></article><article><Receipt size={22}/><div><h3>Cancellation</h3><p>Use “Manage or cancel membership” to review and confirm cancellation in Stripe. Billing shows the effective date and renewal details.</p></div></article><div className="cs-membership-preview-note"><strong>Need a hand?</strong><p>Contact CourtStreak support for help with your plan or billing.</p><Link className="cs-membership-text-link" to="/contact">Contact support →</Link></div></section>
      </div></>}
    </div>
  </main>;
}
