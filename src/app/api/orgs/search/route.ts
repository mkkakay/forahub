import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DirectoryRow {
  slug: string;
  name: string;
  short_name: string | null;
  org_type: string;
  region: string | null;
  tier: number;
  logo_url: string | null;
  aliases: string[] | null;
}

interface OverrideRow {
  slug: string;
  display_name: string | null;
  short_name: string | null;
  manual_logo_url: string | null;
}

interface LogoCacheRow {
  organization_name: string;
  logo_url: string | null;
  status: string;
}

export interface OrgSuggestion {
  slug: string;
  name: string;
  short: string;
  org_type: string;
  region: string | null;
  tier: number;
  logo_url: string | null;
}

// Tiny in-memory cache so a busy combobox doesn't slam the DB. Per-process.
const respCache = new Map<string, { at: number; data: OrgSuggestion[] }>();
const CACHE_TTL_MS = 60_000;

function rankScore(s: { name: string; short: string; slug: string; aliases?: string[] | null }, q: string): number {
  const qLower = q.toLowerCase();
  if (s.slug === qLower) return 0;
  if (s.name.toLowerCase() === qLower) return 1;
  if (s.short.toLowerCase() === qLower) return 1;
  if (s.short.toLowerCase().startsWith(qLower)) return 2;
  if (s.name.toLowerCase().startsWith(qLower)) return 2;
  if ((s.aliases ?? []).some(a => a.toLowerCase().startsWith(qLower))) return 3;
  if (s.short.toLowerCase().includes(qLower)) return 4;
  if (s.name.toLowerCase().includes(qLower)) return 4;
  if (s.slug.includes(qLower)) return 5;
  if ((s.aliases ?? []).some(a => a.toLowerCase().includes(qLower))) return 6;
  return 99;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ data: [] });

  const cacheKey = q.toLowerCase();
  const cached = respCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ data: cached.data });
  }

  // Pull tier 1 + 2 candidates that could plausibly match.
  // We use ILIKE on name/short_name/slug for the main filter. Aliases are
  // checked in JS over the returned candidates (text[] case-insensitive
  // matching in PostgREST is awkward; the candidate set stays small).
  const ilike = `%${q.replace(/[%_]/g, "")}%`;
  const { data: rawRows } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name, short_name, org_type, region, tier, logo_url, aliases")
    .eq("status", "active")
    .in("tier", [1, 2])
    .or(`name.ilike.${ilike},short_name.ilike.${ilike},slug.ilike.${ilike}`)
    .limit(50);

  const candidates = (rawRows as DirectoryRow[] | null) ?? [];

  // Surface alias-only matches that the SQL filter missed by pulling a small
  // additional batch and merging. Cheap because we cap at 200 tier-1 rows.
  if (candidates.length < 8) {
    const { data: tier1All } = await adminSupabase
      .from("organizations_directory")
      .select("slug, name, short_name, org_type, region, tier, logo_url, aliases")
      .eq("status", "active")
      .eq("tier", 1)
      .not("aliases", "is", null)
      .limit(300);
    const byAlias = ((tier1All as DirectoryRow[] | null) ?? []).filter(r =>
      (r.aliases ?? []).some(a => a.toLowerCase().includes(q.toLowerCase()))
    );
    const seen = new Set(candidates.map(c => c.slug));
    for (const r of byAlias) if (!seen.has(r.slug)) candidates.push(r);
  }

  if (candidates.length === 0) {
    respCache.set(cacheKey, { at: Date.now(), data: [] });
    return NextResponse.json({ data: [] });
  }

  // Layer 1: override-row manual logos + display-name renames.
  const slugs = candidates.map(c => c.slug);
  const { data: overrideRows } = await adminSupabase
    .from("organization_overrides")
    .select("slug, display_name, short_name, manual_logo_url")
    .in("slug", slugs);
  const overrideBySlug = new Map(((overrideRows ?? []) as OverrideRow[]).map(o => [o.slug, o]));

  // Layer 2: Brandfetch cache backfill for rows without a directory logo.
  const namesNeedingLogo = candidates
    .map(c => {
      const ov = overrideBySlug.get(c.slug);
      return ov?.display_name ?? c.name;
    })
    .filter(Boolean);
  const cachedLogos = new Map<string, string>();
  if (namesNeedingLogo.length > 0) {
    const { data: logoRows } = await adminSupabase
      .from("organization_logos")
      .select("organization_name, logo_url, status")
      .in("organization_name", namesNeedingLogo);
    for (const r of ((logoRows ?? []) as LogoCacheRow[])) {
      if (r.status === "success" && r.logo_url) cachedLogos.set(r.organization_name, r.logo_url);
    }
  }

  // Build resolved suggestions.
  const resolved: OrgSuggestion[] = candidates.map(c => {
    const ov = overrideBySlug.get(c.slug);
    const name = ov?.display_name ?? c.name;
    const short = ov?.short_name ?? c.short_name ?? c.name;
    const logo = ov?.manual_logo_url ?? c.logo_url ?? cachedLogos.get(name) ?? null;
    return {
      slug: c.slug,
      name,
      short,
      org_type: c.org_type,
      region: c.region,
      tier: c.tier,
      logo_url: logo,
    };
  });

  // Rank: by score, then by tier (1 wins), then alphabetically.
  resolved.sort((a, b) => {
    const aRow = candidates.find(c => c.slug === a.slug);
    const bRow = candidates.find(c => c.slug === b.slug);
    const aScore = rankScore({ name: a.name, short: a.short, slug: a.slug, aliases: aRow?.aliases }, q);
    const bScore = rankScore({ name: b.name, short: b.short, slug: b.slug, aliases: bRow?.aliases }, q);
    if (aScore !== bScore) return aScore - bScore;
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.name.localeCompare(b.name);
  });

  const top = resolved.slice(0, 8);
  respCache.set(cacheKey, { at: Date.now(), data: top });
  return NextResponse.json({ data: top });
}
