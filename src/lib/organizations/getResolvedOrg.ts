import { adminSupabase } from "@/lib/supabase/admin";
import {
  ORG_LIST,
  ORG_REGISTRY,
  FEATURED_CALENDAR_SLUGS,
  type OrgConfig,
} from "@/lib/organizations";

/**
 * Resolved org = static ORG_REGISTRY entry + admin overrides + cached logo.
 * This is the shape every consumer (homepage, org detail page, admin UI) should use.
 */
export interface ResolvedOrg extends OrgConfig {
  needs_dark_background: boolean;
  /** Final logo URL after override → cache resolution. null = render initial fallback. */
  logo_url: string | null;
  is_featured: boolean;
  display_order: number;
  has_override: boolean;
  /** 'contain' = logo fits (default), 'cover' = photo fills the tile. */
  logo_display_mode: "contain" | "cover";
}

interface OverrideRow {
  slug: string;
  display_name: string | null;
  short_name: string | null;
  description: string | null;
  manual_logo_url: string | null;
  needs_dark_background: boolean | null;
  brand_color: string | null;
  is_featured: boolean | null;
  display_order: number | null;
  logo_display_mode: "contain" | "cover" | null;
  updated_at: string | null;
}

/** Append a ?v=… query so browsers re-fetch when the admin updates the logo. */
function withCacheBust(url: string, version: string | null): string {
  if (!url) return url;
  const v = (version ? new Date(version).getTime() : Date.now()).toString();
  return `${url}${url.includes("?") ? "&" : "?"}v=${v}`;
}

interface LogoCacheRow {
  organization_name: string;
  logo_url: string | null;
  status: string;
}

async function readAllOverrides(): Promise<Map<string, OverrideRow>> {
  const { data } = await adminSupabase
    .from("organization_overrides")
    .select("slug, display_name, short_name, description, manual_logo_url, needs_dark_background, brand_color, is_featured, display_order, logo_display_mode, updated_at");
  const rows = (data as OverrideRow[] | null) ?? [];
  return new Map(rows.map(r => [r.slug, r]));
}

async function readLogosForNames(names: string[]): Promise<Map<string, string>> {
  if (names.length === 0) return new Map();
  const { data } = await adminSupabase
    .from("organization_logos")
    .select("organization_name, logo_url, status")
    .in("organization_name", names);
  const rows = (data as LogoCacheRow[] | null) ?? [];
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.status === "success" && r.logo_url) map.set(r.organization_name, r.logo_url);
  }
  return map;
}

function resolveOne(
  base: OrgConfig,
  override: OverrideRow | undefined,
  cachedLogoUrl: string | undefined
): ResolvedOrg {
  const overrideExists = !!override;
  // Manual uploads get cache-busted by the override's updated_at so the browser
  // re-fetches when the admin saves a new image. Brandfetch cache URLs are unique
  // per fetch so they don't need busting.
  const manualUrl = override?.manual_logo_url
    ? withCacheBust(override.manual_logo_url, override.updated_at)
    : null;
  return {
    ...base,
    name: override?.display_name ?? base.name,
    short: override?.short_name ?? base.short,
    description: override?.description ?? base.description,
    color: override?.brand_color ?? base.color,
    needs_dark_background: override?.needs_dark_background ?? false,
    logo_url: manualUrl ?? cachedLogoUrl ?? null,
    is_featured:
      typeof override?.is_featured === "boolean"
        ? override.is_featured
        : FEATURED_CALENDAR_SLUGS.includes(base.slug),
    display_order: override?.display_order ?? 0,
    has_override: overrideExists,
    logo_display_mode: override?.logo_display_mode ?? "contain",
  };
}

/** All registered orgs (registry ∪ overrides), resolved with logos. */
export async function getAllResolvedOrgs(): Promise<ResolvedOrg[]> {
  const overrides = await readAllOverrides();

  // Union of slugs: every registry slug + every override slug not in registry.
  const allSlugs = new Set<string>(ORG_LIST.map(o => o.slug));
  overrides.forEach((_, slug) => allSlugs.add(slug));

  const slugList = Array.from(allSlugs);
  // Look up the cache under BOTH the override.display_name AND the registry
  // canonical name. This avoids cache misses when an admin renames an org
  // (e.g. "Bill and Melinda Gates Foundation" → "Gates Foundation") — the
  // logo was originally seeded under the canonical name and shouldn't vanish
  // just because the display label changed.
  const namesForLogoFetch = slugList.flatMap(s => {
    const ov = overrides.get(s);
    const reg = ORG_REGISTRY[s];
    const names: string[] = [];
    if (ov?.display_name) names.push(ov.display_name);
    if (reg?.name) names.push(reg.name);
    return names;
  });

  const logos = await readLogosForNames(namesForLogoFetch);

  return slugList
    .map(slug => {
      const base = ORG_REGISTRY[slug];
      const ov = overrides.get(slug);
      if (!base && !ov) return null;
      // Synthesize a minimal base for override-only slugs.
      const synthBase: OrgConfig = base ?? {
        slug,
        name: ov?.display_name ?? slug,
        short: ov?.short_name ?? slug,
        color: ov?.brand_color ?? "#0f2a4a",
        logo: "",
        description: ov?.description ?? "",
        matchPatterns: [],
        domain: "",
      };
      // Try the override label first, then fall back to the canonical name
      // so a re-labelled org still resolves to its seeded logo.
      const displayKey = ov?.display_name;
      const canonicalKey = synthBase.name;
      const cached = (displayKey && logos.get(displayKey)) || logos.get(canonicalKey) || undefined;
      return resolveOne(synthBase, ov, cached);
    })
    .filter((o): o is ResolvedOrg => o !== null);
}

/** Resolved Featured Calendars list, ordered. */
export async function getResolvedFeaturedCalendars(): Promise<ResolvedOrg[]> {
  const all = await getAllResolvedOrgs();
  return all
    .filter(o => o.is_featured)
    .sort((a, b) => {
      // Explicit display_order from override wins; tie-break by FEATURED_CALENDAR_SLUGS position.
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      const ai = FEATURED_CALENDAR_SLUGS.indexOf(a.slug);
      const bi = FEATURED_CALENDAR_SLUGS.indexOf(b.slug);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
}

/** Read just the override-layer logo URLs (slug → manual URL). */
export async function readManualLogoOverrides(): Promise<Map<string, string>> {
  const { data } = await adminSupabase
    .from("organization_overrides")
    .select("slug, manual_logo_url")
    .not("manual_logo_url", "is", null);
  const rows = (data as { slug: string; manual_logo_url: string }[] | null) ?? [];
  return new Map(rows.map(r => [r.slug, r.manual_logo_url]));
}
