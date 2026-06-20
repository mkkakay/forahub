// Cached loader for admin-managed audience cards rendered in /about
// "Who We Serve". Mirrors the pattern used by lib/pageBanners.ts:
// React.cache() to dedupe inside a request + a short in-memory memo so the
// public page doesn't hit the DB on every view.

import { cache } from "react";
import { adminSupabase } from "@/lib/supabase/admin";

export interface AudienceCard {
  id: string;
  label: string;
  icon: string | null;
  image_url: string | null;
  link_url: string | null;
  bg_class: string | null;
  icon_color_class: string | null;
  sort_order: number;
  is_active: boolean;
}

const MEMO_TTL_MS = 60_000;
let memo: { at: number; rows: AudienceCard[] } | null = null;

async function fetchActiveRaw(): Promise<AudienceCard[]> {
  if (memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.rows;
  const { data, error } = await adminSupabase
    .from("audience_cards")
    .select("id, label, icon, image_url, link_url, bg_class, icon_color_class, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) {
    memo = { at: Date.now(), rows: [] };
    return [];
  }
  const rows = data as AudienceCard[];
  memo = { at: Date.now(), rows };
  return rows;
}

export const getActiveAudienceCards = cache(async (): Promise<AudienceCard[]> => fetchActiveRaw());

export function invalidateAudienceCardsCache(): void {
  memo = null;
}
