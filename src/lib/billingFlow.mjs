import {roleHome} from './accountFlow.mjs';

export function billingUrl(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
// The UI owns one request at a time. Server-side subscription/idempotency
// checks remain necessary; this also prevents double-tap checkout sessions.
export function createCheckoutAction(client){
 let pending=null;
 return options=>{
  if(pending)return pending;
  pending=(async()=>{
   if(!client)throw new Error('Membership is temporarily unavailable. Please try again.');
   const sessionResult=await client.auth.getSession();
   if(sessionResult.error)throw new Error('Your sign-in could not be checked. Please log in again.');
   const token=sessionResult.data?.session?.access_token;
   if(!token)return {destination:'/login?checkout=membership'+(options.inviteCode?'&invite='+encodeURIComponent(options.inviteCode):'')};
   const account=await client.rpc('cs_hub_account');
   const role=(Array.isArray(account.data)?account.data[0]:account.data)?.role;
   if(account.error||!['player','parent','coach'].includes(role))throw new Error('Your account could not be checked. Please try again.');
   if(role!=='player')return {destination:roleHome(role)};
   const membership=await client.rpc('has_active_courtstreak_membership');
   if(membership.error)throw new Error('Your membership could not be checked. Please try again.');
   if(membership.data)return {destination:options.inviteCode?`/training-circles/join/${encodeURIComponent(options.inviteCode)}?accept=1`:'/membership'};
   const result=await client.functions.invoke('create-stripe-checkout',{body:{inviteCode:options.inviteCode||null,returnUrl:options.returnUrl},headers:{Authorization:'Bearer '+token}});
   const url=billingUrl(result.data?.url);
   if(result.error||!url)throw new Error('Checkout could not open. Please try again.');
   return {url};
  })().finally(()=>{pending=null;});
  return pending;
 };
}
