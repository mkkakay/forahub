// Backfill banner_image_url on events that don't have one yet.
//
// Pexels free tier: 200 requests/hour. We process up to 100 events per run
// with 500ms pacing (~50 seconds total + Pexels latency).
//
// Usage from project root:
//   npx -y -p dotenv-cli -p tsx dotenv -e .env.local -- tsx src/scripts/seedEventBanners.ts
//
// Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PEXELS_API_KEY

import { adminSupabase } from "@/lib/supabase/admin";
import { fetchEventBanner } from "@/lib/events/fetchEventBanner";

const MAX_PER_RUN = 100;
const PACING_MS = 500;

async function main() {
  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, sdg_goals")
    .is("banner_image_url", null)
    .order("start_date", { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }

  const events = (data ?? []) as { id: string; title: string; sdg_goals: number[] | null }[];

  console.log(`Found ${events.length} events without banners. Capped at ${MAX_PER_RUN} per run.\n`);

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
      const url = await fetchEventBanner(event);
      if (url) {
        ok++;
        console.log("✓");
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
