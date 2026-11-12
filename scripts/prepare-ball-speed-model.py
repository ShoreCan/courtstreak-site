#!/usr/bin/env python3
"""Extract the original ball model up to its two TopK operations."""
import hashlib
import json
from pathlib import Path
import onnx

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'ai' / 'models'
manifest_path = ROOT / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
source = ROOT / manifest['ball']['file']
if hashlib.sha256(source.read_bytes()).hexdigest() != manifest['ball']['sha256']:
    raise SystemExit('Unexpected source model bytes.')
model = onnx.shape_inference.infer_shapes(onnx.load(source))
head = '/model.23/Transpose_output_0'
shape = next(v.type.tensor_type.shape for v in model.graph.value_info if v.name == head)
if [d.dim_value for d in shape.dim] != [1, 5376, 84] or sum(n.op_type == 'TopK' for n in model.graph.node) != 2:
    raise SystemExit('The source model does not match the supported ball ranking layout.')
extracted = onnx.utils.Extractor(model).extract_model([model.graph.input[0].name], [head])
onnx.checker.check_model(extracted)
out = ROOT / 'courtstreak-ball-single-readback.onnx'
onnx.save(extracted, out)
manifest['ball_single_readback'] = {
    **manifest['ball'], 'file': out.name, 'output_shape': [1, 5376, 84],
    'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
}
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
