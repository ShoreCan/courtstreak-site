import {DetectorInput, LegacyDetectorInput} from './detectorInput.mjs';
import {runDetectionPass} from './detectionPass.mjs';
import {ORDINARY_BALL_SCORE} from './ballProposalPolicy.mjs';

export const DETECTOR_EXECUTION_REVISION = 'INPUT 02';

// Never overwrite a reusable input while its model session is reading it.
export function createDetectorExecution({ort, manifest, sessions, decodeOutput,
  defaultInputMode = 'reuse', createCanvas = () => document.createElement('canvas'), clock = () => performance.now()}) {
  if (!['legacy', 'reuse'].includes(defaultInputMode)) throw new Error('Unknown default detector input mode.');
  const inputs = {}, tensors = {};
  let legacy = null, pending = null, closing = false, closePromise = null;
  let passes = 0, inputAllocations = 0;
  async function run(kind, source, roi, inputMode, minimumBallScore) {
    const size = manifest[kind].size, session = sessions[kind], began = clock();
    let prepared;
    if (inputMode === 'reuse') {
      inputs[kind] ??= new DetectorInput(size, createCanvas);
      prepared = inputs[kind].prepare(source, roi);
      if (!tensors[kind]) {
        tensors[kind] = new ort.Tensor('float32', prepared.data, [1, 3, size, size]);
        inputAllocations++;
      }
    } else {
      legacy ??= new LegacyDetectorInput(createCanvas);
      prepared = legacy.prepare(source, size, roi);
    }
    const preparedAt = clock();
    const input = inputMode === 'reuse' ? tensors[kind]
      : new ort.Tensor('float32', prepared.data, [1, 3, size, size]);
    let outputs;
    try {
      outputs = await session.run({[session.inputNames[0]]: input});
      const inferredAt = clock();
      const value = decodeOutput(outputs[session.outputNames[0]], kind, prepared.transform, {minimumBallScore});
      return {value, timings: {preprocessMs: preparedAt - began,
        inferenceMs: inferredAt - preparedAt, decodeMs: clock() - inferredAt}};
    } finally {
      if (inputMode !== 'reuse') input.dispose?.();
      if (outputs) for (const value of Object.values(outputs)) value.dispose?.();
    }
  }
  const execution = {
    liveInputMode: defaultInputMode, inputRevision: DETECTOR_EXECUTION_REVISION,
    get resourceSummary() { return {inputRevision: DETECTOR_EXECUTION_REVISION,
      reusableInputTensors: inputAllocations, completedPasses: passes, inFlight: !!pending}; },
    async idle() { if (pending) await pending.catch(() => {}); },
    async detect(frame, roi, withPose, {inputMode = defaultInputMode, refreshBallFrame, minimumBallScore=ORDINARY_BALL_SCORE} = {}) {
      if (closing) throw new Error('The detector has been closed.');
      if (pending) throw new Error('A detector pass is already in progress.');
      if (!['legacy', 'reuse'].includes(inputMode)) throw new Error('Unknown diagnostic input mode.');
      if (!Number.isFinite(minimumBallScore)||minimumBallScore<0||minimumBallScore>1) throw new Error('Invalid ball proposal threshold.');
      const pass = runDetectionPass({frame, roi, withPose, refreshBallFrame, clock,
        runPose: source => run('pose', source, [0, 0, source.width, source.height], inputMode, minimumBallScore),
        runBall: (source, crop) => run('ball', source, crop, inputMode, minimumBallScore)});
      pending = pass;
      try { const result = await pass; passes++; return result.cancelled?result:{...result,ballProposalMinimumScore:minimumBallScore}; }
      finally { if (pending === pass) pending = null; }
    },
    close() {
      if (closePromise) return closePromise;
      closing = true;
      closePromise = (async () => {
        await execution.idle();
        for (const tensor of Object.values(tensors)) tensor.dispose?.();
        for (const input of Object.values(inputs)) input.release();
        legacy?.release();
        const results = await Promise.allSettled(Object.values(sessions).map(session => session.release()));
        const failed = results.find(r => r.status === 'rejected');
        if (failed) throw failed.reason;
      })();
      return closePromise;
    },
  };
  return execution;
}
