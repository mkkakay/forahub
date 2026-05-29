// Cached loader for admin-managed page header banners.
//
// Pages call `getPageBanners()` (server-side) once and pass the relevant row
// to <PageHeader>. The full set of rows is tiny (~5 rows), so we read them in
// one query and reuse the result via React.cache() so multiple page-tree
// imports in the same request share the response. We additionally apply a
// 5-minute in-memory cache so the DB isn't hit on every page view.

import { cache } from "react";
import { adminSupabase } from "@/lib/supabase/admin";

export type OverlayLevel = "light" | "medium" | "dark";
export type BannerVariant = "standard" | "slim";

export interface PageBanner {
  page_key: string;
  image_url: string | null;
  overlay_level: OverlayLevel;
  is_active: boolean;
  variant: BannerVariant;
}

// Shorter than before so admin edits show within ~1 minute even without a
// manual invalidation call from a cold-started function.
const MEMO_TTL_MS = 60_000;
let memo: { at: number; rows: PageBanner[] } | null = null;

async function fetchAllRaw(): Promise<PageBanner[]> {
  if (memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.rows;
  const { data, error } = await adminSupabase
    .from("page_banners")
    .select("page_key, image_url, overlay_level, is_active, variant");
  if (error || !data) {
    memo = { at: Date.now(), rows: [] };
    return [];
  }
  const rows = (data as PageBanner[]).map(r => ({
    ...r,
    overlay_level: (r.overlay_level === "light" || r.overlay_level === "dark" ? r.overlay_level : "medium") as OverlayLevel,
    variant: (r.variant === "slim" ? "slim" : "standard") as BannerVariant,
  }));
  memo = { at: Date.now(), rows };
  return rows;
}

/** Cached for the lifetime of a request (React.cache()) on top of a 5-minute
 *  in-memory cache. Safe to call from any number of server components. */
export const getPageBanners = cache(async (): Promise<PageBanner[]> => fetchAllRaw());

/** Convenience helper — returns the row for a single page key, or null. */
export async function getPageBanner(pageKey: string): Promise<PageBanner | null> {
  const rows = await getPageBanners();
  return rows.find(r => r.page_key === pageKey) ?? null;
}

/** Invalidate the in-memory memo (called after admin PATCH). */
export function invalidatePageBannerCache(): void {
  memo = null;
}
