import test from 'node:test';import assert from 'node:assert/strict';
import {restoreAppLocation} from '../src/lib/bootstrapLocation.mjs';
function browser(value){let url,removed=false;return {win:{sessionStorage:{getItem:()=>value,removeItem:()=>{removed=true;}},location:{origin:'https://example.test'},history:{replaceState:(_state,_title,next)=>{url=next;}}},result:()=>({url,removed})};}
test('a legacy recovery deep link is restored with its query and hash before auth initialization',()=>{
 const b=browser('/reset-password?code=example-code#recovery');assert.equal(restoreAppLocation(b.win),true);assert.deepEqual(b.result(),{url:'/courtstreak-site/reset-password?code=example-code#recovery',removed:true});
});
test('blocked session storage does not prevent the app from opening',()=>{
 const win={get sessionStorage(){throw Error('Blocked storage');}};assert.equal(restoreAppLocation(win),false);
});
test('untrusted and malformed storage values do not replace the address',()=>{
 for(const path of ['//example.org','https://example.org','/\\example.org','/profile\n']){const b=browser(path);assert.equal(restoreAppLocation(b.win),false);assert.equal(b.result().url,undefined);}
});
test('ordinary navigation does not rewrite the address',()=>{const b=browser(null);assert.equal(restoreAppLocation(b.win),false);assert.equal(b.result().removed,false);});
