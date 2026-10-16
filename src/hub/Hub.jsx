import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  CalendarCheck,
  Layers,
  ArrowLeft,
  Plus,
  LogOut,
  ArrowUpRight,
  Settings,
  Link2,
  Check,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import {
  hubRpc,
  hubHome,
  hubLink,
  minutes,
  requirements,
  matchingHistory,
} from "./api.js";
import {
  HUB_DRILLS,
  HUB_TEMPLATES,
  templateProgram,
  programFromKeys,
} from "./catalog.js";
import { demoSnapshot } from "./demo.js";
import "./hub.css";
import HubScoreChart from "./HubScoreChart.jsx";
import NotificationBell from "./NotificationBell.jsx";
import AssignmentReminders from "./AssignmentReminders.jsx";
import SessionReceipts from "./SessionReceipts.jsx";
import DeadlinePicker, { deadlineError } from "./DeadlinePicker.jsx";
import { playerWorkStatus } from "./workStatus.js";
import AssignmentCompletion, {
  AssignmentSummary,
} from "./HubAssignmentProgress.jsx";

import {
  MetricRings,
  HandBalance,
  WorkoutVisual,
  ActivityPlot,
  PlayerGrid,
  WorkTile,
  MetricHelp,
  combineDays,
} from "./HubVisuals.jsx";

const initials = (name) =>
  name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
