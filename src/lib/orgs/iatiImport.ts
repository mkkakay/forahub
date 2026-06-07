// Pulls IATI organisations via the IATI Datastore v3 (Azure APIM, Solr
// backend). The canonical Solr handler is `/select` — earlier versions of
// this file targeted `/search`, which APIM rejects with HTTP 403 because
// the path doesn't match a registered operation on the subscription.
//
// Endpoint: https://api.iatistandard.org/datastore/organisation/select
// Auth: Ocp-Apim-Subscription-Key header sourced from IATI_API_KEY env var.
// Subscribed product must include the `organisation` collection.

import { mapIatiType, type ForaHubOrgType } from "./typeMap";
import { extractDomain } from "./extractDomain";
import type { ImportedOrg } from "./upsertImported";

const IATI_API = "https://api.iatistandard.org/datastore/organisation/select";
const PAGE_SIZE = 100;

interface IatiDoc {
  iati_identifier?: string;
  reporting_org_ref?: string;
  reporting_org_type_code?: string;
  reporting_org_narrative?: string[];
  name_narrative?: string[];
  default_lang?: string;
  organisation_website?: string;
}

interface IatiSearchResponse {
  response?: {
    numFound: number;
    start: number;
    docs: IatiDoc[];
  };
}

export interface IatiPageResult {
  rows: ImportedOrg[];
  totalResults: number;
  pageSize: number;
  dropped: number;
}

function firstNonEmpty(arr: string[] | undefined): string | null {
  if (!arr) return null;
  for (const v of arr) {
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export async function fetchIatiPage(start: number): Promise<IatiPageResult> {
  const params = new URLSearchParams({
    q: "*:*",
    rows: PAGE_SIZE.toString(),
    start: start.toString(),
    wt: "json",
  });
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "forahub-org-importer (hello@forahub.org)",
  };
  const apiKey = process.env.IATI_API_KEY;
  if (apiKey) headers["Ocp-Apim-Subscription-Key"] = apiKey;
  const res = await fetch(`${IATI_API}?${params.toString()}`, { headers });
  if (!res.ok) {
    // Surface up to ~200 chars of the response body so a 403/404 from APIM
    // includes the rejection reason (wrong product, missing path, etc.)
    // instead of just the status code.
    let detail = "";
    try { detail = (await res.text()).slice(0, 200); } catch {}
    const headerHint = apiKey
      ? `key sent via Ocp-Apim-Subscription-Key (length=${apiKey.length})`
      : `no Ocp-Apim-Subscription-Key header sent (env var missing)`;
    throw new Error(
      `IATI Datastore HTTP ${res.status} at start=${start} — ${headerHint}` +
        (detail ? ` · response: ${detail}` : ""),
    );
  }
  const body = (await res.json()) as IatiSearchResponse;
  const docs = body.response?.docs ?? [];
  const totalResults = body.response?.numFound ?? 0;
  const rows: ImportedOrg[] = [];
  let dropped = 0;
  for (const doc of docs) {
    const externalId = doc.iati_identifier ?? doc.reporting_org_ref ?? null;
    if (!externalId) { dropped += 1; continue; }
    const mappedType: ForaHubOrgType | null = mapIatiType(doc.reporting_org_type_code);
    if (!mappedType) { dropped += 1; continue; }
    const display = firstNonEmpty(doc.name_narrative) ?? firstNonEmpty(doc.reporting_org_narrative);
    if (!display) { dropped += 1; continue; }
    const website = doc.organisation_website ?? null;
    const { domain } = extractDomain(website);
    rows.push({
      source: "iati",
      externalId,
      externalIds: {},
      name: display,
      aliases: [],
      shortName: null,
      orgType: mappedType,
      region: null,
      country: null,
      domain,
      websiteUrl: website,
    });
  }
  return { rows, totalResults, pageSize: PAGE_SIZE, dropped };
}
