import { type NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { adminSupabase } from '@/lib/supabase/admin';
import { getActiveSources } from '@/lib/scraper/sources';
import { fetchSource } from '@/lib/scraper/fetchSources';
import { deduplicateAndUpsert } from '@/lib/scraper/deduplicateAndUpsert';
import type { ExtractedEvent, Region, ScraperSource } from '@/lib/scraper/types';

export const dynamic = 'force-dynamic';
// Increase timeout for Vercel Pro / self-hosted. On hobby plan requests are capped at 10s.
export const maxDuration = 300;

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

// ── FIX 1: Country → Region mapping ──────────────────────────────────────────

const COUNTRY_REGION_MAP: Record<string, Region> = {
  // Africa
  'nigeria': 'Africa', 'kenya': 'Africa', 'ethiopia': 'Africa', 'ghana': 'Africa',
  'south africa': 'Africa', 'tanzania': 'Africa', 'uganda': 'Africa', 'rwanda': 'Africa',
  'senegal': 'Africa', 'cameroon': 'Africa', "côte d'ivoire": 'Africa', 'ivory coast': 'Africa',
  'mozambique': 'Africa', 'zambia': 'Africa', 'zimbabwe': 'Africa', 'malawi': 'Africa',
  'madagascar': 'Africa', 'angola': 'Africa', 'mali': 'Africa', 'burkina faso': 'Africa',
  'niger': 'Africa', 'chad': 'Africa', 'sudan': 'Africa', 'somalia': 'Africa',
  'democratic republic of congo': 'Africa', 'drc': 'Africa', 'congo': 'Africa',
  'addis ababa': 'Africa', 'nairobi': 'Africa', 'lagos': 'Africa', 'accra': 'Africa',
  'johannesburg': 'Africa', 'cape town': 'Africa', 'dakar': 'Africa', 'abuja': 'Africa',
  'cairo': 'Africa', 'egypt': 'Africa', 'morocco': 'Africa', 'tunisia': 'Africa',
  'algeria': 'Africa', 'libya': 'Africa',

  // Asia Pacific
  'china': 'Asia-Pacific', 'india': 'Asia-Pacific', 'indonesia': 'Asia-Pacific',
  'bangladesh': 'Asia-Pacific', 'pakistan': 'Asia-Pacific', 'philippines': 'Asia-Pacific',
  'vietnam': 'Asia-Pacific', 'thailand': 'Asia-Pacific', 'myanmar': 'Asia-Pacific',
  'cambodia': 'Asia-Pacific', 'laos': 'Asia-Pacific', 'malaysia': 'Asia-Pacific',
  'singapore': 'Asia-Pacific', 'japan': 'Asia-Pacific', 'south korea': 'Asia-Pacific',
  'nepal': 'Asia-Pacific', 'sri lanka': 'Asia-Pacific', 'bhutan': 'Asia-Pacific',
  'maldives': 'Asia-Pacific', 'afghanistan': 'Asia-Pacific', 'mongolia': 'Asia-Pacific',
  'papua new guinea': 'Asia-Pacific', 'fiji': 'Asia-Pacific', 'samoa': 'Asia-Pacific',
  'vanuatu': 'Asia-Pacific', 'solomon islands': 'Asia-Pacific', 'australia': 'Asia-Pacific',
  'new zealand': 'Asia-Pacific', 'beijing': 'Asia-Pacific', 'shanghai': 'Asia-Pacific',
  'new delhi': 'Asia-Pacific', 'dhaka': 'Asia-Pacific', 'bangkok': 'Asia-Pacific',
  'manila': 'Asia-Pacific', 'jakarta': 'Asia-Pacific', 'kathmandu': 'Asia-Pacific',
  'colombo': 'Asia-Pacific', 'islamabad': 'Asia-Pacific', 'karachi': 'Asia-Pacific',

  // Middle East
  'saudi arabia': 'Middle-East', 'uae': 'Middle-East', 'united arab emirates': 'Middle-East',
  'qatar': 'Middle-East', 'kuwait': 'Middle-East', 'bahrain': 'Middle-East',
  'oman': 'Middle-East', 'jordan': 'Middle-East', 'lebanon': 'Middle-East',
  'iraq': 'Middle-East', 'iran': 'Middle-East', 'syria': 'Middle-East',
  'yemen': 'Middle-East', 'palestine': 'Middle-East', 'israel': 'Middle-East',
  'turkey': 'Middle-East', 'dubai': 'Middle-East', 'abu dhabi': 'Middle-East',
  'riyadh': 'Middle-East', 'doha': 'Middle-East', 'amman': 'Middle-East',
  'beirut': 'Middle-East', 'ankara': 'Middle-East', 'istanbul': 'Middle-East',

  // Latin America
  'brazil': 'Americas-Latin', 'mexico': 'Americas-Latin', 'colombia': 'Americas-Latin',
  'argentina': 'Americas-Latin', 'peru': 'Americas-Latin', 'chile': 'Americas-Latin',
  'venezuela': 'Americas-Latin', 'ecuador': 'Americas-Latin', 'bolivia': 'Americas-Latin',
  'paraguay': 'Americas-Latin', 'uruguay': 'Americas-Latin', 'costa rica': 'Americas-Latin',
  'panama': 'Americas-Latin', 'guatemala': 'Americas-Latin', 'honduras': 'Americas-Latin',
  'el salvador': 'Americas-Latin', 'nicaragua': 'Americas-Latin', 'cuba': 'Americas-Latin',
  'haiti': 'Americas-Latin', 'dominican republic': 'Americas-Latin', 'jamaica': 'Americas-Latin',
  'trinidad': 'Americas-Latin', 'barbados': 'Americas-Latin', 'guyana': 'Americas-Latin',
  'suriname': 'Americas-Latin', 'sao paulo': 'Americas-Latin', 'rio de janeiro': 'Americas-Latin',
  'buenos aires': 'Americas-Latin', 'bogota': 'Americas-Latin', 'lima': 'Americas-Latin',
  'santiago': 'Americas-Latin', 'mexico city': 'Americas-Latin', 'san jose': 'Americas-Latin',

  // Europe
  'switzerland': 'Europe', 'france': 'Europe', 'germany': 'Europe', 'uk': 'Europe',
  'united kingdom': 'Europe', 'netherlands': 'Europe', 'sweden': 'Europe', 'norway': 'Europe',
  'denmark': 'Europe', 'finland': 'Europe', 'belgium': 'Europe', 'austria': 'Europe',
  'italy': 'Europe', 'spain': 'Europe', 'portugal': 'Europe', 'poland': 'Europe',
  'czech republic': 'Europe', 'hungary': 'Europe', 'romania': 'Europe', 'ukraine': 'Europe',
  'russia': 'Europe', 'georgia': 'Europe', 'armenia': 'Europe', 'azerbaijan': 'Europe',
  'geneva': 'Europe', 'zurich': 'Europe', 'paris': 'Europe', 'berlin': 'Europe',
  'london': 'Europe', 'amsterdam': 'Europe', 'brussels': 'Europe', 'vienna': 'Europe',
  'stockholm': 'Europe', 'oslo': 'Europe', 'copenhagen': 'Europe', 'helsinki': 'Europe',
  'rome': 'Europe', 'madrid': 'Europe', 'lisbon': 'Europe', 'warsaw': 'Europe',

  // North America
  'usa': 'Americas-North', 'united states': 'Americas-North', 'canada': 'Americas-North',
  'washington': 'Americas-North', 'new york': 'Americas-North', 'washington dc': 'Americas-North',
  'san francisco': 'Americas-North', 'chicago': 'Americas-North', 'los angeles': 'Americas-North',
  'toronto': 'Americas-North', 'montreal': 'Americas-North', 'ottawa': 'Americas-North',

  // Global / Online
  'online': 'Global', 'virtual': 'Global', 'remote': 'Global', 'global': 'Global',
  'worldwide': 'Global', 'international': 'Global',
};

function inferRegion(location: string | null | undefined): Region | undefined {
  if (!location) return undefined;
  const lower = location.toLowerCase();
  for (const [key, region] of Object.entries(COUNTRY_REGION_MAP)) {
    if (lower.includes(key)) return region;
  }
  return undefined;
}

// ── FIX 2: Hardened JSON extraction ──────────────────────────────────────────

function extractJSON(text: string): Record<string, unknown>[] {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch { /* fall through */ }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch { /* fall through */ }
  }

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      return [parsed as Record<string, unknown>];
    } catch { /* fall through */ }
  }

  return [];
}

