import { adminSupabase } from "@/lib/supabase/admin";

export interface Region {
  slug: string;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export async function getActiveRegions(): Promise<Region[]> {
  const { data } = await adminSupabase
    .from("regions")
    .select("slug, name, description, banner_image_url, display_order, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return (data as Region[] | null) ?? [];
}

export async function getAllRegions(): Promise<Region[]> {
  const { data } = await adminSupabase
    .from("regions")
    .select("slug, name, description, banner_image_url, display_order, is_active")
    .order("display_order", { ascending: true });
  return (data as Region[] | null) ?? [];
}
