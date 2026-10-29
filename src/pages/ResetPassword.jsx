import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase,recoverySession} from '../lib/supabaseClient.js';
import {authErrorMessage} from '../lib/accountFlow.mjs';
import AuthShell,{PasswordField} from '../components/AuthShell.jsx';

export default function ResetPassword(){
 const [password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false),[status,setStatus]=useState('checking'),[retry,setRetry]=useState(0);
 const pending=useRef(false),finished=useRef(false);
 useEffect(()=>{
  if(!supabase){setStatus('error');return;}
  let active=true;setStatus('checking');
  const unsubscribe=recoverySession.subscribe(valid=>{if(active&&!finished.current)setStatus(valid?'recovery':'invalid');});
  const timeout=setTimeout(()=>{if(active&&!finished.current)setStatus('error');},15000);
  supabase.auth.getSession().then(({data,error})=>{if(active&&!finished.current)setStatus(error?'error':data?.session&&recoverySession.has(data.session)?'recovery':'invalid');}).catch(()=>{if(active)setStatus('error');}).finally(()=>clearTimeout(timeout));
  return()=>{active=false;clearTimeout(timeout);unsubscribe();};
 },[retry]);
 async function submit(event){
  event.preventDefault();if(pending.current)return;setError('');
  if(!supabase||status!=='recovery'||!recoverySession.has()){setStatus('invalid');return;}
  if(password.length<8){setError('Use at least 8 characters.');return;}
  if(password!==confirmPassword){setError('Your passwords don’t match.');return;}
  pending.current=true;setLoading(true);
  try{
   const result=await supabase.auth.updateUser({password});if(result.error)throw result.error;
   finished.current=true;recoverySession.clear();setStatus('done');setPassword('');setConfirmPassword('');
   try{const out=await supabase.auth.signOut();if(out.error)throw out.error;}catch{setError('Your password changed. Sign out from your account before logging in again.');}
  }catch(error){setError(authErrorMessage(error,'We couldn’t update your password. Please try again.'));}
  finally{pending.current=false;setLoading(false);}
 }
 const title=status==='done'?'Password updated.':status==='checking'?'Checking your link…':status==='invalid'?'This link has expired.':status==='error'?'Link check interrupted.':'Choose a new password.';
 return <AuthShell title={title}>
  {status==='checking'?<p className="cs-auth-simple-note" role="status">Verifying your reset link.</p>:status==='recovery'?<form onSubmit={submit} aria-busy={loading}>
   <PasswordField label="New password" name="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" value={password} onChange={event=>setPassword(event.target.value)} disabled={loading}/>
   <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} disabled={loading}/>
   {error&&<p className="cs-auth-simple-error" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading?'Updating…':'Update password'}</button>
  </form>:status==='done'?<div className="cs-auth-simple-confirm"><p>Log in with your new password.</p>{error&&<p className="cs-auth-simple-error" role="alert">{error}</p>}<Link to="/login" className="cs-auth-simple-action">Back to login</Link></div>:status==='error'?<div className="cs-auth-simple-confirm"><p>Check your connection and try again.</p><button className="cs-auth-simple-action" type="button" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>:<div className="cs-auth-simple-confirm"><p>Request a new reset link to continue.</p><Link className="cs-auth-simple-action" to="/forgot-password">Get a new link</Link></div>}
  {!['done','checking'].includes(status)&&<p className="cs-auth-simple-footer"><Link to="/login">Back to login</Link></p>}
 </AuthShell>;
}
