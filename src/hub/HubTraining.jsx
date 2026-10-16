import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { hubRpc } from "./api.js";
import "./hub.css";
export default function HubTraining() {
  const { assignmentId, runId } = useParams(),
    [run, setRun] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState(null),
    [until, setUntil] = useState(null),
    [left, setLeft] = useState(0),
    [reps, setReps] = useState(""),
    [epoch, setEpoch] = useState(0),
    [finished, setFinished] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    hubRpc("get_workout_run", { p_run_id: runId })
      .then((d) => {
        if (active) {
          setRun(d);
          setFinished(d.completed);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [runId, epoch]);
  useEffect(() => {
    if (!until) return;
    const tick = () =>
      setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [until]);
  async function perform(fn) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }
  const index = run?.results?.length || 0,
    drill = run?.program?.drills[index];
  async function start() {
    await perform(async () => {
      const d = await hubRpc("begin_workout_drill_attempt", {
        p_run_id: runId,
        p_drill_index: index,
      });
      setAttempt(d.attempt_id);
      setUntil(Date.now() + (d.duration_seconds + d.countdown_seconds) * 1000);
      setLeft(d.duration_seconds + d.countdown_seconds);
    });
  }
  async function save() {
    const count = Number(reps);
    if (
      !reps.trim() ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > 10000
    ) {
      setError("Enter a whole number from 0 to 10,000.");
      return;
    }
    await perform(async () => {
      await hubRpc("complete_workout_drill_attempt", {
        p_attempt_id: attempt,
        p_reps: count,
      });
      setAttempt(null);
      setUntil(null);
      setReps("");
      setEpoch((n) => n + 1);
    });
  }
  return (
    <main id="cs-workboard" className="hub-entry hub-training">
      <Link
        className="cs-back"
        to={`/assigned-work/assignments/${assignmentId}`}
      >
        ← Back to assignment
      </Link>
      <section className="cs-panel">
        <p className="cs-eyebrow">YOUR ASSIGNED WORKOUT</p>
        <h1>{run?.program?.name || "Loading workout…"}</h1>
        {finished ? (
          <>
            <h2>
              {run?.program?.sessionType === "skill"
                ? "Practice saved"
                : "Workout saved"}
            </h2>
            <p className="pc-caption">
              Your completed session is linked to the assignment. Your coach or
              parent can see the updated record when they refresh.
            </p>
            <Link
              className="cs-btn cs-primary"
              to={`/assigned-work/assignments/${assignmentId}`}
            >
              View assignment progress
            </Link>
          </>
        ) : run && index >= run.program.drills.length ? (
          <>
            <h2>All rounds saved</h2>
            <p className="pc-caption">
              Finish to record this session and its assignment credit. Short
              skill practice does not count as a full workout.
            </p>
            <button
              className="cs-btn cs-primary"
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  await hubRpc("cs_hub_finish_run", { p_run_id: runId });
                  setFinished(true);
                })
              }
            >
              {busy
                ? "Saving…"
                : run.program.sessionType === "skill"
                  ? "Finish practice"
                  : "Finish workout"}
            </button>
          </>
        ) : drill ? (
          <>
            <p className="pc-caption">
              Round {index + 1} of {run.program.drills.length} ·{" "}
              {drill.durationSeconds} seconds
            </p>
            <h2>{drill.name}</h2>
            <p className="hub-purpose">{drill.short_description}</p>
            <ol className="hub-coaching">
              {(drill.steps || [drill.instructions]).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <p>{drill.repeat}</p>
            <p className="cs-note">
              <strong>Count:</strong> {drill.rep_rule}
            </p>
            {!attempt ? (
              <button
                className="cs-btn cs-primary"
                disabled={busy}
                onClick={start}
              >
                {busy ? "Starting…" : "Start round · 5-second countdown"}
              </button>
            ) : left > 0 ? (
              <div
                className="hub-timer"
                role="timer"
                aria-label={`${left > drill.durationSeconds ? "Get ready" : "Training"}: ${left > drill.durationSeconds ? left - drill.durationSeconds : left} seconds`}
              >
                <span>
                  {left > drill.durationSeconds ? "GET READY" : "TRAIN"}
                </span>
                <strong>
                  {left > drill.durationSeconds
                    ? left - drill.durationSeconds
                    : left}
                </strong>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
              >
                <label className="cs-field">
                  Your {drill.metric_label || "count"}
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="10000"
                    step="1"
                    value={reps}
                    required
                    onChange={(e) => setReps(e.target.value)}
                  />
                </label>
                <button className="cs-btn cs-primary" disabled={busy}>
                  {busy ? "Saving…" : "Save round"}
                </button>
                <p className="pc-note">
                  Self-reported count. The server checks the required training
                  interval.
                </p>
              </form>
            )}
            <p className="pc-note">
              Choose when to begin each next round. If you reload mid-round,
              restart that round; completed rounds remain saved.
            </p>
          </>
        ) : null}
        <p className="cs-error" role="alert">
          {error}
        </p>
      </section>
    </main>
  );
}