// ── FIX 5: Dead-page pre-filter ───────────────────────────────────────────────

function shouldSkipPage(html: string): { skip: boolean; reason: string } {
  if (html.length < 500) return { skip: true, reason: 'page too short' };
  const lower = html.toLowerCase();
  if (
    lower.includes('login required') ||
    lower.includes('sign in to continue') ||
    lower.includes('access denied') ||
    lower.includes('please log in')
  ) {
    return { skip: true, reason: 'login wall detected' };
  }
  const hasDatePattern = /202[6-9]|203[0-9]|january|february|march|april|may|june|july|august|september|october|november|december/i.test(html);
  if (!hasDatePattern) return { skip: true, reason: 'no date patterns found' };
  return { skip: false, reason: '' };
}

// ── Event mapping ─────────────────────────────────────────────────────────────

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
        2 +
        (e.description ? 1 : 0) +
        (e.registration_url ? 1 : 0) +
        (e.start_date && e.end_date ? 1 : 0) +
        (locationStr ? 1 : 0),
      );

      // FIX 1: infer region from extracted location string
      const region = inferRegion(locationStr) ?? inferRegion(source.url) ?? undefined;

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
        confidence_score: 4,
        quality_score: quality,
        language: source.language,
        source_url: source.url,
        region,
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
  let batchSize = 10;
  let offset = 0;
  try {
    const body = await req.json() as { batchSize?: number; offset?: number };
    if (typeof body.batchSize === 'number') batchSize = Math.min(Math.max(1, body.batchSize), 200);
    if (typeof body.offset === 'number') offset = Math.max(0, body.offset);
  } catch { /* empty body is fine */ }

  // ── Validate env ──────────────────────────────────────────────────────────
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  const allSources = getActiveSources();
  const batch = allSources.slice(offset, offset + batchSize);

  // FIX 4: today's date for the prompt
  const today = new Date().toISOString().split('T')[0];

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
        if (fetchResult.error) {
          errors.push(`${source.id} (${source.organization}) ${source.url}: fetch failed – ${fetchResult.error.slice(0, 300)}`);
        }
        processed++;
        continue;
      }

      const html = fetchResult.content;

      // FIX 5: pre-filter dead/login-walled/dateless pages before spending tokens
      const { skip, reason } = shouldSkipPage(html);
      if (skip) {
        errors.push(`${source.id}: pre-filter-skip (${reason})`);
        processed++;
        continue;
      }

      // FIX 3: increased HTML window 15k → 25k characters
      // FIX 4: explicit today's date + future-only instruction in prompt
      const userPrompt =
        `Today's date is ${today}. Extract ONLY upcoming events with start_date ON OR AFTER ${today}. ` +
        `Do NOT include events that have already happened. Do NOT include events from previous years. Only future events.\n\n` +
        `Return ONLY a valid JSON array with no other text. ` +
        `Each event object must have these fields: title (string), description (string), ` +
        `start_date (YYYY-MM-DD format), end_date (YYYY-MM-DD format or null), location (string or null), ` +
        `is_online (boolean), organization_name (string), registration_url (string or null), ` +
        `sdg_goals (array of numbers 1-17). ` +
        `Return empty array [] if no upcoming events found.\n\nHTML:\n${html.substring(0, 25000)}`;

      let message: Awaited<ReturnType<typeof anthropic.messages.create>>;
      try {
        message = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          messages: [{ role: 'user', content: userPrompt }],
        });
      } catch (apiErr: unknown) {
        const status = (apiErr as { status?: number }).status;
        if (status === 429) {
          await new Promise(resolve => setTimeout(resolve, 30_000));
          try {
            message = await anthropic.messages.create({
              model: CLAUDE_MODEL,
              max_tokens: 1024,
              messages: [{ role: 'user', content: userPrompt }],
            });
          } catch (retryErr) {
            errors.push(`${source.id}: 429 rate limit, retry failed: ${String(retryErr).slice(0, 80)}`);
            processed++;
            await new Promise(resolve => setTimeout(resolve, 3_000));
            continue;
          }
        } else {
          throw apiErr;
        }
      }

      // 3 s inter-request delay
      await new Promise(resolve => setTimeout(resolve, 3_000));

      const rawText = message.content[0]?.type === 'text' ? message.content[0].text : '[]';

      // FIX 2: hardened JSON extraction with 3-tier fallback
      const rawEvents = extractJSON(rawText);

      eventsFound += rawEvents.length;

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
