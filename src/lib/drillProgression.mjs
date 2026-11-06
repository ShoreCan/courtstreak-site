export const PROGRESSION_RULE_VERSION = 1;

// Guidance, never an access lock or a camera certification. A total alone
// cannot establish controlled technique; review has to be explicitly recorded.
export function assessPrerequisites(drill, catalog, sessions = []) {
  const byKey = Object.fromEntries(catalog.map(item => [item.drill_key, item]));
  const requirements = drill.progression?.prerequisites ?? [];
  const results = requirements.map(key => {
    if (!byKey[key]) throw new Error(`Unknown prerequisite: ${key}`);
    const days = new Set();
    const ids = new Set();
    for (const session of sessions) {
      if (session.drill_key !== key || !session.id || ids.has(session.id) ||
          session.control_reviewed !== true || session.completed !== true ||
          !['manual', 'ai'].includes(session.verification_mode) ||
          session.count_kind !== byKey[key].count_kind ||
          session.count_rule_version !== byKey[key].count_rule_version ||
          !Number.isInteger(session.reviewed_clean_reps) || session.reviewed_clean_reps < (drill.progression.clean_reps_per_day ?? 10) ||
          !Number.isInteger(session.reps) || session.reviewed_clean_reps > session.reps) continue;
      const time = Date.parse(session.completed_at);
      if (!Number.isFinite(time)) continue;
      ids.add(session.id);
      days.add(new Date(time).toISOString().slice(0, 10));
    }
    return {drill_key: key, name: byKey[key].name, reviewed_days: days.size, ready: days.size >= (drill.progression.reviewed_days_required ?? 2)};
  });
  return {rule_version: PROGRESSION_RULE_VERSION, recommended_ready: results.every(item => item.ready),
    camera_certified: false, requirements: results};
}

export function validateProgressionCatalog(catalog) {
  const byKey = new Map(catalog.map(drill => [drill.drill_key, drill]));
  if (byKey.size !== catalog.length) throw new Error('Duplicate drill key');
  const visiting = new Set(), visited = new Set();
  function visit(key) {
    if (!byKey.has(key)) throw new Error(`Unknown prerequisite: ${key}`);
    if (visiting.has(key)) throw new Error(`Progression cycle: ${key}`);
    if (visited.has(key)) return;
    visiting.add(key);
    for (const parent of byKey.get(key).progression.prerequisites) visit(parent);
    visiting.delete(key); visited.add(key);
  }
  for (const drill of catalog) {
    if (!drill.actions.length || !['same', 'alternate'].includes(drill.repeat_mode)) throw new Error('Invalid sequence');
    let hand = drill.start_hand;
    for (const action of drill.actions) {
      if (action.from !== hand || !['left', 'right'].includes(action.to)) throw new Error(`Broken hand sequence: ${drill.drill_key}`);
      if (action.move === 'pound' && action.from !== action.to) throw new Error('Invalid pound');
      hand = action.to;
    }
    if (hand !== (drill.repeat_mode === 'alternate' ? (drill.start_hand === 'right' ? 'left' : 'right') : drill.start_hand)) throw new Error(`Broken repeat: ${drill.drill_key}`);
    visit(drill.drill_key);
  }
  return true;
}
