import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import postcss from 'postcss';
import {courtStreakAppearanceCss,parseCssColor} from '../scripts/appearance-css.mjs';

const theme=fs.readFileSync(new URL('../src/theme.css',import.meta.url),'utf8');
function palette(selector){
 const colors=new Map();
 postcss.parse(theme).walkRules(rule=>{if(rule.selector===selector)rule.walkDecls(d=>colors.set(d.prop,d.value));});
 return colors;
}
function luminance(color){
 const [r,g,b]=parseCssColor(color).slice(0,3).map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
 return .2126*r+.7152*g+.0722*b;
}
function contrast(a,b){const [hi,lo]=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (hi+.05)/(lo+.05);}

test('both appearances keep primary, supporting and status copy readable on every surface',()=>{
 const dark=palette(':root'),light=new Map([...dark,...palette(':root[data-cs-appearance=light]')]);
 for(const [mode,colors] of [['dark',dark],['light',light]]){
  for(const surface of ['bg','panel','raised'])for(const ink of ['copy','muted','accent-ink','success-ink','warning-ink','danger-ink','info-ink','purple-ink','secondary','teal']){
   assert.ok(contrast(colors.get(`--cs-theme-${ink}`),colors.get(`--cs-theme-${surface}`))>=4.5,`${mode}: ${ink} on ${surface}`);
  }
  for(const status of ['success','danger','purple'])assert.ok(contrast(colors.get(`--cs-theme-${status}-ink`),colors.get(`--cs-theme-${status}-bg`))>=4.5);
  assert.ok(contrast(colors.get('--cs-theme-on-action'),colors.get('--cs-theme-action'))>=4.5);
  assert.ok(contrast(colors.get('--cs-theme-on-accent'),'#ff8747')>=4.5);
 }
});

test('legacy variables are themed by their use, including misleading Hub palette names',async()=>{
 const css='.hub{--cs-navy:#edf3fc;--cs-white:#172a43;color:var(--cs-navy);background:var(--cs-white);border:1px solid #30445f}.light-card{background:white;color:#12233f}';
 const {css:result}=await postcss([courtStreakAppearanceCss()]).process(css,{from:'/app/src/hub/hub.css'});
 assert.match(result,/color:var\(--cs-theme-copy\)/);
 assert.match(result,/background:var\(--cs-theme-panel\)/);
 assert.match(result,/border:1px solid var\(--cs-theme-line-strong\)/);
 assert.match(result,/--cs-navy:#edf3fc/);
 for(const background of ['#173b32','#064e3b']){
  const badge=await postcss([courtStreakAppearanceCss()]).process(`.badge.complete{background:${background};color:#81d3ac}`,{from:'/app/src/status.css'});
  const values={};badge.root.walkDecls(d=>values[d.prop]=d.value);
  for(const colors of [palette(':root'),new Map([...palette(':root'),...palette(':root[data-cs-appearance=light]')])]){
   const resolve=v=>v.startsWith('var(')?colors.get(v.slice(4,-1)):v;
   assert.ok(contrast(resolve(values.color),resolve(values.background))>=4.5);
  }
 }
 assert.doesNotMatch(result,/filter:/);
});

test('theme adaptation preserves media, SVG URLs, user Circle colors, dimensions and important rules',async()=>{
 const image='url("data:image/svg+xml,%3Csvg fill=\"%23fff\"/%3E")';
 const css=`.camera{background-image:${image};width:390px!important;filter:none;transform:scaleX(-1)}.circle{background:var(--circle-accent);color:var(--option-color)}@media(max-width:720px){.card{color:#fff!important}}`;
 const {css:result}=await postcss([courtStreakAppearanceCss()]).process(css,{from:'/app/src/test.css'});
 for(const text of [image,'width:390px!important','filter:none','transform:scaleX(-1)','background:var(--circle-accent)','color:var(--option-color)'])assert.ok(result.includes(text),text);
 assert.match(result,/@media\(max-width:720px\).*color:var\(--cs-theme-copy\)!important/);
 const vendor=await postcss([courtStreakAppearanceCss()]).process(css,{from:'/app/node_modules/vendor/art.css'});assert.equal(vendor.css,css);
 const actual=fs.readFileSync(new URL('../src/components/ai/iphone-pound-test.css',import.meta.url),'utf8');
 const native=await postcss([courtStreakAppearanceCss()]).process(actual,{from:'/app/src/components/ai/iphone-pound-test.css'});
 assert.equal(native.css,actual);
});

test('orange actions keep a contrasting label in both modes without recoloring the orange fill',async()=>{
 const {css}=await postcss([courtStreakAppearanceCss()]).process('.primary-button{background:#ff8747;color:white}.white-button{background:white;color:#12233f}',{from:'/app/src/actions.css'});
 assert.match(css,/background:#ff8747;color:var\(--cs-theme-on-accent\)/);
 assert.match(css,/white-button\{background:var\(--cs-theme-panel\);color:var\(--cs-theme-copy\)/);
});

function appearanceSession({saved=null,blocked=false}={}){
 const data=new Map(saved===null?[]:[['courtstreak:appearance',saved]]),events=new Map(),dataset={};let writes=0;
 const context={document:{documentElement:{dataset}},window:{localStorage:{getItem:key=>{if(blocked)throw Error('blocked');return data.get(key)??null;},setItem:(key,value)=>{if(blocked)throw Error('blocked');writes++;data.set(key,value);}},addEventListener:(name,listener)=>events.set(name,listener)}};
 const source=fs.readFileSync(new URL('../src/lib/appearance.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
 vm.runInNewContext(source+'\nthis.api={getAppearance,setAppearance,subscribeAppearance};',context);
 return {api:context.api,data,dataset,storage:event=>events.get('storage')(event),writes:()=>writes};
}

test('appearance restores on first load, saves once, and synchronizes other tabs',()=>{
 const session=appearanceSession({saved:'light'});assert.equal(session.dataset.csAppearance,'light');
 let notifications=0;const unsubscribe=session.api.subscribeAppearance(()=>notifications++);
 session.api.setAppearance('dark');session.api.setAppearance('dark');session.api.setAppearance('sepia');
 assert.equal(session.dataset.csAppearance,'dark');assert.equal(session.data.get('courtstreak:appearance'),'dark');assert.equal(session.writes(),1);assert.equal(notifications,1);
 session.storage({key:'unrelated',newValue:'light'});assert.equal(session.api.getAppearance(),'dark');
 session.storage({key:'courtstreak:appearance',newValue:'light'});assert.equal(session.dataset.csAppearance,'light');assert.equal(notifications,2);
 unsubscribe();session.storage({key:null,newValue:null});assert.equal(session.api.getAppearance(),'dark');assert.equal(notifications,2);
});

test('blocked storage and invalid preferences never prevent training or changing appearance',()=>{
 const session=appearanceSession({blocked:true});assert.equal(session.api.getAppearance(),'dark');
 assert.doesNotThrow(()=>session.api.setAppearance('light'));assert.equal(session.dataset.csAppearance,'light');
 assert.equal(appearanceSession({saved:'invalid'}).api.getAppearance(),'dark');
});
