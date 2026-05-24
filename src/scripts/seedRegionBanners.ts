// Seed Pexels landmark banners for every region that doesn't have one yet.
// Pexels free tier: 200 req/hour. We process up to 50 regions at 500ms pacing.
//
// Usage from project root:
//   npx -y -p dotenv-cli -p tsx dotenv -e .env.local -- tsx src/scripts/seedRegionBanners.ts
//
// Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PEXELS_API_KEY

import { adminSupabase } from "@/lib/supabase/admin";
import { fetchRegionBanner, getDefaultRegionQuery } from "@/lib/regions/fetchRegionBanner";

const PACING_MS = 500;
const MAX_PER_RUN = 50;

async function main() {
  const { data, error } = await adminSupabase
    .from("regions")
    .select("slug, name")
    .is("banner_image_url", null)
    .order("display_order", { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }

  const regions = (data ?? []) as { slug: string; name: string }[];
  console.log(`Found ${regions.length} regions without banners.\n`);
  if (regions.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let ok = 0;
  let missing = 0;
  let errored = 0;

  for (const region of regions) {
    const defaultQ = getDefaultRegionQuery(region.slug);
    process.stdout.write(`  ${region.name.padEnd(20)} ← "${defaultQ}" `);
    try {
      const result = await fetchRegionBanner(region.slug);
      if (result.status === "success") {
        ok++;
        console.log(`✓  ${result.url?.slice(0, 70) ?? ""}`);
      } else if (result.status === "not_found") {
        missing++;
        console.log("·  no Pexels result");
      } else {
        errored++;
        console.log(`✗  ${result.message ?? "error"}`);
      }
    } catch (err) {
      errored++;
      console.log(`✗  ${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise(r => setTimeout(r, PACING_MS));
  }

  console.log(`\nDone. success=${ok}  no_result=${missing}  error=${errored}  total=${regions.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
