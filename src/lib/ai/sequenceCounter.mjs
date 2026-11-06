// Consumes confirmed movement events, never raw wrist crossings or predictions.
// Route-specific moves still need their own visual classifier before use here.
export class DrillSequenceCounter {
  constructor(drill) {
    if (!drill?.sequence_contract || !drill.actions?.length) throw new Error('A catalog sequence contract is required');
    this.drill = drill; this.count = 0; this.mirrored = false; this.pending = [];
    this.seen = new Set(); this.lastTime = -Infinity;
  }
  expected(index = this.pending.length) {
    const action = this.drill.actions[index];
    if (!this.mirrored) return action;
    const flip = hand => hand === 'right' ? 'left' : 'right';
    return {...action, from: flip(action.from), to: flip(action.to)};
  }
  resetPartial() { this.pending = []; }
  update(event) {
    if (!event?.id || this.seen.has(event.id)) return null;
    this.seen.add(event.id);
    const time = event.event_time_seconds;
    if (!Number.isFinite(time) || time <= this.lastTime) { this.resetPartial(); return null; }
    this.lastTime = time;
    if (event.control_status !== 'confirmed' || event.bounce_confirmed !== true || event.move_verified !== true ||
        !Number.isFinite(event.floor_contact_time_seconds) || event.floor_contact_time_seconds < 0 ||
        event.floor_contact_time_seconds > time || !['left', 'right'].includes(event.from_hand) ||
        !['left', 'right'].includes(event.to_hand)) { this.resetPartial(); return null; }
    const matches = action => event.move === action.move && event.from_hand === action.from && event.to_hand === action.to;
    if (this.pending.length && event.floor_contact_time_seconds <= this.pending.at(-1).event_time_seconds) this.resetPartial();
    if (!matches(this.expected())) this.resetPartial();
    if (!matches(this.expected())) return null;
    this.pending.push(event);
    if (this.pending.length !== this.drill.actions.length) return null;
    const result = {count: ++this.count, drill_key: this.drill.drill_key,
      count_rule_version: this.drill.count_rule_version, event_time_seconds: time,
      action_event_ids: this.pending.map(item => item.id), control_status: 'confirmed'};
    this.resetPartial();
    if (this.drill.repeat_mode === 'alternate') this.mirrored = !this.mirrored;
    return result;
  }
}
