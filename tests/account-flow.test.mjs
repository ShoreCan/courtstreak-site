import test from 'node:test';
import assert from 'node:assert/strict';
import {safeAccountReturn,accountContext,contextQuery,accountRole,resolveAccountDestination,signInAndResolve,authErrorMessage,loadAccountUser,accountLoginPath} from '../src/lib/accountFlow.mjs';

test('login preserves protected destinations including billing, Circle, assignment and tracker routes',()=>{
 for(const path of ['/membership','/settings#privacy-settings','/training-circles/crew-123','/assigned-training/a-b/c-d','/lab/drill/right-hand-pound/session?mode=iphone-fresh-frame-test','/family-hub?view=parent'])assert.equal(safeAccountReturn(path),path);
});
test('external, malformed and authentication-loop destinations are rejected',()=>{
 for(const path of ['https://example.com','//example.com','/\\example.com','/login','/create-account','/unknown','/lab/drill/right-hand-pound/session?mode=anything','/hub\n','/assigned-work/%2f%2fevil.test'])assert.equal(safeAccountReturn(path),null,path);
});
test('destination and invitation context survive the switch between login and signup',()=>{
 const next='/hub/invite/'+ 'a'.repeat(64)+'?role=parent';
 const context=accountContext(new URLSearchParams({next,invite:'crew-123',accept:'1',checkout:'membership'}));
 const restored=accountContext(new URLSearchParams(contextQuery(context)));
 assert.deepEqual(restored,context);assert.equal(new URLSearchParams(contextQuery(context)).get('role'),'parent');
 assert.equal(accountContext(new URLSearchParams(),'/membership').next,'/membership');
});
test('trainer signup uses the existing coach account contract',()=>{
 assert.equal(accountRole('trainer'),'coach');assert.equal(accountRole('parent'),'parent');assert.equal(accountRole('admin'),'player');
});
const client=(role='player',member=true)=>({rpc:async name=>({data:name==='cs_hub_account'?{role}:member,error:null})});
test('players, parents and coaches open their own destination after login',async()=>{
 assert.equal(await resolveAccountDestination(client()),'/dashboard');
 assert.equal(await resolveAccountDestination(client('parent')),'/family-hub');
 assert.equal(await resolveAccountDestination(client('coach')),'/team-hub');
 assert.equal(await resolveAccountDestination(client('player',false)),'/pricing');
});
test('explicit links are resumed through their normal route gates',async()=>{
 const noRpc={rpc(){assert.fail('An explicit protected route performs its own access check');}};
 assert.equal(await resolveAccountDestination(noRpc,{next:'/membership'}),'/membership');
 assert.equal(await resolveAccountDestination(noRpc,{invite:'crew/one',accept:true,next:'/profile'}),'/training-circles/join/crew%2Fone?accept=1');
});
test('unknown roles and unavailable role or membership checks do not redirect to paid training',async()=>{
 await assert.rejects(resolveAccountDestination(client('unknown')),/account could not/);
 await assert.rejects(resolveAccountDestination({rpc:async()=>({error:{code:'offline'}})}),/account could not/);
 await assert.rejects(resolveAccountDestination({rpc:async name=>name==='cs_hub_account'?{data:{role:'player'}}:{error:{code:'offline'}}}),/membership could not/);
});
test('failed login never runs account queries and successful login keeps normalized credentials',async()=>{
 const failure={auth:{signInWithPassword:async()=>({error:{code:'invalid_credentials'}})},rpc:()=>assert.fail('No role query after failed sign-in')};
 await assert.rejects(signInAndResolve(failure,{email:' Player@Example.test ',password:'sample'},{}),error=>error.code==='invalid_credentials');
 let received;const success={...client('parent'),auth:{signInWithPassword:async value=>{received=value;return {error:null};}}};
 assert.equal(await signInAndResolve(success,{email:' Parent@Example.test ',password:'sample'},{}),'/family-hub');
 assert.equal(received.email,'parent@example.test');
});
test('connection failures reach the form error handler and messages contain no setup instructions',async()=>{
 await assert.rejects(signInAndResolve({auth:{signInWithPassword:async()=>{throw Error('Failed to fetch');}}},{email:'a@b.test',password:'sample'},{}));
 assert.match(authErrorMessage(Error('Failed to fetch')),/Connection interrupted/);
 assert.equal(authErrorMessage({code:'invalid_credentials'}),'Check your email and password, then try again.');
 assert.doesNotMatch(authErrorMessage({message:'missing SQL function cs_hub_account'}),/SQL|function|Supabase/);
});

test('network failures do not masquerade as a signed-out account', async () => {
  const {accountAccessStatus} = await import('../src/lib/accountFlow.mjs');
  assert.equal(accountAccessStatus({data:{user:{id:'player'}}}), 'ready');
  assert.equal(accountAccessStatus({data:{user:null}}), 'logged-out');
  assert.equal(accountAccessStatus({error:{name:'AuthSessionMissingError'}}), 'logged-out');
  assert.equal(accountAccessStatus({error:{status:401}}), 'logged-out');
  assert.equal(accountAccessStatus({error:{name:'AuthRetryableFetchError',status:0}}), 'error');
  assert.equal(accountAccessStatus({error:{status:503}}), 'error');
});

test('page reloads keep connection failures on the current page instead of signing the player out',async()=>{
 const user={id:'test-player'};
 assert.equal(await loadAccountUser({auth:{getUser:async()=>({data:{user}})}}),user);
 assert.equal(await loadAccountUser({auth:{getUser:async()=>({error:{name:'AuthSessionMissingError'}})}}),null);
 assert.equal(await loadAccountUser({auth:{getUser:async()=>({data:{user:null}})}}),null);
 await assert.rejects(loadAccountUser({auth:{getUser:async()=>({error:{name:'AuthRetryableFetchError',status:0}})}}),/sign-in could not/);
 await assert.rejects(loadAccountUser({auth:{getUser:async()=>{throw Error('Network interrupted');}}}));
});
test('an expired session keeps the original drill or Circle destination in the login URL',()=>{
 for(const next of ['/lab/drill/right-hand-pound','/training-circles/crew-123','/settings'])assert.equal(new URLSearchParams(accountLoginPath(next).split('?')[1]).get('next'),next);
 assert.equal(accountLoginPath('https://external.test'),'/login');
});
