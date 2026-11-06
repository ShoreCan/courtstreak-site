import {detectorSourceCrop} from './detectorInput.mjs';

// Keep the published crop, rounded letterbox and Canvas resize. Only the
// RGBA-to-planar-float conversion moves onto the GPU; model pixels stay comparable.
export const GPU_INPUT_SHADER = `
@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let size = textureDimensions(image);
  if (id.x >= size.x || id.y >= size.y) { return; }
  let p = textureLoad(image, vec2<i32>(id.xy), 0);
  let index = id.y * size.x + id.x;
  let plane = size.x * size.y;
  output[index] = p.r; output[index + plane] = p.g; output[index + plane * 2u] = p.b;
}`;

export class GpuDetectorInput {
  constructor({device, size, buffer, usage = globalThis.GPUTextureUsage,
    createCanvas = () => document.createElement('canvas')}) {
    this.device = device; this.size = size;
    this.canvas = createCanvas(); this.canvas.width = this.canvas.height = size;
    this.context = this.canvas.getContext('2d', {willReadFrequently: true});
    this.texture = device.createTexture({size: [size, size], format: 'rgba8unorm',
      usage: usage.TEXTURE_BINDING | usage.COPY_DST | usage.RENDER_ATTACHMENT});
    this.pipeline = device.createComputePipeline({layout: 'auto',
      compute: {module: device.createShaderModule({code: GPU_INPUT_SHADER}), entryPoint: 'main'}});
    this.bind = device.createBindGroup({layout: this.pipeline.getBindGroupLayout(0),
      entries: [{binding: 0, resource: this.texture.createView()}, {binding: 1, resource: {buffer}}]});
  }
  prepare(source, roi) {
    const [x, y, x2, y2] = roi, size = this.size;
    const scale = Math.min(size / (x2 - x), size / (y2 - y));
    const dw = Math.round((x2 - x) * scale), dh = Math.round((y2 - y) * scale);
    const px = Math.round((size - dw) / 2 - .1), py = Math.round((size - dh) / 2 - .1);
    const c = this.context;
    c.fillStyle = 'rgb(114,114,114)'; c.fillRect(0, 0, size, size);
    c.drawImage(...detectorSourceCrop(source, roi), px, py, dw, dh);
    // The copy is enqueued before returning: a caller may now reuse its camera canvas.
    this.device.queue.copyExternalImageToTexture({source: this.canvas, flipY: false},
      {texture: this.texture}, [size, size]);
    const encoder = this.device.createCommandEncoder(), pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bind);
    pass.dispatchWorkgroups(Math.ceil(size / 8), Math.ceil(size / 8)); pass.end();
    this.device.queue.submit([encoder.finish()]);
    return {transform: {x, y, scale, px, py}};
  }
  release() { this.texture.destroy(); this.canvas.width = this.canvas.height = 0; this.context = null; }
}
