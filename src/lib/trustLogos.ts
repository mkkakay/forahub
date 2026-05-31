import { cache } from "react";
import { adminSupabase } from "@/lib/supabase/admin";

export interface TrustLogoRow {
  id: string;
  name: string;
  image_url: string;
  display_order: number;
}

/**
 * Server-only fetch of active trust-strip logos.
 *
 * Wrapped in React.cache so a single server render only hits Postgres once
 * even when the function is called from multiple components. Mirrors the
 * pattern used by `src/lib/pageBanners.ts`.
 *
 * Returns an empty array on any failure — TrustStrip falls back to its
 * hardcoded default list when this returns [].
 */
export const getActiveTrustLogos = cache(async (): Promise<TrustLogoRow[]> => {
  try {
    const { data, error } = await adminSupabase
      .from("trust_logos")
      .select("id, name, image_url, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (error) {
      console.warn("trust_logos read failed:", error.message);
      return [];
    }
    return (data ?? []) as TrustLogoRow[];
  } catch (err) {
    console.warn("trust_logos read threw:", err);
    return [];
  }
});
