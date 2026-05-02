import Anthropic from '@anthropic-ai/sdk';
import type { ScraperSource, FetchResult, ExtractedEvent } from './types';

const MODEL = 'claude-sonnet-4-20250514';

// Token cost constants (USD per 1M tokens)
const INPUT_COST_PER_M = 3.0;
const OUTPUT_COST_PER_M = 15.0;

// Rough token estimate: 1 token ≈ 4 characters
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCallCost(inputText: string, outputText: string): number {
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);
  return (inputTokens / 1_000_000) * INPUT_COST_PER_M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;
}

// ── Fallback regex extraction ─────────────────────────────────────────────────
// Used when Claude API is unavailable. Captures partial data rather than nothing.

function fallbackExtract(content: string, source: ScraperSource, sourceUrl: string): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];

  // Naive extraction: look for date-like patterns near title-like lines
  const datePattern = /\b(\d{1,2}[\s\-\/]\w+[\s\-\/]\d{4}|\w+ \d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})\b/g;
  const lines = content.split('\n').filter(l => l.trim().length > 20);

  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    if (line.length < 20 || line.length > 200) continue;

    // Look for a date nearby
    const window = lines.slice(Math.max(0, i - 2), i + 3).join(' ');
    const dateMatch = window.match(datePattern);
    if (!dateMatch) continue;

    events.push({
      title: line,
      start_date: undefined,
      organization: source.organization,
      sdg_goals: source.primary_sdg_goals,
      sdg_inferred: true,
      is_side_event: false,
      is_recurring: false,
      speakers: [],
      deadlines: [],
      confidence_score: 1,
      quality_score: 1,
      is_public: true,
      language: source.language,
      source_url: sourceUrl,
    });
  }

  return events.slice(0, 10); // cap at 10 partial events
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(content: string, source: ScraperSource, pageUrl: string): string {
  const sdgList = source.primary_sdg_goals.join(', ');
  return `You are an expert event extraction system for ForaHub, a platform that tracks global development and health conferences, summits, and side events.

SOURCE CONTEXT:
- Organization: ${source.organization}
- Primary SDG goals: ${sdgList}
- Region: ${source.region}
- Language: ${source.language}
- Source URL: ${pageUrl}

TASK: Extract ALL upcoming events from the content below. For each event, return a JSON object.

EXTRACTION RULES:
1. Only extract future events (discard past events unless the date is ambiguous).
2. Every event MUST have at least one SDG goal assigned.
   - If the event explicitly mentions SDG goals, use those and set sdg_inferred=false.
   - Otherwise, infer 1–3 most relevant SDGs based on topic and organization, set sdg_inferred=true.
3. Confidence score (1–5): How certain are you this is a real upcoming event?
   - 5: Title + date + registration link all confirmed
   - 4: Title + date confirmed, no link
   - 3: Title confirmed, approximate date
   - 2: Ambiguous — might be an event
   - 1: Very uncertain
4. Quality score (0–5): Sum of: +1 has description, +1 has registration_url, +1 has both start AND end dates, +1 has specific location (city/venue), +1 has explicit SDG tags.
5. For non-English content, translate title and description to English; store originals in title_original and description_original.
6. Generate a 3-paragraph event_brief (120–180 words total):
   - Para 1: What this event is and why it exists.
   - Para 2: Why it matters in the current global context.
   - Para 3: Who typically attends and what the key debates will be.
7. Detect side events: if this is clearly a satellite/side event of a larger conference, set is_side_event=true and fill parent_conference_name.
8. Detect recurring series: if this is an annual or regular series (e.g. "World Health Assembly 2027", "COP30"), set is_recurring=true and series_name to the canonical series name.
9. Extract ALL hidden deadlines separately in the deadlines array.

Return a JSON array. If no events are found, return [].
Each object must match this schema exactly:

{
  "title": "string — full event title",
  "description": "string | null",
  "start_date": "ISO 8601 string | null",
  "end_date": "ISO 8601 string | null",
  "location_city": "string | null",
  "location_country": "string | null",
  "location_venue": "string | null",
  "organization": "string",
  "registration_url": "string | null",
  "event_type": "conference|side_event|webinar|training|consultation|summit|null",
  "format": "in_person|virtual|hybrid|null",
  "cost_type": "free|paid|null",
  "cost_amount": "string | null — e.g. '$500 USD'",
  "audience_level": "researchers|practitioners|policymakers|donors|all|null",
  "is_public": true,
  "expected_attendance": "string | null — e.g. '500 delegates'",
  "sdg_goals": [1,2,3],
  "sdg_inferred": true,
  "region": "Africa|Americas|Asia-Pacific|Europe|Middle-East|South-Asia|Online|null",
  "is_side_event": false,
  "parent_conference_name": "string | null",
  "is_recurring": false,
  "series_name": "string | null",
  "speakers": ["Name - Role"],
  "deadlines": [
    { "type": "abstract|early_bird|travel_grant|side_event_proposal|registration", "date": "ISO 8601", "description": "string | null" }
  ],
  "confidence_score": 4,
  "quality_score": 3,
  "event_brief": "Three paragraph brief...",
  "language": "en",
  "title_original": "string | null",
  "description_original": "string | null",
  "source_url": "${pageUrl}"
}

CONTENT TO ANALYZE:
---
${content.slice(0, 40_000)}
---

Return ONLY the JSON array. No explanation, no markdown fences.`;
}

