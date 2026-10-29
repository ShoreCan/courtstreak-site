import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoverySession} from '../src/lib/recoverySession.mjs';
const session=(id='player',token='test-recovery-token')=>({user:{id},access_token:token});
test('a recovery event arriving before the lazy route mounts is retained in memory',()=>{
 const store=createRecoverySession();store.observe('PASSWORD_RECOVERY',session());
 assert.equal(store.has(session()),true);
 let observed;const unsubscribe=store.subscribe(value=>{observed=value;});
 store.clear();assert.equal(observed,false);unsubscribe();
});
test('normal existing and signed-in sessions never unlock recovery',()=>{
 const store=createRecoverySession();for(const event of ['INITIAL_SESSION','SIGNED_IN','TOKEN_REFRESHED']){store.observe(event,session());assert.equal(store.has(session()),false);}
});
test('sign-out and switching users invalidate recovery proof',()=>{
 for(const [event,value]of [['SIGNED_OUT',null],['SIGNED_IN',session('another')]]){
  const store=createRecoverySession();store.observe('PASSWORD_RECOVERY',session());store.observe(event,value);assert.equal(store.has(),false);
 }
});
test('a separate sign-in for the same user does not inherit recovery proof',()=>{
 const store=createRecoverySession();store.observe('PASSWORD_RECOVERY',session());store.observe('SIGNED_IN',session('player','ordinary-token'));assert.equal(store.has(),false);
});
test('refreshing the recovery session preserves its identity but does not extend its time window',()=>{
 let now=0;const store=createRecoverySession({clock:()=>now,ttl:1000});store.observe('PASSWORD_RECOVERY',session());
 now=700;store.observe('TOKEN_REFRESHED',session('player','refreshed-token'));
 assert.equal(store.has(session('player','refreshed-token')),true);assert.equal(store.has(session()),false);
 now=1000;assert.equal(store.has(),false);
});
test('missing and mismatched credentials cannot create or reuse proof',()=>{
 const store=createRecoverySession();store.observe('PASSWORD_RECOVERY',{user:{id:'player'}});assert.equal(store.has(),false);
 store.observe('PASSWORD_RECOVERY',session());assert.equal(store.has(session('another')),false);assert.equal(store.has(session('player','wrong-token')),false);
 assert.equal(JSON.stringify(store),'{}','Recovery credentials are not exported or serialized');
});
