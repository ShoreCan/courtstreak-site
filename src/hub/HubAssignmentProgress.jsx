import React from "react";
import { Check, ChevronRight, CalendarCheck, Clock } from "lucide-react";
import { assignmentProgress, workUnit, requirementText } from "./workStatus.js";
const initials = (name) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
export function AssignmentSummary({ assignment, players, now, timezone }) {
  const q = assignmentProgress(assignment, players),
    unit = workUnit(assignment.program),
    late = !q.complete && new Date(assignment.due_at) < new Date(now);
  const due = new Date(assignment.due_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
  return (
    <section className="cs-panel hc-assignment-summary">
      <div className="hc-assignment-heading">
        <span className="hc-assignment-symbol">
          <CalendarCheck size={25} />
        </span>
        <div>
          <p className="cs-eyebrow">{assignment.program.name}</p>
          <h2>{assignment.name}</h2>
          <p className="hc-author">Assigned by {assignment.creator_name}</p>
        </div>
      </div>
      <p className="hc-requirement">{requirementText(assignment)}</p>
      <div className="hc-assignment-facts">
        <span className={late ? "hc-overdue" : ""}>
          <Clock size={16} />
          {late ? "Overdue · " : "Due "}
          {due}
        </span>
        <span>
          {q.recipients.length === 1
            ? players.find((p) => p.id === q.recipients[0].id)?.name
            : `${q.recipients.length} players`}
        </span>
      </div>
      <div className="hc-assignment-totals">
        <div>
          <strong>
            {q.done}
            <small> of {q.total}</small>
          </strong>
          <span>{unit}s completed</span>
        </div>
        <div>
          <strong>{q.remaining}</strong>
          <span>
            {unit}
            {q.remaining === 1 ? "" : "s"} remaining
          </span>
        </div>
        {q.recipients.length > 1 && (
          <div>
            <strong>
              {q.finished}
              <small> of {q.recipients.length}</small>
            </strong>
            <span>players finished all work</span>
          </div>
        )}
      </div>
      <div
        className="hc-completion-track"
        role="progressbar"
        aria-label="Assigned sessions completed"
        aria-valuenow={q.done}
        aria-valuemin={0}
        aria-valuemax={q.total || 1}
      >
        <i style={{ width: `${q.total ? (q.done / q.total) * 100 : 0}%` }} />
      </div>
    </section>
  );
}
export default function AssignmentCompletion({
  assignment,
  players,
  now,
  onPlayer,
  onAssign,
  canAssign,
  onReceipt,
}) {
  const q = assignmentProgress(assignment, players),
    unit = workUnit(assignment.program);
  return (
    <section className="cs-panel hc-assignment-completion">
      <div className="hd-card-head">
        <h2>
          {q.recipients.length === 1 ? "Completion" : "Player completion"}
        </h2>
        <span className="hd-period">
          {assignment.sessions} {unit}
          {assignment.sessions === 1 ? "" : "s"} each
        </span>
      </div>
      <div className="hc-recipient-list">
        {q.recipients.map((r) => {
          const p = players.find((p) => p.id === r.id),
            done = Math.min(Number(r.done) || 0, assignment.sessions),
            remaining = assignment.sessions - done,
            late = remaining > 0 && new Date(assignment.due_at) < new Date(now);
          return (
            <article className="hc-recipient" key={r.id}>
              <div className="hc-recipient-heading">
                <span className="hd-avatar">{initials(p.name)}</span>
                <div>
                  <h3>{p.name}</h3>
                  <p
                    className={
                      late ? "hc-overdue" : remaining ? "" : "hc-finished"
                    }
                  >
                    {remaining
                      ? `${remaining} ${unit}${remaining === 1 ? "" : "s"} remaining${late ? " · Overdue" : ""}`
                      : "All assigned work complete"}
                  </p>
                </div>
              </div>
              <ol
                className="hc-session-markers"
                aria-label={`${done} of ${assignment.sessions} ${unit}s completed`}
              >
                {Array.from({ length: assignment.sessions }, (_, i) => (
                  <li key={i} className={i < done ? "done" : ""}>
                    {i < done && onReceipt ? (
                      <button
                        type="button"
                        onClick={() => onReceipt(p, i)}
                        aria-label={`View ${p.name}, session ${i + 1} receipt`}
                      >
                        <Check size={18} />
                      </button>
                    ) : (
                      <span>{i < done ? <Check size={18} /> : i + 1}</span>
                    )}
                    <small>{i < done ? "Completed" : "To do"}</small>
                  </li>
                ))}
              </ol>
              {r.late > 0 && (
                <small className="hc-late-note">
                  {r.late} completed after the deadline
                </small>
              )}
              <div className="hc-recipient-actions">
                <button className="cs-btn" onClick={() => onPlayer(p)}>
                  View progress <ChevronRight size={15} />
                </button>
                {!remaining && canAssign && (
                  <button className="cs-link" onClick={() => onAssign(p)}>
                    Assign next workout →
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!q.recipients.length && (
        <p className="cs-empty">No assigned players in this view.</p>
      )}
      <details className="hd-help">
        <summary>What counts as complete?</summary>
        <p>
          A check appears after a full assigned session is saved from the
          player's own account. Parent and coach views cannot complete training
          for a player. Completion and drill counts are based on saved activity;
          manual counts are self-reported.
        </p>
      </details>
    </section>
  );
}
