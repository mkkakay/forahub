// Hybrid event categorizer.
//
//   Stage A — keyword rules (deterministic, free, runs first)
//   Stage B — SDG inference (when SDG is set but no keyword hit)
//   Stage C — AI fallback (Anthropic Haiku, only for ambiguous events)
//
// Order matters. The cheap stages cover the easy cases so we burn AI tokens
// only on events the other stages can't handle.

import Anthropic from "@anthropic-ai/sdk";
import type { CategoryKey, CategorySource } from "@/lib/categories";

const MODEL = "claude-haiku-4-5-20251001";

// Approximate pricing for Haiku 4.5 — used for cost reporting only.
// Input ~$0.80 / 1M tokens, output ~$4 / 1M tokens. Our prompts run small
// (≈500 in, ≈80 out) so per-event cost lands near $0.0008.
const PRICE_INPUT_PER_TOKEN = 0.8 / 1_000_000;
const PRICE_OUTPUT_PER_TOKEN = 4.0 / 1_000_000;

export interface ClassifyInput {
  title: string;
  organization: string | null;
  description: string | null;
  sdg_goals: number[] | null;
}

export interface ClassifyResult {
  category: CategoryKey;
  secondary: CategoryKey[];
  confidence: number;
  source: CategorySource;
  reasoning?: string;
  cost_usd?: number;
}

// ── Stage A: keyword rules ────────────────────────────────────────────────
// Each keyword is lowercased and matched case-insensitively against
// (title + " " + organization + " " + description). Use longer phrases when
// possible — single tokens like "refugee" or "policy" are too noisy on their own.
const KEYWORD_RULES: Record<CategoryKey, string[]> = {
  humanitarian: [
    "humanitarian response",
    "humanitarian assistance",
    "humanitarian action",
    "humanitarian crisis",
    "ocha",
    "emergency response",
    "disaster relief",
    "disaster response",
    "idp",
    "internally displaced",
    "refugee crisis",
    "refugee emergency",
    "famine",
    "cholera outbreak",
    "ebola",
    "mpox outbreak",
    "outbreak response",
    "cerf",
    "cluster system",
    "humanitarian appeal",
    "humanitarian coordinator",
    "humanitarian needs",
    "acute malnutrition",
    "wash cluster",
    "protection cluster",
  ],
  development: [
    "capacity building",
    "systems strengthening",
    "health systems strengthening",
    "long-term development",
    "undp",
    "sustainable development",
    "infrastructure investment",
    "governance reform",
    "poverty reduction",
    "human capital",
    "private sector development",
    "vocational training",
    "social protection systems",
    "universal health coverage",
    "uhc",
    "domestic resource mobilization",
  ],
  nexus: [
    "humanitarian-development nexus",
    "humanitarian development nexus",
    "triple nexus",
    "humanitarian-peace nexus",
    "resilience building",
    "community resilience",
    "protracted crisis",
    "protracted displacement",
    "durable solutions",
    "climate adaptation",
    "food security",
    "food systems",
    "refugee livelihoods",
    "refugee inclusion",
    "anticipatory action",
    "anticipatory financing",
  ],
  policy_governance: [
    "general assembly",
    "security council",
    "ecosoc",
    "treaty negotiation",
    "intergovernmental",
    "high-level political forum",
    "hlpf",
    "executive board",
    "world health assembly",
    "wha",
    "g20 summit",
    "g7 summit",
    "g77",
    "ministerial meeting",
    "ministerial conference",
    "normative",
    "rules-based order",
    "compact for migration",
    "global compact",
    "cop29",
    "cop30",
    "cop31",
    "unfccc cop",
  ],
  research_academic: [
    "lancet",
    "symposium",
    "scientific conference",
    "research consortium",
    "academy of",
    "evidence review",
    "systematic review",
    "phd colloquium",
    "doctoral",
    "research methods",
    "annual scientific meeting",
    "research priorities",
    "research agenda",
    "peer review",
    "implementation science",
    "operational research",
  ],
};

