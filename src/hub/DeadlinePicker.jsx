import React, { useState } from "react";
import { CalendarCheck, Clock } from "lucide-react";
export function localDateTime(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function presetDeadline(days, now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(20, 0, 0, 0);
  return localDateTime(d);
}
export function deadlineError(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    return "Choose a date and time for the deadline.";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || localDateTime(date) !== value)
    return "That local date or time is unavailable. Choose another time.";
  if (date <= now)
    return "Choose a deadline later than now. Later today is allowed.";
  const max = new Date(now);
  max.setFullYear(max.getFullYear() + 1);
  if (date > max) return "Choose a deadline within the next year.";
  return "";
}
export default function DeadlinePicker({ value, onChange }) {
  const [mode, setMode] = useState("custom"),
    [date, setDate] = useState(
      value.split("T")[0] || localDateTime(new Date()).slice(0, 10),
    ),
    [time, setTime] = useState(value.split("T")[1] || "");
  const now = new Date(),
    max = new Date(now);
  max.setFullYear(max.getFullYear() + 1);
  const error = value ? deadlineError(value, now) : "",
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  function update(d, t) {
    setDate(d);
    setTime(t);
    onChange(d && t ? `${d}T${t}` : "");
  }
  return (
    <fieldset className="hd-deadline-picker">
      <legend>When is it due?</legend>
      <div className="hp-deadline-presets" aria-label="Quick deadline">
        {[
          [1, "1 day"],
          [3, "3 days"],
          [7, "7 days"],
        ].map(([days, label]) => (
          <button
            key={days}
            type="button"
            aria-pressed={mode === String(days)}
            onClick={() => {
              const v = presetDeadline(days);
              setMode(String(days));
              update(...v.split("T"));
            }}
          >
            <CalendarCheck size={17} />
            <strong>{label}</strong>
            <small>
              {days === 1 ? "Tomorrow" : "In " + days + " days"} · 8 PM
            </small>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={mode === "custom"}
          onClick={() => setMode("custom")}
        >
          <Clock size={17} />
          <strong>Custom</strong>
          <small>Date & time</small>
        </button>
      </div>
      {mode === "custom" ? (
        <div className="hd-custom-deadline">
          <p>Choose any future time, including later today.</p>
          <div className="cs-formgrid">
            <label className="cs-field">
              Date
              <input
                type="date"
                aria-label="Deadline date"
                value={date}
                min={localDateTime(now).slice(0, 10)}
                max={localDateTime(max).slice(0, 10)}
                required
                onChange={(e) => update(e.target.value, time)}
              />
            </label>
            <label className="cs-field">
              Time
              <input
                type="time"
                aria-label="Deadline time"
                value={time}
                required
                onChange={(e) => update(date, e.target.value)}
              />
            </label>
          </div>
        </div>
      ) : (
        <p className="hd-deadline-selected">
          {new Date(value).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })}
          <button
            type="button"
            className="cs-link"
            onClick={() => setMode("custom")}
          >
            Change date or time
          </button>
        </p>
      )}
      <p className="hd-deadline-zone">
        Time zone: <strong>{zone}</strong>
      </p>
      {error && (
        <p className="cs-error" aria-live="polite">
          {error}
        </p>
      )}
    </fieldset>
  );
}
