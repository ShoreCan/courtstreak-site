import { encodeQualityCountedVideo } from './qualityCountedVideo.mjs';
const abortError = () => new DOMException('Video preparation cancelled.', 'AbortError');

export function createQualityCountedVideo(options) {
  // Codec work is lazy-loaded and runs only after tracking has stopped.
  if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') return encodeQualityCountedVideo(options);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./countedVideo.worker.mjs', import.meta.url), { type: 'module' });
    const cleanup = () => { options.signal?.removeEventListener('abort', abort); worker.terminate(); };
    const abort = () => { cleanup(); reject(abortError()); };
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') options.onProgress?.(data.progress);
      else if (data.type === 'fallback') { cleanup(); encodeQualityCountedVideo(options).then(resolve, reject); }
      else if (data.type === 'result') { cleanup(); resolve(data.result); }
      else if (data.type === 'error') { cleanup(); reject(new Error(data.message)); }
    };
    worker.onerror = () => { cleanup(); reject(new Error('High-quality video preparation could not run. Your original video is still available.')); };
    const { blob, changes, finalCount, completed, duration } = options;
    worker.postMessage({ blob, changes, finalCount, completed, duration });
  });
}