// ── Claude extraction ─────────────────────────────────────────────────────────

export async function extractEvents(
  fetchResult: FetchResult,
  source: ScraperSource,
  pageUrl: string,
  apiKey: string,
): Promise<{ events: ExtractedEvent[]; estimatedCost: number }> {
  if (!fetchResult.content || fetchResult.content.trim().length < 100) {
    return { events: [], estimatedCost: 0 };
  }

  const prompt = buildPrompt(fetchResult.content, source, pageUrl);
  let rawOutput = '';

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    rawOutput = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    const cost = estimateCallCost(prompt, rawOutput);

    // Strip any accidental markdown fences
    const json = rawOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed: unknown[] = JSON.parse(json);

    const events: ExtractedEvent[] = parsed
      .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .map(e => ({
        title: String(e.title ?? ''),
        description: e.description ? String(e.description) : undefined,
        start_date: e.start_date ? String(e.start_date) : undefined,
        end_date: e.end_date ? String(e.end_date) : undefined,
        location_city: e.location_city ? String(e.location_city) : undefined,
        location_country: e.location_country ? String(e.location_country) : undefined,
        location_venue: e.location_venue ? String(e.location_venue) : undefined,
        organization: String(e.organization ?? source.organization),
        registration_url: e.registration_url ? String(e.registration_url) : undefined,
        event_type: e.event_type as ExtractedEvent['event_type'] ?? undefined,
        format: e.format as ExtractedEvent['format'] ?? undefined,
        cost_type: e.cost_type as ExtractedEvent['cost_type'] ?? undefined,
        cost_amount: e.cost_amount ? String(e.cost_amount) : undefined,
        audience_level: e.audience_level as ExtractedEvent['audience_level'] ?? undefined,
        is_public: Boolean(e.is_public ?? true),
        expected_attendance: e.expected_attendance ? String(e.expected_attendance) : undefined,
        sdg_goals: Array.isArray(e.sdg_goals) ? (e.sdg_goals as number[]) : source.primary_sdg_goals,
        sdg_inferred: Boolean(e.sdg_inferred ?? true),
        region: e.region as ExtractedEvent['region'] ?? undefined,
        is_side_event: Boolean(e.is_side_event ?? false),
        parent_conference_name: e.parent_conference_name ? String(e.parent_conference_name) : undefined,
        is_recurring: Boolean(e.is_recurring ?? false),
        series_name: e.series_name ? String(e.series_name) : undefined,
        speakers: Array.isArray(e.speakers) ? (e.speakers as string[]) : [],
        deadlines: Array.isArray(e.deadlines) ? (e.deadlines as ExtractedEvent['deadlines']) : [],
        confidence_score: Number(e.confidence_score ?? 3),
        quality_score: Number(e.quality_score ?? 2),
        event_brief: e.event_brief ? String(e.event_brief) : undefined,
        language: String(e.language ?? fetchResult.detectedLanguage),
        title_original: e.title_original ? String(e.title_original) : undefined,
        description_original: e.description_original ? String(e.description_original) : undefined,
        source_url: String(e.source_url ?? pageUrl),
      }));

    return { events, estimatedCost: cost };

  } catch (err) {
    // If Claude is unavailable, fall back to regex extraction
    console.error('[extractEvents] Claude API error, using fallback extraction:', err);
    const events = fallbackExtract(fetchResult.content, source, pageUrl);
    return { events, estimatedCost: 0 };
  }
}
