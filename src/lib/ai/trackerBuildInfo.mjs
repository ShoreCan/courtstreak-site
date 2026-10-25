// Vite replaces this at build time. A plain Node replay reports unknown provenance.
export const TRACKER_BUILD_INFO = typeof __COURTSTREAK_TRACKER_BUILD__ === 'undefined'
  ? Object.freeze({schema:'courtstreak-tracker-build-v1',sourceCommit:null,workingTreeDirty:null,trackerSourceSha256:null,builtAt:null,models:null})
  : Object.freeze(__COURTSTREAK_TRACKER_BUILD__);
