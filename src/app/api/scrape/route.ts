import { type NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { adminSupabase } from '@/lib/supabase/admin';
import { getActiveSources } from '@/lib/scraper/sources';
import { fetchSource } from '@/lib/scraper/fetchSources';
import { deduplicateAndUpsert } from '@/lib/scraper/deduplicateAndUpsert';
import type { ExtractedEvent, ScraperSource } from '@/lib/scraper/types';

export const dynamic = 'force-dynamic';
// Increase timeout for Vercel Pro / self-hosted. On hobby plan requests are capped at 10s.
export const maxDuration = 300;

const GROQ_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT =
  'Extract all events from this webpage. Return JSON array with fields: ' +
  'title (string), description (string|null), start_date (YYYY-MM-DD|null), ' +
  'end_date (YYYY-MM-DD|null), location (string|null), is_online (boolean), ' +
  'organization_name (string|null), registration_url (string|null), ' +
  'sdg_goals (array of numbers 1-17). ' +
  'Only return valid upcoming or recent events. Return empty array if no events found. ' +
  'Return ONLY the JSON array, no markdown fences.';

function mapToExtracted(
  raw: Record<string, unknown>[],
  source: ScraperSource,
): ExtractedEvent[] {
  return raw
    .filter(e => typeof e.title === 'string' && e.title.trim().length > 2)
    .map(e => {
      const sdgGoals =
        Array.isArray(e.sdg_goals) && e.sdg_goals.length > 0
          ? (e.sdg_goals as number[]).filter(n => Number.isInteger(n) && n >= 1 && n <= 17)
          : source.primary_sdg_goals;

      const locationStr = e.location ? String(e.location) : '';
      const parts = locationStr.split(',').map(s => s.trim()).filter(Boolean);

      // Base quality from extracted fields; add 2 for title+date (always present after filtering)
      const quality = Math.max(3,
        2 + // title and start_date are always present at this point
        (e.description ? 1 : 0) +
        (e.registration_url ? 1 : 0) +
        (e.start_date && e.end_date ? 1 : 0) +
        (locationStr ? 1 : 0),
      );

      return {
        title: String(e.title).trim().slice(0, 500),
        description: e.description ? String(e.description).slice(0, 3000) : undefined,
        start_date: e.start_date ? String(e.start_date) : undefined,
        end_date: e.end_date ? String(e.end_date) : undefined,
        location_city: parts[0] || undefined,
        location_country: parts.length > 1 ? parts[parts.length - 1] : undefined,
        organization: e.organization_name ? String(e.organization_name) : source.organization,
        registration_url: e.registration_url ? String(e.registration_url) : undefined,
        format: e.is_online ? ('virtual' as const) : ('in_person' as const),
        sdg_goals: sdgGoals,
        sdg_inferred: !(Array.isArray(e.sdg_goals) && e.sdg_goals.length > 0),
        is_public: true,
        is_side_event: false,
        is_recurring: false,
        speakers: [],
        deadlines: [],
        confidence_score: 4, // curated trusted sources; qualifies for auto-publish
        quality_score: quality,
        language: source.language,
        source_url: source.url,
      } satisfies ExtractedEvent;
    });
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const adminKey = req.headers.get('x-admin-key');
  const expected = process.env.ADMIN_SECRET;
  if (!expected || adminKey !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let batchSize = 50;
  let offset = 0;
  try {
    const body = await req.json() as { batchSize?: number; offset?: number };
    if (typeof body.batchSize === 'number') batchSize = Math.min(Math.max(1, body.batchSize), 200);
    if (typeof body.offset === 'number') offset = Math.max(0, body.offset);
  } catch { /* empty body is fine */ }

  // ── Validate env ──────────────────────────────────────────────────────────
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  const groq = new Groq({ apiKey: groqApiKey });
  const allSources = getActiveSources();
  const batch = allSources.slice(offset, offset + batchSize);

  const startTime = Date.now();
  let processed = 0;
  let eventsFound = 0;
  let eventsSaved = 0;
  const errors: string[] = [];

  // ── Process each source ───────────────────────────────────────────────────
  for (const source of batch) {
    try {
      // 1. Fetch page content
      const fetchResult = await fetchSource(source);
      if (!fetchResult.content || fetchResult.content.trim().length < 50) {
        processed++;
        continue;
      }

      // 2. Extract events via Groq (truncate to ~30k chars ≈ 7k tokens)
      const content = fetchResult.content.slice(0, 30_000);
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: 4096,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Organization: ${source.organization}\nURL: ${source.url}\n\nCONTENT:\n${content}`,
          },
        ],
      });

      const rawText = completion.choices[0]?.message?.content ?? '[]';

      // 3. Parse JSON response
      let rawEvents: Record<string, unknown>[] = [];
      try {
        const json = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/, '')
          .trim();
        const parsed = JSON.parse(json);
        rawEvents = Array.isArray(parsed) ? parsed : [];
      } catch {
        errors.push(`${source.id}: JSON parse failed`);
        processed++;
        continue;
      }

      eventsFound += rawEvents.length;

      // 4. Map to ExtractedEvent and save
      if (rawEvents.length > 0) {
        const events = mapToExtracted(rawEvents, source);
        if (events.length > 0) {
          const result = await deduplicateAndUpsert(events, source.id, supabaseUrl, serviceKey);
          eventsSaved += result.inserted + result.updated;
        }
      }

      processed++;
    } catch (err) {
      errors.push(`${source.id}: ${String(err).slice(0, 120)}`);
      processed++;
    }
  }

  const durationSeconds = Math.round((Date.now() - startTime) / 1000);

  // ── Log run ───────────────────────────────────────────────────────────────
  await adminSupabase.from('scraper_logs').insert({
    sources_processed: processed,
    events_found: eventsFound,
    events_saved: eventsSaved,
    errors: errors.length > 0 ? errors.join('\n') : null,
    duration_seconds: durationSeconds,
  });

  return NextResponse.json({
    processed,
    eventsFound,
    eventsSaved,
    errors,
    totalSources: allSources.length,
    batchInfo: { offset, batchSize, nextOffset: offset + batchSize },
    durationSeconds,
  });
}
