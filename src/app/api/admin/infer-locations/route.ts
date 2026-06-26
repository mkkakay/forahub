// One-shot AI backfill for in_person/hybrid events that the scraper inserted
// with location = NULL. Sends title + organization + description + source_url
// to Haiku, asks for {city, country, confidence, is_observance}, writes back
// only when confidence ≥ 0.8 AND is_observance = false. Marks rows with
// location_inferred = true so the popup can show an "approximate location"
// badge, and resets geocode_status to null so the next backfill pass picks
// them up and writes lat/lng.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { buildAnthropicClient } from "@/lib/categories/classify";
import { safeEqual } from "@/lib/security/timing";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "claude-haiku-4-5-20251001";
const CONFIDENCE_THRESHOLD = 0.8;
// Sent per request to bound a single POST. Caller can re-run to drain the
// queue. Haiku is fast (~500ms/event) so 100 fits well under maxDuration=300s.
const BATCH_SIZE = 100;

// Per-MTok pricing for Haiku 4.5 (input / output) — used only to surface a
// rough $$ figure in the response so the operator can see the cost.
const PRICE_IN_PER_MTOK = 1.0;
const PRICE_OUT_PER_MTOK = 5.0;

function isAuthorized(req: NextRequest): boolean {
  return safeEqual(req.headers.get("x-admin-key"), process.env.ADMIN_SECRET);
}

interface Candidate {
  id: string;
  title: string;
  organization: string | null;
  description: string | null;
  source_url: string | null;
}

interface AiAnswer {
  city: string | null;
  country: string | null;
  confidence: number;
  is_observance: boolean;
  reason?: string;
}

function buildPrompt(c: Candidate): string {
  return (
    "You are filling in the missing physical location for a real-world event " +
    "that the scraper marked as in-person/hybrid but failed to capture a venue " +
    "or city for. Use only the information given — do not invent facts.\n\n" +
    `Title: ${c.title}\n` +
    `Organization: ${c.organization ?? "(unknown)"}\n` +
    `Source URL: ${c.source_url ?? "(unknown)"}\n` +
    `Description: ${(c.description ?? "").slice(0, 1200)}\n\n` +
    "Decide:\n" +
    "1. Is this a public holiday, observance, awareness day, or recurring " +
    "named day with no single venue (e.g. 'Christmas Holiday', 'World AIDS " +
    "Day', 'International Women's Day')? If yes → is_observance=true, " +
    "city=null, country=null, confidence=0.\n" +
    "2. Otherwise, what city is this event held in? Use the actual confirmed " +
    "host city for that edition of recurring events (COP30 → Belém, Brazil; " +
    "WHA → Geneva; UN General Assembly → New York City; UN-Habitat CPR → " +
    "Nairobi; UNDP/UNFPA Executive Board → New York City; etc.).\n" +
    "3. Confidence is your honest 0–1 probability that the city is correct. " +
    "Use 0.9+ only when the host city is unambiguous from the title/org. Use " +
    "0.5–0.79 when you're guessing. Use < 0.5 when you genuinely don't know.\n\n" +
    "Return ONLY a single JSON object on one line, no prose, no code fences:\n" +
    '{"city":"…","country":"…","confidence":0.0,"is_observance":false,' +
    '"reason":"…"}'
  );
}

function parseAi(raw: string): AiAnswer | null {
  // Be liberal with formatting: extract the first JSON object in the text.
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]) as Partial<AiAnswer>;
    const conf = typeof obj.confidence === "number" ? obj.confidence : 0;
    return {
      city: obj.city ?? null,
      country: obj.country ?? null,
      confidence: Math.max(0, Math.min(1, conf)),
      is_observance: !!obj.is_observance,
      reason: typeof obj.reason === "string" ? obj.reason : undefined,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { count: pending } = await adminSupabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .in("format", ["in_person", "hybrid"])
    .gte("start_date", new Date().toISOString())
    .is("location", null);
  return NextResponse.json({ pending: pending ?? 0, model: MODEL, batch_size: BATCH_SIZE });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = buildAnthropicClient();
  if (!client) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set" },
      { status: 500 },
    );
  }

  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, organization, description, source_url")
    .in("format", ["in_person", "hybrid"])
    .gte("start_date", new Date().toISOString())
    .is("location", null)
    .order("start_date", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return sanitizeApiError(error, "admin/infer-locations", 500);

  const candidates = (data ?? []) as Candidate[];
  const summary = {
    processed: 0,
    written: 0,
    skipped_low_confidence: 0,
    skipped_observance: 0,
    skipped_no_city: 0,
    parse_errors: 0,
    remaining: 0,
    cost_usd: 0,
    tokens_in: 0,
    tokens_out: 0,
    samples_written: [] as Array<{ id: string; title: string; city: string; country: string | null; confidence: number }>,
  };

  for (const c of candidates) {
    summary.processed += 1;
    let answer: AiAnswer | null = null;
    try {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 256,
        temperature: 0,
        messages: [{ role: "user", content: buildPrompt(c) }],
      });
      summary.tokens_in += resp.usage.input_tokens ?? 0;
      summary.tokens_out += resp.usage.output_tokens ?? 0;
      const text = resp.content
        .map(b => (b.type === "text" ? b.text : ""))
        .join("");
      answer = parseAi(text);
      if (!answer) {
        summary.parse_errors += 1;
        continue;
      }
    } catch (err) {
      console.warn("[infer-locations] AI call failed:", err instanceof Error ? err.message : err);
      summary.parse_errors += 1;
      continue;
    }

    if (answer.is_observance) {
      summary.skipped_observance += 1;
      continue;
    }
    if (!answer.city || answer.city.trim().length < 2) {
      summary.skipped_no_city += 1;
      continue;
    }
    if (answer.confidence < CONFIDENCE_THRESHOLD) {
      summary.skipped_low_confidence += 1;
      continue;
    }

    const location = answer.country
      ? `${answer.city}, ${answer.country}`
      : answer.city;
    const update = {
      location,
      location_inferred: true,
      location_inferred_confidence: answer.confidence,
      // reset so the existing /api/admin/geocode-events run picks the row up
      // and writes lat/lng. The "skipped (empty location)" status would have
      // blocked it otherwise.
      geocode_status: null,
      geocode_error: null,
    };
    const { error: updateErr } = await adminSupabase
      .from("events")
      .update(update)
      .eq("id", c.id);
    if (updateErr) {
      summary.parse_errors += 1;
      continue;
    }
    summary.written += 1;
    if (summary.samples_written.length < 5) {
      summary.samples_written.push({
        id: c.id,
        title: c.title,
        city: answer.city,
        country: answer.country,
        confidence: answer.confidence,
      });
    }
  }

  summary.cost_usd =
    (summary.tokens_in / 1_000_000) * PRICE_IN_PER_MTOK +
    (summary.tokens_out / 1_000_000) * PRICE_OUT_PER_MTOK;

  const { count } = await adminSupabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .in("format", ["in_person", "hybrid"])
    .gte("start_date", new Date().toISOString())
    .is("location", null);
  summary.remaining = count ?? 0;

  return NextResponse.json({ ok: true, ...summary });
}
