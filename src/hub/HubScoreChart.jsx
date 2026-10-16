import React, { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";

export default function HubScoreChart({ history, timezone }) {
  const ref = useRef(null),
    [width, setWidth] = useState(360),
    [picked, setPicked] = useState(null),
    id = useId().replace(/:/g, "");
  useEffect(() => {
    const measure = () =>
      setWidth(Math.max(240, ref.current?.clientWidth || 360));
    measure();
    if (!ref.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [history.length]);
  if (!history.length) return null;
  const rows = history.slice(-20),
    found = rows.findIndex((r) => r.id === picked),
    index = found < 0 ? rows.length - 1 : found,
    active = rows[index],
    latest = history.at(-1),
    first = history[0],
    best = Math.max(...history.map((r) => Number(r.reps))),
    change = Number(latest.reps) - Number(first.reps),
    h = 180,
    l = 32,
    r = 12,
    t = 18,
    b = 28,
    cap = Math.max(5, Math.ceil(best / 5) * 5),
    x = (i) =>
      l + (rows.length > 1 ? i / (rows.length - 1) : 0.5) * (width - l - r),
    y = (v) => h - b - (v / cap) * (h - t - b),
    points = rows.map((row, i) => `${x(i)},${y(Number(row.reps))}`),
    date = (value) =>
      new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
        timeZoneName: "short",
      }),
    select = (i) =>
      setPicked(rows[Math.max(0, Math.min(rows.length - 1, i))].id);
  function pointer(event) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect?.width) return;
    const px = ((event.clientX - rect.left) / rect.width) * width;
    select(Math.round(((px - l) / (width - l - r)) * (rows.length - 1)));
  }
  return (
    <div className="hp-score-chart">
      <div className="hp-score-stats">
        <div>
          <span>Latest</span>
          <strong>{latest.reps}</strong>
        </div>
        <div>
          <span>Best of {history.length}</span>
          <strong>{best}</strong>
        </div>
        <div
          className={change > 0 ? "improved" : change < 0 ? "decreased" : ""}
        >
          <span>Change</span>
          <strong>
            {history.length > 1 ? `${change > 0 ? "+" : ""}${change}` : "—"}
            {change > 0 && <TrendingUp size={15} />}
          </strong>
        </div>
      </div>
      <div className="hp-score-reading" aria-live="polite">
        <div>
          <span>
            {index === rows.length - 1 ? "Latest attempt" : "Selected attempt"}
          </span>
          <strong>
            {active.reps}
            <small>{active.metric}</small>
          </strong>
        </div>
        <time dateTime={active.completed_at}>{date(active.completed_at)}</time>
      </div>
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${h}`}
        role="img"
        aria-label={`Matching drill attempt history. Selected result: ${active.reps} ${active.metric}, ${date(active.completed_at)}.`}
        onClick={pointer}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || event.buttons === 1)
            pointer(event);
        }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8ecaff" stopOpacity=".22" />
            <stop offset="100%" stopColor="#8ecaff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, Math.ceil(cap / 2), cap].map((v) => (
          <g key={v}>
            <line
              x1={l}
              x2={width - r}
              y1={y(v)}
              y2={y(v)}
              stroke="#40546d"
              strokeOpacity=".55"
            />
            <text
              x={l - 7}
              y={y(v) + 4}
              textAnchor="end"
              fill="#a9bbd0"
              fontSize="11"
            >
              {v}
            </text>
          </g>
        ))}
        {rows.length > 1 && (
          <polygon
            points={`${x(0)},${h - b} ${points.join(" ")} ${x(rows.length - 1)},${h - b}`}
            fill={`url(#${id})`}
          />
        )}
        <line
          x1={x(index)}
          x2={x(index)}
          y1={t}
          y2={h - b}
          stroke="#a8d4ff"
          strokeDasharray="3 5"
          opacity=".5"
        />
        <polyline
          className="hp-draw-line"
          pathLength="1"
          points={points.join(" ")}
          fill="none"
          stroke="#8ecaff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {rows.map((row, i) => (
          <g key={row.id || i}>
            {i === index && (
              <circle
                cx={x(i)}
                cy={y(Number(row.reps))}
                r="10"
                fill="#8ecaff"
                opacity=".13"
              />
            )}
            <circle
              cx={x(i)}
              cy={y(Number(row.reps))}
              r={i === index ? 5 : 2.5}
              fill={i === index ? "#dbedff" : "#8ecaff"}
              stroke="#1b2b40"
              strokeWidth="2"
            />
          </g>
        ))}
        <text x={l} y={h - 7} fill="#a9bbd0" fontSize="10">
          Attempt {history.length - rows.length + 1}
        </text>
        <text
          x={width - r}
          y={h - 7}
          fill="#a9bbd0"
          fontSize="10"
          textAnchor="end"
        >
          Attempt {history.length}
        </text>
      </svg>
      <div className="hp-score-controls">
        <button
          type="button"
          onClick={() => select(index - 1)}
          disabled={index === 0}
          aria-label="Previous drill result"
        >
          <ChevronLeft size={19} />
        </button>
        <label className="hub-sr" htmlFor={`score-${id}`}>
          Select a matching drill result
        </label>
        <input
          id={`score-${id}`}
          type="range"
          min="0"
          max={Math.max(0, rows.length - 1)}
          step="1"
          value={index}
          disabled={rows.length < 2}
          aria-valuetext={`${active.reps} ${active.metric}, ${date(active.completed_at)}`}
          onChange={(event) => select(Number(event.target.value))}
        />
        <button
          type="button"
          onClick={() => select(index + 1)}
          disabled={index === rows.length - 1}
          aria-label="Next drill result"
        >
          <ChevronRight size={19} />
        </button>
      </div>
      <p className="hp-chart-hint">
        Slide or tap the chart to inspect {rows.length} attempts.
      </p>
    </div>
  );
}
