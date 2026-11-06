export function createGpuPoseClient({runPose, clock = () => performance.now() / 1000}) {
  let pending = null, latest = null, error = null, closed = false, generation = 0, id = 0;
  return {
    revision: 'GPU POSE 01', provider: 'independent-webgpu',
    get latest() { return latest; }, get busy() { return !!pending; }, get error() { return error; },
    request(frame, {capturedAt, sourceVideoTime, coordinateSize}) {
      if (closed || pending || error) return false;
      const currentGeneration = generation, currentId = ++id;
      const source = coordinateSize ? {...coordinateSize, image: frame} : frame;
      // Do not defer runPose: the shared capture canvas is mutable.
      let job;
      try { job = Promise.resolve(runPose(source)); } catch (e) { error = e; return false; }
      pending = job;
      job.then(result => {
        if (!closed && currentGeneration === generation) latest = {id: currentId, capturedAt, sourceVideoTime,
          completedAt: clock(), person: result.value, ms: Object.values(result.timings).reduce((a, b) => a + b, 0)};
      }, e => { if (!closed && currentGeneration === generation) error = e; })
        .finally(() => { if (pending === job) pending = null; });
      return true;
    },
    reset() { generation++; latest = null; },
    async idle() { if (pending) await pending.catch(() => {}); },
    close() { closed = true; generation++; latest = null; },
  };
}
