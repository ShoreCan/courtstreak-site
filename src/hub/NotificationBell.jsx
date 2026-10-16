import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  notificationPlacement,
  visibleViewport,
} from "./notificationLayout.js";
import {
  Bell,
  Check,
  ChevronRight,
  X,
  RefreshCw,
  Clock,
  FileCheck,
  MessageSquare,
  CalendarCheck,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { hubRpc, hubHome } from "./api.js";
import { demoAlerts } from "./demoActivity.js";
import "./hub-activity.css";
export default function NotificationBell({
  preview = false,
  demoRole = "player",
}) {
  const navigate = useNavigate(),
    root = useRef(null),
    panel = useRef(null),
    button = useRef(null),
    heading = useRef(null),
    [open, setOpen] = useState(false),
    [filter, setFilter] = useState("all"),
    [feed, setFeed] = useState(() =>
      preview
        ? demoAlerts(demoRole)
        : { items: [], unread_count: 0, role: "player" },
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [position, setPosition] = useState({ top: 80, right: 16 });
  const fetching = useRef(false),
    generation = useRef(0);
  const refresh = useCallback(async () => {
    if (preview || fetching.current) return;
    const epoch = generation.current;
    fetching.current = true;
    try {
      const r = await hubRpc("cs_hub_get_alerts");
      if (epoch === generation.current) {
        setFeed(r);
        setError("");
      }
    } catch (e) {
      if (epoch === generation.current) setError(e.message);
    } finally {
      fetching.current = false;
    }
  }, [preview]);
  useEffect(() => {
    if (preview) {
      setFeed(demoAlerts(demoRole));
      return;
    }
    refresh();
    const check = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("courtstreak:hub-updated", check);
    return () => {
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("courtstreak:hub-updated", check);
    };
  }, [preview, demoRole, refresh]);
  useEffect(() => {
    if (preview || !supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        generation.current++;
        fetching.current = false;
        setOpen(false);
        setFeed({ items: [], unread_count: 0, role: "player" });
        if (event === "SIGNED_IN") queueMicrotask(refresh);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [preview, refresh]);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = button.current?.getBoundingClientRect();
      if (rect) setPosition(notificationPlacement(rect, visibleViewport()));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    heading.current?.focus();
    refresh();
    const closeOutside = (e) => {
      if (
        !root.current?.contains(e.target) &&
        !panel.current?.contains(e.target)
      )
        setOpen(false);
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open, refresh]);
  async function action(kind, id) {
    if (busy) return false;
    setBusy(true);
    try {
      if (!preview)
        await hubRpc("cs_hub_alert_action", {
          p_action: kind,
          p_id: id || null,
        });
      generation.current++;
      setFeed((f) => {
        const items = f.items
          .filter((n) => kind !== "dismiss" || n.id !== id)
          .map((n) =>
            kind === "read_all" || n.id === id
              ? { ...n, read_at: n.read_at || new Date().toISOString() }
              : n,
          );
        return {
          ...f,
          items,
          unread_count:
            kind === "read_all"
              ? 0
              : Math.max(
                  0,
                  f.unread_count -
                    (f.items.some((n) => n.id === id && !n.read_at) ? 1 : 0),
                ),
        };
      });
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function visit(n) {
    await action("read", n.id);
    setOpen(false);
    const role = preview ? demoRole : feed.role,
      base = preview ? "/preview/hub" : hubHome(role),
      params = new URLSearchParams({ player: n.player_id });
    if (preview) params.set("view", role);
    if (n.kind === "feedback") params.set("tab", "feedback");
    if (n.kind === "completion") {
      params.set("tab", "receipts");
      params.set("run", n.source_id);
    }
    navigate(`${base}/assignments/${n.assignment_id}?${params}`);
  }
  const role = preview ? demoRole : feed.role;
  const title = (n) =>
    n.kind === "completion"
      ? role === "player"
        ? "Your session was saved"
        : `${n.player_name} saved a session`
      : n.kind === "feedback"
        ? role === "player"
          ? "New feedback on your work"
          : `Feedback for ${n.player_name}`
        : n.kind === "due"
          ? role === "player"
            ? "Your workout is due soon"
            : `${n.player_name} · Work due soon`
          : role === "player"
            ? "New workout assigned"
            : `New workout for ${n.player_name}`;
  const destination = (n) =>
    n.kind === "completion"
      ? "Open receipt"
      : n.kind === "feedback"
        ? "Read feedback"
        : "View assignment";
  const visible = feed.items.filter(
    (n) =>
      filter === "all" || (filter === "unread" ? !n.read_at : n.kind === "due"),
  );
  const icons = {
    completion: FileCheck,
    feedback: MessageSquare,
    due: Clock,
    assignment: CalendarCheck,
  };
  return (
    <div className="cs-notifications" ref={root}>
      <button
        type="button"
        className="cs-notification-bell"
        ref={button}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${feed.unread_count ? `, ${feed.unread_count} unread` : ""}${error ? ", unavailable" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={20} />
        {feed.unread_count > 0 && (
          <b className="cs-notification-count">
            {feed.unread_count > 99 ? "99+" : feed.unread_count}
          </b>
        )}
      </button>
      {open &&
        createPortal(
          <section
            ref={panel}
            className="cs-notification-panel"
            role="dialog"
            aria-modal="false"
            aria-label="Notifications"
            style={position}
          >
            <header>
              <div>
                <h2 ref={heading} tabIndex={-1}>
                  Notifications
                </h2>
                <small>
                  {preview
                    ? "Fictional sample updates"
                    : `${feed.unread_count} unread · Latest 50 updates`}
                </small>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  button.current?.focus();
                }}
                aria-label="Close notifications"
              >
                <X size={19} />
              </button>
            </header>
            <nav
              className="cs-notification-filters"
              aria-label="Filter notifications"
            >
              {[
                ["all", "All"],
                ["unread", "Unread"],
                ["reminders", "Reminders"],
              ].map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="cs-notification-tools">
              <button
                type="button"
                onClick={() => action("read_all")}
                disabled={busy || !feed.unread_count}
              >
                <Check size={14} />
                Mark all read
              </button>
              {!preview && (
                <button type="button" onClick={refresh}>
                  <RefreshCw size={14} />
                  Refresh
                </button>
              )}
            </div>
            {error && (
              <p className="cs-notification-error" role="alert">
                {error}
              </p>
            )}
            <div className="cs-notification-items">
              {visible.map((n) => {
                const Icon = icons[n.kind] || Bell;
                return (
                  <article
                    key={n.id}
                    className={`${n.read_at ? "" : "unread"} cs-alert-${n.kind}`}
                  >
                    <button
                      type="button"
                      className="cs-notification-open"
                      onClick={() => visit(n)}
                      disabled={busy}
                    >
                      <span className="cs-alert-kind">
                        <Icon size={19} />
                      </span>
                      <div>
                        <strong>
                          {title(n)} {!n.read_at && <em>New</em>}
                        </strong>
                        <span>{n.assignment_name}</span>
                        {n.kind === "due" && n.due_at && (
                          <small className="cs-alert-deadline">
                            Due{" "}
                            {new Date(n.due_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              timeZoneName: "short",
                            })}
                          </small>
                        )}
                        <span className="cs-alert-action">
                          {destination(n)} <ChevronRight size={13} />
                        </span>
                        <small>
                          {new Date(n.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="cs-notification-dismiss"
                      onClick={() => action("dismiss", n.id)}
                      aria-label={`Dismiss ${title(n)}`}
                      disabled={busy}
                    >
                      Dismiss
                    </button>
                  </article>
                );
              })}
            </div>
            {!visible.length && !error && (
              <p className="cs-notification-empty">
                {filter === "unread"
                  ? "You're caught up—no unread updates in the latest 50."
                  : filter === "reminders"
                    ? "No due-soon reminders in the latest 50 updates. Check Assigned work for all deadlines."
                    : "You're all caught up. New assignments, saved sessions and feedback will appear here."}
              </p>
            )}
            <footer>
              <details>
                <summary>How reminders and unread updates work</summary>
                <p>
                  The bell number is your unread count. Opening an update marks
                  it read. Dismiss hides that update without changing workout
                  progress. Due-soon reminders cover unfinished work within 24
                  hours of its deadline and refresh while CourtStreak is open.
                  This inbox shows the latest 50 visible updates.{" "}
                  {preview
                    ? "Sample actions stay in this preview."
                    : "Read and dismissed states sync to your account."}
                </p>
              </details>
            </footer>
          </section>,
          document.body,
        )}
    </div>
  );
}
