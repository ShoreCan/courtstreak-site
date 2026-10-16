import React, { useId, useState, useRef, useEffect } from "react";
import {
  Activity,
  CalendarCheck,
  ChevronRight,
  Users,
  Layers,
  Info,
} from "lucide-react";
import { minutes, requirements } from "./api.js";
import "./hub-dashboard.css";
import { playerWorkStatus, workUnit } from "./workStatus.js";
const initials = (name) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
export function combineDays(players) {
  const days = new Map();
  for (const p of players)
    for (const d of p.daily || [])
      days.set(d.date, (days.get(d.date) || 0) + (Number(d.seconds) || 0));
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, seconds]) => ({ date, seconds }));
}
export function dashboardTotals(players, assignments) {
  const done = players.reduce(
    (v, p) => {
      const q = requirements(p, assignments);
      return { done: v.done + q.done, total: v.total + q.total };
    },
    { done: 0, total: 0 },
  );
  const daily = combineDays(players),
    single = players.length === 1;
  return {
    ...done,
    daily,
    seconds: players.reduce((s, p) => s + (Number(p.seconds) || 0), 0),
    workouts: players.reduce((s, p) => s + (Number(p.workouts) || 0), 0),
    activity: single
      ? daily.filter((d) => d.seconds > 0).length
      : players.filter((p) => p.seconds > 0).length,
    activityTotal: single ? daily.length : players.length,
    single,
  };
}
export function MetricRings({ players, assignments, onWork, onActivity }) {
  const t = dashboardTotals(players, assignments);
  return (
    <section className="hd-metrics" aria-label="Training summary">
      {[
        {
          label: "Assigned",
          value: t.total ? `${Math.round((t.done / t.total) * 100)}%` : "—",
          sub: t.total ? `${t.done} / ${t.total} done` : "No assignments",
          ratio: t.total ? t.done / t.total : 0,
          color: "orange",
          action: onWork,
          Icon: CalendarCheck,
        },
        {
          label: t.single ? "Practice days" : "Players active",
          value: `${t.activity}`,
          sub: `of ${t.activityTotal} ${t.single ? "days" : "players"}`,
          ratio: t.activityTotal ? t.activity / t.activityTotal : 0,
          color: "blue",
          action: onActivity,
          Icon: Users,
        },
        {
          label: "Active minutes",
          value: minutes(t.seconds),
          sub: `${t.workouts} full workouts`,
          ratio: null,
          color: "green",
          action: onActivity,
          Icon: Activity,
        },
      ].map(({ label, value, sub, ratio, color, action, Icon }) => (
        <button
          className={`hd-metric ${color}`}
          key={label}
          onClick={action}
          aria-label={`${label}: ${value}, ${sub}. Open details`}
        >
          <span className="hd-ring">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle className="hd-ring-track" cx="50" cy="50" r="42" />
              {ratio !== null && (
                <circle
                  className="hd-ring-value"
                  cx="50"
                  cy="50"
                  r="42"
                  strokeDasharray={`${Math.max(0, Math.min(1, ratio)) * 264} 264`}
                  transform="rotate(-90 50 50)"
                />
              )}
            </svg>
            <span>
              <strong>{value}</strong>
              {ratio === null && <Icon size={15} />}
            </span>
          </span>
          <strong className="hd-metric-label">
            {label} <ChevronRight size={13} />
          </strong>
          <small>{sub}</small>
        </button>
      ))}
    </section>
  );
}
export function Sparkline({ values = [], color = "currentColor" }) {
  if (!values.length) return <span className="hd-spark-empty">No history</span>;
  const max = Math.max(1, ...values),
    min = Math.min(0, ...values),
    x = (i) => 4 + (values.length > 1 ? i / (values.length - 1) : 0.5) * 96,
    y = (n) => 30 - ((n - min) / (max - min)) * 26;
  return (
    <svg
      className="hd-spark"
      viewBox="0 0 104 36"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(values.at(-1))}
        r="3"
        fill={color}
      />
    </svg>
  );
}
export function ActivityPlot({
  daily = [],
  onOpen,
  title = "Practice this week",
}) {
  const chartRef = useRef(null),
    [width, setWidth] = useState(360);
  useEffect(() => {
    const measure = () =>
      setWidth(Math.max(240, chartRef.current?.clientWidth || 360));
    measure();
    if (!chartRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [daily.length]);
  const id = useId().replace(/:/g, ""),
    [picked, setPicked] = useState(null),
    chosen = daily.find((d) => d.date === picked) || daily.at(-1),
    cap = Math.max(
      5,
      Math.ceil(Math.max(0, ...daily.map((d) => minutes(d.seconds))) / 5) * 5,
    ),
    w = width,
    h = 158,
    l = 30,
    r = 12,
    t = 16,
    b = 22,
    x = (i) =>
      l + (daily.length > 1 ? i / (daily.length - 1) : 0.5) * (w - l - r),
    y = (v) => h - b - (v / cap) * (h - t - b),
    points = daily.map((d, i) => `${x(i)},${y(minutes(d.seconds))}`),
    label = (date) =>
      new Date(date + "T12:00:00Z").toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
  function inspectDay(event) {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect?.width || !daily.length) return;
    const px = ((event.clientX - rect.left) / rect.width) * w;
    const i = Math.max(
      0,
      Math.min(
        daily.length - 1,
        Math.round(((px - l) / (w - l - r)) * (daily.length - 1)),
      ),
    );
    setPicked(daily[i].date);
  }
  return (
    <section className="hd-card hd-activity">
      <div className="hd-card-head">
        <button onClick={onOpen}>
          <span>{title}</span>
          <ChevronRight size={17} />
        </button>
        <span className="hd-period">ACTIVE MIN</span>
      </div>
      {chosen ? (
        <>
          <div className="hd-chart-reading" aria-live="polite">
            <strong>
              {minutes(chosen.seconds)}
              <small> min</small>
            </strong>
            <span>{label(chosen.date)}</span>
          </div>
          <svg
            ref={chartRef}
            onClick={inspectDay}
            onPointerMove={(event) => {
              if (event.pointerType === "mouse" || event.buttons === 1)
                inspectDay(event);
            }}
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-label={`Daily active minutes: ${daily.map((d) => label(d.date) + ": " + minutes(d.seconds)).join("; ")}`}
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff9b4a" stopOpacity=".2" />
                <stop offset="100%" stopColor="#ff9b4a" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, cap / 2, cap].map((v) => (
              <g key={v}>
                <line
                  x1={l}
                  x2={w - r}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="#35465c"
                  strokeOpacity=".6"
                />
                <text
                  x={l - 7}
                  y={y(v) + 4}
                  fill="#9fb0c5"
                  fontSize="11"
                  textAnchor="end"
                >
                  {v}
                </text>
              </g>
            ))}
            {points.length > 1 && (
              <polygon
                points={`${x(0)},${h - b} ${points.join(" ")} ${x(daily.length - 1)},${h - b}`}
                fill={`url(#${id})`}
              />
            )}
            <line
              x1={x(daily.findIndex((d) => d.date === chosen.date))}
              x2={x(daily.findIndex((d) => d.date === chosen.date))}
              y1={t}
              y2={h - b}
              stroke="#ffad70"
              strokeDasharray="3 5"
              opacity=".4"
            />
            <polyline
              className="hp-draw-line"
              pathLength="1"
              points={points.join(" ")}
              fill="none"
              stroke="#ffa359"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {daily.map((d, i) => (
              <circle
                key={d.date}
                cx={x(i)}
                cy={y(minutes(d.seconds))}
                r={chosen.date === d.date ? 5 : 3}
                fill={chosen.date === d.date ? "#ffd0a6" : "#ff9b4a"}
                stroke="#15283e"
                strokeWidth="2"
              />
            ))}
          </svg>
          <div className="hd-days" aria-label="Choose a practice day">
            {daily.map((d) => (
              <button
                key={d.date}
                aria-pressed={chosen.date === d.date}
                onClick={() => setPicked(d.date)}
                aria-label={`${label(d.date)}, ${minutes(d.seconds)} active minutes`}
              >
                <span>
                  {new Date(d.date + "T12:00:00Z").toLocaleDateString(
                    undefined,
                    { weekday: "short", timeZone: "UTC" },
                  )}
                </span>
                <strong>{minutes(d.seconds)}</strong>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="hd-empty">
          Practice appears after the first saved round.
        </p>
      )}
    </section>
  );
}
export function WorkoutVisual({ program }) {
  const hands = ["right", "left", "both"].map((key) => ({
    key,
    seconds: program.drills
      .filter((d) => d.hand === key)
      .reduce((sum, d) => sum + (Number(d.durationSeconds) || 0), 0),
  }));
  const total = hands.reduce((sum, h) => sum + h.seconds, 0);
  return (
    <div className="hp-workout-visual">
      <div className="hp-plan-numbers">
        <strong>
          {program.activeSeconds / 60}
          <small>ACTIVE MIN</small>
        </strong>
        <span>
          <b>{program.drills.length}</b> rounds
          <small>Stationary ball handling</small>
        </span>
      </div>
      <div
        className="hp-hand-track"
        aria-label={hands
          .map((h) => `${h.key}: ${h.seconds / 60} minutes`)
          .join(", ")}
      >
        {hands.map((h) => (
          <i key={h.key} className={h.key} style={{ flex: h.seconds || 0 }} />
        ))}
      </div>
      <div className="hp-hand-legend">
        {hands
          .filter((h) => h.seconds > 0)
          .map((h) => (
            <span key={h.key} className={h.key}>
              <i />
              {h.key === "both"
                ? "Both hands"
                : h.key === "right"
                  ? "Right hand"
                  : "Left hand"}{" "}
              <b>{total ? Math.round((h.seconds / total) * 100) : 0}%</b>
            </span>
          ))}
      </div>
    </div>
  );
}
export function PlayerGrid({
  players,
  assignments,
  onPlayer,
  onWork,
  onAssign,
  onAll,
  title,
  limit,
  now,
  filterable = false,
}) {
  const [filter, setFilter] = useState("all");
  const rows = players.map((p) => ({
    p,
    status: playerWorkStatus(p, assignments, now),
  }));
  const counts = {
    all: rows.length,
    remaining: rows.filter((r) => r.status.kind === "remaining").length,
    finished: rows.filter((r) => r.status.kind === "finished").length,
    unassigned: rows.filter((r) => r.status.kind === "unassigned").length,
  };
  const filtered = rows.filter(
    (r) => filter === "all" || r.status.kind === filter,
  );
  const shown = limit && filter === "all" ? filtered.slice(0, limit) : filtered;
  return (
    <section className="hd-card hd-roster hc-roster">
      <div className="hd-card-head">
        <h2>{title}</h2>
        {onAll && (
          <button onClick={onAll}>
            View all {players.length} <ChevronRight size={15} />
          </button>
        )}
      </div>
      {filterable && (
        <div className="hc-roster-filters" aria-label="Filter players">
          {[
            ["all", "All players"],
            ["remaining", "Work remaining"],
            ["finished", "Finished"],
            ["unassigned", "No assignment"],
          ]
            .filter(([key]) => key !== "unassigned" || counts.unassigned > 0)
            .map(([key, label]) => (
              <button
                key={key}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
                <strong>{counts[key]}</strong>
              </button>
            ))}
        </div>
      )}
      <div className="hd-player-grid">
        {shown.map(({ p, status: q }) => (
          <article key={p.id} className={`hd-player hc-player ${q.kind}`}>
            <button
              className="hc-player-open home-person"
              onClick={() => onPlayer(p)}
              aria-label={`${p.name}. ${q.label}. View progress`}
            >
              <span className="hd-player-main">
                <span
                  className="hp-avatar-ring"
                  style={{
                    "--completion": `${q.total ? (q.done / q.total) * 100 : 0}%`,
                  }}
                >
                  <span className="hd-avatar">{initials(p.name)}</span>
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    View progress <ChevronRight size={12} />
                  </small>
                </span>
                <ChevronRight size={16} />
              </span>
            </button>
            <p className={`hc-player-status ${q.overdue ? "hc-overdue" : ""}`}>
              {q.kind === "finished" && <CalendarCheck size={16} />} {q.label}
              {q.overdue > 0 && <small>Overdue</small>}
            </p>
            <div className="hc-player-completed">
              <span>
                {q.total
                  ? `${q.done} of ${q.total} sessions completed`
                  : "Ready for a new plan"}
              </span>
            </div>
            <div className="hc-player-week">
              <div
                className="hp-mini-week"
                aria-label="Daily practice this week"
              >
                {(p.daily || []).map((d) => (
                  <span
                    key={d.date}
                    title={`${d.date}: ${minutes(d.seconds)} active minutes`}
                  >
                    <i
                      className={d.seconds > 0 ? "" : "empty"}
                      style={{
                        height: `${Math.max(3, ((Number(d.seconds) || 0) / Math.max(1, ...(p.daily || []).map((x) => Number(x.seconds) || 0))) * 28)}px`,
                      }}
                    />
                    <small>
                      {new Date(d.date + "T12:00:00Z").toLocaleDateString(
                        undefined,
                        { weekday: "narrow", timeZone: "UTC" },
                      )}
                    </small>
                  </span>
                ))}
              </div>
              <div>
                <strong>
                  {minutes(p.seconds)}
                  <small> min</small>
                </strong>
                <span>This week</span>
              </div>
            </div>
            {q.next && onWork ? (
              <button
                className="cs-btn hc-next-action"
                onClick={() => onWork(q.next, p)}
              >
                View remaining work <ChevronRight size={15} />
              </button>
            ) : onAssign ? (
              <button
                className="cs-btn hc-next-action"
                onClick={() => onAssign(p)}
              >
                {q.total ? "Assign next workout" : "Assign workout"}{" "}
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                className="cs-btn hc-next-action"
                onClick={() => onPlayer(p)}
              >
                View progress <ChevronRight size={15} />
              </button>
            )}
          </article>
        ))}
      </div>
      {!shown.length && (
        <p className="cs-empty">
          {filter === "remaining"
            ? "Everyone has finished their assigned work."
            : filter === "finished"
              ? "No players have finished all their assigned work yet."
              : "No players in this view."}
        </p>
      )}
      {limit && filter === "all" && filtered.length > limit && onAll && (
        <button className="cs-link hc-view-all" onClick={onAll}>
          See all {filtered.length}{" "}
          {filter === "all" ? "players" : "matching players"} →
        </button>
      )}
    </section>
  );
}
export function WorkTile({ assignment, players, onOpen, timezone, now }) {
  const recipients = assignment.recipients.filter((r) =>
      players.some((p) => p.id === r.id),
    ),
    total = recipients.length * assignment.sessions,
    done = recipients.reduce(
      (s, r) => s + Math.min(r.done, assignment.sessions),
      0,
    ),
    complete = total > 0 && done >= total,
    late = !complete && new Date(assignment.due_at) < new Date(now),
    date = new Date(assignment.due_at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    });
  return (
    <button
      className={`hd-work cs-assignment ${complete ? "hp-complete" : ""}`}
      onClick={() => onOpen(assignment)}
    >
      <span className="hd-work-icon">
        <span
          className="hp-work-ring"
          style={{ "--completion": `${total ? (done / total) * 100 : 0}%` }}
        >
          <Layers size={22} />
        </span>
      </span>
      <span className="hd-work-content">
        <strong>{assignment.name}</strong>
        <small>
          {assignment.program.activeSeconds / 60} min · {assignment.sessions}{" "}
          {workUnit(assignment.program)}
          {assignment.sessions === 1 ? "" : "s"}{" "}
          {recipients.length > 1 ? "per player" : "required"}
        </small>
        <span className={`hd-due ${late ? "late" : ""}`}>
          {complete ? "Completed · Due" : late ? "Overdue" : "Due"} {date}
        </span>
        <span className="hd-thin-track">
          <i style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
        </span>
      </span>
      <span className="hd-work-count">
        <strong>
          {done}/{total}
        </strong>
        <small>sessions completed</small>
        <ChevronRight size={17} />
      </span>
    </button>
  );
}
export function MetricHelp() {
  return (
    <details className="hd-help">
      <summary>
        <Info size={14} /> What do these numbers mean?
      </summary>
      <p>
        Assignments include currently visible requirements. Practice days and
        minutes cover this week. Practice-day rings compare logged days with
        elapsed days, not a training goal. Player counts show who logged
        practice. Full workouts exclude short skill sessions. Drill scores are
        self-reported.
      </p>
    </details>
  );
}

export function HandBalance({ players }) {
  const [picked, setPicked] = useState("right");
  const sections = [
    ["right", "Right hand", "#ffb076"],
    ["left", "Left hand", "#91c9f3"],
    ["both", "Both hands", "#8cddbd"],
    ["other", "Unclassified", "#a8acc5"],
  ].map(([key, label, color]) => ({
    key,
    label,
    color,
    seconds: players.reduce((sum, p) => sum + (Number(p.sides?.[key]) || 0), 0),
  }));
  const total = sections.reduce((sum, v) => sum + v.seconds, 0),
    active = sections.find((s) => s.key === picked) || sections[0];
  let offset = 0;
  return (
    <section className="cs-panel hc-hand-balance">
      <div className="hd-card-head">
        <h2>Practice on both sides</h2>
        <span className="hd-period">THIS WEEK</span>
      </div>
      <div className="hc-hand-layout">
        <div className="hc-hand-dial">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke="#31465f"
              strokeWidth="14"
            />
            {sections
              .filter((s) => s.seconds > 0)
              .map((s) => {
                const length = (s.seconds / total) * 490,
                  start = offset;
                offset += length;
                return (
                  <circle
                    key={s.key}
                    cx="100"
                    cy="100"
                    r="78"
                    fill="none"
                    stroke={s.color}
                    strokeWidth={picked === s.key ? 18 : 12}
                    strokeDasharray={`${Math.max(0, length - 4)} 490`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 100 100)"
                  />
                );
              })}
          </svg>
          <div aria-live="polite">
            <span>{active.label}</span>
            <strong>
              {minutes(active.seconds)}
              <small> min</small>
            </strong>
            <span>
              {total ? Math.round((active.seconds / total) * 100) : 0}% of
              logged time
            </span>
          </div>
        </div>
        <div className="hc-hand-options" aria-label="Inspect hand usage">
          {sections
            .filter((s) => s.key !== "other" || s.seconds > 0)
            .map((s) => (
              <button
                key={s.key}
                aria-pressed={picked === s.key}
                onClick={() => setPicked(s.key)}
              >
                <i style={{ background: s.color }} />
                <span>{s.label}</span>
                <strong>{minutes(s.seconds)} min</strong>
                <ChevronRight size={14} />
              </button>
            ))}
        </div>
      </div>
      {!total && (
        <p className="cs-empty">
          Hand usage appears after a saved training round.
        </p>
      )}
      <details className="hd-help">
        <summary>How hand usage is measured</summary>
        <p>
          Time comes from the hand label on each saved drill, not camera
          detection. Both-hand drills count once in their own category.
          Unclassified drills stay separate. This chart describes practice time,
          not skill quality.
        </p>
      </details>
    </section>
  );
}
