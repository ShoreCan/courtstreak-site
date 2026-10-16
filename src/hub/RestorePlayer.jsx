import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { getHubAccount, hubRpc, hubHome } from "./api.js";
import "./hub.css";

export default function RestorePlayer() {
  const navigate = useNavigate(),
    writing = useRef(false);
  const [account, setAccount] = useState(null),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    Promise.all([getHubAccount(), supabase.auth.getUser()])
      .then(([current, session]) => {
        if (
          session.error ||
          !session.data?.user ||
          session.data.user.id !== current.id
        )
          throw new Error(
            "Please sign in again to restore your player account.",
          );
        if (active) {
          setAccount(current);
          setEmail(session.data.user.email || "");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  async function restore() {
    if (writing.current || !account) return;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      const session = await supabase.auth.getUser();
      if (session.error || session.data?.user?.id !== account.id)
        throw new Error(
          "Your sign-in changed. Reload this page before continuing.",
        );
      const updated = await hubRpc("cs_hub_restore_player");
      if (updated?.role !== "player" || updated?.id !== account.id)
        throw new Error(
          "Your player role could not be confirmed. Please reload and try again.",
        );
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(e.message || "Your account could not be updated. Try again.");
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  return (
    <main id="cs-workboard" className="hub-entry">
      <Link className="cs-logo" to="/">
        Court<span>Streak</span>
      </Link>
      <section
        className="cs-panel"
        style={{ maxWidth: 620, margin: "24px auto" }}
      >
        <p className="cs-eyebrow">YOUR ORIGINAL PLAYER ACCOUNT</p>
        <h1>Return to your player dashboard</h1>
        <p className="pc-caption">
          Your original dashboard is still available. This corrects an account
          that was switched to Parent or Coach during testing.
        </p>
        {account && (
          <>
            <div className="cs-breakdown">
              <span>Signed in</span>
              <strong>{account.name}</strong>
            </div>
            <p className="cs-small cs-muted">{email}</p>
            <div className="cs-breakdown">
              <span>Current account role</span>
              <strong>{account.role}</strong>
            </div>
            <p className="pc-caption">
              Training records, XP, trophies, and your membership stay
              unchanged. Your account will open the player dashboard after
              login. Normal membership checks still apply.
            </p>
            {account.role === "player" ? (
              <Link className="cs-btn cs-primary" to="/dashboard">
                Open my player dashboard
              </Link>
            ) : (
              <button
                className="cs-btn cs-primary"
                disabled={busy}
                onClick={restore}
              >
                {busy
                  ? "Restoring player access…"
                  : "Restore my player account"}
              </button>
            )}
            <Link className="hub-explore-link" to={hubHome(account.role)}>
              Keep my current account role
            </Link>
          </>
        )}
        {!account && !error && (
          <p role="status">Checking your signed-in account…</p>
        )}
        {error && (
          <>
            <p className="cs-error" role="alert">
              {error}
            </p>
            <a
              className="hub-explore-link"
              href="mailto:courtstreaksupport@gmail.com?subject=CourtStreak%20account%20type%20help"
            >
              Contact CourtStreak support
            </a>
            {!account && (
              <button
                className="cs-btn"
                onClick={() => setAttempt((x) => x + 1)}
              >
                Try again
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
