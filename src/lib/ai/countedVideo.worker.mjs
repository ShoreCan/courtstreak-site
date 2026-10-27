import { encodeQualityCountedVideo } from './qualityCountedVideo.mjs';
self.onmessage = async ({ data }) => {
  if (typeof VideoEncoder !== 'function' || typeof VideoDecoder !== 'function') {
    self.postMessage({ type: 'fallback',reason:'worker-api-unavailable' }); return;
  }
  try {
    const result = await encodeQualityCountedVideo({ ...data,executionContext:'worker',
      onProgress: progress => self.postMessage({ type: 'progress', progress }) });
    self.postMessage({ type: 'result', result });
  } catch (error) {
    if(error.name==='CountedVideoUnsupportedError')self.postMessage({type:'fallback',reason:'worker-codec-unavailable'});
    else self.postMessage({ type: 'error', message: error.message });
  }
};
