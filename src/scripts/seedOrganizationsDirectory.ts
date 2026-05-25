// Seed the organizations_directory table with the curated Tier 1 list, then
// optionally fetch a Brandfetch logo for any entry without one (250ms pacing).
//
// Usage from project root:
//   npx -y -p dotenv-cli -p tsx dotenv -e .env.local -- tsx src/scripts/seedOrganizationsDirectory.ts
//
// Flags:
//   --no-logos     skip the Brandfetch fetch step (just upsert rows)
//   --logos-only   skip the upsert, only fetch logos for existing rows
//
// Idempotent: ON CONFLICT (slug) DO UPDATE.

import { adminSupabase } from "@/lib/supabase/admin";
import { TIER1_SEED, type Tier1Org } from "@/lib/organizations/tier1Seed";
import { fetchFromBrandfetch } from "@/lib/organizations/fetchFromBrandfetch";

const LOGO_PACING_MS = 250;

interface DirectoryRow {
  slug: string;
  name: string;
  short_name: string | null;
  org_type: string;
  region: string | null;
  domain: string | null;
  logo_url: string | null;
}

function rowFromSeed(o: Tier1Org): Record<string, unknown> {
  return {
    slug: o.slug,
    name: o.name,
    short_name: o.short_name,
    aliases: o.aliases ?? [],
    org_type: o.org_type,
    region: o.region,
    domain: o.domain,
    tier: 1,
    source: "manual",
    status: "active",
    updated_at: new Date().toISOString(),
  };
}

async function upsertAll(): Promise<{ inserted: number; updated: number; failed: number }> {
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  // Chunk for safety — Supabase ignores larger payloads sometimes.
  const CHUNK = 100;
  for (let i = 0; i < TIER1_SEED.length; i += CHUNK) {
    const batch = TIER1_SEED.slice(i, i + CHUNK).map(rowFromSeed);
    // Determine which slugs already exist so we can report inserts vs updates.
    const slugs = batch.map(r => r.slug as string);
    const { data: existing } = await adminSupabase
      .from("organizations_directory")
      .select("slug")
      .in("slug", slugs);
    const existingSlugs = new Set(((existing ?? []) as { slug: string }[]).map(r => r.slug));

    const { error } = await adminSupabase
      .from("organizations_directory")
      .upsert(batch, { onConflict: "slug" });
    if (error) {
      console.error(`  ✗ batch failed: ${error.message}`);
      failed += batch.length;
      continue;
    }
    for (const r of batch) {
      if (existingSlugs.has(r.slug as string)) updated++;
      else inserted++;
    }
  }
  return { inserted, updated, failed };
}

async function fetchLogosForMissing(): Promise<{ ok: number; missing: number; errored: number }> {
  const { data } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name, short_name, org_type, region, domain, logo_url")
    .eq("tier", 1)
    .is("logo_url", null);

  const rows = (data as DirectoryRow[] | null) ?? [];
  console.log(`\nFetching Brandfetch logos for ${rows.length} orgs without one…\n`);

  if (rows.length === 0) return { ok: 0, missing: 0, errored: 0 };

  let ok = 0;
  let missing = 0;
  let errored = 0;

  for (const row of rows) {
    process.stdout.write(`  ${row.short_name?.padEnd(20) ?? row.name.padEnd(20)} ${row.domain?.padEnd(35) ?? "(no domain)".padEnd(35)} `);
    if (!row.domain) {
      missing++;
      console.log("·  no domain");
      continue;
    }
    try {
      const result = await fetchFromBrandfetch(row.domain);
      if (result.status === "success") {
        const { error } = await adminSupabase
          .from("organizations_directory")
          .update({ logo_url: result.logoUrl, updated_at: new Date().toISOString() })
          .eq("slug", row.slug);
        if (error) {
          errored++;
          console.log(`✗  DB update: ${error.message}`);
        } else {
          ok++;
          console.log(`✓`);
        }
      } else if (result.status === "not_found") {
        missing++;
        console.log("·  not in Brandfetch");
      } else {
        errored++;
        console.log(`✗  ${result.message ?? "error"}`);
      }
    } catch (err) {
      errored++;
      console.log(`✗  ${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise(r => setTimeout(r, LOGO_PACING_MS));
  }

  return { ok, missing, errored };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const skipLogos = args.has("--no-logos");
  const logosOnly = args.has("--logos-only");

  if (!logosOnly) {
    console.log(`Upserting ${TIER1_SEED.length} Tier 1 orgs into organizations_directory…\n`);
    const r = await upsertAll();
    console.log(`\nUpsert done. inserted=${r.inserted}  updated=${r.updated}  failed=${r.failed}`);
  }

  if (!skipLogos) {
    const r = await fetchLogosForMissing();
    console.log(`\nLogos done. ok=${r.ok}  missing=${r.missing}  errored=${r.errored}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
