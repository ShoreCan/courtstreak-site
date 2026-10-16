import { supabase } from "../lib/supabaseClient.js";
export async function hubRpc(name, args = {}) {
  if (!supabase)
    throw new Error("CourtStreak could not connect. Please try again.");
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (
      (error.code === "PGRST202" || error.code === "42883") &&
      [
        "cs_hub_get_alerts",
        "cs_hub_alert_action",
        "cs_hub_repeat_assignment",
        "cs_hub_session_receipts",
      ].includes(name)
    )
      throw new Error(
        "Assignment activity is temporarily unavailable. Please refresh or contact CourtStreak support.",
      );
    if (error.code === "PGRST202" || error.code === "42883")
      throw new Error(
        "The Team & Family Hub database update has not been installed yet. Run CourtStreak-Hubs.sql in Supabase, then refresh.",
      );
    throw new Error(
      error.message || "This change could not be saved. Please retry.",
    );
  }
  return data;
}
export const getHubAccount = () => hubRpc("cs_hub_account");
export const hubHome = (role) =>
  role === "coach"
    ? "/team-hub"
    : role === "parent"
      ? "/family-hub"
      : "/assigned-work";
export function safeHubNext(value) {
  return typeof value === "string" &&
    /^\/(?:hub(?:\/invite\/[a-f0-9]{64})?|account\/restore-player|connections|assigned-work(?:\/[a-zA-Z0-9/-]+)?|(?:team|family)-hub(?:\/[a-zA-Z0-9/-]+)?)(?:\?[^#]*)?$/.test(
      value,
    )
    ? value
    : null;
}
export const hubLink = (path) =>
  new URL(
    import.meta.env.BASE_URL + path.replace(/^\//, ""),
    window.location.origin,
  ).href;
export function minutes(seconds) {
  return Math.round((seconds || 0) / 6) / 10;
}
export function requirements(p, assignments) {
  return assignments.reduce(
    (n, a) => {
      const r = a.recipients.find((x) => x.id === p.id);
      return r
        ? {
            done: n.done + Math.min(r.done, a.sessions),
            total: n.total + a.sessions,
          }
        : n;
    },
    { done: 0, total: 0 },
  );
}
export function matchingHistory(results, selected) {
  return results
    .filter(
      (r) =>
        r.drill_key === selected.drill_key &&
        r.duration_seconds === selected.duration_seconds &&
        r.metric === selected.metric &&
        r.count_kind === selected.count_kind &&
        r.count_rule_version === selected.count_rule_version &&
        Number.isFinite(Number(r.reps)) &&
        r.reps !== null,
    )
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
}
