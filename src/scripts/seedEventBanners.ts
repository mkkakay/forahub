// Backfill banner_image_url on events that don't have one yet (or whose source
// was never recorded — covers older rows seeded before banner_source existed).
//
// Pexels free tier: 200 requests/hour. We process up to 100 events per run with
// 600ms pacing (~60 seconds total + API latency). Unsplash fallback kicks in
// automatically when Pexels returns nothing and UNSPLASH_ACCESS_KEY is set.
//
// Usage from project root:
//   npx -y -p dotenv-cli -p tsx dotenv -e .env.local -- tsx src/scripts/seedEventBanners.ts
//
// Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PEXELS_API_KEY
// Optional env: UNSPLASH_ACCESS_KEY

import { adminSupabase } from "@/lib/supabase/admin";
import { fetchEventBannerDetailed } from "@/lib/events/fetchEventBanner";

const MAX_PER_RUN = 100;
const PACING_MS = 600;

async function main() {
  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, sdg_goals, banner_image_url, banner_source")
    .or("banner_image_url.is.null,banner_source.is.null")
    .order("start_date", { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }

  const events = (data ?? []) as {
    id: string;
    title: string;
    sdg_goals: number[] | null;
    banner_image_url: string | null;
    banner_source: string | null;
  }[];

  console.log(`Found ${events.length} events needing a banner. Capped at ${MAX_PER_RUN} per run.\n`);

  if (events.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let ok = 0;
  let missing = 0;
  let errored = 0;

  for (const event of events) {
    const titleSnippet = event.title.slice(0, 60).padEnd(60);
    process.stdout.write(`  ${titleSnippet} `);
    try {
      const result = await fetchEventBannerDetailed({
        id: event.id,
        title: event.title,
        sdg_goals: event.sdg_goals,
      });
      if (result.url) {
        ok++;
        const tag = result.source ? ` (${result.source})` : "";
        console.log(`✓${tag}`);
      } else {
        missing++;
        console.log("·  no result");
      }
    } catch (err) {
      errored++;
      console.log(`✗  ${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise(r => setTimeout(r, PACING_MS));
  }

  console.log(`\nDone. success=${ok}  no_result=${missing}  error=${errored}  total=${events.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
