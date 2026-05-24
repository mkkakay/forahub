import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { ORG_LIST, slugify } from "@/lib/organizations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrgSuggestion {
  slug: string;
  name: string;
  short: string;
  logo_url: string | null;
}

interface OverrideRow {
  slug: string;
  display_name: string | null;
  short_name: string | null;
  manual_logo_url: string | null;
}

interface LogoRow {
  organization_name: string;
  logo_url: string | null;
  status: string;
}

// Public — used by the /submit autocomplete. No admin gate, no PII.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 1) return NextResponse.json({ data: [] });

  // 1. Match against the static registry (20 curated orgs).
  const registryMatches: OrgSuggestion[] = ORG_LIST
    .filter(o => {
      return (
        o.name.toLowerCase().includes(q) ||
        o.short.toLowerCase().includes(q) ||
        o.slug.includes(q) ||
        o.matchPatterns.some(p => p.toLowerCase().includes(q))
      );
    })
    .map(o => ({ slug: o.slug, name: o.name, short: o.short, logo_url: null }));

  // 2. Pull overrides (admin-renamed display names + manual logos).
  const { data: overrideRows } = await adminSupabase
    .from("organization_overrides")
    .select("slug, display_name, short_name, manual_logo_url");
  const overrides = ((overrideRows ?? []) as OverrideRow[]);
  const overrideBySlug = new Map(overrides.map(o => [o.slug, o]));

  // Apply override renames onto registry matches AND surface override-only orgs that match.
  const merged: Map<string, OrgSuggestion> = new Map();
  for (const r of registryMatches) {
    const ov = overrideBySlug.get(r.slug);
    merged.set(r.slug, {
      slug: r.slug,
      name: ov?.display_name ?? r.name,
      short: ov?.short_name ?? r.short,
      logo_url: ov?.manual_logo_url ?? null,
    });
  }
  for (const ov of overrides) {
    if (merged.has(ov.slug)) continue;
    const matches =
      (ov.display_name?.toLowerCase().includes(q) ?? false) ||
      (ov.short_name?.toLowerCase().includes(q) ?? false) ||
      ov.slug.includes(q);
    if (!matches) continue;
    merged.set(ov.slug, {
      slug: ov.slug,
      name: ov.display_name ?? ov.slug,
      short: ov.short_name ?? ov.display_name ?? ov.slug,
      logo_url: ov.manual_logo_url,
    });
  }

  // 3. Fill missing logos from the Brandfetch cache (organization_logos).
  const names = Array.from(merged.values()).filter(o => !o.logo_url).map(o => o.name);
  if (names.length > 0) {
    const { data: logoRows } = await adminSupabase
      .from("organization_logos")
      .select("organization_name, logo_url, status")
      .in("organization_name", names);
    const logoMap = new Map<string, string>();
    for (const lr of (logoRows ?? []) as LogoRow[]) {
      if (lr.status === "success" && lr.logo_url) logoMap.set(lr.organization_name, lr.logo_url);
    }
    merged.forEach((sug, slug) => {
      if (!sug.logo_url && logoMap.has(sug.name)) {
        merged.set(slug, { ...sug, logo_url: logoMap.get(sug.name) ?? null });
      }
    });
  }

  // 4. Rank: exact-slug-match > short-name-startswith > name-startswith > substring.
  const ranked = Array.from(merged.values())
    .sort((a, b) => {
      const aSlugExact = slugify(a.name) === q ? 0 : 1;
      const bSlugExact = slugify(b.name) === q ? 0 : 1;
      if (aSlugExact !== bSlugExact) return aSlugExact - bSlugExact;
      const aStart = a.short.toLowerCase().startsWith(q) || a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStart = b.short.toLowerCase().startsWith(q) || b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 8);

  return NextResponse.json({ data: ranked });
}
