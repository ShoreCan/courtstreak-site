"""Optional WGSL functional check: pip install wgpu==0.33.0 numpy==2.5.4.

Executes the actual source kernels on a fallback adapter. This is not a browser,
Core ML, model parity, camera latency, live FPS, or counting accuracy benchmark.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import wgpu

ROOT = Path(__file__).resolve().parents[2]


def shader(filename, name):
    text = (ROOT / "src/lib/ai" / filename).read_text()
    return re.search(r"export const " + name + r" = `([\s\S]*?)`;", text).group(1)


adapter = wgpu.gpu.request_adapter_sync(force_fallback_adapter=True)
device = adapter.request_device_sync()


def execute(code, entries, groups):
    pipeline = device.create_compute_pipeline(
        layout="auto", compute={"module": device.create_shader_module(code=code), "entry_point": "main"}
    )
    bind = device.create_bind_group(layout=pipeline.get_bind_group_layout(0), entries=entries)
    encoder = device.create_command_encoder()
    compute = encoder.begin_compute_pass()
    compute.set_pipeline(pipeline)
    compute.set_bind_group(0, bind, [])
    compute.dispatch_workgroups(*groups)
    compute.end()
    device.queue.submit([encoder.finish()])


pixels = ((np.arange(8 * 8 * 4, dtype=np.uint32) * 17 + 3) % 256).astype(np.uint8).reshape(8, 8, 4)
texture = device.create_texture(size=(8, 8, 1), format="rgba8unorm",
                               usage=wgpu.TextureUsage.COPY_DST | wgpu.TextureUsage.TEXTURE_BINDING)
device.queue.write_texture({"texture": texture}, pixels, {"offset": 0, "bytes_per_row": 32, "rows_per_image": 8}, (8, 8, 1))
output = device.create_buffer(size=3 * 8 * 8 * 4, usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC)
execute(shader("gpuDetectorInput.mjs", "GPU_INPUT_SHADER"), [
    {"binding": 0, "resource": texture.create_view()}, {"binding": 1, "resource": {"buffer": output}}
], (1, 1, 1))
actual = np.frombuffer(device.queue.read_buffer(output), dtype=np.float32)
expected = (pixels[:, :, :3].astype(np.float32) / np.float32(255)).transpose(2, 0, 1).flatten()
max_difference = float(np.max(np.abs(actual - expected)))
assert max_difference <= 1e-7, max_difference

anchors = [20, 401, 7955]
pose = np.zeros((56, 8400), dtype=np.float32)
for index in anchors:
    pose[:, index] = np.arange(56, dtype=np.float32) + index
    pose[4, index] = .9
input_buffer = device.create_buffer_with_data(data=pose, usage=wgpu.BufferUsage.STORAGE)
compact = device.create_buffer_with_data(data=np.zeros(58384 // 4, dtype=np.uint32),
                                       usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC)
execute(shader("gpuDetectorExecution.mjs", "POSE_COMPACT_SHADER"), [
    {"binding": 0, "resource": {"buffer": input_buffer}}, {"binding": 1, "resource": {"buffer": compact}}
], ((8400 + 63) // 64, 1, 1))
raw = bytes(device.queue.read_buffer(compact))
words, floats = np.frombuffer(raw, dtype=np.uint32), np.frombuffer(raw, dtype=np.float32)
assert int(words[0]) == 3
observed = []
for i in range(3):
    index = int(words[1 + i * 57])
    observed.append(index)
    assert np.array_equal(floats[2 + i * 57:2 + i * 57 + 56], pose[:, index])
assert sorted(observed) == anchors
result = {"adapter": dict(adapter.info), "inputMaximumAbsoluteDifference": max_difference,
          "poseAnchorsPreserved": sorted(observed), "functionalCheckPassed": True,
          "browserOrModelParityMeasured": False, "liveFPSMeasured": False, "liveAccuracyMeasured": False}
text = json.dumps(result, indent=2)
if len(sys.argv) > 1:
    Path(sys.argv[1]).write_text(text + "\n")
print(text)
