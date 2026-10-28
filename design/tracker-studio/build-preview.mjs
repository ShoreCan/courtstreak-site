// Bundle the real presenter and a clearly labeled sample into one offline HTML.
// This entry is separate from the production app and never loads AI models.
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {courtStreakAppearanceCss} from '../../scripts/appearance-css.mjs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';

const root=fileURLToPath(new URL('../../',import.meta.url));
const target=process.argv[2];
if(!target||!target.startsWith('/'))throw new Error('Pass an absolute output HTML path.');
const result=await build({
 configFile:false,root,base:'./',plugins:[react()],css:{postcss:{plugins:[courtStreakAppearanceCss()]}},publicDir:false,logLevel:'warn',
 build:{write:false,cssCodeSplit:false,minify:true,
  rolldownOptions:{input:resolve(root,'design/tracker-studio/index.html'),output:{codeSplitting:false}}}
});
const outputs=(Array.isArray(result)?result:[result]).flatMap(r=>r.output);
const chunks=outputs.filter(f=>f.type==='chunk');
if(chunks.length!==1)throw new Error(`Expected one JS chunk, received ${chunks.length}.`);
const script=chunks[0].code.replace(/<\/script/gi,'<\\/script');
let css=outputs.filter(f=>f.fileName.endsWith('.css')).map(f=>String(f.source)).join('\n');
// These marketing backgrounds are unused here; avoid external file references.
css=css.replace(/url\((['"]?)\/courtstreak-site\/[^)]+\)/g,'none');
const head='<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#15283f"><title>CourtStreak — Tracker Studio 04 design review</title>';
const content=`<style>${css}</style></head><body><div id="root"></div><script type="module">${script}</script></body></html>`;
const embedded=`<!doctype html><html lang="en" data-studio-phase="__STUDIO_PHASE__" data-studio-appearance="__STUDIO_APPEARANCE__"><head>${head}${content}`;
const template=Buffer.from(embedded).toString('base64');
const html=`<!doctype html><html lang="en"><head>${head}<script id="studio-embedded" type="text/plain">${template}</script>${content}`;
await mkdir(dirname(target),{recursive:true});
await writeFile(target,html);
console.log(`Saved standalone design preview: ${target} (${Buffer.byteLength(html)} bytes)`);
