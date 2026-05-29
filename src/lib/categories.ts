// Central registry for the humanitarian/development taxonomy.
//
// Every component, API, classifier, and admin view reads from this list — no
// hardcoded category arrays elsewhere. To add a category: add an entry here
// and the rest of the system picks it up.

import {
  AlertTriangle,
  Sprout,
  Link as LinkIcon,
  Landmark,
  Microscope,
  type LucideIcon,
} from "lucide-react";

export type CategoryKey =
  | "humanitarian"
  | "development"
  | "nexus"
  | "policy_governance"
  | "research_academic";

export type CategorySource =
  | "ai"
  | "keyword"
  | "admin"
  | "submitter"
  | "sdg_inferred";

export interface EventCategory {
  key: CategoryKey;
  label: string;
  /** Lucide icon component — UI imports from this single registry, never raw. */
  icon: LucideIcon;
  /** Brand-level color used for badges, dropdown accents, and filter pills. */
  color: string;
  description: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  {
    key: "humanitarian",
    label: "Humanitarian",
    icon: AlertTriangle,
    color: "#dc2626",
    description:
      "Emergency response, crisis, disaster, refugees, conflict, acute health emergencies, food crisis, IDPs",
  },
  {
    key: "development",
    label: "Development",
    icon: Sprout,
    color: "#059669",
    description:
      "Long-term capacity building, systems strengthening, poverty reduction, infrastructure, education, sustainable financing",
  },
  {
    key: "nexus",
    label: "Nexus",
    icon: LinkIcon,
    color: "#d97706",
    description:
      "Humanitarian-development overlap: protracted crises, resilience, climate adaptation, food security, refugee livelihoods, durable solutions",
  },
  {
    key: "policy_governance",
    label: "Policy & Governance",
    icon: Landmark,
    color: "#2563eb",
    description:
      "Multilateral coordination, treaty negotiations, global governance, normative work, intergovernmental processes",
  },
  {
    key: "research_academic",
    label: "Research & Academic",
    icon: Microscope,
    color: "#7c3aed",
    description:
      "Research events, academic conferences, scientific gatherings, evidence generation",
  },
];

export const CATEGORY_KEYS: CategoryKey[] = EVENT_CATEGORIES.map(c => c.key);

const CATEGORY_BY_KEY: Record<CategoryKey, EventCategory> = EVENT_CATEGORIES.reduce(
  (acc, c) => {
    acc[c.key] = c;
    return acc;
  },
  {} as Record<CategoryKey, EventCategory>,
);

export function getCategory(key: string | null | undefined): EventCategory | null {
  if (!key) return null;
  return CATEGORY_BY_KEY[key as CategoryKey] ?? null;
}

export function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === "string" && value in CATEGORY_BY_KEY;
}

/** Parse a comma-separated category list from a query string. */
export function parseCategoryList(value: string | null): CategoryKey[] | null {
  if (!value) return null;
  const keys = value
    .split(",")
    .map(s => s.trim())
    .filter(isCategoryKey);
  return keys.length > 0 ? keys : null;
}
