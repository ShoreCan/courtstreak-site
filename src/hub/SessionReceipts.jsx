import React, { useEffect, useRef, useState } from "react";
import { Check, FileCheck, Clock } from "lucide-react";
import { hubRpc, minutes } from "./api.js";
import { demoReceipts } from "./demoActivity.js";
import "./hub-activity.css";
export default function SessionReceipts({
  assignment,
  player,
  preview,
  session,
  runId,
  timezone,
  now,
}) {
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, [assignment.id, player?.id]);
  const [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [epoch, setEpoch] = useState(0),
    [picked, setPicked] = useState(null);
  useEffect(() => {
    let active = true;
    setResult(null);
    setError("");
    setPicked(null);
    if (!player) return;
    const load = preview
      ? Promise.resolve(demoReceipts(assignment, player, now))
      : hubRpc("cs_hub_session_receipts", {
          p_assignment: assignment.id,
          p_player: player.id,
        });
    load
      .then((r) => {
        if (active) setResult(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [assignment.id, player?.id, preview, epoch]);
  const format = (value) =>
    new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    });
  const rows = result?.sessions || [],
    selected = picked
      ? rows.find((r) => r.run_id === picked)
      : runId
        ? rows.find((r) => r.run_id === runId)
        : rows[Number(session) || 0];
  if (!player)
    return (
      <section className="cs-panel">
        <h2>Choose a player</h2>
        <p>Select a completed session from Player completion.</p>
      </section>
    );
  return (
    <section className="cs-panel cs-receipts" aria-busy={!result && !error}>
      <div className="cs-receipts-heading">
        <FileCheck size={24} />
        <div>
          <h2 ref={heading} tabIndex={-1}>
            {player.name} · Session receipts
          </h2>
          <p>
            {preview
              ? "Fictional sample receipt"
              : "Saved assigned sessions only"}
          </p>
        </div>
      </div>
      {error ? (
        <div role="alert">
          <p className="cs-error">{error}</p>
          <button className="cs-btn" onClick={() => setEpoch((e) => e + 1)}>
            Try again
          </button>
        </div>
      ) : !result ? (
        <p role="status">Loading saved sessions…</p>
      ) : !rows.length ? (
        <p className="cs-empty">
          No completed assigned sessions have been saved yet.
        </p>
      ) : (
        <>
          <div className="cs-receipt-tabs" aria-label="Choose a saved session">
            {rows.map((r, i) => (
              <button
                key={r.run_id}
                aria-pressed={selected?.run_id === r.run_id}
                onClick={() => setPicked(r.run_id)}
              >
                <Check size={15} />
                Session {i + 1}
              </button>
            ))}
          </div>
          {!selected && (
            <p className="cs-empty">
              This saved session is not available. Choose an available session
              above.
            </p>
          )}
          {selected && (
            <>
              <div className="cs-receipt-summary">
                <div>
                  <span>
                    {selected.late ? "Completed after deadline" : "Completed"}
                  </span>
                  <strong>{format(selected.completed_at)}</strong>
                </div>
                <div>
                  <span>Saved active time</span>
                  <strong>{minutes(selected.active_seconds)} min</strong>
                </div>
                <div>
                  <span>Saved rounds</span>
                  <strong>
                    {selected.rounds.filter((r) => r.completed_at).length} of{" "}
                    {selected.rounds.length}
                  </strong>
                </div>
              </div>
              <ol className="cs-receipt-rounds">
                {selected.rounds.map((r, i) => (
                  <li key={i}>
                    <span className="cs-receipt-round-number">
                      {r.completed_at ? <Check size={15} /> : i + 1}
                    </span>
                    <div>
                      <strong>{r.name}</strong>
                      <small>
                        {r.completed_at
                          ? `${r.duration_seconds ?? "—"}s · Saved ${format(r.completed_at)}`
                          : "No saved round found"}
                      </small>
                    </div>
                    <div className="cs-receipt-result">
                      <strong>{r.reps ?? "—"}</strong>
                      <small>{r.metric}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
          <details className="hd-help">
            <summary>What does this receipt verify?</summary>
            <p>
              It shows the rounds and time saved to this assigned session.
              Counts are self-reported. A saved session does not prove correct
              technique or camera-verified effort. Unrelated practice is
              excluded.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
