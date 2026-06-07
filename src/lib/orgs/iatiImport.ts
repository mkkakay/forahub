// Pulls IATI reporting organisations from the IATI Bulk Data Service. This
// replaces the previous IATI Datastore (Azure APIM Solr) integration, which
// returned an unrecoverable 403 from the Solr backend ("Unauthorized
// request") regardless of subscription state. The bulk service is a single
// JSON file with no API key, no Azure APIM, no subscription, and CC-BY
// licensing. Endpoint:
//
//   https://bulk-data.iatistandard.org/reporting-orgs
//
// Note the URL has no `.json` extension and the Content-Type is text/html,
// but the body is actual JSON — the response shape is documented below.
//
// Volume is small (~2,000 reporting orgs) so we cache the parsed array
// in-process for 5 minutes. That covers the admin's auto-loop POSTs which
// drain the catalog in ~10 batches over a few seconds.

import { mapIatiType, type ForaHubOrgType } from "./typeMap";
import { extractDomain } from "./extractDomain";
import type { ImportedOrg } from "./upsertImported";

const IATI_BULK_URL = "https://bulk-data.iatistandard.org/reporting-orgs";

interface BulkRecord {
  iati_identifier: string;
  organisation_identifier?: string;
  id?: string;
  human_readable_name: string;
  short_name?: string;
  organisation_type?: string;
  hq_country?: string;
  website?: string;
  description?: string;
  default_licence_id?: string;
  first_publication_date?: string;
  created_date?: string;
  reporting_source_type?: string;
}
interface BulkResponse {
  index_created?: string;
  index_created_unix_timestamp?: number;
  reporting_orgs?: BulkRecord[];
}

export interface IatiBulkResult {
  /** Rows that pass the typeMap (private-sector codes 70–73 are dropped). */
  orgs: ImportedOrg[];
  /** Total records read from the bulk index BEFORE any typeMap filtering. */
  raw_count: number;
  /** Records dropped at parse time (filtered type, missing required fields). */
  dropped: number;
  /** Records with a usable website extracted to a domain. */
  with_domain: number;
  index_created: string | null;
}

interface CacheEntry { value: IatiBulkResult; fetchedAt: number }
const CACHE_TTL_MS = 5 * 60 * 1000;
let memo: CacheEntry | null = null;

function mapBulkRecord(rec: BulkRecord): ImportedOrg | null {
  if (!rec.iati_identifier || !rec.human_readable_name) return null;
  const mappedType: ForaHubOrgType | null = mapIatiType(rec.organisation_type);
  if (!mappedType) return null; // private-sector codes etc — skip

  // Empty string in the website field counts as null per the bulk-file
  // convention. extractDomain handles trim/scheme/known-platform reject.
  const websiteRaw = (rec.website && rec.website.trim()) ? rec.website.trim() : null;
  const domain = websiteRaw ? extractDomain(websiteRaw).domain : null;

  const display = rec.human_readable_name.trim();
  const shortName = rec.short_name && rec.short_name.trim()
    && rec.short_name.trim().toLowerCase() !== display.toLowerCase()
    ? rec.short_name.trim()
    : null;

  return {
    source: "iati",
    externalId: rec.iati_identifier.trim(),
    externalIds: {},
    name: display,
    aliases: [],
    shortName,
    orgType: mappedType,
    region: null,
    country: rec.hq_country ? rec.hq_country.trim() : null,
    domain,
    websiteUrl: websiteRaw,
  };
}

export async function fetchIatiBulk(force = false): Promise<IatiBulkResult> {
  if (!force && memo && Date.now() - memo.fetchedAt < CACHE_TTL_MS) {
    return memo.value;
  }
  const res = await fetch(IATI_BULK_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "forahub-org-importer (hello@forahub.org)",
    },
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.text()).slice(0, 200); } catch {}
    throw new Error(`IATI Bulk HTTP ${res.status}${detail ? ` · ${detail}` : ""}`);
  }
  const body = (await res.json()) as BulkResponse;
  const records = body.reporting_orgs ?? [];
  const orgs: ImportedOrg[] = [];
  let dropped = 0;
  let withDomain = 0;
  for (const rec of records) {
    const mapped = mapBulkRecord(rec);
    if (!mapped) { dropped += 1; continue; }
    if (mapped.domain) withDomain += 1;
    orgs.push(mapped);
  }
  const result: IatiBulkResult = {
    orgs,
    raw_count: records.length,
    dropped,
    with_domain: withDomain,
    index_created: body.index_created ?? null,
  };
  memo = { value: result, fetchedAt: Date.now() };
  return result;
}

/**
 * Slice the cached/just-fetched org array into a single batch the admin
 * importer route can process per POST call. start/limit are row indices,
 * NOT page numbers — the bulk file has no native pagination.
 */
export async function fetchIatiSlice(start: number, limit: number): Promise<{
  orgs: ImportedOrg[];
  total: number;
  next_cursor: number;
  done: boolean;
  with_domain_in_slice: number;
}> {
  const bulk = await fetchIatiBulk();
  const slice = bulk.orgs.slice(start, start + limit);
  const next = start + slice.length;
  const withDomain = slice.reduce((n, o) => n + (o.domain ? 1 : 0), 0);
  return {
    orgs: slice,
    total: bulk.orgs.length,
    next_cursor: next,
    done: next >= bulk.orgs.length,
    with_domain_in_slice: withDomain,
  };
}
