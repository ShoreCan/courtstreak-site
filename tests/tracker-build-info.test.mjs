import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {trackerBuildInfo} from '../scripts/tracker-build-info.mjs';
import {TRACKER_BUILD_INFO} from '../src/lib/ai/trackerBuildInfo.mjs';

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'courtstreak-build-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const write=(name,content)=>{const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content);};
 for(const p of ['src/pages/LabDrillDetail.jsx','src/pages/LabDrillSession.jsx','src/lib/ai/core.mjs','src/components/ai/Camera.jsx','vite.config.js','scripts/tracker-build-info.mjs','package.json','package-lock.json'])write(p,'fixture');
 const manifest={version:1};
 for(const kind of ['ball','pose']){const content=Buffer.from(kind);write(`public/ai/models/${kind}.onnx`,content);manifest[kind]={file:`${kind}.onnx`,size:512,sha256:createHash('sha256').update(content).digest('hex')};}
 write('public/ai/models/manifest.json',JSON.stringify(manifest));
 return {root,write,manifest,build:()=>trackerBuildInfo(root,{builtAt:'2026-10-25T00:00:00.000Z'})};
}
test('non-Git source has an exact fingerprint and honest unknown commit instead of a hard-coded old SHA',t=>{
 const f=fixture(t),a=f.build();assert.equal(a.sourceCommit,null);assert.equal(a.workingTreeDirty,null);assert.match(a.trackerSourceSha256,/^[a-f0-9]{64}$/);assert.deepEqual(f.build(),a);
 f.write('src/lib/ai/core.mjs','changed');assert.notEqual(f.build().trackerSourceSha256,a.trackerSourceSha256);
 assert.equal(TRACKER_BUILD_INFO.sourceCommit,null);
});
test('Git builds identify the exact head and distinguish uncommitted code',t=>{
 const f=fixture(t),run=args=>execFileSync('git',['-C',f.root,...args],{stdio:'pipe',encoding:'utf8'}).trim();
 run(['init','-q']);run(['add','.']);run(['-c','user.name=CourtStreak Test','-c','user.email=test@example.invalid','commit','-qm','fixture']);
 const clean=f.build();assert.equal(clean.sourceCommit,run(['rev-parse','HEAD']));assert.equal(clean.workingTreeDirty,false);
 f.write('src/components/ai/Camera.jsx','changed');const dirty=f.build();assert.equal(dirty.sourceCommit,clean.sourceCommit);assert.equal(dirty.workingTreeDirty,true);assert.notEqual(dirty.trackerSourceSha256,clean.trackerSourceSha256);
});
test('wrong model bytes and unsupported manifests stop the build',t=>{
 const f=fixture(t);f.write('public/ai/models/ball.onnx','wrong');assert.throws(f.build,/model bytes differ/);
 const g=fixture(t);g.manifest.version=2;g.write('public/ai/models/manifest.json',JSON.stringify(g.manifest));assert.throws(g.build,/Unsupported/);
 const h=fixture(t);h.manifest.ball.file='../elsewhere';h.write('public/ai/models/manifest.json',JSON.stringify(h.manifest));assert.throws(h.build,/Invalid ball/);
});
