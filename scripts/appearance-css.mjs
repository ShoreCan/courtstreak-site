// Adapt legacy CSS to shared palette tokens at build time. No runtime scanning,
// filters, observers, or per-frame theme work; media keeps its original colors.
import {readFileSync} from 'node:fs';

const token = name => `var(--cs-theme-${name})`;
const names = {white:[255,255,255,1],black:[0,0,0,1],whitesmoke:[245,245,245,1],gray:[128,128,128,1],grey:[128,128,128,1]};
export function parseCssColor(value){
 const s=value.trim().toLowerCase();
 if(names[s])return names[s];
 if(s[0]==='#'){
  let hex=s.slice(1);if(hex.length===3||hex.length===4)hex=[...hex].map(c=>c+c).join('');
  if(!/^[\da-f]{6}([\da-f]{2})?$/.test(hex))return null;
  return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),hex.length===8?parseInt(hex.slice(6),16)/255:1];
 }
 const m=s.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;
 const parts=m[1].replace(/\//g,' ').split(/[,\s]+/).filter(Boolean);if(parts.length<3||parts.length>4)return null;
 const rgb=parts.slice(0,3).map(n=>n.endsWith('%')?parseFloat(n)*2.55:Number(n));
 const alpha=parts[3]?(parts[3].endsWith('%')?parseFloat(parts[3])/100:Number(parts[3])):1;
 return [...rgb,alpha].every(Number.isFinite)?[...rgb,alpha]:null;
}
function hue([r,g,b]){
 const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
 if(!delta)return 0;
 return ((max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360;
}
function neutral(c){const max=Math.max(...c.slice(0,3)),min=Math.min(...c.slice(0,3)),h=hue(c);return max-min<48||(h>=185&&h<=255&&max<170);}
function ink(c){
 const rgb=c.slice(0,3),max=Math.max(...rgb),min=Math.min(...rgb);
 if(neutral(c))return token((min>175||max<85)&&c[3]>.75?'copy':'muted');
 const h=hue(c);
 return token(h>=15&&h<42?'accent-ink':h>=42&&h<75?'warning-ink':h>=75&&h<175?'success-ink':h>=175&&h<255?'info-ink':h>=255&&h<320?'purple-ink':'danger-ink');
}
function propertyRole(prop){
 if(prop.startsWith('--'))return null;
 if(['color','-webkit-text-fill-color','text-decoration-color','caret-color'].includes(prop))return 'ink';
 if(/^background(?:-color|-image)?$/.test(prop))return 'surface';
 if(/^(?:border|outline)(?:-(?:top|bottom|left|right|block|inline|color|start|end|width|style))*$/.test(prop))return 'line';
 return null;
}
function surface(c,context){
 const rgb=c.slice(0,3),max=Math.max(...rgb),min=Math.min(...rgb),alpha=c[3];
 if(!neutral(c)){
  if(context.solidAction||context.filledInk)return null;
  const h=hue(c),status=Math.max(...rgb)<170?(h>=75&&h<175?'success':h>=255&&h<320?'purple':h<15||h>=320?'danger':null):null;
  return status&&alpha>.7?token(`${status}-bg`):null;
 }
 if(context.scrim)return null; // Dim backdrops remain dark in both appearances.
 if(context.solidAction)return token('action');
 if(alpha<.7&&min>175)return `rgba(var(--cs-theme-overlay-rgb),${Number(alpha.toFixed(3))})`;
 let shade=context.page?'bg':max<36?'bg':max<66?'panel':max>245?'panel':'raised';
 if(alpha<.995)return `rgba(var(--cs-theme-${shade}-rgb),${Number(alpha.toFixed(3))})`;
 return token(shade);
}
function mapColor(raw,role,context){
 const c=parseCssColor(raw);if(!c||c[3]===0)return raw;
 if(role==='ink')return context.orangeAction?token('on-accent'):context.filledInk??(context.solidAction?token('on-action'):ink(c));
 if(role==='line')return neutral(c)?token(c[3]<.1?'line-soft':c[3]<.3?'line':'line-strong'):raw;
 return surface(c,context)??raw;
}
// Tokenize colors while leaving strings, image URLs and SVG data untouched.
function transformValue(value,role,context){
 const pattern=/(?:url|var)\([^)]*\)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|rgba?\([^)]*\)|#[\da-fA-F]{3,8}\b|\b(?:white|black|whitesmoke|gr[ae]y)\b/gi;
 return value.replace(pattern,raw=>{
  if(/^url\(|^["']/.test(raw))return raw;
  if(/^var\(/.test(raw)){
   const name=raw.match(/^var\(\s*(--[\w-]+)/)?.[1];
   // These colors belong to the user's Circle or an inline illustration.
   if(!name||/circle-accent|option-color|ring-color|plan-accent|^--cs-theme-|^--cs-look-/.test(name))return raw;
   const defined=context.colors.get(name);
   return defined?mapColor(defined,role,context):raw;
  }
  return mapColor(raw,role,context);
 });
}
const nativePalette=/\/(?:components\/(?:appearance\.css|ai\/(?:iphone-pound-test|pound-entry-studio)\.css)|theme\.css|design\/tracker-studio\/preview\.css)$/;
const artwork=/(?:cs-iphone-shell|cs-app-preview-device|cs-app-preview-phone|cs-court-art|cs-hero-court|cs-ball-seam|cs-basketball-art|cs-vault-cabinet|cs-vault-basketball|cs-cabinet-trophy-(?:cup|stem|base))/;
function customColors(root,seed=new Map()){
 const colors=new Map(seed);
 root.walkDecls(decl=>{if(decl.prop.startsWith('--')&&parseCssColor(decl.value))colors.set(decl.prop,decl.value);});
 return colors;
}
// Shared legacy tokens are declared in the initial stylesheets; local tokens
// take precedence. This runs in Vite/PostCSS, never in the user's browser.
function sharedColors(){
 const colors=new Map();
 for(const name of ['styles.css','player-app-ui.css']){
  const css=readFileSync(new URL(`../src/${name}`,import.meta.url),'utf8');
  for(const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)[;}]/g))if(parseCssColor(match[2]))colors.set(match[1],match[2]);
 }
 return colors;
}
export function courtStreakAppearanceCss(){
 const shared=sharedColors();
 return {postcssPlugin:'courtstreak-appearance',Once(root){
  const file=(root.source?.input?.file??'').replace(/\\/g,'/');
  if(nativePalette.test(file)||file.includes('/node_modules/'))return;
  const colors=customColors(root,shared);
  root.walkRules(rule=>{
   if(artwork.test(rule.selector??''))return;
   const declarations=rule.nodes?.filter(n=>n.type==='decl')??[];
   const background=declarations.filter(d=>/^background/.test(d.prop)).map(d=>d.value).join(' ');
   const backgroundColors=(background.match(/rgba?\([^)]*\)|#[\da-f]{3,8}\b/gi)??[]).map(parseCssColor).filter(Boolean);
   for(const name of background.matchAll(/var\(\s*(--[\w-]+)/g)){const c=parseCssColor(colors.get(name[1])??'');if(c)backgroundColors.push(c);}
   const orangeAction=/(?:button|btn|primary|cta|action|brand|active|selected|current)/i.test(rule.selector)&&backgroundColors.some(c=>!neutral(c)&&hue(c)>=15&&hue(c)<42&&c[3]>.7);
   const solidAction=/(?:primary|cta|submit|join-button|save-button|start-button)/i.test(rule.selector)&&!orangeAction;
   const filled=/(?:button|btn|primary|cta|action|active|selected|current)/i.test(rule.selector)?backgroundColors.find(c=>!neutral(c)&&c[3]>.95):null;
   const luminance=filled?filled.slice(0,3).map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0):0;
   const filledInk=filled?(luminance>.179?'#000000':'#ffffff'):null;
   const context={colors,orangeAction,solidAction,filledInk,page:/(?:^|[\s,])(?:html|body|:root|#root)(?:$|[\s,.:[#])|[-_](?:page|root|layout|shell)(?:[\s,:.[#]|$)/.test(rule.selector),scrim:/scrim|backdrop|modal-overlay/.test(rule.selector)};
   for(const decl of declarations){
    if(decl.value.includes('--cs-look-')||decl.value.includes('--cs-theme-'))continue;
    const textFill=decl.prop==='fill'&&/(?:^|[\s>])text(?:$|[\s.:[#])|axis|tick-label|chart-label/.test(rule.selector);
    const role=textFill?'ink':propertyRole(decl.prop);if(role)decl.value=transformValue(decl.value,role,context);
   }
  });
 }};
}
