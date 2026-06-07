// Pulls a single page from the ROR REST API and maps each record into the
// shared ImportedOrg shape consumed by upsertImportedOrg().
//
// ROR v2 docs: https://ror.readme.io/v2/docs/rest-api
// - Endpoint: https://api.ror.org/v2/organizations?page=N
// - Page size is fixed at 20, can't be widened.
// - Each record carries: id (https://ror.org/xxxx), names[], types[],
//   locations[], links[] (websites + wikipedia), external_ids (Wikidata/GRID).

import { mapRorType, type ForaHubOrgType } from "./typeMap";
import { extractDomain } from "./extractDomain";
import type { ImportedOrg } from "./upsertImported";

const ROR_API = "https://api.ror.org/v2/organizations";

interface RorName {
  value: string;
  types: string[];      // ['ror_display','label','alias','acronym',...]
  lang?: string | null;
}
interface RorLocation {
  geonames_details?: {
    country_name?: string | null;
    country_code?: string | null;
  };
}
interface RorLink {
  value: string;
  type: "website" | "wikipedia";
}
interface RorExternalId {
  type: string;          // 'wikidata' | 'grid' | 'isni' | 'fundref'
  all?: string[];
  preferred?: string | null;
}
interface RorRecord {
  id: string;            // https://ror.org/xxxx
  status: string;        // 'active' | 'inactive' | 'withdrawn'
  names?: RorName[];
  types?: string[];
  locations?: RorLocation[];
  links?: RorLink[];
  external_ids?: RorExternalId[];
}
interface RorApiResponse {
  number_of_results: number;
  items: RorRecord[];
  time_taken: number;
}

export interface RorPageResult {
  rows: ImportedOrg[];
  totalResults: number;
  pageSize: number;
  /** ROR records dropped because the type/status filter rejected them. */
  dropped: number;
}

function pickName(rec: RorRecord): { display: string; aliases: string[]; short: string | null } {
  const names = rec.names ?? [];
  const display =
    names.find(n => n.types.includes("ror_display"))?.value ??
    names.find(n => n.types.includes("label"))?.value ??
    names[0]?.value ??
    "";
  const acronyms = names.filter(n => n.types.includes("acronym")).map(n => n.value);
  const aliases = names
    .filter(n => n.value !== display && !n.types.includes("acronym"))
    .map(n => n.value);
  return {
    display,
    aliases: aliases.slice(0, 10),
    short: acronyms[0] ?? null,
  };
}

function pickDomainAndUrl(rec: RorRecord): { domain: string | null; url: string | null } {
  const links = rec.links ?? [];
  const website = links.find(l => l.type === "website")?.value ?? null;
  if (!website) return { domain: null, url: null };
  const { domain } = extractDomain(website);
  return { domain, url: website };
}

function pickExternalIds(rec: RorRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ext of rec.external_ids ?? []) {
    const preferred = ext.preferred ?? ext.all?.[0];
    if (preferred) out[ext.type.toLowerCase()] = preferred;
  }
  return out;
}

function pickCountry(rec: RorRecord): string | null {
  return rec.locations?.[0]?.geonames_details?.country_name ?? null;
}

function rorIdFromUrl(url: string): string | null {
  // 'https://ror.org/02e2c7k09' → '02e2c7k09'
  const m = url.match(/ror\.org\/([a-z0-9]+)/i);
  return m ? m[1] : null;
}

export interface FetchRorOptions {
  /** Lucene-style filter pushed through ROR's query.advanced parameter.
   *  Example for the cron: `admin.last_modified.date:[2026-05-24 TO *]` */
  advancedQuery?: string;
}

export async function fetchRorPage(
  page: number,
  opts: FetchRorOptions = {},
): Promise<RorPageResult> {
  const params = new URLSearchParams({ page: page.toString() });
  if (opts.advancedQuery) params.set("query.advanced", opts.advancedQuery);
  const res = await fetch(`${ROR_API}?${params.toString()}`, {
    headers: { Accept: "application/json", "User-Agent": "forahub-org-importer (hello@forahub.org)" },
  });
  if (!res.ok) {
    throw new Error(`ROR API HTTP ${res.status} on page ${page}`);
  }
  const body = (await res.json()) as RorApiResponse;
  const rows: ImportedOrg[] = [];
  let dropped = 0;
  for (const rec of body.items ?? []) {
    if (rec.status !== "active") { dropped += 1; continue; }
    const mappedType: ForaHubOrgType | null = mapRorType(rec.types);
    if (!mappedType) { dropped += 1; continue; }
    const { display, aliases, short } = pickName(rec);
    if (!display) { dropped += 1; continue; }
    const rorId = rorIdFromUrl(rec.id);
    if (!rorId) { dropped += 1; continue; }
    const { domain, url } = pickDomainAndUrl(rec);
    rows.push({
      source: "ror",
      externalId: rorId,
      externalIds: pickExternalIds(rec),
      name: display,
      aliases,
      shortName: short,
      orgType: mappedType,
      region: null,
      country: pickCountry(rec),
      domain,
      websiteUrl: url,
    });
  }
  return {
    rows,
    totalResults: body.number_of_results ?? 0,
    pageSize: 20,
    dropped,
  };
}
