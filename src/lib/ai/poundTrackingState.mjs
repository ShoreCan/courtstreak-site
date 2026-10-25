import { BallIdentityTracker, createPoundCounter, createPoundValidator } from './poundCore.mjs';
import { CURRENT_POUND_CONFIGURATION, LEGACY_POUND_CONFIGURATION } from './trackerConfiguration.mjs';

export function createPoundTrackingState(freshFrames=true) {
  const configuration=freshFrames?CURRENT_POUND_CONFIGURATION:LEGACY_POUND_CONFIGURATION;
  const state={configuration,tracker:new BallIdentityTracker({...configuration.identityOptions,diagnostics:true})};
  resetPoundTrackingCounter(state);
  return state;
}

export function resetPoundTrackingCounter(state) {
  state.counter=createPoundCounter(state.configuration.counterRevision);
  state.validator=createPoundValidator(state.configuration.counterRevision);
}
