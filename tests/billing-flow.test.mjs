import test from 'node:test';import assert from 'node:assert/strict';
import {createCheckoutAction,billingUrl} from '../src/lib/billingFlow.mjs';
function client({role='player',member=false,url='https://checkout.stripe.com/test-session',session=true}={}){
 let calls=0;return {auth:{getSession:async()=>({data:{session:session?{access_token:'test-token'}:null}})},rpc:async name=>({data:name==='cs_hub_account'?{role}:member}),functions:{invoke:async()=>{calls++;return {data:{url}};}},calls:()=>calls};
}
const options={returnUrl:'https://example.test/courtstreak-site',inviteCode:'crew-123'};
test('double taps share one pending checkout creation request',async()=>{
 const c=client(),open=createCheckoutAction(c),first=open(options),second=open(options);assert.equal(first,second);
 assert.deepEqual(await first,{url:'https://checkout.stripe.com/test-session'});assert.equal(c.calls(),1);
});
test('already subscribed players open billing without creating another checkout',async()=>{
 const c=client({member:true});assert.deepEqual(await createCheckoutAction(c)({...options,inviteCode:null}),{destination:'/membership'});assert.equal(c.calls(),0);
});
test('parent and coach accounts open their workspace without player checkout',async()=>{
 for(const [role,destination]of [['parent','/family-hub'],['coach','/team-hub']]){const c=client({role});assert.deepEqual(await createCheckoutAction(c)(options),{destination});assert.equal(c.calls(),0);}
});
test('a missing session preserves the invite through login',async()=>{
 const c=client({session:false});assert.deepEqual(await createCheckoutAction(c)(options),{destination:'/login?checkout=membership&invite=crew-123'});assert.equal(c.calls(),0);
});
test('unavailable membership checks do not create a new checkout',async()=>{
 const c=client();c.rpc=async name=>name==='cs_hub_account'?{data:{role:'player'}}:{error:{message:'offline'}};
 await assert.rejects(createCheckoutAction(c)(options),/membership could not/);assert.equal(c.calls(),0);
});
test('failed requests can be retried, with no stuck pending promise',async()=>{
 const c=client();let calls=0;c.functions.invoke=async()=>{calls++;if(calls===1)throw Error('Network interrupted');return {data:{url:'https://checkout.stripe.com/retry'}};};
 const open=createCheckoutAction(c);await assert.rejects(open(options));assert.deepEqual(await open(options),{url:'https://checkout.stripe.com/retry'});assert.equal(calls,2);
});
test('malformed and unsafe billing responses do not navigate the browser',async()=>{
 for(const url of ['javascript:alert(1)','http://example.test','https://user:password@example.test','not a URL']){assert.equal(billingUrl(url),null);await assert.rejects(createCheckoutAction(client({url}))(options),/Checkout could not/);}
});

test('subscribed players can continue their Circle invitation without another checkout',async()=>{
 const c=client({member:true});assert.deepEqual(await createCheckoutAction(c)(options),{destination:'/training-circles/join/crew-123?accept=1'});assert.equal(c.calls(),0);
});
