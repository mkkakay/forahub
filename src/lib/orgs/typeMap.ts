// Mapping from external taxonomies (ROR, IATI) to ForaHub's `org_type` enum.
//
// Returning `null` means "skip this row entirely" — used to filter out
// for-profit companies, archival facilities, and other categories that would
// just dilute the directory for an SDG-events product.

export type ForaHubOrgType =
  | "un_agency" | "un_fund" | "un_programme"
  | "multilateral" | "ifi" | "foundation"
  | "ngo" | "government" | "university" | "think_tank"
  | "civil_society" | "private_sector" | "media" | "other";

// ── ROR v2 ─────────────────────────────────────────────────────────────────
// Allowed `types` values per ROR schema v2:
//   education, healthcare, government, nonprofit, company,
//   facility, other, archive, funder
// ROR allows multiple per row — we pick the most specific.
const ROR_TYPE_RANK: Record<string, ForaHubOrgType> = {
  funder: "foundation",
  education: "university",
  government: "government",
  nonprofit: "ngo",
  healthcare: "ngo",
  other: "other",
};
const ROR_TYPE_SKIP = new Set(["company", "facility", "archive"]);

export function mapRorType(types: readonly string[] | undefined): ForaHubOrgType | null {
  if (!types || types.length === 0) return "other";
  const lower = types.map(t => t.toLowerCase());
  if (lower.some(t => ROR_TYPE_SKIP.has(t)) && !lower.some(t => t in ROR_TYPE_RANK)) {
    return null;
  }
  // Specific first
  for (const t of ["funder", "education", "government", "nonprofit", "healthcare", "other"]) {
    if (lower.includes(t)) return ROR_TYPE_RANK[t];
  }
  return "other";
}

// ── IATI organisation type codes ───────────────────────────────────────────
// https://iatistandard.org/en/iati-standard/203/codelists/OrganisationType/
const IATI_TYPE_MAP: Record<string, ForaHubOrgType | null> = {
  "10": "government",
  "11": "government",
  "15": "government",
  "21": "ngo",          // International NGO
  "22": "ngo",          // National NGO
  "23": "ngo",          // Regional NGO
  "24": "ngo",          // Partner-country NGO
  "30": "multilateral", // Public-Private Partnership
  "40": "multilateral",
  "60": "foundation",
  "70": null, // Private sector — skip
  "71": null,
  "72": null,
  "73": null,
  "80": "university",   // Academic, Training and Research
  "90": "other",
};
export function mapIatiType(code: string | null | undefined): ForaHubOrgType | null {
  if (!code) return "other";
  const trimmed = code.toString().trim();
  if (trimmed in IATI_TYPE_MAP) return IATI_TYPE_MAP[trimmed];
  return "other";
}
