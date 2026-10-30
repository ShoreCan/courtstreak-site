import {safeTrackerReturn} from './trackerReturn.mjs';

const origin='https://courtstreak.invalid';
const fixed=new Set(['/dashboard','/train','/lab','/workout','/progress','/profile','/settings','/membership','/trophies','/trophies/collection','/training-circles','/hub','/team-hub','/family-hub','/assigned-work','/connections','/account/restore-player','/welcome']);
export function safeAccountReturn(value){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return null;
 try{
  const url=new URL(value,origin),path=url.pathname;
  if(url.origin!==origin)return null;
  const dynamic=/^\/(?:lab\/drill\/[a-z0-9-]+(?:\/session)?|training-circles\/(?:join\/)?[a-zA-Z0-9_-]+|hub\/invite\/[a-f0-9]{64}|(?:team|family)-hub\/[a-zA-Z0-9/-]+|assigned-work\/[a-zA-Z0-9/-]+|assigned-training\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+)$/.test(path);
  if(!fixed.has(path)&&!dynamic)return null;
  if(path==='/lab/drill/right-hand-pound/session'&&url.searchParams.has('mode'))return safeTrackerReturn(path+url.search);
  return path+url.search+url.hash;
 }catch{return null;}
}
export function accountRole(role){return role==='parent'?'parent':['coach','trainer'].includes(role)?'coach':'player';}
export function roleHome(role){return role==='parent'?'/family-hub':role==='coach'?'/team-hub':'/dashboard';}
export function accountAccessStatus({data,error}){
 if(!error)return data?.user?'ready':'logged-out';
 if(error.name==='AuthSessionMissingError'||[401,403].includes(error.status)||['session_not_found','refresh_token_not_found','refresh_token_already_used','bad_jwt','user_not_found','user_banned','not_authenticated'].includes(error.code))return 'logged-out';
 return 'error';
}
export async function loadAccountUser(client){
 if(!client)throw new Error('Your sign-in could not be checked. Please try again.');
 const result=await client.auth.getUser();
 if(accountAccessStatus(result)==='error')throw new Error('Your sign-in could not be checked. Please try again.');
 return accountAccessStatus(result)==='ready'?result.data.user:null;
}
export function accountLoginPath(next){return '/login'+contextQuery({next:safeAccountReturn(next)});}
export function accountContext(params,from){
 const raw=params.get('invite')?.trim();
 return {invite:raw&&raw.length<=512?raw:null,accept:params.get('accept')==='1',next:safeAccountReturn(params.get('next'))||safeAccountReturn(from),checkout:params.get('checkout')==='membership'};
}
export function contextQuery(context){
 const q=new URLSearchParams();
 if(context.invite){q.set('invite',context.invite);if(context.accept)q.set('accept','1');}
 if(context.next){q.set('next',context.next);try{const role=new URL(context.next,origin).searchParams.get('role');if(['parent','coach'].includes(role))q.set('role',role);}catch{}}
 if(context.checkout)q.set('checkout','membership');
 return q.size?'?'+q.toString():'';
}
export function explicitAccountDestination(context){
 if(context.invite)return `/training-circles/join/${encodeURIComponent(context.invite)}${context.accept?'?accept=1':''}`;
 return safeAccountReturn(context.next);
}
export async function resolveAccountDestination(client,context={}){
 const next=explicitAccountDestination(context);if(next)return next;
 const account=await client.rpc('cs_hub_account');
 if(account.error)throw new Error('Your account could not open. Please try again.');
 const data=Array.isArray(account.data)?account.data[0]:account.data;
 if(!['player','coach','parent'].includes(data?.role))throw new Error('Your account could not open. Please try again.');
 if(data.role!=='player')return roleHome(data.role);
 const membership=await client.rpc('has_active_courtstreak_membership');
 if(membership.error)throw new Error('Your membership could not be checked. Please try again.');
 return membership.data?'/dashboard':'/pricing';
}
export async function signInAndResolve(client,credentials,context){
 if(!client)throw new Error('Login is temporarily unavailable. Please try again shortly.');
 const result=await client.auth.signInWithPassword({email:credentials.email.trim().toLowerCase(),password:credentials.password});
 if(result.error)throw result.error;
 return resolveAccountDestination(client,context);
}
export function authErrorMessage(error,fallback='Something went wrong. Please try again.'){
 const code=error?.code||'',message=error?.message||'';
 if(code==='invalid_credentials'||/invalid login credentials/i.test(message))return 'Check your email and password, then try again.';
 if(code==='email_not_confirmed')return 'Confirm your email, then log in.';
 if(/rate_limit|over_.*limit/.test(code))return 'Please wait a moment before trying again.';
 if(code==='same_password')return 'Choose a different password.';
 if(code==='weak_password')return 'Choose a stronger password with at least 8 characters.';
 if(code==='reauthentication_needed')return 'Please log in again before changing your password.';
 if(/fetch|network|connection|offline|timeout/i.test(message))return 'Connection interrupted. Check your connection and try again.';
 if(error instanceof Error&&!code&&/^(Your account|Your membership|Login is temporarily)/.test(message))return message;
 return fallback;
}