function DrillGuide({ drill }) {
  if (!drill) return null;
  return (
    <div className="hub-guide">
      <h3>{drill.name}</h3>
      <p>{drill.short_description}</p>
      <ol>
        {(drill.steps || [drill.instructions]).map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p>{drill.repeat}</p>
      <p>
        <strong>Count:</strong> {drill.rep_rule || drill.metric_label}
      </p>
      {drill.demo_video_url && /^https:\/\//.test(drill.demo_video_url) && (
        <a href={drill.demo_video_url} target="_blank" rel="noreferrer">
          Watch demonstration
        </a>
      )}
    </div>
  );
}
export default function Hub({ preview = false }) {
  const nav = useNavigate(),
    location = useLocation(),
    params = useParams(),
    [query, setQuery] = useSearchParams();
  const demoRole = ["player", "parent"].includes(query.get("view"))
    ? query.get("view")
    : "coach";
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [epoch, setEpoch] = useState(0);
  const writing = useRef(false);
  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    if (preview) {
      setData(demoSnapshot(demoRole));
      setLoading(false);
      return;
    }
    hubRpc("cs_hub_snapshot")
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [preview, demoRole, epoch]);
  useEffect(() => {
    if (preview) return undefined;
    const refresh = () => {
      if (!writing.current && !document.activeElement?.closest("form"))
        setEpoch((value) => value + 1);
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [preview]);
  useEffect(() => {
    if (data && !loading) document.getElementById("hub-page-title")?.focus();
  }, [location.pathname, loading]);
  useEffect(() => {
    const board = document.getElementById("cs-workboard");
    const menu = board?.querySelector(".cs-nav");
    if (!menu) return;
    const measure = () =>
      board.style.setProperty(
        "--cs-hub-nav-height",
        `${Math.ceil(menu.getBoundingClientRect().height)}px`,
      );
    measure();
    window.addEventListener("resize", measure);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(menu);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      board.style.removeProperty("--cs-hub-nav-height");
    };
  }, [data?.account.role]);
  const role = data?.account.role || demoRole,
    base = preview ? "/preview/hub" : hubHome(role),
    segment = preview
      ? location.pathname.replace("/preview/hub", "")
      : location.pathname.replace(/^\/(team-hub|family-hub|assigned-work)/, ""),
    parts = segment.split("/").filter(Boolean);
  let page = parts[0] || "overview";
  if (location.pathname === "/connections") page = "connections";
  const id = parts[1],
    tab = query.get("tab") || "overview",
    requestedChild = page === "players" && id ? id : query.get("player"),
    child = data?.players.some((p) => p.id === requestedChild)
      ? requestedChild
      : data?.players[0]?.id;
  const selectedPlayers = data
    ? role === "parent"
      ? data.players.filter((p) => p.id === child)
      : data.players.some((p) => p.id === query.get("player"))
        ? data.players.filter((p) => p.id === query.get("player"))
        : data.players
    : [];
  const go = (path = "", state) =>
    nav(linkTo(path), {
      state: state || {
        hubTrail: [
          ...(location.state?.hubTrail || []),
          location.pathname + location.search,
        ],
      },
    });
  const linkTo = (path = "") => {
    const [pathname, search = ""] = path.split("?");
    const params = new URLSearchParams(search);
    if (preview) params.set("view", demoRole);
    if (role === "parent" && child && !params.has("player"))
      params.set("player", child);
    const suffix = params.toString();
    return (
      base + (pathname ? "/" + pathname : "") + (suffix ? "?" + suffix : "")
    );
  };
  const setParam = (key, value) => {
    const q = new URLSearchParams(query);
    q.set(key, value);
    setQuery(q, { replace: true, state: location.state });
  };
  async function save(fn, message) {
    if (preview || writing.current) return { ok: false };
    writing.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await fn();
      setNotice(message || "Saved.");
      setEpoch((v) => v + 1);
      window.dispatchEvent(new Event("courtstreak:hub-updated"));
      return { ok: true, result };
    } catch (e) {
      setError(e.message);
      return { ok: false };
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const date = (value) =>
    new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: data?.preferences.timezone || "America/Chicago",
      timeZoneName: "short",
    });
  if (loading && !data)
    return (
      <main id="cs-workboard" className="hub-loading">
        <section className="cs-panel">
          <h1>Opening your workspace…</h1>
        </section>
      </main>
    );
  if (!data)
    return (
      <main id="cs-workboard" className="hub-loading">
        <section className="cs-panel">
          <h1>The Hub could not load</h1>
          <p className="cs-error" role="alert">
            {error}
          </p>
          <button className="cs-btn" onClick={() => setEpoch((v) => v + 1)}>
            Try again
          </button>
          <Link className="cs-link" to="/">
            CourtStreak home
          </Link>
        </section>
      </main>
    );
  if (!preview) {
    const expected = location.pathname.startsWith("/team-hub")
      ? "coach"
      : location.pathname.startsWith("/family-hub")
        ? "parent"
        : "player";
    if (expected !== role) return <Navigate to={hubHome(role)} replace />;
  }
  const players = data.players,
    assignments = data.assignments,
    own = (a) => a.creator_id === data.account.id;
  const relevant = (ps = selectedPlayers) =>
    assignments.filter((a) =>
      a.recipients.some((r) => ps.some((p) => p.id === r.id)),
    );
  const unfinished = (ps = selectedPlayers) =>
    relevant(ps)
      .filter((a) =>
        a.recipients.some(
          (r) => ps.some((p) => p.id === r.id) && r.done < a.sessions,
        ),
      )
      .sort((a, b) => a.due_at.localeCompare(b.due_at));
  const openPlayer = (p) => go(`players/${p.id}`),
    openAssignment = (a, player) =>
      go(`assignments/${a.id}${player ? `?player=${player.id}` : ""}`),
    assignPlayer = (p) => go(`create?player=${p.id}`);
  const Empty = ({ title, children }) => (
    <section className="cs-panel">
      <h2>{title}</h2>
      <p className="pc-caption">{children}</p>
    </section>
  );
  const summary = (ps) => (
    <MetricRings
      players={ps}
      assignments={assignments}
      onWork={() => go("assignments")}
      onActivity={() => go("progress?metric=consistency")}
    />
  );
  const assignmentRow = (a) => (
    <WorkTile
      key={a.id}
      assignment={a}
      players={selectedPlayers}
      onOpen={openAssignment}
      timezone={data.preferences.timezone}
      now={data.server_time}
    />
  );
  const chooseChild =
    role === "parent" && players.length > 1 ? (
      <div className="cs-child-picker" aria-label="Linked children">
        {players.map((p) => (
          <button
            key={p.id}
            aria-pressed={p.id === child}
            onClick={() => setParam("player", p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
    ) : null;
  function connections() {
    return (
      <>
        <section className="cs-panel">
          <h2>
            {role === "player"
              ? "Parent & coach access"
              : "Approved player access"}
          </h2>
          <p className="pc-caption">
            {role === "player"
              ? "You control who can see your progress. Removing access takes effect immediately."
              : "Only players who explicitly approve your account appear in your workspace."}
          </p>
          {data.links.map((l) => (
            <div className="cs-breakdown" key={l.id}>
              <span>
                {l.name}
                <small className="hub-block cs-muted">
                  {l.role === "parent" ? "Parent view" : "Coach view"}
                </small>
              </span>
              <button
                className="cs-link"
                disabled={busy || preview}
                onClick={() => {
                  if (
                    window.confirm(
                      "Remove this access? Progress will no longer be shared.",
                    )
                  )
                    save(
                      () =>
                        hubRpc("cs_hub_remove_access", {
                          p_id: l.id,
                          p_kind: "link",
                        }),
                      "Access removed.",
                    );
                }}
              >
                Remove access
              </button>
            </div>
          ))}
          {data.links.length === 0 && (
            <p className="cs-empty">No approved connections yet.</p>
          )}
        </section>
        {role === "player" && !preview && (
          <section className="cs-panel cs-section">
            <h2>Add parent view or add a coach</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const r = await save(
                  () =>
                    hubRpc("cs_hub_invite", {
                      p_email: f.get("email"),
                      p_role: f.get("role"),
                    }),
                  "Invitation created. Copy the link below and share it with this person.",
                );
                if (r.ok) e.target.reset();
              }}
            >
              <div className="cs-formgrid">
                <label className="cs-field">
                  Their email
                  <input
                    name="email"
                    type="email"
                    autoComplete="off"
                    required
                    maxLength="254"
                    placeholder="name@example.com"
                  />
                </label>
                <label className="cs-field">
                  Grant access as
                  <select name="role">
                    <option value="parent">Parent</option>
                    <option value="coach">Coach</option>
                  </select>
                </label>
              </div>
              <button className="cs-btn cs-primary" disabled={busy}>
                Create invitation link
              </button>
            </form>
          </section>
        )}
        {data.invites.map((i) => (
          <section className="cs-panel cs-section" key={i.id}>
            <h3>
              {i.email} · {i.manager_role}
            </h3>
            <p className="cs-small cs-muted">
              Pending · expires {date(i.expires_at)}
            </p>
            <label className="cs-field">
              Invitation link
              <input
                readOnly
                value={hubLink(
                  "/hub/invite/" + i.token + "?role=" + i.manager_role,
                )}
              />
            </label>
            <div className="cs-actions">
              <button
                className="cs-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      hubLink(
                        "/hub/invite/" + i.token + "?role=" + i.manager_role,
                      ),
                    );
                    setNotice("Invitation link copied.");
                  } catch {
                    setNotice("Select the link above and copy it.");
                  }
                }}
              >
                Copy link
              </button>
              <button
                className="cs-link"
                disabled={busy}
                onClick={() =>
                  save(
                    () =>
                      hubRpc("cs_hub_remove_access", {
                        p_id: i.id,
                        p_kind: "invite",
                      }),
                    "Invitation cancelled.",
                  )
                }
              >
                Cancel invitation
              </button>
            </div>
          </section>
        ))}
      </>
    );
  }
  function preferences() {
    if (tab !== "notifications")
      return (
        <section className="hd-settings-menu">
          <div className="hd-account">
            <span className="hd-avatar">{initials(data.account.name)}</span>
            <div>
              <strong>{data.account.name}</strong>
              <small>
                {role === "coach"
                  ? "Coach"
                  : role === "parent"
                    ? "Parent"
                    : "Player"}{" "}
                account
              </small>
            </div>
          </div>
          {[
            [Link2, "Player access", () => go("connections")],
            [
              Settings,
              "Email preferences",
              () => setParam("tab", "notifications"),
            ],
            [ChartNoAxesCombined, "Weekly report", () => go("report")],
          ].map(([Icon, label, action]) => (
            <button key={label} onClick={action}>
              <Icon size={21} />
              <span>{label}</span>
              <ChevronRight size={18} />
            </button>
          ))}
        </section>
      );
    return (
      <section className="cs-panel updates-panel">
        <button className="cs-back" onClick={() => setParam("tab", "overview")}>
          <ArrowLeft size={15} /> Settings
        </button>
        <h2>Email preferences</h2>
        <div className="hub-settings-access">
          <Link className="cs-btn" to={linkTo("connections")}>
            <Link2 size={16} /> Manage player access <ChevronRight size={16} />
          </Link>
          <p className="cs-small cs-muted">
            Connections and permissions stay here. Your account role is
            remembered when you log in.
          </p>
        </div>
        <h3>Optional email updates</h3>
        <p className="pc-caption">
          These controls manage email only. Bell updates stay inside
          CourtStreak.
        </p>
        <form
          key={JSON.stringify(data.preferences)}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save(
              () =>
                hubRpc("cs_hub_preferences_save", {
                  p_timezone: f.get("timezone"),
                  p_weekly_email: f.has("weekly"),
                  p_reminders_enabled: f.has("reminders"),
                }),
              "Notification preferences saved.",
            );
          }}
        >
          <label className="cs-field">
            Timezone
            <input
              name="timezone"
              defaultValue={data.preferences.timezone}
              required
              placeholder="America/Chicago"
            />
          </label>
          {role === "player" ? (
            <label className="cs-choice">
              <input
                type="checkbox"
                name="reminders"
                defaultChecked={data.preferences.reminders_enabled}
              />
              <span>
                <strong>Email reminders for assigned work</strong>
                <small>
                  Only unfinished work. One email per assignment when its author
                  enables a reminder.
                </small>
              </span>
            </label>
          ) : (
            <label className="cs-choice">
              <input
                type="checkbox"
                name="weekly"
                defaultChecked={data.preferences.weekly_email}
              />
              <span>
                <strong>Weekly email summary</strong>
                <small>
                  Monday at 8:00 AM in your timezone. Covers the completed
                  previous week.
                </small>
              </span>
            </label>
          )}
          <button className="cs-btn cs-primary" disabled={busy || preview}>
            Save preferences
          </button>
          {role !== "player" && (
            <button
              className="cs-link"
              type="button"
              onClick={() => go("report")}
            >
              View this week’s report →
            </button>
          )}
          <details className="hd-help">
            <summary>Email delivery details</summary>
            <p>
              Email delivery must be enabled by CourtStreak. Saving a preference
              alone does not activate delivery.
            </p>
          </details>
        </form>
      </section>
    );
  }
  function progress() {
    const ps = selectedPlayers,
      mode =
        query.get("metric") ||
        (["consistency", "scores", "balance"].includes(query.get("view"))
          ? query.get("view")
          : "consistency"),
      daily = combineDays(ps);
    return (
      <>
        {chooseChild}
        <div className="workspace-controls">
          <div className="pc-tabs">
            {[
              ["consistency", "Consistency"],
              ["scores", "Drill scores"],
              ["balance", "Balance"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={mode === key}
                onClick={() => setParam("metric", key)}
              >
                {label}
              </button>
            ))}
          </div>
          {role === "coach" && (
            <label className="cs-field">
              View progress for
              <select
                aria-label="View progress for"
                value={query.get("player") || "all"}
                onChange={(e) => setParam("player", e.target.value)}
              >
                <option value="all">
                  Entire team · {players.length} players
                </option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {summary(ps)}
        {mode === "consistency" ? (
          <div className="pc-grid upgraded-consistency">
            <section className="cs-panel">
              <div className="cs-panel-head">
                <div>
                  <h2>Assignment tracker</h2>
                  <p>Each tile is one required session.</p>
                </div>
              </div>
              <Tracker
                ps={ps}
                assignments={relevant(ps)}
                openPlayer={openPlayer}
                openAssignment={openAssignment}
              />
            </section>
            <section className="cs-panel">
              <ActivityPlot daily={daily} onOpen={() => go("report")} />
              <div className="activity-next">
                <h3>Next deadline</h3>
                {unfinished(ps)[0] ? (
                  assignmentRow(unfinished(ps)[0])
                ) : (
                  <p className="cs-empty">No unfinished assignments.</p>
                )}
              </div>
            </section>
          </div>
        ) : mode === "scores" ? (
          <TeamScores ps={ps} openPlayer={openPlayer} />
        ) : (
          <HandBalance players={ps} />
        )}
      </>
    );
  }
  function home() {
    const ps = role === "player" ? players : selectedPlayers,
      upcoming = unfinished(ps),
      work = relevant(ps);
    return (
      <div className="hd-overview">
        {chooseChild}
        <PlayerGrid
          players={role === "parent" ? players : ps}
          assignments={assignments}
          onPlayer={openPlayer}
          onWork={openAssignment}
          onAssign={role !== "player" ? assignPlayer : undefined}
          now={data.server_time}
          filterable={role === "coach"}
          onAll={() => go("players")}
          limit={role === "coach" ? 4 : undefined}
          title={
            role === "coach"
              ? "Your team"
              : role === "parent"
                ? "Your children"
                : "Your progress"
          }
        />
        <details className="hc-overview-stats">
          <summary>Practice & assigned work</summary>
          {summary(ps)}
        </details>
        <div className="hd-overview-grid">
          <ActivityPlot
            daily={combineDays(ps)}
            onOpen={() => go("progress?metric=consistency")}
          />
          <section className="hd-card hd-next">
            <div className="hd-card-head">
              <h2>Assigned work</h2>
              <button onClick={() => go("assignments")}>
                View all <ChevronRight size={15} />
              </button>
            </div>
            {upcoming.slice(0, 2).map((a) => (
              <WorkTile
                key={a.id}
                assignment={a}
                players={ps}
                onOpen={openAssignment}
                timezone={data.preferences.timezone}
                now={data.server_time}
              />
            ))}
            {!upcoming.length && (
              <div className="hd-clear">
                <Check size={24} />
                <strong>
                  {work.length
                    ? "All assigned work complete"
                    : "No assigned work yet"}
                </strong>
                <button
                  onClick={() =>
                    go(
                      role === "player"
                        ? "assignments"
                        : preview
                          ? "create"
                          : "workouts",
                    )
                  }
                >
                  {role === "player"
                    ? "View work"
                    : preview
                      ? "Explore assignment setup"
                      : "Browse workouts"}{" "}
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
            <button className="hd-action-row" onClick={() => go("workouts")}>
              <Layers size={18} />
              <span>Workout library</span>
              <ChevronRight size={16} />
            </button>
          </section>
        </div>
        <MetricHelp />
      </div>
    );
  }
  const detailTabs = (items) => (
    <nav className="detail-tabs" aria-label="Detail sections">
      {items.map(([key, label]) => (
        <button
          key={key}
          aria-pressed={
            tab === key || (tab === "overview" && key === items[0][0])
          }
          onClick={() => setParam("tab", key)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
  function playerDetail() {
    const p = players.find((x) => x.id === id);
    if (!p)
      return (
        <Empty title="Player unavailable">
          This account has not approved access, or access has been removed.
        </Empty>
      );
    const q = requirements(p, assignments),
      work = relevant([p]);
    return (
      <>
        <section className="cs-panel">
          <div className="cs-profile-head">
            <span className="cs-avatar">{initials(p.name)}</span>
            <div>
              <h2>{p.name}</h2>
              <p className="cs-small cs-muted">
                {q.done}/{q.total} required sessions · {minutes(p.seconds)}{" "}
                active min this week
              </p>
            </div>
            {role !== "player" && (
              <button
                className="cs-btn cs-primary hp-assign-child"
                onClick={() => go(`create?player=${p.id}`)}
              >
                <Plus size={16} />
                {preview ? "Preview assignment" : "Assign workout"}
              </button>
            )}
          </div>
        </section>
        <MetricRings
          players={[p]}
          assignments={assignments}
          onWork={() => setParam("tab", "work")}
          onActivity={() => go(`progress?player=${p.id}&metric=consistency`)}
        />
        {detailTabs([
          ["overview", "Progress"],
          ["work", "Assigned work"],
          ...(role !== "player"
            ? [["notes", role === "coach" ? "Coaching notes" : "Parent notes"]]
            : []),
        ])}
        <div className="detail-pane">
          {tab === "work" ? (
            <section className="cs-panel">
              <h2>Assigned work</h2>
              {work.map((a) => (
                <WorkTile
                  key={a.id}
                  assignment={a}
                  players={[p]}
                  onOpen={openAssignment}
                  timezone={data.preferences.timezone}
                  now={data.server_time}
                />
              ))}
            </section>
          ) : tab === "notes" && role !== "player" ? (
            <section className="cs-panel">
              <h2>Your private note</h2>
              <p className="pc-caption">
                Visible only to your account. Use assignment feedback for
                player-facing coaching.
              </p>
              <form
                key={p.id + p.note}
                onSubmit={(e) => {
                  e.preventDefault();
                  save(
                    () =>
                      hubRpc("cs_hub_note_save", {
                        p_player: p.id,
                        p_body: new FormData(e.currentTarget).get("note"),
                      }),
                    "Private note saved.",
                  );
                }}
              >
                <label className="cs-field">
                  Note
                  <textarea
                    name="note"
                    maxLength="1000"
                    defaultValue={p.note}
                  />
                </label>
                <button
                  className="cs-btn cs-primary"
                  disabled={busy || preview}
                >
                  Save private note
                </button>
              </form>
            </section>
          ) : (
            <div className="cs-grid">
              <section className="cs-panel">
                <ActivityPlot
                  daily={p.daily}
                  onOpen={() =>
                    go(`progress?player=${p.id}&metric=consistency`)
                  }
                />
              </section>
              <section className="cs-panel">
                <h2>Drill history</h2>
                <ScoreHistory
                  results={p.results}
                  timezone={data.preferences.timezone}
                />
              </section>
            </div>
          )}
        </div>
      </>
    );
  }
  function assignmentDetail() {
    const a = assignments.find((a) => a.id === id);
    if (!a)
      return (
        <Empty title="Assignment unavailable">
          Access may have been removed. Return to your overview.
        </Empty>
      );
    const canWrite = own(a) && role !== "player",
      detailPlayers =
        role === "parent" ||
        (query.get("player") && query.get("player") !== "all")
          ? selectedPlayers
          : players;
    return (
      <>
        {role === "parent" && chooseChild}
        {role === "coach" &&
          query.get("player") &&
          query.get("player") !== "all" && (
            <button
              className="cs-link hc-show-team"
              onClick={() => setParam("player", "all")}
            >
              Show all assigned players
            </button>
          )}
        {role !== "player" && (
          <div className="cs-actions cs-repeat-action">
            <button
              className="cs-btn"
              onClick={() =>
                go(
                  `create?repeat=${a.id}${role === "parent" || (query.get("player") && query.get("player") !== "all") ? `&player=${detailPlayers[0]?.id || ""}` : ""}`,
                )
              }
            >
              Repeat assignment <ArrowUpRight size={15} />
            </button>
          </div>
        )}
        <AssignmentSummary
          assignment={a}
          players={detailPlayers}
          now={data.server_time}
          timezone={data.preferences.timezone}
        />
        <section className="hc-player-start">
          {role === "player" && a.recipients[0]?.done < a.sessions && (
            <button
              className="cs-btn cs-primary"
              disabled={busy || preview}
              onClick={async () => {
                const r = await save(
                  () =>
                    hubRpc("cs_hub_begin_run", {
                      p_assignment: a.id,
                      p_timezone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone ||
                        "UTC",
                    }),
                  "",
                );
                if (r.ok) nav(`/assigned-training/${a.id}/${r.result.run_id}`);
              }}
            >
              Start or resume assigned workout
            </button>
          )}
        </section>
        {detailTabs([
          ["overview", "Completion"],
          ["feedback", "Feedback"],
          ["plan", "Workout"],
          ["receipts", "Session receipts"],
          ["reminder", "Reminders"],
        ])}
        <div className="detail-pane">
          {tab === "receipts" ? (
            <SessionReceipts
              assignment={a}
              player={
                players.find((p) => p.id === query.get("player")) ||
                detailPlayers.find((p) =>
                  a.recipients.some((r) => r.id === p.id),
                )
              }
              preview={preview}
              session={query.get("session")}
              runId={query.get("run")}
              timezone={data.preferences.timezone}
              now={data.server_time}
            />
          ) : tab === "feedback" ? (
            <section className="cs-panel">
              <h2>Player feedback</h2>
              {a.feedback.map((f) => (
                <article className="cs-feedback" key={f.id}>
                  <strong>
                    {players.find((p) => p.id === f.player_id)?.name}
                  </strong>
                  <small>
                    {f.author} · {date(f.created_at)}
                  </small>
                  <p>{f.body}</p>
                </article>
              ))}
              {!a.feedback.length && (
                <p className="cs-empty">No feedback yet.</p>
              )}
              {canWrite && !preview && (
                <details className="tracker-details">
                  <summary>Add individual feedback</summary>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      await save(
                        () =>
                          hubRpc("cs_hub_feedback_save", {
                            p_assignment: a.id,
                            p_player: f.get("player"),
                            p_body: f.get("body"),
                          }),
                        "Feedback saved for the player and their linked parent.",
                      );
                    }}
                  >
                    <label className="cs-field">
                      Player
                      <select name="player">
                        {a.recipients.map((r) => (
                          <option key={r.id} value={r.id}>
                            {players.find((p) => p.id === r.id)?.name ||
                              "Linked player"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="cs-field">
                      Feedback
                      <textarea
                        name="body"
                        required
                        maxLength="600"
                        placeholder="One strength, and one focus for next time."
                      />
                    </label>
                    <button className="cs-btn cs-primary" disabled={busy}>
                      Save feedback
                    </button>
                  </form>
                </details>
              )}
            </section>
          ) : tab === "reminder" ? (
            <AssignmentReminders
              assignment={a}
              players={detailPlayers}
              now={data.server_time}
              timezone={data.preferences.timezone}
              canWrite={canWrite}
              preview={preview}
              busy={busy}
              save={save}
              onPreferences={() => go("preferences?tab=notifications")}
            />
          ) : tab === "plan" ? (
            <section className="cs-panel">
              <h2>Workout rounds</h2>
              <p className="pc-caption">
                30 seconds each · players choose when to start the next round.
              </p>
              {a.program.drills.map((d, i) => (
                <details className="hub-round" key={i}>
                  <summary>
                    {i + 1}. {d.name}
                  </summary>
                  <DrillGuide drill={d} />
                </details>
              ))}
            </section>
          ) : (
            <AssignmentCompletion
              assignment={a}
              players={detailPlayers}
              now={data.server_time}
              onPlayer={openPlayer}
              onAssign={assignPlayer}
              canAssign={role !== "player"}
              onReceipt={(p, index) =>
                go(
                  `assignments/${a.id}?player=${p.id}&tab=receipts&session=${index}`,
                )
              }
            />
          )}
        </div>
      </>
    );
  }
  function workouts() {
    return (
      <>
        <div className="cs-panel-head">
          <p className="cs-small cs-muted">
            Purposeful stationary plans with balanced hand usage.
          </p>
          <button
            className="cs-btn cs-primary"
            disabled={preview}
            onClick={() => go("builder")}
          >
            <Plus size={16} />
            Build a workout
          </button>
        </div>
        <div className="cs-workout-grid">
          {[
            ...HUB_TEMPLATES.map((t) => ({
              id: t.key,
              name: t.name,
              purpose: t.purpose,
              program: templateProgram(t),
            })),
            ...data.plans,
          ].map((t) => (
            <section className="cs-workout-card hp-plan-card" key={t.id}>
              <div className="hp-plan-eyebrow">
                <Layers size={15} /> TRAINING PLAN
              </div>
              <h2>{t.name}</h2>
              <p>{t.purpose || "Your saved workout."}</p>
              <WorkoutVisual program={t.program} />
              <div className="cs-actions">
                <button
                  className="cs-btn"
                  onClick={() => go(`workouts/${t.id}`)}
                >
                  View workout
                </button>
                {role !== "player" && (
                  <button
                    className="cs-link"
                    onClick={() => go("create?plan=" + t.id)}
                  >
                    {preview ? "Preview assignment →" : "Assign workout →"}
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      </>
    );
  }
  function report() {
    const ps = selectedPlayers;
    return (
      <>
        {chooseChild}
        <section className="cs-panel">
          <h2>This week at a glance</h2>
          <p className="pc-caption">
            {date(data.week_start)} → {date(data.server_time)} · Current partial
            week
          </p>
          {ps.map((p) => {
            const q = requirements(p, assignments);
            return (
              <button
                className="home-person"
                key={p.id}
                onClick={() => openPlayer(p)}
              >
                <span className="home-person-name">
                  <strong>{p.name}</strong>
                  <small>
                    {minutes(p.seconds)} active min · {p.workouts} full workouts
                    this week
                  </small>
                </span>
                <span>
                  {q.done}/{q.total} assigned
                </span>
              </button>
            );
          })}
          <p className="pc-note">
            Assignment totals include all currently visible assignments.
            Practice totals cover the current week. Scores are self-reported,
            not AI-verified.
          </p>
          <button className="cs-link" onClick={() => go("preferences")}>
            Weekly summary preferences →
          </button>
        </section>
      </>
    );
  }
  let content,
    title,
    nested = false;
  if (!players.length && ["overview", "progress", "players"].includes(page)) {
    title = role === "coach" ? "Team Hub" : "Family Hub";
    content = (
      <section className="hub-welcome" aria-labelledby="hub-welcome-title">
        <div className="hub-welcome-hero">
          <div>
            <span className="hub-setup-tag">
              <Link2 size={14} /> Set up your{" "}
              {role === "coach" ? "team" : "family"}
            </span>
            <h2 id="hub-welcome-title">
              {role === "coach"
                ? "Your team’s next level starts here."
                : "Be part of their progress."}
            </h2>
            <p>
              {role === "coach"
                ? "See who puts in the work. Build purposeful workouts. Keep every player moving forward."
                : "See the work behind their confidence. Follow practice, check assigned work, and encourage consistency."}
            </p>
            <span className="hub-connection-status">
              No {role === "coach" ? "players" : "children"} connected yet
            </span>
          </div>
          <img
            src={`${import.meta.env.BASE_URL}hub-assets/basketball.webp`}
            alt=""
            className="hub-welcome-ball"
          />
        </div>
        <div className="hub-setup-body">
          <div className="hub-sample-callout">
            <div>
              <span className="cs-eyebrow">SEE IT BEFORE YOU CONNECT</span>
              <h3>
                {role === "parent"
                  ? "Explore Jordan Carter’s sample Family Hub."
                  : "Take a look inside a sample Team Hub."}
              </h3>
            </div>
            <Link
              className="cs-btn cs-primary"
              to={`/preview/hub?view=${role}`}
            >
              Explore {role === "parent" ? "Family" : "Team"} Hub{" "}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hub-setup-mini">
            <div>
              <Link2 size={23} />
              <strong>1. Player invites you</strong>
              <span>From Settings → Parent & coach access</span>
            </div>
            <div>
              <Check size={23} />
              <strong>2. You accept</strong>
              <span>Open their link with this account</span>
            </div>
            <div>
              <ChartNoAxesCombined size={23} />
              <strong>3. Progress appears</strong>
              <span>Real work. Real completion. Clear insight.</span>
            </div>
          </div>
          <div className="hub-setup-actions">
            <button className="cs-btn" onClick={() => go("connections")}>
              Manage connections <ArrowUpRight size={16} />
            </button>
            <details className="hub-connect-help">
              <summary>How does player access work?</summary>
              <p>
                The player opens Settings → Parent & coach access, enters your
                account email and chooses{" "}
                {role === "parent" ? "Parent" : "Coach"}. They share the
                invitation link with you. Open it while signed into this
                account. Each child uses their own player account; parents and
                coaches use their own names and sign-ins.
              </p>
            </details>
          </div>
        </div>
        <div className="hub-ready-next">
          <Layers size={22} aria-hidden="true" />
          <div>
            <h3>Build a plan before your first connection.</h3>
            <p>
              Browse purposeful workouts and save your own. Assign them once a
              player approves access.
            </p>
          </div>
          <button className="cs-btn" onClick={() => go("workouts")}>
            Browse workouts <ChevronRight size={16} />
          </button>
        </div>
      </section>
    );
  } else if (page === "overview") {
    title =
      role === "coach"
        ? "Team overview"
        : role === "parent"
          ? "Family overview"
          : "My assigned work";
    content = home();
  } else if (page === "progress") {
    title = role === "coach" ? "Team progress" : "Child progress";
    content = progress();
  } else if (page === "players" && id) {
    nested = true;
    title = players.find((p) => p.id === id)?.name || "Player progress";
    content = playerDetail();
  } else if (page === "players") {
    title = role === "parent" ? "Your children" : "Player progress";
    content = (
      <PlayerGrid
        players={players}
        assignments={assignments}
        onPlayer={openPlayer}
        onWork={openAssignment}
        onAssign={role !== "player" ? assignPlayer : undefined}
        now={data.server_time}
        filterable={role === "coach"}
        title={role === "parent" ? "Your children" : "Your team"}
      />
    );
  } else if (page === "assignments" && id) {
    nested = true;
    title = "Assignment details";
    content = assignmentDetail();
  } else if (page === "assignments") {
    const work = relevant(),
      openIds = new Set(unfinished().map((a) => a.id)),
      status = ["all", "open", "complete"].includes(query.get("status"))
        ? query.get("status")
        : "all",
      visibleWork = work.filter(
        (a) =>
          status === "all" ||
          (status === "open" ? openIds.has(a.id) : !openIds.has(a.id)),
      );
    title = "Assigned work";
    content = (
      <>
        {chooseChild}
        <section className="cs-panel">
          <div className="hp-work-filters" aria-label="Filter assigned work">
            {[
              ["all", "All work", work.length],
              ["open", "Open", openIds.size],
              ["complete", "Complete", work.length - openIds.size],
            ].map(([value, label, count]) => (
              <button
                key={value}
                aria-pressed={status === value}
                onClick={() => setParam("status", value)}
              >
                {label}
                <strong>{count}</strong>
              </button>
            ))}
          </div>
          {visibleWork.map(assignmentRow)}
          {!visibleWork.length && (
            <div className="hc-empty-filter">
              <Check size={24} />
              <p className="cs-empty">
                {!work.length
                  ? "No assignments yet."
                  : status === "complete"
                    ? "No assignments completed yet."
                    : "All assigned work complete."}
              </p>
              {role !== "player" && status !== "complete" && (
                <button
                  className="cs-btn"
                  onClick={() => go("create")}
                  disabled={!players.length}
                >
                  Assign a workout
                </button>
              )}
            </div>
          )}
        </section>
      </>
    );
  } else if (page === "connections") {
    title = role === "player" ? "Parent & coach access" : "Connected players";
    content = connections();
  } else if (page === "preferences") {
    title = "Settings";
    content = preferences();
  } else if (page === "report") {
    title = "Weekly report";
    nested = true;
    content = report();
  } else if (page === "workouts" && id) {
    const t = HUB_TEMPLATES.find((t) => t.key === id),
      plan = t
        ? { name: t.name, program: templateProgram(t) }
        : data.plans.find((p) => p.id === id);
    title = plan?.name || "Workout unavailable";
    nested = true;
    content = plan ? (
      <section className="cs-panel">
        <h2>{plan.name}</h2>
        <p className="pc-caption">
          {plan.program.activeSeconds / 60} active minutes · Self-paced
          transitions
        </p>
        <WorkoutVisual program={plan.program} />
        {role !== "player" && (
          <button
            className="cs-btn cs-primary hc-plan-assign"
            onClick={() => go(`create?plan=${id}`)}
            disabled={!players.length}
          >
            Assign this workout <ChevronRight size={16} />
          </button>
        )}
        {plan.program.drills.map((d, i) => (
          <details className="hub-round" key={i}>
            <summary>
              {i + 1}. {d.name}
            </summary>
            <DrillGuide drill={d} />
          </details>
        ))}
      </section>
    ) : (
      <Empty title="Workout unavailable">Return to your library.</Empty>
    );
  } else if (page === "workouts") {
    title = "Workout library";
    content = workouts();
  } else if (page === "builder" && role !== "player") {
    title = "Build a workout";
    nested = true;
    content = (
      <WorkoutBuilder
        customDrills={data.custom_drills || []}
        preview={preview}
        busy={busy}
        save={save}
        onDone={() => go("workouts")}
      />
    );
  } else if (page === "create" && role !== "player") {
    const repeatSource = assignments.find((a) => a.id === query.get("repeat"));
    title = repeatSource ? "Repeat assignment" : "Assign work";
    nested = true;
    content =
      query.get("repeat") && !repeatSource ? (
        <Empty title="Original assignment unavailable">
          Return to Assigned work and choose an assignment you can currently
          view.
        </Empty>
      ) : (
        <AssignmentWizard
          repeatSource={repeatSource}
          key={`${query.get("repeat") || query.get("plan") || ""}:${query.get("player") || child || ""}`}
          players={players}
          assignments={assignments}
          plans={data.plans}
          initialPlan={query.get("plan")}
          initialPlayer={
            query.get("player") || (role === "parent" ? child : null)
          }
          role={role}
          busy={busy}
          preview={preview}
          save={save}
          onDone={(id) =>
            nav(base + "/assignments/" + id, {
              replace: true,
              state: { hubTrail: [base + "/assignments"] },
            })
          }
        />
      );
  } else {
    title = "Page unavailable";
    content = (
      <Empty title="Choose a destination">
        Use the navigation to continue.
      </Empty>
    );
  }
  const navItems =
    role === "player"
      ? [
          ["overview", "Assigned work", CalendarCheck],
          ["connections", "Connections", Link2],
          ["preferences", "Settings", Settings],
        ]
      : [
          ["overview", "Overview", LayoutDashboard],
          [
            "progress",
            role === "parent" ? "Child progress" : "Team progress",
            ChartNoAxesCombined,
          ],
          ["players", role === "parent" ? "Children" : "Players", Users],
          ["assignments", "Assigned work", CalendarCheck],
          ["workouts", "Workouts", Layers],
        ];
  const fallback =
      page === "builder" || page === "workouts"
        ? "workouts"
        : page === "create" || page === "assignments"
          ? "assignments"
          : page === "players"
            ? "players"
            : "overview",
    trail = (location.state?.hubTrail || []).filter(
      (url) =>
        url === base ||
        url.startsWith(base + "/") ||
        url.startsWith(base + "?"),
    ),
    back = trail.at(-1) || linkTo(fallback === "overview" ? "" : fallback),
    backSection = back
      .replace(base, "")
      .split("?")[0]
      .split("/")
      .filter(Boolean),
    backLabel =
      backSection[0] === "players"
        ? backSection[1]
          ? "player profile"
          : "players"
        : backSection[0] === "assignments"
          ? backSection[1]
            ? "assignment"
            : "assigned work"
          : backSection[0] === "progress"
            ? "progress"
            : backSection[0] === "workouts"
              ? "workouts"
              : "overview";
  return (
    <div id="cs-workboard" className="hub-site hd-dashboard">
      {preview && (
        <div className="cs-demo">
          <div className="hub-preview-identity">
            <span className="hub-preview-label">
              {role === "parent"
                ? "PARENT PREVIEW"
                : role === "player"
                  ? "PLAYER PREVIEW"
                  : "COACH PREVIEW"}
            </span>
            <span>
              View-only preview · Fictional sample data · Nothing is recorded or
              sent
            </span>
          </div>
          <div className="hub-preview-public-actions">
            <Link className="cs-btn" to="/preview">
              All previews
            </Link>
            <Link
              className="cs-btn cs-primary"
              to={`/create-account?role=${role}`}
            >
              Create {role} account <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      )}
      <div className="cs-app">
        <aside className="cs-sidebar">
          <Link className="cs-logo" to="/">
            Court<span>Streak</span>
          </Link>
          <div className="cs-space">
            <small>
              {role === "coach"
                ? "Team Hub"
                : role === "parent"
                  ? "Family Hub"
                  : "Player workspace"}
            </small>
            <strong>{data.account.name}</strong>
          </div>
          <nav
            className={`cs-nav ${role === "player" ? "hub-player-nav" : ""}`}
            aria-label="Hub navigation"
          >
            {navItems.map(([key, label, Icon]) => (
              <Link
                key={key}
                className="hub-nav-link"
                aria-current={
                  page === key ||
                  (key === "workouts" && page === "builder") ||
                  (key === "assignments" && page === "create")
                    ? "page"
                    : undefined
                }
                to={linkTo(key === "overview" ? "" : key)}
              >
                <Icon size={18} />
                <span className="pc-nav-long">{label}</span>
                <span className="pc-nav-short">
                  {key === "overview"
                    ? "Home"
                    : key === "assignments"
                      ? "Work"
                      : key === "progress"
                        ? "Progress"
                        : label}
                </span>
              </Link>
            ))}
          </nav>
          <div className="cs-sidebar-foot">
            <strong>{data.account.name}</strong>
            {role !== "player" && (
              <Link className="cs-help" to={linkTo("preferences")}>
                Settings
              </Link>
            )}
            <Link className="cs-help" to={linkTo("connections")}>
              Manage connections
            </Link>
            {role === "player" && (
              <Link
                className="cs-help"
                to={preview ? "/preview/player" : "/dashboard"}
              >
                Player dashboard
              </Link>
            )}
            <button
              className="cs-help"
              onClick={async () => {
                if (!preview) await supabase.auth.signOut();
                nav(preview ? "/" : "/login");
              }}
            >
              <LogOut size={14} /> {preview ? "Exit preview" : "Log out"}
            </button>
          </div>
        </aside>
        <main aria-busy={busy || loading}>
          {nested && (
            <button
              className="cs-back"
              onClick={() =>
                nav(back, { state: { hubTrail: trail.slice(0, -1) } })
              }
            >
              <ArrowLeft size={14} />
              Back to {backLabel}
            </button>
          )}
          <header className="cs-top">
            <div className="cs-page-heading">
              <p className="cs-eyebrow">
                {role === "coach"
                  ? "Team Hub"
                  : role === "parent"
                    ? "Family Hub"
                    : "Player workspace"}{" "}
                ·{" "}
                {new Date(data.week_start).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  timeZone: data.preferences.timezone,
                })}{" "}
                week
              </p>
              <h1 id="hub-page-title" tabIndex={-1}>
                {title}
              </h1>
            </div>
            <div className="cs-header-bell">
              <NotificationBell preview={preview} demoRole={role} />
            </div>
            <div className="cs-actions">
              {page === "progress" ? (
                <button className="cs-btn" onClick={() => go("report")}>
                  Weekly report <ArrowUpRight size={16} />
                </button>
              ) : role !== "player" &&
                ["overview", "players", "assignments"].includes(page) &&
                !id ? (
                <button
                  className="cs-btn cs-primary"
                  disabled={!players.length}
                  title={
                    !players.length
                      ? "Connect a player before assigning work"
                      : undefined
                  }
                  onClick={() => go("create")}
                >
                  <Plus size={16} />
                  Assign workout
                </button>
              ) : null}
              <Link
                className="cs-link hub-mobile-settings"
                to={linkTo("preferences")}
              >
                Settings
              </Link>
            </div>
          </header>
          {error && (
            <p className="cs-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="cs-toast" role="status">
              {notice}
            </p>
          )}

          {preview && page === "overview" && (
            <details className="hc-preview-tools">
              <summary>Explore sample features</summary>
              <nav
                className="hd-demo-tools hub-preview-tour"
                aria-label="Explore this sample"
              >
                <button onClick={() => go("players/jordan")}>
                  <ChartNoAxesCombined size={18} />
                  <span>Jordan’s progress</span>
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => go("create")}>
                  <CalendarCheck size={18} />
                  <span>Try assigning a workout</span>
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => go("assignments/demo-week?tab=feedback")}
                >
                  <Users size={18} />
                  <span>Player feedback</span>
                  <ChevronRight size={14} />
                </button>
              </nav>
            </details>
          )}
          {content}
        </main>
      </div>
    </div>
  );
}

function Tracker({ ps, assignments, openPlayer, openAssignment }) {
  const [onlyOpen, setOnlyOpen] = useState(false),
    cols = assignments.flatMap((a, ai) =>
      Array.from({ length: a.sessions }, (_, i) => ({
        a,
        i,
        label: `${i + 1} of ${a.sessions}`,
      })),
    ),
    shown =
      onlyOpen && ps.length > 1
        ? ps.filter((p) => {
            const q = requirements(p, assignments);
            return q.done < q.total;
          })
        : ps;
  return (
    <>
      {ps.length > 1 && (
        <div className="tracker-toolbar">
          <p>
            {
              ps.filter((p) => {
                const q = requirements(p, assignments);
                return q.done < q.total;
              }).length
            }{" "}
            players with open work
          </p>
          <button
            className="tracker-filter"
            aria-pressed={onlyOpen}
            onClick={() => setOnlyOpen(!onlyOpen)}
          >
            {onlyOpen ? "Show everyone" : "Show unfinished"}
          </button>
        </div>
      )}
      {cols.length ? (
        <div
          className="session-board"
          tabIndex={0}
          role="region"
          aria-label="Assignment sessions. Scroll horizontally to see all sessions."
        >
          <table
            className="session-table cs-tracker-table"
            style={{ minWidth: 136 + cols.length * 68 }}
          >
            <caption className="hub-sr">
              Each cell is one required session. Check means complete; Next is
              the nearest unfinished deadline.
            </caption>
            <colgroup>
              <col className="cs-tracker-player-column" />
              {cols.map((c) => (
                <col key={c.a.id + c.i} />
              ))}
            </colgroup>
            <thead>
              <tr className="cs-tracker-groups">
                <th scope="col" rowSpan={2}>
                  Player
                </th>
                {assignments
                  .filter((a) => a.sessions > 0)
                  .map((a) => (
                    <th key={a.id} scope="colgroup" colSpan={a.sessions}>
                      <span className="cs-tracker-assignment" title={a.name}>
                        {a.name}
                      </span>
                    </th>
                  ))}
              </tr>
              <tr className="cs-tracker-session-headings">
                {cols.map((c) => (
                  <th key={c.a.id + c.i} scope="col">
                    <span title={`${c.a.name}, session ${c.label}`}>
                      {c.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const q = requirements(p, assignments),
                  pending = cols
                    .filter(
                      (c) =>
                        c.a.recipients.find((r) => r.id === p.id)?.done <= c.i,
                    )
                    .sort(
                      (a, b) =>
                        a.a.due_at.localeCompare(b.a.due_at) || a.i - b.i,
                    ),
                  next = pending[0];
                return (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="session-name"
                        onClick={() => openPlayer(p)}
                      >
                        <span className="cs-tracker-player-name">{p.name}</span>
                        <small>
                          {q.done}/{q.total} finished
                        </small>
                        <span className="hd-thin-track">
                          <i
                            style={{
                              width: `${q.total ? (q.done / q.total) * 100 : 0}%`,
                            }}
                          />
                        </span>
                      </button>
                    </td>
                    {cols.map((c) => {
                      const r = c.a.recipients.find((r) => r.id === p.id),
                        done = r && r.done > c.i,
                        isNext = next === c;
                      return (
                        <td key={c.a.id + c.i}>
                          {r ? (
                            <button
                              className={`session-cell ${done ? "done" : isNext ? "next" : ""}`}
                              aria-label={`${p.name}, ${c.a.name}, session ${c.i + 1} of ${c.a.sessions}: ${done ? "completed" : isNext ? "next due" : "to do"}`}
                              title={c.a.name}
                              onClick={() => openAssignment(c.a)}
                            >
                              {done ? (
                                <Check size={16} />
                              ) : isNext ? (
                                "NEXT"
                              ) : (
                                "○"
                              )}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cs-empty">No assigned sessions yet.</p>
      )}
      <div className="session-key">
        <span>✓ Completed</span>
        <span>NEXT · Next due</span>
        <span>○ To do</span>
      </div>
      <details className="tracker-details">
        <summary>Assignment names & deadlines</summary>
        <div className="assignment-key">
          {assignments.map((a, i) => (
            <button key={a.id} onClick={() => openAssignment(a)}>
              <span>
                {i + 1}. {a.name}
                <small>
                  {a.program.name} · {a.sessions} sessions
                </small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      </details>
    </>
  );
}
function ScoreHistory({ results = [], timezone }) {
  const choices = [
      ...new Map(
        results.map((r) => [
          [
            r.drill_key,
            r.duration_seconds,
            r.metric,
            r.count_kind,
            r.count_rule_version,
          ].join("|"),
          r,
        ]),
      ).entries(),
    ],
    [key, setKey] = useState(""),
    selection = choices.find((c) => c[0] === key)?.[1] || choices[0]?.[1];
  if (!selection)
    return (
      <p className="cs-empty">
        No timed scores yet. Completed attempts will appear here.
      </p>
    );
  const history = matchingHistory(results, selection);
  return (
    <>
      <label className="cs-field">
        Matching drill
        <select
          value={key || choices[0][0]}
          onChange={(e) => setKey(e.target.value)}
        >
          {choices.map(([k, r]) => (
            <option key={k} value={k}>
              {r.name} · {r.duration_seconds}s · {r.metric}
            </option>
          ))}
        </select>
      </label>
      <HubScoreChart
        key={key || choices[0][0]}
        history={history}
        timezone={timezone}
      />
      <details className="tracker-details">
        <summary>See {history.length} matching results</summary>
        {history.map((r) => (
          <div className="cs-breakdown" key={r.id}>
            <span>{new Date(r.completed_at).toLocaleDateString()}</span>
            <strong>{r.reps}</strong>
          </div>
        ))}
      </details>
      <details className="hd-help">
        <summary>How scores are compared</summary>
        <p>
          Self-reported counts, not AI-verified. Only the same drill, duration,
          metric, and count rule are compared. History is limited to the latest
          100 timed attempts; the chart shows up to 20 matching attempts. Change
          compares the first and latest matching results in that loaded history.
        </p>
      </details>
    </>
  );
}
function WorkoutBuilder({ preview, busy, save, onDone, customDrills = [] }) {
  const drills = [...HUB_DRILLS, ...customDrills];
  const [name, setName] = useState(""),
    [keys, setKeys] = useState([]),
    [selected, setSelected] = useState(drills[0].key),
    [rounds, setRounds] = useState(1),
    [error, setError] = useState("");
  const d = drills.find((d) => d.key === selected),
    opposite = selected.includes("right")
      ? selected.replace("right", "left")
      : selected.includes("left")
        ? selected.replace("left", "right")
        : null,
    canPair = opposite && drills.some((d) => d.key === opposite);
  function add(pair) {
    const extra = pair ? [selected, opposite] : [selected];
    if ((keys.length + extra.length) * rounds > 64) {
      setError("Keep the workout at 64 rounds or fewer.");
      return;
    }
    setKeys([...keys, ...extra]);
    setError("");
  }
  return (
    <div className="cs-grid">
      <section className="cs-panel">
        <h2>Choose purposeful rounds</h2>
        <details className="tracker-details">
          <summary>Add your own stationary drill</summary>
          <CustomDrillForm save={save} busy={busy} preview={preview} />
        </details>
        <label className="cs-field">
          Workout name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength="80"
            placeholder="Monday Handle Builder"
          />
        </label>
        <label className="cs-field">
          Drill
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {drills.map((d) => (
              <option key={d.key} value={d.key}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <details className="tracker-details">
          <summary>Read coaching instructions</summary>
          <DrillGuide drill={d} />
        </details>
        <div className="cs-actions cs-section">
          <button
            className="cs-btn"
            disabled={preview}
            onClick={() => add(false)}
          >
            Add round · 30s
          </button>
          {canPair && (
            <button
              className="cs-link"
              disabled={preview}
              onClick={() => add(true)}
            >
              Add both starting hands
            </button>
          )}
        </div>
        <label className="cs-field">
          Repeat sequence
          <select
            value={rounds}
            onChange={(e) => setRounds(Number(e.target.value))}
          >
            {[1, 2, 3].map((n) => (
              <option value={n} key={n}>
                {n} {n === 1 ? "round" : "rounds"}
              </option>
            ))}
          </select>
        </label>
        <p className="cs-small cs-muted">
          Each timed round is 30 seconds. Transitions are self-paced. Plans
          under 8 active minutes count as skill practice, not full workouts.
        </p>
      </section>
      <section className="cs-panel">
        <h2>Your workout</h2>
        <p className="pc-caption">
          {keys.length * rounds} timed rounds · {(keys.length * rounds) / 2}{" "}
          active minutes
        </p>
        {keys.map((key, i) => (
          <div className="cs-stage" key={i}>
            <div>
              <strong>
                {i + 1}. {drills.find((d) => d.key === key)?.name}
              </strong>
            </div>
            <div className="cs-actions">
              <button
                className="cs-btn"
                aria-label={`Move round ${i + 1} earlier`}
                disabled={i === 0}
                onClick={() => {
                  const next = [...keys];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  setKeys(next);
                }}
              >
                ↑
              </button>
              <button
                className="cs-btn"
                aria-label={`Remove round ${i + 1}`}
                onClick={() => setKeys(keys.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {!keys.length && (
          <p className="cs-empty">Add rounds to build your sequence.</p>
        )}
        <p className="cs-error" role="alert">
          {error}
        </p>
        <button
          className="cs-btn cs-primary"
          disabled={busy || preview}
          onClick={async () => {
            const repeated = Array.from({ length: rounds }, () => keys).flat();
            if (!name.trim() || repeated.length < 2 || repeated.length > 64) {
              setError("Name your workout and choose 2–64 timed rounds.");
              return;
            }
            const r = await save(
              () =>
                hubRpc("cs_hub_save_plan", {
                  p_name: name.trim(),
                  p_keys: repeated,
                }),
              "Workout saved in your library.",
            );
            if (r.ok) onDone();
          }}
        >
          Save workout
        </button>
      </section>
    </div>
  );
}
function AssignmentWizard({
  players,
  assignments,
  plans,
  repeatSource,
  initialPlan,
  initialPlayer,
  role,
  busy,
  preview,
  save,
  onDone,
}) {
  const all = [
      ...(repeatSource
        ? [
            {
              id: "repeat:" + repeatSource.id,
              name: repeatSource.program.name,
              program: repeatSource.program,
            },
          ]
        : []),
      ...HUB_TEMPLATES.map((t) => ({
        id: t.key,
        name: t.name,
        program: templateProgram(t),
      })),
      ...plans,
    ],
    [step, setStep] = useState(1),
    [planId, setPlanId] = useState(initialPlan || all[0]?.id),
    [name, setName] = useState(repeatSource?.name || "This week’s training"),
    [requestId] = useState(() => globalThis.crypto.randomUUID()),
    [recipients, setRecipients] = useState(() =>
      players.some((p) => p.id === initialPlayer)
        ? [initialPlayer]
        : players.length === 1
          ? [players[0].id]
          : repeatSource
            ? repeatSource.recipients
                .filter((r) => players.some((p) => p.id === r.id))
                .map((r) => r.id)
            : [],
    ),
    [search, setSearch] = useState(""),
    [sessions, setSessions] = useState(repeatSource?.sessions || 1),
    [deadline, setDeadline] = useState(""),
    [error, setError] = useState(""),
    plan = all.find((p) => p.id === planId);
  async function next(e) {
    e.preventDefault();
    setError("");
    if (step === 1 && (!name.trim() || !plan)) {
      setError("Name the assignment and choose a workout.");
      return;
    }
    if (step === 2 && !recipients.length) {
      setError("Choose at least one approved player.");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (!Number.isInteger(sessions) || sessions < 1 || sessions > 5) {
      setError("Choose 1–5 sessions per player.");
      return;
    }
    const dueError = deadlineError(deadline);
    if (dueError) {
      setError(dueError);
      return;
    }
    if (preview) {
      setError("Preview only. No assignment was sent or saved.");
      return;
    }
    const r = await save(
      () =>
        repeatSource && plan.id === "repeat:" + repeatSource.id
          ? hubRpc("cs_hub_repeat_assignment", {
              p_source: repeatSource.id,
              p_name: name.trim(),
              p_players: recipients,
              p_sessions: sessions,
              p_due_at: new Date(deadline).toISOString(),
              p_request_id: requestId,
            })
          : hubRpc("cs_hub_assign", {
              p_name: name.trim(),
              p_workout_name: plan.name,
              p_keys: plan.program.drills.map((d) => d.sourceDrillKey || d.key),
              p_players: recipients,
              p_sessions: sessions,
              p_due_at: new Date(deadline).toISOString(),
            }),
      "Assignment saved. Players can find it in My assigned work.",
    );
    if (r.ok) onDone(r.result);
  }
  return (
    <section className="cs-panel">
      <div className="cs-steps" aria-label="Assignment steps">
        {["Choose work", "Choose players", "Set deadline"].map((t, i) => (
          <div
            className={`cs-step ${step === i + 1 ? "active" : ""}`}
            key={t}
            aria-current={step === i + 1 ? "step" : undefined}
          >
            <span>{i + 1}</span>
            {t}
          </div>
        ))}
      </div>
      {preview && (
        <p className="hub-assignment-preview">
          Assignment walkthrough · You can explore these steps using sample
          players. Nothing will be sent or saved.
        </p>
      )}
      {repeatSource && (
        <p className="cs-repeat-hint">
          New assignment draft · The original stays unchanged. Review recipients
          and choose a new deadline before sending.
        </p>
      )}
      <form onSubmit={next}>
        {step === 1 ? (
          <>
            <h2>What should they work on?</h2>
            <label className="cs-field">
              Assignment name
              <input
                value={name}
                maxLength="80"
                required
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="cs-field">
              Workout
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {all.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.program.activeSeconds / 60} active min
                  </option>
                ))}
              </select>
            </label>
            {plan && (
              <div className="hp-selected-plan">
                <Layers size={25} />
                <div>
                  <strong>{plan.name}</strong>
                  <span>
                    {plan.program.activeSeconds / 60} active min ·{" "}
                    {plan.program.drills.length} rounds
                  </span>
                </div>
                <details>
                  <summary>View drills</summary>
                  <ol>
                    {plan.program.drills.map((d, i) => (
                      <li key={i}>{d.name}</li>
                    ))}
                  </ol>
                </details>
              </div>
            )}
          </>
        ) : step === 2 ? (
          <>
            <h2>
              {role === "parent"
                ? "Choose your children"
                : "Choose your players"}
            </h2>
            {!players.length && (
              <p className="cs-empty">
                Players must grant access before receiving work.
              </p>
            )}
            {role === "coach" && players.length > 6 && (
              <label className="cs-field">
                Search players
                <input
                  type="search"
                  value={search}
                  placeholder="Search by name"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            )}
            <div className="hd-recipient-toolbar">
              <span aria-live="polite">{recipients.length} selected</span>
              <button
                type="button"
                className="cs-link"
                onClick={() => setRecipients(players.map((p) => p.id))}
              >
                Select everyone
              </button>
              {recipients.length > 0 && (
                <button
                  type="button"
                  className="cs-link"
                  onClick={() => setRecipients([])}
                >
                  Clear selection
                </button>
              )}
            </div>
            {players
              .filter((p) =>
                p.name
                  .toLocaleLowerCase()
                  .includes(search.trim().toLocaleLowerCase()),
              )
              .map((p) => (
                <label className="cs-choice" key={p.id}>
                  <input
                    type="checkbox"
                    checked={recipients.includes(p.id)}
                    onChange={(e) =>
                      setRecipients(
                        e.target.checked
                          ? [...recipients, p.id]
                          : recipients.filter((id) => id !== p.id),
                      )
                    }
                  />
                  <span>
                    <strong>{p.name}</strong>
                    <small className="hd-existing-work">
                      {playerWorkStatus(p, assignments, new Date()).label}
                    </small>
                  </span>
                </label>
              ))}
            {search.trim() &&
              !players.some((p) =>
                p.name
                  .toLocaleLowerCase()
                  .includes(search.trim().toLocaleLowerCase()),
              ) && (
                <p className="cs-empty">
                  No players match that name. Your selections are kept.
                </p>
              )}
          </>
        ) : (
          <>
            <h2>Set a clear requirement</h2>
            <label className="cs-field">
              Times to complete
              <input
                type="number"
                min="1"
                max="5"
                value={sessions}
                onChange={(e) => setSessions(Number(e.target.value))}
              />
            </label>
            <DeadlinePicker value={deadline} onChange={setDeadline} />
            <div className="hp-assignment-review">
              <p className="cs-eyebrow">READY TO ASSIGN</p>
              <strong>{plan?.name}</strong>
              <div className="hp-recipient-chips">
                {players
                  .filter((p) => recipients.includes(p.id))
                  .map((p) => (
                    <span key={p.id}>{p.name}</span>
                  ))}
              </div>
              <div>
                <span>
                  {sessions}{" "}
                  {(plan?.program.activeSeconds || 0) < 480
                    ? sessions === 1
                      ? "practice session"
                      : "practice sessions"
                    : sessions === 1
                      ? "workout"
                      : "workouts"}{" "}
                  each
                </span>
                <strong>
                  {(sessions * (plan?.program.activeSeconds || 0)) / 60} active
                  min each
                </strong>
              </div>
              {deadline && !deadlineError(deadline) && (
                <p>
                  Due{" "}
                  {new Date(deadline).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })}
                </p>
              )}
            </div>
          </>
        )}
        <p className="cs-error" role="alert">
          {error}
        </p>
        <div className="cs-wizard-footer">
          <button
            type="button"
            className="cs-btn"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || busy}
          >
            Back
          </button>
          <button
            className="cs-btn cs-primary"
            disabled={busy || (preview && step === 3)}
          >
            {busy
              ? "Saving…"
              : step === 3
                ? preview
                  ? "Sending locked in preview"
                  : "Create assignment"
                : "Continue →"}
          </button>
        </div>
      </form>
    </section>
  );
}
function CustomDrillForm({ save, busy, preview }) {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const r = await save(
          () =>
            hubRpc("cs_hub_save_drill", {
              p_name: f.get("name"),
              p_hand: f.get("hand"),
              p_instructions: f.get("instructions"),
              p_repeat: f.get("repeat"),
              p_rule: f.get("rule"),
              p_kind: f.get("kind"),
            }),
          "Custom drill saved. It is now available in your drill selector.",
        );
        if (r.ok) e.target.reset();
      }}
    >
      <label className="cs-field">
        Drill name
        <input name="name" required maxLength="80" />
      </label>
      <label className="cs-field">
        Hand usage
        <select name="hand">
          <option value="right">Right hand</option>
          <option value="left">Left hand</option>
          <option value="both">Both hands</option>
        </select>
      </label>
      <label className="cs-field">
        Stationary instructions
        <textarea
          name="instructions"
          required
          minLength="20"
          maxLength="1500"
          placeholder="One step per line. Include the starting hand, each floor bounce, and the receiving hand."
        />
      </label>
      <label className="cs-field">
        How to repeat
        <textarea
          name="repeat"
          required
          minLength="10"
          maxLength="600"
          placeholder="Explain how the next repetition starts from the hand that received the ball."
        />
      </label>
      <label className="cs-field">
        What counts as one rep
        <textarea name="rule" required minLength="10" maxLength="600" />
      </label>
      <label className="cs-field">
        Scoring unit
        <select name="kind">
          <option value="bounce">Controlled bounces</option>
          <option value="transfer">Controlled transfers</option>
          <option value="sequence">Complete sequences</option>
        </select>
      </label>
      <p className="cs-small cs-muted">
        30-second rounds. Your authored instructions are included in assigned
        snapshots. No AI verification is claimed.
      </p>
      <button className="cs-btn" disabled={busy || preview}>
        Save drill
      </button>
    </form>
  );
}
function TeamScores({ ps, openPlayer }) {
  const choices = [
      ...new Map(
        ps
          .flatMap((p) => p.results)
          .map((r) => [
            [
              r.drill_key,
              r.duration_seconds,
              r.metric,
              r.count_kind,
              r.count_rule_version,
            ].join("|"),
            r,
          ]),
      ).entries(),
    ],
    [key, setKey] = useState(""),
    selected = choices.find(([k]) => k === key)?.[1] || choices[0]?.[1],
    rows = ps
      .map((p) => {
        const h = selected ? matchingHistory(p.results, selected) : [];
        return {
          p,
          latest: h.at(-1),
          change:
            h.length > 1 ? Number(h.at(-1).reps) - Number(h[0].reps) : null,
        };
      })
      .sort(
        (a, b) =>
          Number(b.latest?.reps ?? -1) - Number(a.latest?.reps ?? -1) ||
          a.p.name.localeCompare(b.p.name),
      );
  return (
    <section className="cs-panel">
      <h2>Matching drill results</h2>
      <p className="pc-caption">
        Latest matching attempt per player, ordered by self-reported count.
      </p>
      {choices.length ? (
        <label className="cs-field">
          Compare this drill
          <select
            value={key || choices[0][0]}
            onChange={(e) => setKey(e.target.value)}
          >
            {choices.map(([k, r]) => (
              <option value={k} key={k}>
                {r.name} · {r.duration_seconds}s · {r.metric}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="cs-empty">No comparable timed results yet.</p>
      )}
      <div className="hp-comparison-list">
        {rows.map(({ p, latest, change }, index) => (
          <button
            key={p.id}
            className="hp-comparison"
            onClick={() => openPlayer(p)}
            aria-label={`${p.name}, ${latest ? `${latest.reps} ${latest.metric}` : "no matching attempt"}. View history`}
          >
            <span className="hp-rank">
              {latest ? String(index + 1).padStart(2, "0") : "—"}
            </span>
            <span className="hd-avatar">{initials(p.name)}</span>
            <span className="hp-comparison-person">
              <strong>{p.name}</strong>
              <span className="hp-comparison-track">
                <i
                  style={{
                    width: latest
                      ? `${(Number(latest.reps) / Math.max(1, ...rows.map((r) => Number(r.latest?.reps) || 0))) * 100}%`
                      : "0%",
                  }}
                />
              </span>
              <small>
                {latest
                  ? new Date(latest.completed_at).toLocaleDateString()
                  : "No matching attempt"}
              </small>
            </span>
            <span className="hp-comparison-value">
              <strong>{latest?.reps ?? "—"}</strong>
              <small>
                {change === null
                  ? ""
                  : `${change > 0 ? "+" : ""}${change} in history`}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      <details className="hd-help">
        <summary>How comparisons work</summary>
        <p>
          Only identical drills, intervals, metrics, and stored counting rules
          are compared. Change is from the first to latest loaded matching
          attempt. Counts are self-reported and do not measure technique
          quality. Select a player for history.
        </p>
      </details>
    </section>
  );
}
