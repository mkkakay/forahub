// Single source of truth for event/org card visuals.
// Every card on the homepage flows through this service. When a card has no
// real banner image, it falls back to an SDG-themed gradient that LOOKS
// INTENTIONAL — never a broken-image icon.

import { ORG_LIST, slugify } from "@/lib/organizations";
import { getSdgFallbackGradient, getSdgColor } from "./sdgFallbacks";

export interface EventAssetInput {
  /** Persisted Pexels/admin banner URL on the event row. */
  banner_image_url?: string | null;
  /** Org name as stored on the event (free-form text). */
  organization?: string | null;
  /** Event's tagged SDGs — first one drives color/gradient. */
  sdg_goals?: number[] | null;
  /** Logo URL already resolved upstream (e.g. via batchGetLogos in page.tsx). */
  org_logo_url?: string | null;
}

export interface EventAssets {
  /** Real image URL when present; null forces the gradient. */
  banner_image_url: string | null;
  /** Always-present CSS background — used when banner_image_url is null
   *  OR when the image fails to load client-side. */
  banner_gradient: string;
  /** Org logo URL from the Brandfetch cache; null → consumer renders an initial chip. */
  org_logo_url: string | null;
  /** Org brand color (hex) — registry first, then primary SDG, then ForaHub navy. */
  org_brand_color: string;
  /** Which source produced the banner. For debugging / analytics. */
  fallback_type: "uploaded" | "pexels" | "sdg_gradient";
}

function findRegistryByOrgName(orgName: string) {
  const slug = slugify(orgName);
  const bySlug = ORG_LIST.find(o => o.slug === slug);
  if (bySlug) return bySlug;
  const norm = orgName.toLowerCase();
  return ORG_LIST.find(o => o.matchPatterns.some(p => norm.includes(p.toLowerCase()))) ?? null;
}

/**
 * Resolve every visual asset for an event card in one pure call.
 * Synchronous — input data should already be fetched upstream (the page-level
 * server component is responsible for cache hydration via batchGetLogos).
 */
export function getEventAssets(input: EventAssetInput): EventAssets {
  const sdg = input.sdg_goals?.[0];
  const registry = input.organization ? findRegistryByOrgName(input.organization) : null;

  const banner_image_url = input.banner_image_url?.trim() || null;
  const banner_gradient = getSdgFallbackGradient(sdg);

  const org_brand_color =
    registry?.color ?? getSdgColor(sdg) ?? "#0f2a4a";

  return {
    banner_image_url,
    banner_gradient,
    org_logo_url: input.org_logo_url ?? null,
    org_brand_color,
    fallback_type: banner_image_url ? "pexels" : "sdg_gradient",
  };
}
