export function demoDueDate(now = new Date()) {
  const due = new Date(new Date(now).getTime() + 18 * 60 * 60 * 1000);
  due.setSeconds(0, 0);
  return due.toISOString();
}
export function demoReceipts(assignment, player, now = new Date()) {
  const done = Math.min(
    assignment.recipients.find((r) => r.id === player.id)?.done || 0,
    assignment.sessions,
  );
  return {
    player_id: player.id,
    player_name: player.name,
    assignment_id: assignment.id,
    sessions: Array.from({ length: done }, (_, session) => {
      const completed = new Date(
          new Date(now).getTime() - (session + 1) * 60 * 60 * 1000,
        ),
        start = new Date(
          completed.getTime() - assignment.program.activeSeconds * 1000,
        );
      return {
        run_id: `sample-run-${player.id}-${session}`,
        name: assignment.program.name,
        started_at: start.toISOString(),
        completed_at: completed.toISOString(),
        late: false,
        active_seconds: assignment.program.activeSeconds,
        rounds: assignment.program.drills.map((d, index) => ({
          index,
          name: d.name,
          duration_seconds: d.durationSeconds,
          completed_at: new Date(
            start.getTime() + (index + 1) * d.durationSeconds * 1000,
          ).toISOString(),
          reps: 20 + index,
          metric: d.metric_label || d.metricLabel || "Controlled reps",
          verification: "self-reported",
        })),
      };
    }),
  };
}
export function demoAlerts(role) {
  const now = new Date().toISOString(),
    player = role === "player";
  return {
    role,
    unread_count: 2,
    items: [
      {
        id: "sample-alert-1",
        kind: player ? "assignment" : "completion",
        assignment_id: "demo-week",
        player_id: "jordan",
        source_id: "sample-run-jordan-0",
        due_at: demoDueDate(),
        assignment_name: "Finish strong this week",
        player_name: "Jordan Carter",
        created_at: now,
        read_at: null,
      },
      {
        id: "sample-alert-2",
        kind: player ? "feedback" : "due",
        assignment_id: "demo-week",
        player_id: "jordan",
        source_id: "sample-feedback-jordan",
        due_at: demoDueDate(),
        assignment_name: "Finish strong this week",
        player_name: "Jordan Carter",
        created_at: now,
        read_at: null,
      },
    ],
  };
}