function keywordMatch(input: ClassifyInput): ClassifyResult | null {
  const haystack = [
    input.title ?? "",
    input.organization ?? "",
    input.description ?? "",
  ]
    .join(" ")
    .toLowerCase();
  if (!haystack.trim()) return null;

  // Score every category by counting matched phrases. The top scorer is the
  // primary; runners-up with at least one hit become secondaries.
  const scores: Partial<Record<CategoryKey, number>> = {};
  for (const [key, phrases] of Object.entries(KEYWORD_RULES) as [CategoryKey, string[]][]) {
    let s = 0;
    for (const p of phrases) {
      if (haystack.includes(p)) s += 1;
    }
    if (s > 0) scores[key] = s;
  }
  const ranked = (Object.entries(scores) as [CategoryKey, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  if (ranked.length === 0) return null;
  const [primary] = ranked[0];
  const secondary = ranked.slice(1, 3).map(([k]) => k);
  return {
    category: primary,
    secondary,
    confidence: 0.85,
    source: "keyword",
  };
}

// ── Stage B: SDG inference ────────────────────────────────────────────────
// Used when no keyword matched but the event has at least one SDG goal.
// Confidence is moderate (0.65) — AI can override it later if a fuller signal
// is available, but for the bulk of events with strong SDG metadata this is
// a free, deterministic, sensible default.
const SDG_TO_CATEGORY: Record<number, CategoryKey | null> = {
  1: "development",
  2: "development",
  3: null, // ambiguous — could be humanitarian (outbreak) or development (UHC)
  4: "development",
  5: "development",
  6: "development",
  7: "development",
  8: "development",
  9: "development",
  10: "development",
  11: "development",
  12: "nexus",
  13: "nexus",
  14: "nexus",
  15: "nexus",
  16: "policy_governance",
  17: "policy_governance",
};

function sdgInference(input: ClassifyInput): ClassifyResult | null {
  if (!input.sdg_goals || input.sdg_goals.length === 0) return null;
  // First SDG is the primary one set during scraping / submission.
  for (const sdg of input.sdg_goals) {
    const cat = SDG_TO_CATEGORY[sdg];
    if (cat) {
      return {
        category: cat,
        secondary: [],
        confidence: 0.65,
        source: "sdg_inferred",
      };
    }
  }
  return null;
}

// ── Stage C: AI classification ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are classifying events for ForaHub, serving development/humanitarian professionals.

DECISION RULES (apply in order):
1. If event is about immediate emergency response, active crisis, refugees in acute need, disaster relief → humanitarian
2. If event is about long-term programs, systems strengthening, capacity building, sustainable infrastructure → development
3. If event explicitly addresses both humanitarian and development concerns (resilience, protracted crisis, climate-displacement, refugee livelihoods) → nexus
4. If event is intergovernmental coordination, treaty negotiation, governance reform → policy_governance
5. If event is research, scientific gathering, academic, evidence generation → research_academic

IMPORTANT: If multiple categories apply, pick the PRIMARY one based on the event's main purpose. Also return up to 2 SECONDARY categories.

Return strict JSON only: {"category": "primary", "secondary": ["...", "..."], "confidence": 0.0-1.0, "reasoning": "one short sentence"}

Confidence < 0.6 means genuinely ambiguous — that's fine, return your best primary + secondaries.`;

const VALID_KEYS = new Set<CategoryKey>([
  "humanitarian",
  "development",
  "nexus",
  "policy_governance",
  "research_academic",
]);

async function aiClassify(
  input: ClassifyInput,
  client: Anthropic,
): Promise<ClassifyResult | null> {
  const userContent = [
    `Title: ${input.title}`,
    input.organization ? `Organization: ${input.organization}` : null,
    input.description ? `Description: ${input.description.slice(0, 800)}` : null,
    input.sdg_goals && input.sdg_goals.length > 0
      ? `SDG goals: ${input.sdg_goals.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
  } catch {
    return null;
  }

  const block = message.content.find(b => b.type === "text");
  if (!block || block.type !== "text") return null;
  // The model sometimes wraps JSON in prose; grab the first {...} block.
  const match = block.text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  const obj = parsed as {
    category?: string;
    secondary?: string[];
    confidence?: number;
    reasoning?: string;
  };
  if (!obj.category || !VALID_KEYS.has(obj.category as CategoryKey)) return null;
  const secondary = (Array.isArray(obj.secondary) ? obj.secondary : [])
    .filter((s): s is CategoryKey => VALID_KEYS.has(s as CategoryKey))
    .filter(s => s !== obj.category)
    .slice(0, 2);
  const confidence =
    typeof obj.confidence === "number" && obj.confidence >= 0 && obj.confidence <= 1
      ? obj.confidence
      : 0.7;
  const cost =
    message.usage.input_tokens * PRICE_INPUT_PER_TOKEN +
    message.usage.output_tokens * PRICE_OUTPUT_PER_TOKEN;
  return {
    category: obj.category as CategoryKey,
    secondary,
    confidence,
    source: "ai",
    reasoning: typeof obj.reasoning === "string" ? obj.reasoning : undefined,
    cost_usd: cost,
  };
}

/**
 * Classify a single event, running the cheap stages before any paid call.
 * Returns null only if AI is unavailable AND keyword + SDG produced nothing.
 */
export async function classifyEvent(
  input: ClassifyInput,
  client: Anthropic | null,
): Promise<ClassifyResult | null> {
  const kw = keywordMatch(input);
  if (kw) return kw;
  const sdg = sdgInference(input);
  if (sdg) return sdg;
  if (!client) return null;
  return aiClassify(input, client);
}

/**
 * Synchronous classifier — runs only the cheap stages (keyword + SDG inference).
 * Use this in high-volume insert paths (scraper, bulk submit) where blocking
 * on AI would slow the run and burn budget. Returns null if neither stage hits;
 * the bulk endpoint can fill those in with AI later.
 */
export function classifyEventSync(input: ClassifyInput): ClassifyResult | null {
  return keywordMatch(input) ?? sdgInference(input);
}

export function buildAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}
