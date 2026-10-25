import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const sha256 = data => createHash('sha256').update(data).digest('hex');
function git(root,args) {
  try { return execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); }
  catch { return null; }
}
export function trackerBuildInfo(root,{builtAt=new Date().toISOString()}={}) {
  root=fs.realpathSync(root);
  const top=git(root,['rev-parse','--show-toplevel']);
  const isRepository=top!==null&&fs.realpathSync(top)===root;
  const sourceCommit=isRepository?git(root,['rev-parse','HEAD']):null;
  const status=isRepository?git(root,['status','--porcelain','--untracked-files=normal']):null;
  const paths=['src/pages/LabDrillDetail.jsx','src/pages/LabDrillSession.jsx','vite.config.js','scripts/tracker-build-info.mjs','package.json','package-lock.json','public/ai/models/manifest.json'];
  for(const dir of ['src/lib/ai','src/components/ai']){
    for(const name of fs.readdirSync(path.join(root,dir)).sort()){
      const relative=`${dir}/${name}`;
      if(fs.statSync(path.join(root,relative)).isFile())paths.push(relative);
    }
  }
  const sourceFiles=Object.fromEntries([...new Set(paths)].sort().map(relative=>[relative,sha256(fs.readFileSync(path.join(root,relative)))]));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/ai/models/manifest.json'),'utf8'));
  if(manifest.version!==1)throw new Error('Unsupported model manifest version.');
  const models={};
  for(const kind of ['ball','pose']){
    const model=manifest[kind];
    if(!model||typeof model.file!=='string'||path.basename(model.file)!==model.file||!/^[a-f0-9]{64}$/.test(model.sha256??'')||!Number.isInteger(model.size)||model.size<=0||model.size>2048)throw new Error(`Invalid ${kind} model manifest.`);
    const actual=sha256(fs.readFileSync(path.join(root,'public/ai/models',model.file)));
    if(actual!==model.sha256)throw new Error(`${kind} model bytes differ from the published manifest. Build stopped.`);
    models[kind]={file:model.file,sha256:actual,size:model.size};
  }
  return {schema:'courtstreak-tracker-build-v1',sourceCommit:/^[a-f0-9]{40}$/.test(sourceCommit??'')?sourceCommit:null,
    workingTreeDirty:status===null?null:status!=='',builtAt,
    trackerSourceSha256:sha256(Object.entries(sourceFiles).map(([name,hash])=>`${name}\0${hash}\n`).join('')),
    sourceFiles,models,modelVerification:'Build-time bytes; not a claim of physical-browser runtime verification'};
}
