import { HUB_TEMPLATES, templateProgram } from "./catalog.js";
import { demoDueDate } from "./demoActivity.js";
export function demoSnapshot(role) {
  const now = new Date(),
    monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const days = Math.min(7, Math.floor((now - monday) / 86400000) + 1);
  const people = [
    ["jordan", "Jordan Carter", 32],
    ["maya", "Maya Bennett", 42],
    ["eli", "Eli Brooks", 16],
    ["riley", "Riley Carter", 24],
    ["noah", "Noah Reed", 34],
    ["avery", "Avery Ellis", 24],
    ["leo", "Leo Adams", 0],
    ["sofia", "Sofia Hayes", 36],
  ];
  function sampleDaily(activeMinutes, personIndex) {
    const dayMinutes = Array(days).fill(0);
    const slots = [
      days - 1,
      0,
      Math.floor(days / 2),
      days - 1,
      Math.max(0, days - 2),
    ];
    for (let w = 0; w < Math.floor(activeMinutes / 8); w++)
      dayMinutes[slots[(w + personIndex) % slots.length]] += 8;
    dayMinutes[days - 1] += activeMinutes % 8;
    return dayMinutes.map((min, i) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      return {
        date: [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-"),
        seconds: min * 60,
      };
    });
  }
  const players = people
    .filter((p) =>
      role === "player"
        ? p[0] === "jordan"
        : role !== "parent" || ["jordan", "riley"].includes(p[0]),
    )
    .map(([id, name, min]) => ({
      id,
      name,
      seconds: min * 60,
      workouts: Math.floor(min / 8),
      daily: sampleDaily(
        min,
        people.findIndex((p) => p[0] === id),
      ),
      sides: { right: min * 22, left: min * 22, both: min * 16, other: 0 },
      note: "",
      results:
        id === "leo"
          ? []
          : [0, 1, 2, 3, 4, 5].map((n) => ({
              id: id + "-" + n,
              completed_at: new Date(
                monday.getTime() - (7 - n) * 86400000,
              ).toISOString(),
              drill_key: "right-hand-pound",
              name: "Right-Hand Pound",
              duration_seconds: 30,
              metric: "Controlled reps",
              count_kind: "bounce",
              count_rule_version: "1",
              reps: 28 + people.findIndex((p) => p[0] === id) * 2 + n * 2,
              verification: "self-reported",
            })),
    }));
  const due = new Date(demoDueDate(now));
  const assignments = [
    {
      id: "demo-week",
      name: "Finish strong this week",
      creator_id: "demo-manager",
      creator_name: "Coach Morgan",
      program: templateProgram(HUB_TEMPLATES[0]),
      sessions: 2,
      due_at: due.toISOString(),
      created_at: monday.toISOString(),
      reminder_hours: null,
      recipients: players.map((p, i) => ({
        id: p.id,
        done: [1, 2, 1, 1, 2, 2, 0, 2][people.findIndex((x) => x[0] === p.id)],
        late: 0,
      })),
      feedback: [
        {
          id: "sample-feedback-jordan",
          player_id: "jordan",
          author: "Coach Morgan",
          body: "Good control on your changes of direction, Jordan. Keep your eyes up and finish each sequence cleanly before adding speed in your next session.",
          created_at: now.toISOString(),
        },
      ],
    },
  ];
  return {
    account: {
      id:
        role === "coach"
          ? "demo-manager"
          : role === "player"
            ? "jordan"
            : "demo-parent",
      role,
      name:
        role === "coach"
          ? "Coach Morgan"
          : role === "player"
            ? "Jordan Carter"
            : "Dana Carter",
    },
    players,
    assignments,
    links: players.map((p) => ({
      id: p.id,
      player_id: p.id,
      name: p.name,
      role,
    })),
    invites: [],
    plans: [],
    preferences: {
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
      weekly_email: false,
      reminders_enabled: false,
    },
    week_start: monday.toISOString(),
    server_time: now.toISOString(),
  };
}
