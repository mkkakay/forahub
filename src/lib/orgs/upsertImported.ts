// Idempotent upsert for imported orgs. Handles three classes of dedup
// (in priority order) before falling through to an insert:
//
//   1. Same source already imported this row → UPDATE.
//   2. A different source (e.g. ROR row vs IATI row) describes the same
//      org → MERGE (preserve the existing tier, append the external id,
//      union the aliases). Match key: shared domain (most reliable) or a
//      shared Wikidata Q-ID where both rows have one.
//   3. Nothing found → INSERT a new row.
//
// Trust rule: tier=1 manual rows are never downgraded by merges. A merge
// can ADD external_ids onto a tier-1 row but won't reset its source.

import { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/organizations";
import type { ForaHubOrgType } from "./typeMap";

export interface ImportedOrg {
  /** Provenance source — drives source + domain_verified_via fields. */
  source: "ror" | "iati";
  /** External id used for primary dedup. */
  externalId: string;
  /** Optional extra ids written into external_ids JSON. */
  externalIds: Record<string, string>;
  name: string;
  aliases: string[];
  shortName: string | null;
  orgType: ForaHubOrgType;
  region: string | null;
  /** Normalized registered domain (e.g. "harvard.edu") or null. */
  domain: string | null;
  /** Full website url for record-keeping. */
  websiteUrl: string | null;
  /** Free-text country or "Global". */
  country: string | null;
}

export interface UpsertOutcome {
  outcome: "inserted" | "updated" | "merged" | "skipped";
  /** Why we skipped, if applicable. */
  reason?: string;
}

interface ExistingRow {
  id: string;
  slug: string;
  name: string;
  aliases: string[] | null;
  tier: number | null;
  source: string | null;
  domain: string | null;
  external_ids: Record<string, string> | null;
}

const SLUG_MAX_ATTEMPTS = 6;

/**
 * Ensure a slug is unique by appending a numeric suffix on collision.
 */
async function uniqueSlug(
  client: SupabaseClient,
  base: string,
): Promise<string> {
  let candidate = base;
  for (let i = 0; i < SLUG_MAX_ATTEMPTS; i++) {
    const { data } = await client
      .from("organizations_directory")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  // Fall back to a timestamp suffix if the namespace is wildly contested.
  return `${base}-${Date.now().toString(36)}`;
}

function mergeAliases(existing: string[] | null, incoming: string[]): string[] {
  const set = new Set<string>();
  for (const a of existing ?? []) if (a && a.trim()) set.add(a.trim());
  for (const a of incoming) if (a && a.trim()) set.add(a.trim());
  return Array.from(set);
}

export async function upsertImportedOrg(
  client: SupabaseClient,
  org: ImportedOrg,
): Promise<UpsertOutcome> {
  if (!org.name || org.name.trim().length < 2) {
    return { outcome: "skipped", reason: "empty_name" };
  }
  const verifiedVia = org.source;
  const confidence = org.domain ? 1.0 : 0;
  const externalIdsJson: Record<string, string> = {
    [org.source]: org.externalId,
    ...org.externalIds,
  };

  // ── 1. Same-source dedup (the cheapest and tightest match). ─────────────
  const sourceIdKey = org.source;
  const { data: bySource } = await client
    .from("organizations_directory")
    .select("id, slug, name, aliases, tier, source, domain, external_ids")
    .eq("external_ids->>" + sourceIdKey, org.externalId)
    .limit(1)
    .maybeSingle();

  if (bySource) {
    const existing = bySource as ExistingRow;
    const mergedAliases = mergeAliases(existing.aliases, org.aliases);
    const mergedExt = { ...(existing.external_ids ?? {}), ...externalIdsJson };
    const patch: Record<string, unknown> = {
      aliases: mergedAliases.length > 0 ? mergedAliases : null,
      external_ids: mergedExt,
      last_seen_at: new Date().toISOString(),
    };
    // Don't trample a manual tier-1 row's curated values.
    if (existing.source !== "manual") {
      patch.name = org.name;
      patch.short_name = org.shortName;
      patch.org_type = org.orgType;
      patch.region = org.region;
      patch.website_url = org.websiteUrl;
      if (org.domain) {
        patch.domain = org.domain;
        patch.domain_verified_via = verifiedVia;
        patch.domain_confidence = confidence;
      }
    }
    await client.from("organizations_directory").update(patch).eq("id", existing.id);
    return { outcome: "updated" };
  }

  // ── 2. Cross-source merge by domain or Wikidata ────────────────────────
  let crossMatch: ExistingRow | null = null;
  if (org.domain) {
    const { data } = await client
      .from("organizations_directory")
      .select("id, slug, name, aliases, tier, source, domain, external_ids")
      .eq("domain", org.domain)
      .limit(1)
      .maybeSingle();
    if (data) crossMatch = data as ExistingRow;
  }
  if (!crossMatch && externalIdsJson.wikidata) {
    const { data } = await client
      .from("organizations_directory")
      .select("id, slug, name, aliases, tier, source, domain, external_ids")
      .eq("external_ids->>wikidata", externalIdsJson.wikidata)
      .limit(1)
      .maybeSingle();
    if (data) crossMatch = data as ExistingRow;
  }
  if (crossMatch) {
    const mergedAliases = mergeAliases(
      crossMatch.aliases,
      [org.name, ...org.aliases].filter(n => n.toLowerCase() !== crossMatch!.name.toLowerCase()),
    );
    const mergedExt = { ...(crossMatch.external_ids ?? {}), ...externalIdsJson };
    const patch: Record<string, unknown> = {
      aliases: mergedAliases.length > 0 ? mergedAliases : null,
      external_ids: mergedExt,
      last_seen_at: new Date().toISOString(),
    };
    // Keep manual / earlier-source rows authoritative; just add ids + aliases.
    await client.from("organizations_directory").update(patch).eq("id", crossMatch.id);
    return { outcome: "merged" };
  }

  // ── 3. Insert a fresh row ─────────────────────────────────────────────
  const slug = await uniqueSlug(client, slugify(org.name));
  const insertPayload: Record<string, unknown> = {
    slug,
    name: org.name,
    short_name: org.shortName,
    aliases: org.aliases.length > 0 ? org.aliases : null,
    org_type: org.orgType,
    region: org.region,
    domain: org.domain,
    domain_verified_via: verifiedVia,
    domain_confidence: confidence,
    website_url: org.websiteUrl,
    tier: 2,
    is_verified: false,
    source: org.source,
    status: "active",
    external_ids: externalIdsJson,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };
  const { error } = await client.from("organizations_directory").insert(insertPayload);
  if (error) {
    // Slug race or constraint hit — rare; treat as skip so the batch continues.
    return { outcome: "skipped", reason: error.message };
  }
  return { outcome: "inserted" };
}
