"""Local ONNX worker for recorded-video diagnostics; no uploads or camera access.

Set COURTSTREAK_ORT_PATH for a separate onnxruntime==1.22.0 installation.
The JS driver owns the published identity/counter logic and requests its ROI.
Pillow bilinear rasterization is an explicit difference from browser Canvas.
"""
import os, sys, json, math, time, subprocess, hashlib
from pathlib import Path
if os.environ.get('COURTSTREAK_ORT_PATH'):
    sys.path.insert(0, os.environ['COURTSTREAK_ORT_PATH'])
import numpy as np
import onnxruntime as ort
from PIL import Image

root = Path(__file__).resolve().parents[2]
manifest = json.loads((root/'public/ai/models/manifest.json').read_text())
options = ort.SessionOptions()
options.intra_op_num_threads = 2
options.inter_op_num_threads = 1
sessions = {}
for kind in ['pose', 'ball']:
    model = root/'public/ai/models'/manifest[kind]['file']
    if hashlib.sha256(model.read_bytes()).hexdigest() != manifest[kind]['sha256']:
        raise RuntimeError('Pinned model hash mismatch: '+kind)
    sessions[kind] = ort.InferenceSession(str(model), sess_options=options, providers=['CPUExecutionProvider'])

def iou(a,b):
    iw=max(0,min(a[2],b[2])-max(a[0],b[0])); ih=max(0,min(a[3],b[3])-max(a[1],b[1]))
    return iw*ih/max(1,(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-iw*ih)

def infer(image, kind, roi, minimum):
    start=time.monotonic(); size=manifest[kind]['size']; x,y,x2,y2=roi
    scale=min(size/(x2-x),size/(y2-y))
    dw=math.floor((x2-x)*scale+.5);dh=math.floor((y2-y)*scale+.5)
    px=math.floor((size-dw)/2-.1+.5);py=math.floor((size-dh)/2-.1+.5)
    sx=image.width/1280;sy=image.height/720
    padded=Image.new('RGB',(size,size),(114,114,114))
    padded.paste(image.resize((dw,dh),Image.Resampling.BILINEAR,box=(x*sx,y*sy,x2*sx,y2*sy)),(px,py))
    data=np.asarray(padded,dtype=np.float32).transpose(2,0,1)[None]/255
    prepared=time.monotonic();session=sessions[kind]
    output=session.run(None,{session.get_inputs()[0].name:data})[0];inferred=time.monotonic();rows=[]
    def box(b):return [(float(b[0])-px)/scale+x,(float(b[1])-py)/scale+y,(float(b[2])-px)/scale+x,(float(b[3])-py)/scale+y]
    if kind=='pose':
        for i in np.flatnonzero(np.isfinite(output[0,4]) & (output[0,4]>=.18)):
            a=output[0,:,i];cx,cy,bw,bh=map(float,a[:4]);xy=a[5:].reshape(17,3)
            rows.append({'box':box([cx-bw/2,cy-bh/2,cx+bw/2,cy+bh/2]),'score':float(a[4]),
                'xy':[[float((v[0]-px)/scale+x),float((v[1]-py)/scale+y)]for v in xy], 'confidence':list(map(float,xy[:,2]))})
    else:
        for b in output[0]:
            if round(float(b[5]))==32 and math.isfinite(float(b[4])) and float(b[4])>=minimum:
                rows.append({'box':box(b[:4]),'score':float(b[4])})
    rows=[r for r in rows if all(math.isfinite(v)for v in r['box'])and r['box'][2]>r['box'][0]and r['box'][3]>r['box'][1]]
    kept=[]
    for row in sorted(rows,key=lambda r:-r['score']):
        if all(iou(row['box'],k['box'])<.7 for k in kept):kept.append(row)
        if len(kept)>=50:break
    value=max(kept,key=lambda r:math.sqrt(max((r['box'][2]-r['box'][0])*(r['box'][3]-r['box'][1]),1)),default=None)if kind=='pose'else kept
    return value,{'preprocessMs':(prepared-start)*1000,'inferenceMs':(inferred-prepared)*1000,'decodeMs':(time.monotonic()-inferred)*1000}

proc=None;source=None;index=-1;image=None
try:
    for line in sys.stdin:
        request=json.loads(line)
        if request['path']!=source:
            if proc:proc.stdout.close();proc.terminate();proc.wait()
            source=request['path'];index=-1;image=None
            info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height:stream_side_data=rotation','-of','json',source]))['streams'][0]
            width,height=info['width'],info['height'];rotation=next((s['rotation']for s in info.get('side_data_list',[])if 'rotation'in s),0)
            if abs(rotation)%180==90:width,height=height,width
            if abs(width/height-16/9)>.001:raise RuntimeError('This diagnostic currently expects a landscape 16:9 original.')
            proc=subprocess.Popen(['ffmpeg','-nostdin','-v','error','-threads','2','-i',source,'-map','0:v:0','-vf','hflip','-fps_mode','passthrough','-threads','1','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
        target=request['frameIndex']
        if target<index:raise RuntimeError('Frame requests must be monotonic within each source.')
        while index<target:
            raw=proc.stdout.read(width*height*3)
            if len(raw)!=width*height*3:raise RuntimeError(f'Unexpected EOF at {source} frame {index+1}')
            index+=1
        if target==index:image=Image.frombytes('RGB',(width,height),raw)
        if 'cachedPerson' in request:
            person,pose_timing=request['cachedPerson'],{'reusedSameFrame':True}
        else:
            person,pose_timing=infer(image,'pose',[0,0,1280,720],request['minimumBallScore'])
        balls,ball_timing=infer(image,'ball',request['roi'],request['minimumBallScore'])
        print(json.dumps({'person':person,'balls':balls,'timings':{'pose':pose_timing,'ball':ball_timing},'nativeFrameSize':[width,height],'ort':ort.__version__}),flush=True)
finally:
    if proc:proc.stdout.close();proc.terminate();proc.wait()
