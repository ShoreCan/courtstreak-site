import React from "react";
import { Bell, Check, Clock, Mail } from "lucide-react";
import { assignmentProgress } from "./workStatus.js";
import { hubRpc } from "./api.js";
export default function AssignmentReminders({
  assignment,
  players,
  now,
  timezone,
  canWrite,
  preview,
  busy,
  save,
  onPreferences,
}) {
  const progress = assignmentProgress(assignment, players),
    due = new Date(assignment.due_at),
    remind = new Date(due.getTime() - 24 * 60 * 60 * 1000),
    past = due < new Date(now),
    soon = new Date(now) >= remind;
  const format = (d) =>
    d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    });
  return (
    <section className="cs-panel cs-reminder-settings">
      <div className="cs-reminder-heading">
        <Bell size={23} />
        <div>
          <h2>Assignment reminders</h2>
          <p>{assignment.name}</p>
        </div>
      </div>
      <div
        className={`cs-inapp-reminder ${progress.complete ? "finished" : ""}`}
      >
        <span className="cs-reminder-symbol">
          {progress.complete ? <Check size={23} /> : <Clock size={23} />}
        </span>
        <div>
          <span className="cs-reminder-channel">IN COURTSTREAK</span>
          <h3>
            {!progress.total
              ? "Not assigned in this view"
              : progress.complete
                ? "No reminder needed"
                : past
                  ? "Deadline passed"
                  : soon
                    ? "Due within 24 hours"
                    : "Automatic · 24 hours before"}
          </h3>
          <p>
            {!progress.total
              ? "Choose a player assigned to this workout to check their reminder status."
              : progress.complete
                ? "Everyone in this view has finished their assigned work."
                : past
                  ? "Unfinished work stays visible under Assigned work."
                  : soon
                    ? "Open the bell to see work that is due soon."
                    : `Due-soon reminders become available ${format(remind)}.`}
          </p>
          <small>Deadline: {format(due)}</small>
        </div>
      </div>
      <p className="cs-reminder-explainer">
        Bell reminders are for unfinished work and appear while CourtStreak is
        open or refreshed. They do not send a phone push alert.
      </p>
      <details className="cs-email-reminder">
        <summary>
          <Mail size={18} />
          <span>
            Email reminder <small>Optional</small>
          </span>
        </summary>
        <p>
          Email is separate from the bell. Delivery requires CourtStreak email
          service and the player's email opt-in. Saving a time does not send an
          immediate message.
        </p>
        {canWrite ? (
          <form
            key={assignment.id + ":" + assignment.reminder_hours}
            onSubmit={(e) => {
              e.preventDefault();
              const hours = new FormData(e.currentTarget).get("hours");
              save(
                () =>
                  hubRpc("cs_hub_reminder_save", {
                    p_assignment: assignment.id,
                    p_hours: hours === "off" ? null : Number(hours),
                  }),
                "Email reminder timing saved.",
              );
            }}
          >
            <label className="cs-field">
              Email timing
              <select
                name="hours"
                defaultValue={assignment.reminder_hours || "off"}
              >
                <option value="off">No email reminder</option>
                <option value="24">24 hours before the deadline</option>
                <option value="2">2 hours before the deadline</option>
              </select>
            </label>
            <button className="cs-btn" disabled={busy || preview}>
              Save email timing
            </button>
            {preview && (
              <p className="cs-small cs-muted">
                Preview only · Email settings cannot be saved.
              </p>
            )}
          </form>
        ) : (
          <p>
            Email timing is managed by {assignment.creator_name}, who assigned
            this workout.
          </p>
        )}
        <button type="button" className="cs-link" onClick={onPreferences}>
          My email preferences →
        </button>
      </details>
      <details className="hd-help">
        <summary>Who gets an in-app reminder?</summary>
        <p>
          The player and approved parents or coaches who can currently view this
          assignment. Completed work is excluded from due-soon reminders. Read
          or dismiss an update in the bell; this does not change training
          progress.
        </p>
      </details>
    </section>
  );
}
