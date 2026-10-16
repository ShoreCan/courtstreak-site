import React, { useEffect, useState, useRef } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { hubRpc, hubHome, safeHubNext } from "./api.js";
import "./hub.css";
export function HubEntry() {
  const nav = useNavigate(),
    [query] = useSearchParams(),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    hubRpc("cs_hub_account")
      .then((account) => {
        const next = safeHubNext(query.get("next"));
        if (active)
          nav(
            next && next !== "/hub" && !next.startsWith("/hub?")
              ? next
              : account.role === "player"
                ? "/dashboard"
                : hubHome(account.role),
            { replace: true },
          );
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [nav, query, retry]);
  return (
    <main id="cs-workboard" className="hub-loading">
      <section className="cs-panel">
        <p className="cs-eyebrow">COURTSTREAK</p>
        <h1>
          {error
            ? "We couldn’t open your workspace"
            : "Opening your workspace…"}
        </h1>
        {error && (
          <>
            <p className="cs-error" role="alert">
              {error}
            </p>
            <button className="cs-btn" onClick={() => setRetry((x) => x + 1)}>
              Try again
            </button>
            <Link className="cs-link" to="/login">
              Return to login
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
export function HubInvite() {
  const { token } = useParams(),
    nav = useNavigate(),
    [invite, setInvite] = useState(null),
    [account, setAccount] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      hubRpc("cs_hub_invite_details", { p_token: token }),
      hubRpc("cs_hub_account"),
    ])
      .then(([i, a]) => {
        if (active) {
          setInvite(i);
          setAccount(a);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token]);
  const writing = useRef(false);
  async function accept() {
    if (busy || writing.current) return;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      if (!invite || !account || account.role !== invite.role)
        throw new Error(
          "Sign in with the correct account type. Your current account will not be changed.",
        );
      await hubRpc("cs_hub_accept_invite", { p_token: token });
      nav(hubHome(invite.role), { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  async function switchAccount() {
    if (busy || writing.current) return;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      const next = `/hub/invite/${token}${invite ? `?role=${invite.role}` : ""}`;
      nav(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    } catch (e) {
      setError(e.message || "Could not sign out. Try again.");
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  return (
    <main id="cs-workboard" className="hub-entry">
      <section className="cs-panel">
        <p className="cs-eyebrow">PLAYER-APPROVED ACCESS</p>
        <h1>
          {invite ? `${invite.player} invited you` : "CourtStreak invitation"}
        </h1>
        <p className="pc-caption">
          {invite
            ? `Access their progress as a ${invite.role}. Training stays on the player’s own account.`
            : "Sign in using the verified email the player invited."}
        </p>
        {invite && account && (
          <>
            <p className="cs-small cs-muted">
              Your account: {account.name}. Use your own name here; your child’s
              name belongs on their separate player account.
            </p>
            {account.role === invite.role ? (
              <button
                className="cs-btn cs-primary"
                disabled={busy}
                onClick={accept}
              >
                {busy ? "Connecting…" : "Accept invitation"}
              </button>
            ) : (
              <section className="cs-panel">
                <h2>This invitation needs a {invite.role} account</h2>
                <p>
                  Your signed-in account is a {account.role} account. It will
                  stay that way. Use a separate {invite.role} account to accept
                  this invitation.
                </p>
                <p>
                  If that account uses a different email, ask the player to
                  resend the invitation to that email.
                </p>
                <button
                  className="cs-btn cs-primary"
                  disabled={busy}
                  onClick={switchAccount}
                >
                  Sign in with the correct account
                </button>
              </section>
            )}
          </>
        )}
        <p className="cs-error" role="alert">
          {error}
        </p>
        <Link className="cs-link" to="/hub">
          Back to my workspace
        </Link>
        <button className="cs-link" disabled={busy} onClick={switchAccount}>
          Use a different account
        </button>
      </section>
    </main>
  );
}
