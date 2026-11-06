// Internal layout fixture. No detector, camera permission, recording or score.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import PoundSessionView from '../../src/components/ai/PoundSessionView.jsx';
const noop=()=>{};
function Preview(){
 const params=new URLSearchParams(location.search),[phase,setPhase]=useState(params.get('phase')||'placing');
 const ratio=params.get('landscape')?16/9:9/16;
 const placeholder='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${360/ratio}"><rect width="100%" height="100%" fill="#142235"/><text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#a3b1c7">Camera preview</text></svg>`);
 const poster=params.has('recorded')?new URL('../../__camera-qa-image.png',import.meta.url).href:placeholder;
 const ui={phase,enhancedTracking:true,cameraReady:phase!=='idle',checks:{body:true,hand:true,ball:true,floor:true,owned:true,rightHand:true},fps:8.6,count:0,left:20,countdown:3,setupGuide:{key:'ready',screenText:'Your view is ready.',message:'Hold the ball naturally until Go.'},message:phase==='error'?'Keep the basketball in view, then try again.':'',evidence:{frames:[],repEvents:[]},setupFailure:phase==='error'?{}:null};
 const versions={check:'CAMERA TEST 20',setup:'SETUP 08',camera:'VISIBLE SETUP 01',counter:'COUNT 08',frame:'FRAME 02'};
 return <MemoryRouter><PoundSessionView drillKey="right-hand-pound" ui={ui} ratio={ratio} live={!['idle','error'].includes(phase)} ended={false} videoRef={video=>{if(video){video.poster=poster;video.style.transform='none';}}} overlayRef={noop} clip={{status:'idle'}} countedClip={{status:'idle'}} savedClip={{}} replayChanges={[]} versions={versions} onOpen={()=>setPhase('placing')} onStart={()=>setPhase('setup')} onRetrySetup={()=>setPhase('setup')} onStop={()=>setPhase('idle')} onSaveEvidence={noop} onManual={noop} onBack={noop}/></MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<Preview/>);
