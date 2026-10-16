// Counting rules are based on the movement, never a generic UI metric label.
export function countKind(drill = {}) {
  if (drill.count_kind) return drill.count_kind;
  const key = drill.drill_key || drill.sourceDrillKey || drill.key || '';
  if (key === 'two-ball-power-pounds') return 'simultaneous-pair';
  if (key === 'two-ball-alternating') return 'alternating-pair';
  const identity = `${key} ${drill.aiProfile || ''} ${drill.name || ''}`.toLowerCase();
  if (/combo|sequence|chain|freestyle|double|cross-cross|inout-crossover|in-out-crossover|pound-cross|pound-between|pound-behind|crossover-between|between-crossover|crossover-behind|between-behind|burst|push-crossover|retreat-crossover|retreat-between|retreat-behind|same-side-between|behind-back-push|walking-change|zigzag|retreat-reattack|cone-slalom|reactive-command/.test(identity)) return 'sequence';
  if (/crossover|crossovers|between|behind/.test(identity)) return 'transfer';
  return 'bounce';
}

export function repRule(drill = {}) {
  const rules = {
    bounce: 'One rep is one controlled floor bounce returned to your hand. Do not count mishandles or loose-ball bounces.',
    transfer: 'One rep is the named transfer: one floor bounce received securely by the opposite hand. Reset dribbles, passes without a bounce, and mishandles do not count.',
    sequence: 'One rep is the entire described sequence with every bounce and receive controlled. Do not count individual bounces within it. An unfinished sequence does not count.',
    'simultaneous-pair': 'One rep is a simultaneous pair of controlled bounces, with both balls returning to your hands.',
    'alternating-pair': 'One rep is a full right-left pair of controlled bounces, with both balls returning to their hands.',
  };
  return rules[countKind(drill)] || rules.bounce;
}

export function resultValue(session) {
  const value = session?.reps ?? session?.score;
  return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
}

export function comparisonKey(session = {}) {
  const seconds = Number(session.duration_seconds);
  // Missing context stays in history, but cannot establish a fair comparison.
  if (!session.drill_key || !Number.isInteger(seconds) || seconds <= 0 || !session.count_kind || !session.count_rule_version || !session.verification_mode) return null;
  if (!['manual', 'ai'].includes(session.verification_mode)) return null;
  return JSON.stringify([session.drill_key, seconds, session.count_kind, session.count_rule_version, session.verification_mode, session.reps != null ? 'reps' : 'score']);
}

export function comparisonGroups(sessions = []) {
  const groups = new Map();
  for (const session of sessions) {
    const key = comparisonKey(session);
    if (!key || resultValue(session) == null || !Number.isFinite(new Date(session.completed_at).getTime())) continue;
    if (!groups.has(key)) groups.set(key, { key, name: `${session.drill_name} · ${session.duration_seconds}s · ${session.verification_mode === 'manual' ? 'Self-reported' : 'Experimental camera'}`, sessions: [] });
    groups.get(key).sessions.push(session);
  }
  return [...groups.values()].map(group => ({ ...group, sessions: group.sessions.sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at)), count: group.sessions.length }));
}
