// Seed the organization_logos cache with Brandfetch results for every entry
// in ORG_REGISTRY. Idempotent — re-runs upsert and re-fetches anything in
// 'error' or 'not_found' status.
//
// Usage from project root:
//   npx tsx src/scripts/seedOrgLogos.ts
//
// Requires environment vars:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   BRANDFETCH_API_KEY
//
// If you're loading from .env.local, prefix with `dotenv`:
//   npx dotenv-cli -e .env.local -- npx tsx src/scripts/seedOrgLogos.ts

import { ORG_LIST } from "@/lib/organizations";
import { fetchAndCacheLogo } from "@/lib/organizations/getLogoUrl";

async function main() {
  console.log(`Seeding logos for ${ORG_LIST.length} registry orgs…\n`);

  let ok = 0;
  let missing = 0;
  let errored = 0;

  for (const org of ORG_LIST) {
    process.stdout.write(`  ${org.name.padEnd(50)} `);
    try {
      const result = await fetchAndCacheLogo(org.name);
      if (result.status === "success") {
        ok++;
        console.log(`✓  ${result.logoUrl?.slice(0, 80) ?? ""}`);
      } else if (result.status === "not_found") {
        missing++;
        console.log("·  no logo found");
      } else {
        errored++;
        console.log(`✗  ${result.message ?? "error"}`);
      }
    } catch (err) {
      errored++;
      console.log(`✗  ${err instanceof Error ? err.message : String(err)}`);
    }
    // Gentle pacing — don't hammer Brandfetch.
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\nDone. success=${ok}  not_found=${missing}  error=${errored}  total=${ORG_LIST.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
