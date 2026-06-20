// Auto-publish rule and rolling-24h soft cap for org-attributed event
// submissions. The submit endpoint, the org events list, and the team panel
// all consume this — keep it the only place the rule lives.

import { adminSupabase } from "@/lib/supabase/admin";
import { effectiveAutoPublish, type OrgManagerRow } from "@/lib/orgs/managers";

/** Single-named constant — bump if review capacity changes. */
export const AUTOPUBLISH_CAP_PER_24H = 5;
export const AUTOPUBLISH_WINDOW_HOURS = 24;

export type AutoPublishOutcome =
  | { outcome: "publish"; manager: OrgManagerRow }
  | { outcome: "cap_hit"; manager: OrgManagerRow; recent: number; cap: number; windowHours: number }
  | { outcome: "not_granted"; manager: OrgManagerRow }
  | { outcome: "not_a_manager" };

interface EvalArgs {
  orgSlug: string;
  userId: string;
}

export async function evaluateAutoPublish({ orgSlug, userId }: EvalArgs): Promise<AutoPublishOutcome> {
  const { data: mgrData, error: mgrErr } = await adminSupabase
    .from("org_managers")
    .select("id, org_slug, user_id, email, role, added_at, verified_at, added_via, can_autopublish, autopublish_granted_by, autopublish_granted_at")
    .eq("org_slug", orgSlug)
    .eq("user_id", userId)
    .maybeSingle();
  if (mgrErr || !mgrData) return { outcome: "not_a_manager" };
  const manager = mgrData as OrgManagerRow;

  if (!effectiveAutoPublish(manager)) {
    return { outcome: "not_granted", manager };
  }

  // Rolling-window cap. Per-org (not per-manager) — a compromised single
  // seat shouldn't be able to silently spam the org's pipeline even if
  // every other seat is dormant.
  const sinceIso = new Date(Date.now() - AUTOPUBLISH_WINDOW_HOURS * 3600 * 1000).toISOString();
  const { count, error: cntErr } = await adminSupabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("org_slug", orgSlug)
    .gte("auto_published_at", sinceIso);
  if (cntErr) {
    // Soft-fail safe: if the count query errors, treat it as "cap not hit"
    // rather than blocking legitimate submissions. The downstream submit
    // path still records auto_published_at so the cap self-heals next call.
    return { outcome: "publish", manager };
  }
  const recent = count ?? 0;
  if (recent >= AUTOPUBLISH_CAP_PER_24H) {
    return {
      outcome: "cap_hit",
      manager,
      recent,
      cap: AUTOPUBLISH_CAP_PER_24H,
      windowHours: AUTOPUBLISH_WINDOW_HOURS,
    };
  }
  return { outcome: "publish", manager };
}
