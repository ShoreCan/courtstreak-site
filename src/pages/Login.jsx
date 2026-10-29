import React,{useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {supabase} from '../lib/supabaseClient.js';
import {accountContext,contextQuery,signInAndResolve,authErrorMessage} from '../lib/accountFlow.mjs';
import AuthShell,{PasswordField} from '../components/AuthShell.jsx';

export default function Login(){
 const navigate=useNavigate(),location=useLocation(),[params]=useSearchParams();
 const context=accountContext(params,location.state?.from);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const pending=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function submit(event){
  event.preventDefault();if(pending.current)return;
  pending.current=true;setLoading(true);setError('');
  try{const next=await signInAndResolve(supabase,{email,password},context);if(mounted.current)navigate(next,{replace:true});}
  catch(error){if(mounted.current)setError(authErrorMessage(error,'We couldn’t log you in. Please try again.'));}
  finally{pending.current=false;if(mounted.current)setLoading(false);}
 }
 return <AuthShell title="Welcome back.">
  <form onSubmit={submit} aria-busy={loading}>
   <label className="cs-auth-simple-field"><span>Email</span><input name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" disabled={loading}/></label>
   <PasswordField name="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} disabled={loading}/>
   <Link className="cs-auth-simple-link cs-auth-simple-forgot" to="/forgot-password">Forgot password?</Link>
   {error&&<p className="cs-auth-simple-error" role="alert">{error}</p>}
   <button type="submit" disabled={loading}>{loading?'Logging in…':'Log in'}</button>
  </form>
  <p className="cs-auth-simple-footer">New here? <Link to={'/create-account'+contextQuery(context)}>Create an account</Link></p>
 </AuthShell>;
}
