import React,{useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {supabase} from '../lib/supabaseClient.js';
import AuthShell from '../components/AuthShell.jsx';

export default function Welcome(){
 const [params]=useSearchParams(),invite=params.get('invite')?.trim().slice(0,512);
 const [status,setStatus]=useState('checking'),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true,attempts=0,timer;
  setStatus('checking');
  async function check(){
   try{
    if(!supabase)throw Error('Unavailable');
    const result=await supabase.rpc('has_active_courtstreak_membership');
    if(!active)return;
    if(result.error)throw result.error;
    if(result.data===true){setStatus('active');return;}
    attempts++;
    if(attempts<10)timer=setTimeout(check,1500);else setStatus('pending');
   }catch{if(active)setStatus('error');}
  }
  void check();return()=>{active=false;clearTimeout(timer);};
 },[retry]);
 const title=status==='active'?'You’re ready to train.':status==='checking'?'Checking membership…':status==='pending'?'Still confirming.':'Check interrupted.';
 return <AuthShell title={title}>
  <div className="cs-auth-simple-confirm">
   {status==='active'?<><p>Your membership is active.</p><Link className="cs-auth-simple-action" to={invite?`/training-circles/join/${encodeURIComponent(invite)}`:"/dashboard"}>{invite?"Continue to Circle":"Start training"}</Link></>:status==='checking'?<p role="status">This can take a moment after checkout.</p>:<><p>{status==='pending'?'Your membership isn’t active yet. If you just checked out, try again in a moment.':'Check your connection and try again.'}</p><button className="cs-auth-simple-action" type="button" onClick={()=>setRetry(value=>value+1)}>Check again</button><Link className="cs-auth-simple-link" to="/membership">View membership</Link></>}
   {status!=='checking'&&<Link className="cs-auth-simple-link" to="/hub">Open my account</Link>}
  </div>
 </AuthShell>;
}
