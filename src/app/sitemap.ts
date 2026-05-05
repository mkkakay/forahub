import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forahub.org";

  const staticPages = [
    { url: baseUrl, priority: 1.0, changeFrequency: "daily" as const },
    { url: `${baseUrl}/events`, priority: 0.9, changeFrequency: "daily" as const },
    { url: `${baseUrl}/funding`, priority: 0.8, changeFrequency: "daily" as const },
    { url: `${baseUrl}/assistant`, priority: 0.7, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/pricing`, priority: 0.8, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/about`, priority: 0.6, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/contact`, priority: 0.5, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/terms`, priority: 0.3, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/privacy`, priority: 0.3, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/help`, priority: 0.5, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/data-sources`, priority: 0.4, changeFrequency: "monthly" as const },
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const today = new Date().toISOString();
    const { data } = await supabase
      .from("events")
      .select("id, updated_at")
      .gte("start_date", today)
      .eq("status", "published")
      .limit(5000);

    const eventPages = (data ?? []).map((e: { id: string; updated_at?: string }) => ({
      url: `${baseUrl}/events/${e.id}`,
      lastModified: e.updated_at ? new Date(e.updated_at) : new Date(),
      priority: 0.7,
      changeFrequency: "weekly" as const,
    }));

    return [...staticPages.map(p => ({ ...p, lastModified: new Date() })), ...eventPages];
  } catch {
    return staticPages.map(p => ({ ...p, lastModified: new Date() }));
  }
}
