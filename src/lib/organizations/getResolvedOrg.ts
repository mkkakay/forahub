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
}

interface LogoCacheRow {
  organization_name: string;
  logo_url: string | null;
  status: string;
}

async function readAllOverrides(): Promise<Map<string, OverrideRow>> {
  const { data } = await adminSupabase
    .from("organization_overrides")
    .select("slug, display_name, short_name, description, manual_logo_url, needs_dark_background, brand_color, is_featured, display_order");
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
  return {
    ...base,
    name: override?.display_name ?? base.name,
    short: override?.short_name ?? base.short,
    description: override?.description ?? base.description,
    color: override?.brand_color ?? base.color,
    needs_dark_background: override?.needs_dark_background ?? false,
    logo_url: override?.manual_logo_url ?? cachedLogoUrl ?? null,
    is_featured:
      typeof override?.is_featured === "boolean"
        ? override.is_featured
        : FEATURED_CALENDAR_SLUGS.includes(base.slug),
    display_order: override?.display_order ?? 0,
    has_override: overrideExists,
  };
}

/** All registered orgs (registry ∪ overrides), resolved with logos. */
export async function getAllResolvedOrgs(): Promise<ResolvedOrg[]> {
  const overrides = await readAllOverrides();

  // Union of slugs: every registry slug + every override slug not in registry.
  const allSlugs = new Set<string>(ORG_LIST.map(o => o.slug));
  overrides.forEach((_, slug) => allSlugs.add(slug));

  const slugList = Array.from(allSlugs);
  const namesForLogoFetch = slugList
    .map(s => {
      const ov = overrides.get(s);
      return ov?.display_name ?? ORG_REGISTRY[s]?.name ?? null;
    })
    .filter((n): n is string => typeof n === "string");

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
      const lookupName = ov?.display_name ?? synthBase.name;
      return resolveOne(synthBase, ov, logos.get(lookupName));
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
