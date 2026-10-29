import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, MessagesSquare, Sparkles, UserRoundCheck, UsersRound } from 'lucide-react';
import SitePage from '../components/SitePage.jsx';
import { supabase } from '../lib/supabaseClient.js';
import {createCheckoutAction} from '../lib/billingFlow.mjs';

export default function PricingPage() {
  const [searchParams] = useSearchParams();
const inviteCode = searchParams.get('invite');

const navigate=useNavigate();
const [currentUser,setCurrentUser]=useState(null),[startingCheckout,setStartingCheckout]=useState(false),[checkoutError,setCheckoutError]=useState('');
const checkout=useRef(null);
if(!checkout.current)checkout.current=createCheckoutAction(supabase);
useEffect(()=>{
 let active=true;
 if(supabase)supabase.auth.getUser().then(({data})=>{if(active)setCurrentUser(data?.user||null);}).catch(()=>{if(active)setCheckoutError('Your sign-in could not be checked. Log in before starting membership.');});
 return()=>{active=false;};
},[]);
async function openCheckout(){
 setStartingCheckout(true);setCheckoutError('');
 try{
  const result=await checkout.current({inviteCode,returnUrl:window.location.origin+import.meta.env.BASE_URL.replace(/\/$/,'')});
  if(result.destination)navigate(result.destination);else window.location.assign(result.url);
 }catch(error){setCheckoutError(error.message||'Checkout could not open. Please try again.');}
 finally{setStartingCheckout(false);}
}
  return (
    <SitePage
  eyebrow="CourtStreak Membership"
  title="Make training a habit."
  intro="Guided drills, progress tracking, and private Training Circles."
  primaryLabel="View membership"
  primaryHref="#membership-details"
  secondaryLabel="Explore first"
  secondaryHref="/courtstreak-site/preview"
    finalEyebrow="Ready to Start Your Streak?"
  finalTitle="Join CourtStreak — $29.99/month"
  finalText="One player. Monthly membership. Manage or cancel anytime."
  finalButtonLabel={currentUser ? "View membership" : "Create Account"}
  finalButtonHref={currentUser ? "#membership-details" : "/courtstreak-site/create-account?checkout=membership"}
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
  Training and progress for one player.
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
    onClick={openCheckout}
    disabled={startingCheckout}
    aria-busy={startingCheckout}

  >
    {startingCheckout?'Opening checkout…':inviteCode?'Start membership & join':'Start membership'}
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
            {checkoutError&&<p className="cs-membership-error" role="alert">{checkoutError}</p>}
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
            <a className="site-secondary-button full" href="/courtstreak-site/contact">Contact CourtStreak</a>
          </article>
        </div>

       <div className="site-pricing-note">
  <Sparkles />
  <div>
    <strong>More than workouts. A reason to keep showing up.</strong>
    <p>
      Follow a plan. See your progress. Train with your crew.
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
