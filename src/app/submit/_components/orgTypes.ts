// Shared display helpers for org_type badges. Used by both OrgCombobox and OrgChipInput.

export const ORG_TYPE_LABEL: Record<string, string> = {
  un_agency: "UN Agency",
  un_fund: "UN Fund",
  un_programme: "UN Programme",
  multilateral: "Multilateral",
  ifi: "Development Bank",
  foundation: "Foundation",
  ngo: "NGO",
  government: "Government",
  university: "University",
  think_tank: "Think Tank",
  civil_society: "Civil Society",
  private_sector: "Private Sector",
  media: "Media",
  other: "Organization",
};

export const ORG_TYPE_COLOR: Record<string, string> = {
  un_agency: "bg-blue-100 text-blue-800",
  un_fund: "bg-blue-100 text-blue-800",
  un_programme: "bg-blue-100 text-blue-800",
  multilateral: "bg-indigo-100 text-indigo-800",
  ifi: "bg-emerald-100 text-emerald-800",
  foundation: "bg-amber-100 text-amber-800",
  ngo: "bg-rose-100 text-rose-800",
  government: "bg-slate-100 text-slate-800",
  university: "bg-purple-100 text-purple-800",
  think_tank: "bg-cyan-100 text-cyan-800",
  civil_society: "bg-rose-100 text-rose-800",
  private_sector: "bg-gray-100 text-gray-800",
  media: "bg-gray-100 text-gray-800",
  other: "bg-gray-100 text-gray-600",
};

export function orgTypeBadge(type: string | null | undefined): { label: string; className: string } {
  const key = type ?? "other";
  return {
    label: ORG_TYPE_LABEL[key] ?? "Organization",
    className: ORG_TYPE_COLOR[key] ?? ORG_TYPE_COLOR.other,
  };
}

export interface OrgSuggestion {
  slug: string;
  name: string;
  short: string;
  org_type: string;
  region: string | null;
  tier: number;
  logo_url: string | null;
}
