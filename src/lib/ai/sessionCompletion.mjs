// Losing visibility during the optional review cannot undo a completed round.
// Pending receipts still need real evidence; this function never adds a rep.
export function finishCompletedReview(state,now,duration,reason){
 if(state.phase!=='review'||!Number.isFinite(state.started)||!Number.isFinite(now)||now-state.started<duration)return false;
 state.phase='finished';state.left=0;state.reviewInterruptionReason=reason;
 state.message='Round complete. The final-return review stopped; compare your count with the video.';
 return true;
}
