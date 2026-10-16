export const workUnit = (program) =>
  Number(program?.activeSeconds) >= 480 ? "workout" : "practice session";
export function assignmentProgress(assignment, players) {
  const ids = new Set(players.map((p) => p.id));
  const recipients = assignment.recipients.filter((r) => ids.has(r.id));
  const required = Number(assignment.sessions) || 0;
  const done = recipients.reduce(
    (sum, r) => sum + Math.max(0, Math.min(Number(r.done) || 0, required)),
    0,
  );
  const total = recipients.length * required;
  return {
    recipients,
    done,
    total,
    remaining: total - done,
    finished: recipients.filter((r) => r.done >= required).length,
    complete: total > 0 && done === total,
  };
}
export function playerWorkStatus(player, assignments, now) {
  const work = assignments.filter((a) =>
    a.recipients.some((r) => r.id === player.id),
  );
  const pending = work
    .filter((a) => assignmentProgress(a, [player]).remaining > 0)
    .sort((a, b) => a.due_at.localeCompare(b.due_at));
  const totals = work.reduce(
    (sum, a) => {
      const q = assignmentProgress(a, [player]);
      return { done: sum.done + q.done, total: sum.total + q.total };
    },
    { done: 0, total: 0 },
  );
  const remaining = totals.total - totals.done;
  const overdue = pending.filter((a) => new Date(a.due_at) < new Date(now));
  const allWorkouts = work.every((a) => workUnit(a.program) === "workout");
  const unit = allWorkouts ? "workout" : "session";
  return {
    ...totals,
    remaining,
    next: pending[0],
    overdue: overdue.length,
    kind: remaining ? "remaining" : totals.total ? "finished" : "unassigned",
    label: remaining
      ? `${remaining} ${unit}${remaining === 1 ? "" : "s"} remaining`
      : totals.total
        ? "Assigned work complete"
        : "No workout assigned",
  };
}
export function requirementText(assignment) {
  const times =
    assignment.sessions === 1
      ? "once"
      : assignment.sessions === 2
        ? "twice"
        : `${assignment.sessions} times`;
  return `Complete this ${Number(assignment.program.activeSeconds) / 60}-minute ${workUnit(assignment.program)} ${times}.`;
}
