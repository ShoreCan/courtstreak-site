#!/usr/bin/env python3
"""Export the existing CourtStreak ball/pose weights for on-device Safari use.
No training, no live counting server, and no camera access are involved.
"""
import argparse, hashlib, json, shutil, tempfile
from pathlib import Path

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--models-dir',required=True,type=Path)
 p.add_argument('--output',required=True,type=Path)
 a=p.parse_args(); models=a.models_dir.expanduser().resolve(); out=a.output.resolve()
 weights={kind:models/name for kind,name in [('ball','yolo26n.pt'),('pose','yolo11n-pose.pt')]}
 for path in weights.values():
  if not path.is_file():raise SystemExit('Missing existing model: '+str(path))
 try:from ultralytics import YOLO
 except ImportError:raise SystemExit('Run this with the Python environment used for last night’s tracker. ultralytics is missing from this Python.')
 out.mkdir(parents=True,exist_ok=True); manifest={'version':1,'counter_baseline':'0.7.8','ball':None,'pose':None}
 with tempfile.TemporaryDirectory(prefix='courtstreak-model-export-') as tmp:
  for kind,source in weights.items():
   copied=Path(tmp)/source.name;shutil.copy2(source,copied);model=YOLO(str(copied))
   if kind=='ball' and model.names.get(32)!='sports ball':raise SystemExit('Expected COCO sports ball class 32. Your model needs a matching decoder before export.')
   size=512 if kind=='ball' else 640
   exported=Path(model.export(format='onnx',imgsz=size,batch=1,opset=17,simplify=False,dynamic=False,half=False,nms=False))
   import onnx
   graph=onnx.load(str(exported),load_external_data=True);onnx.checker.check_model(graph)
   dims=[d.dim_value for d in graph.graph.output[0].type.tensor_type.shape.dim]
   if len(dims)!=3 or dims[0]!=1:raise SystemExit('Unsupported output shape: '+str(dims))
   if kind=='ball' and not (dims[1]==84 or dims[-1]==6):raise SystemExit('Ball decoder does not support '+str(dims))
   if kind=='pose' and dims[1]!=56:raise SystemExit('Pose decoder does not support '+str(dims))
   destination=out/('courtstreak-'+kind+'.onnx');onnx.save_model(graph,str(destination),save_as_external_data=False)
   if destination.stat().st_size>90_000_000:raise SystemExit('Unexpectedly large model; refusing an unreviewed export.')
   manifest[kind]={'file':destination.name,'size':size,'output_shape':dims,'source_weights':source.name,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('Exported both existing models and validated ONNX shapes. iPhone speed and accuracy still need device testing.')
if __name__=='__main__':main()
