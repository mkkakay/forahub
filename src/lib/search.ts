export const SDG_LABELS: Record<number, string> = {
  1:  "No Poverty",
  2:  "Zero Hunger",
  3:  "Good Health and Well-Being",
  4:  "Quality Education",
  5:  "Gender Equality",
  6:  "Clean Water and Sanitation",
  7:  "Affordable and Clean Energy",
  8:  "Decent Work and Economic Growth",
  9:  "Industry Innovation and Infrastructure",
  10: "Reduced Inequalities",
  11: "Sustainable Cities and Communities",
  12: "Responsible Consumption and Production",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace Justice and Strong Institutions",
  17: "Partnerships for the Goals",
};

interface SearchableEvent {
  title: string;
  description: string | null;
  organization: string | null;
  location: string | null;
  sdg_goals: number[] | null;
}

function titleAcronym(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .toLowerCase();
}

function buildSearchText(event: SearchableEvent): string {
  const goals = event.sdg_goals ?? [];
  const sdgText = goals
    .flatMap(n => [`sdg ${n}`, SDG_LABELS[n] ?? ""])
    .join(" ");
  return [
    event.title,
    event.description ?? "",
    event.organization ?? "",
    event.location ?? "",
    sdgText,
  ]
    .join(" ")
    .toLowerCase();
}

function parseSdgNumber(q: string): number | null {
  // Matches "3", "sdg3", "sdg 3", "goal 3", etc.
  const m = q.match(/^(?:sdg\s*|goal\s*)?(\d{1,2})$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    return n >= 1 && n <= 17 ? n : null;
  }
  return null;
}

export function matchesSearch(event: SearchableEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return true;

  // Pure SDG-number query: "3", "sdg 3", "goal 3"
  const sdgNum = parseSdgNumber(q);
  if (sdgNum !== null) {
    return (event.sdg_goals ?? []).includes(sdgNum);
  }

  const text = buildSearchText(event);
  const acronym = titleAcronym(event.title);
  const words = q.split(/\s+/).filter(Boolean);

  // All words must match (AND logic); each word tries substring then acronym
  return words.every(
    w => text.includes(w) || acronym === w || acronym.startsWith(w)
  );
}

// For autocomplete: match titles by partial/acronym, return up to 5
export function suggestTitles(titles: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];

  const words = q.split(/\s+/).filter(Boolean);

  return titles
    .filter(title => {
      const t = title.toLowerCase();
      const a = titleAcronym(title);
      return words.every(w => t.includes(w)) || a === q || a.startsWith(q);
    })
    .slice(0, 5);
}
