import { LAUNCH_DRILLS } from "../data/drillCatalog.js";

const pair = (key) => ["right", "left"].map((side) => `${key}-${side}`);
const mirror = (text, side) =>
  side === "right"
    ? text
    : text.replace(/right|left/gi, (m) =>
        m.toLowerCase() === "right" ? "left" : "right",
      );
const combo = (key, name, side, actions, purpose) => ({
  key: `hub-${key}-${side}`,
  drill_key: `hub-${key}-${side}`,
  name: `${side === "right" ? "Right" : "Left"} start · ${name}`,
  hand: key.startsWith("cross") ? "both" : side,
  side,
  metric_type: "reps",
  metric_label: "Complete sequences",
  count_kind: "sequence",
  difficulty: "Developing",
  category: "Ball Handling",
  durationSeconds: 30,
  transitionSeconds: 0,
  setup: "Stay stationary in an athletic stance with clear space around you.",
  short_description: purpose,
  steps: actions.map((a) => mirror(a, side)),
  repeat:
    "Finish the entire chain under control before counting one sequence. Continue from the receiving hand; mirror the next chain when it ends in the opposite hand. Do not add an unlisted reset bounce.",
  rep_rule:
    "One complete, controlled chain is one sequence. Loose-ball bounces and unfinished chains do not count.",
  key_points: [
    "Stay balanced and look ahead.",
    "Keep your palm above or beside the ball.",
    "Slow down until every receive is controlled.",
  ],
  instructions: actions.map((a) => mirror(a, side)).join(" "),
  cue: "Control the full chain before increasing pace.",
  aiProfile: "manual",
  order: 1,
});
const chains = [
  [
    "pound-v",
    "Pound → Front V",
    [
      "One right-hand pound.",
      "One inward right-hand front V bounce.",
      "One outward right-hand front V bounce.",
    ],
    "Connect force to same-hand direction control.",
  ],
  [
    "pound-v-inout",
    "Pound → Front V → In-and-Out",
    [
      "One right-hand pound.",
      "One inward right-hand front V bounce.",
      "One outward right-hand front V bounce.",
      "One right-hand in-and-out bounce.",
    ],
    "Keep the same hand through a longer change-of-pace chain.",
  ],
  [
    "cross-between",
    "Crossover → Between",
    [
      "Cross from right to left.",
      "Bounce between your legs from left back to right.",
    ],
    "Two transfers return to the starting hand for a repeatable protected chain.",
  ],
  [
    "cross-between-behind",
    "Crossover → Between → Behind",
    [
      "Cross from right to left.",
      "Bounce between your legs from left to right.",
      "Bounce behind your back from right to left.",
    ],
    "Three transfers finish in the opposite hand; mirror the next chain naturally.",
  ],
];
export const HUB_DRILLS = [
  ...LAUNCH_DRILLS.map((d) => ({
    ...d,
    key: d.drill_key,
    durationSeconds: 30,
    transitionSeconds: 0,
    instructions: d.steps.join(" ") + " " + d.repeat,
    cue: d.key_points[0],
    aiProfile: "manual",
  })),
  ...chains.flatMap(([key, name, actions, purpose]) =>
    ["right", "left"].map((side) => combo(key, name, side, actions, purpose)),
  ),
];
export const HUB_DRILL_MAP = Object.fromEntries(
  HUB_DRILLS.map((d) => [d.key, d]),
);
const foundations = [
  "right-hand-pound",
  "left-hand-pound",
  ...pair("front-v"),
  ...pair("in-out"),
  "stationary-crossover",
  "stationary-between-legs",
  ...pair("hub-pound-v"),
  ...pair("hub-pound-v-inout"),
  "stationary-crossover",
  "stationary-between-legs",
  "right-hand-pound",
  "left-hand-pound",
];
const pace = [
  "right-hand-pound",
  "left-hand-pound",
  ...pair("front-v"),
  ...pair("hub-pound-v"),
  ...pair("hub-pound-v-inout"),
  "stationary-crossover",
  "pound-cross-alternating",
  ...pair("hub-cross-between"),
  ...pair("hub-pound-v-inout"),
  "in-out-right",
  "in-out-left",
];
const protectedKeys = [
  "stationary-crossover",
  "stationary-between-legs",
  "stationary-behind-back",
  "stationary-crossover",
  ...pair("hub-cross-between"),
  ...pair("hub-cross-between-behind"),
  ...pair("hub-cross-between"),
  ...pair("hub-cross-between-behind"),
  "stationary-between-legs",
  "stationary-behind-back",
  "right-hand-pound",
  "left-hand-pound",
];
export const HUB_TEMPLATES = [
  {
    key: "foundations",
    name: "Handle Foundations",
    purpose: "Build control first, then connect the same skills.",
    keys: foundations,
  },
  {
    key: "pace",
    name: "Setup & Pace",
    purpose: "Build same-hand chains before changing direction.",
    keys: pace,
  },
  {
    key: "protected",
    name: "Protected Transfers",
    purpose: "Progress from single transfers to two- and three-action chains.",
    keys: protectedKeys,
  },
  {
    key: "advanced",
    name: "Advanced Flow",
    purpose:
      "Extend control under longer combinations while balancing both starting hands.",
    keys: [
      ...pace.slice(0, 8),
      ...protectedKeys.slice(4, 12),
      ...pair("hub-pound-v-inout"),
      ...pair("hub-cross-between-behind"),
    ],
  },
];
export function programFromKeys(name, keys) {
  return {
    name,
    focus: "Ball Handling",
    durationMinutes: Math.ceil(keys.length / 2),
    activeSeconds: keys.length * 30,
    drills: keys.map((key, i) => ({
      ...HUB_DRILL_MAP[key],
      key,
      sourceDrillKey: key,
      order: i + 1,
      durationSeconds: 30,
      transitionSeconds: 0,
      duration: "30 seconds · self-paced next round",
    })),
  };
}
export const templateProgram = (t) => programFromKeys(t.name, t.keys);
