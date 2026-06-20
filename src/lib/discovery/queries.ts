// Real-data helpers for the discovery / submit / org pages. Every
// function here returns numbers and rows sourced from a single Supabase
// query at render time. NEVER hardcoded.
//
// Guardrails baked in:
//   - getDirectoryMetrics returns NULL for any individual signal that
//     errors or has no honest backing — callers must hide that metric,
//     not fall through to a placeholder.
//   - Counts come from PostgREST `count:'exact', head:true` which is a
//     single round-trip per metric.
//   - Honest rounding to "10,000+" only applies if the real count is
//     ≥ 10,000. Below that, the raw number is returned and the
//     component decides how to render it.
//
// We do NOT track:
//   - Country of an event (only `region`, with 7 canonical values)
//   - Visitor country / Top countries in analytics
//   - Submission-funnel splits (single vs bulk)
// Those are documented in OMISSIONS in the page-level report.

import { adminSupabase } from "@/lib/supabase/admin";

export interface DirectoryMetrics {
  orgsActive: number | null;
  eventsPublished: number | null;
  regionsCovered: number | null;
  sdgsRepresented: number | null;
}

export async function getDirectoryMetrics(): Promise<DirectoryMetrics> {
  const [orgs, events, regions, sdgs] = await Promise.all([
    adminSupabase
      .from("organizations_directory")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    adminSupabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    // PostgREST can't group-and-count in one call cheaply; we pull the
    // distinct region values via a small select and count client-side.
    adminSupabase
      .from("events")
      .select("region")
      .not("region", "is", null)
      .neq("region", "")
      .limit(1000),
    // SDG goals are int[] on events. Pull a thin projection and count
    // distinct ints client-side — there are only 17 possible values, so
    // this is O(rows) and tiny.
    adminSupabase
      .from("events")
      .select("sdg_goals")
      .not("sdg_goals", "is", null)
      .limit(5000),
  ]);

  const regionsSet = new Set<string>();
  if (!regions.error) {
    for (const r of (regions.data ?? []) as { region: string | null }[]) {
      if (r.region) regionsSet.add(r.region);
    }
  }

  const sdgSet = new Set<number>();
  if (!sdgs.error) {
    for (const row of (sdgs.data ?? []) as { sdg_goals: number[] | null }[]) {
      for (const n of row.sdg_goals ?? []) {
        if (typeof n === "number" && n >= 1 && n <= 17) sdgSet.add(n);
      }
    }
  }

  return {
    orgsActive: orgs.error ? null : (orgs.count ?? 0),
    eventsPublished: events.error ? null : (events.count ?? 0),
    regionsCovered: regions.error ? null : regionsSet.size,
    sdgsRepresented: sdgs.error ? null : sdgSet.size,
  };
}

/** Round down to a marketing-friendly bucket. Used ONLY for the
 *  organizations-indexed pill where 10,595 → "10,000+". For values
 *  under 10,000 we return null so callers render the raw number. */
export function roundedDownLabel(n: number): string | null {
  if (n >= 100_000) return `${Math.floor(n / 100_000) * 100}k+`;
  if (n >= 10_000)  return `${Math.floor(n / 10_000) * 10},000+`;
  return null;
}

export interface RecentEventRow {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  created_at: string;
  region: string | null;
}

export async function getRecentEvents(limit = 5): Promise<RecentEventRow[]> {
  const { data } = await adminSupabase
    .from("events")
    .select("id, title, organization, start_date, created_at, region")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as RecentEventRow[] | null) ?? [];
}

export interface TrustOrgRow {
  slug: string;
  name: string;
  logo_url: string | null;
}

/** Real orgs from the directory, picked for the trust strip. We prefer
 *  rows with a real logo URL so the strip never renders a broken image.
 *  Order is opportunistic — name-alpha within tier 1, falling back to
 *  any logo-bearing claimed/verified row. Cap at `limit`. */
export async function getTrustStripOrgs(limit = 8): Promise<TrustOrgRow[]> {
  const { data } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name, logo_url, tier, is_claimed, is_verified")
    .eq("status", "active")
    .not("logo_url", "is", null)
    .neq("logo_url", "")
    .order("tier", { ascending: true })
    .order("name", { ascending: true })
    .limit(limit * 4);

  const rows = (data as Array<TrustOrgRow & { tier: number | null; is_claimed: boolean | null; is_verified: boolean | null }> | null) ?? [];
  // Score: tier 1 wins, then claimed/verified, then alpha. Dedup on
  // slug just in case the projection picks up the same org twice.
  const seen = new Set<string>();
  const ranked = rows
    .filter(r => r.logo_url && !seen.has(r.slug) && (seen.add(r.slug) || true))
    .sort((a, b) => {
      const ta = a.tier ?? 99;
      const tb = b.tier ?? 99;
      if (ta !== tb) return ta - tb;
      const ca = (a.is_claimed || a.is_verified) ? 0 : 1;
      const cb = (b.is_claimed || b.is_verified) ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map(({ slug, name, logo_url }) => ({ slug, name, logo_url }));
  return ranked;
}
