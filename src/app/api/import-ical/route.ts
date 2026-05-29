// TODO: This endpoint is intentionally not exposed in the admin UI because many iCal feeds are
// blocked by Cloudflare. Keep it as a direct-call utility for known-good feeds only.
// Do not wire it back into the UI without first verifying the target feeds are CF-accessible.
import { type NextRequest, NextResponse } from 'next/server';
import ICAL from 'ical.js';
import { adminSupabase } from '@/lib/supabase/admin';
import { classifyEventSync } from '@/lib/categories/classify';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ── Feed definitions ──────────────────────────────────────────────────────────

const FEEDS = [
  {
    id: 'ical-iisd',
    name: 'IISD SDG Knowledge Hub',
    url: 'https://sdg.iisd.org/?ical=1',
    organization: 'IISD',
  },
  {
    id: 'ical-iisd-enb',
    name: 'IISD Earth Negotiations Bulletin',
    url: 'https://enb.iisd.org/events?ical=1&feed_me=1',
    organization: 'IISD',
  },
  {
    id: 'ical-un',
    name: 'UN System Calendar',
    url: 'https://calendar.google.com/calendar/ical/un.org_ical_en%40resource.calendar.google.com/public/basic.ics',
    organization: 'United Nations',
  },
  {
    id: 'ical-unfccc',
    name: 'UNFCCC Events',
    url: 'https://unfccc.int/events?field_event_type_target_id=All&field_event_dates_value%5Bvalue%5D%5Bdate%5D=&field_event_dates_end_value%5Bvalue%5D%5Bdate%5D=&ical=1&feed_me=1',
    organization: 'UNFCCC',
  },
  {
    id: 'ical-cbd',
    name: 'CBD Biodiversity Events',
    url: 'https://www.cbd.int/meetings/ical',
    organization: 'CBD',
  },
  {
    id: 'ical-ipbes',
    name: 'IPBES Events',
    url: 'https://ipbes.net/events/feed/ical',
    organization: 'IPBES',
  },
] as const;

// ── Region inference (mirrors scrape route) ───────────────────────────────────

const REGION_MAP: Record<string, string> = {
  'nigeria': 'Africa', 'kenya': 'Africa', 'ethiopia': 'Africa', 'ghana': 'Africa',
  'south africa': 'Africa', 'tanzania': 'Africa', 'uganda': 'Africa', 'rwanda': 'Africa',
  'senegal': 'Africa', 'nairobi': 'Africa', 'lagos': 'Africa', 'accra': 'Africa',
  'addis ababa': 'Africa', 'cairo': 'Africa', 'egypt': 'Africa', 'morocco': 'Africa',
  'china': 'Asia-Pacific', 'india': 'Asia-Pacific', 'indonesia': 'Asia-Pacific',
  'bangladesh': 'Asia-Pacific', 'pakistan': 'Asia-Pacific', 'philippines': 'Asia-Pacific',
  'vietnam': 'Asia-Pacific', 'thailand': 'Asia-Pacific', 'singapore': 'Asia-Pacific',
  'japan': 'Asia-Pacific', 'south korea': 'Asia-Pacific', 'australia': 'Asia-Pacific',
  'new zealand': 'Asia-Pacific', 'bangkok': 'Asia-Pacific', 'beijing': 'Asia-Pacific',
  'new delhi': 'Asia-Pacific', 'dhaka': 'Asia-Pacific', 'jakarta': 'Asia-Pacific',
  'saudi arabia': 'Middle-East', 'uae': 'Middle-East', 'united arab emirates': 'Middle-East',
  'qatar': 'Middle-East', 'jordan': 'Middle-East', 'lebanon': 'Middle-East',
  'turkey': 'Middle-East', 'dubai': 'Middle-East', 'doha': 'Middle-East',
  'riyadh': 'Middle-East', 'amman': 'Middle-East', 'istanbul': 'Middle-East',
  'brazil': 'Americas-Latin', 'mexico': 'Americas-Latin', 'colombia': 'Americas-Latin',
  'argentina': 'Americas-Latin', 'peru': 'Americas-Latin', 'chile': 'Americas-Latin',
  'venezuela': 'Americas-Latin', 'ecuador': 'Americas-Latin', 'bolivia': 'Americas-Latin',
  'costa rica': 'Americas-Latin', 'bogota': 'Americas-Latin', 'lima': 'Americas-Latin',
  'santiago': 'Americas-Latin', 'buenos aires': 'Americas-Latin', 'sao paulo': 'Americas-Latin',
  'switzerland': 'Europe', 'france': 'Europe', 'germany': 'Europe', 'uk': 'Europe',
  'united kingdom': 'Europe', 'netherlands': 'Europe', 'sweden': 'Europe', 'norway': 'Europe',
  'denmark': 'Europe', 'finland': 'Europe', 'belgium': 'Europe', 'austria': 'Europe',
  'italy': 'Europe', 'spain': 'Europe', 'poland': 'Europe', 'geneva': 'Europe',
  'paris': 'Europe', 'berlin': 'Europe', 'london': 'Europe', 'amsterdam': 'Europe',
  'brussels': 'Europe', 'vienna': 'Europe', 'stockholm': 'Europe', 'rome': 'Europe',
  'usa': 'Americas-North', 'united states': 'Americas-North', 'canada': 'Americas-North',
  'washington': 'Americas-North', 'new york': 'Americas-North', 'san francisco': 'Americas-North',
  'chicago': 'Americas-North', 'toronto': 'Americas-North', 'montreal': 'Americas-North',
  'online': 'Global', 'virtual': 'Global', 'remote': 'Global',
  'global': 'Global', 'worldwide': 'Global',
};

function inferRegion(location: string | null): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [key, region] of Object.entries(REGION_MAP)) {
    if (lower.includes(key)) return region;
  }
  return null;
}

// ── SDG inference from text ───────────────────────────────────────────────────

const SDG_KEYWORDS: [RegExp, number][] = [
  [/\b(health|disease|pandemic|medicine|medical|hospital|malaria|hiv|aids|nutrition)\b/i, 3],
  [/\b(climate|carbon|emission|temperature|greenhouse|cop\d|decarboni)\b/i, 13],
  [/\b(education|school|learning|university|academic|training|capacity.?build)\b/i, 4],
  [/\b(gender|women|girl|female|feminist|sexual.+reproductive)\b/i, 5],
  [/\b(water|sanitation|wash|hygiene|ocean|marine)\b/i, 6],
  [/\b(energy|solar|wind|renewable|electr)\b/i, 7],
  [/\b(food|hunger|agriculture|farming|crop|livestock|nutrition)\b/i, 2],
  [/\b(governance|justice|peace|rule of law|human rights|conflict)\b/i, 16],
  [/\b(partnership|finance|investment|aid|oda|multilateral|cooperation)\b/i, 17],
  [/\b(poverty|poor|inequality|inclusion|vulnerable|marginali)\b/i, 1],
  [/\b(work|employment|labour|labor|job|economic growth|enterprise)\b/i, 8],
  [/\b(innovation|technology|digital|infrastructure|industry)\b/i, 9],
  [/\b(inequalit|migrant|refugee|displacement|social protect)\b/i, 10],
  [/\b(city|urban|housing|transport|resilience|disaster)\b/i, 11],
  [/\b(consumption|production|waste|circular economy|supply chain)\b/i, 12],
  [/\b(biodiversity|forest|land|ecosystem|wildlife|nature)\b/i, 15],
  [/\b(sdg|sustainable development goal)\b/i, 17],
];

function inferSdgGoals(text: string): number[] {
  const found = new Set<number>();
  for (const [pattern, sdg] of SDG_KEYWORDS) {
    if (pattern.test(text)) found.add(sdg);
  }
  return found.size > 0 ? Array.from(found).sort((a, b) => a - b) : [17];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function icalDateToISO(prop: ICAL.Property | null): string | null {
  if (!prop) return null;
  try {
    const val = prop.getFirstValue() as ICAL.Time;
    const js = val.toJSDate();
    return js.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const results: {
    feed: string;
    fetched: number;
    saved: number;
    skipped: number;
    errors: string[];
  }[] = [];

  for (const feed of FEEDS) {
    const feedResult = { feed: feed.name, fetched: 0, saved: 0, skipped: 0, errors: [] as string[] };

    try {
      // 1. Fetch raw iCal
      const res = await fetch(feed.url, {
        headers: {
          'Accept': 'text/calendar, application/ics, text/plain, */*',
          'User-Agent': 'ForaHub/1.0 (https://forahub.org; events@forahub.org)',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        feedResult.errors.push(`HTTP ${res.status}`);
        results.push(feedResult);
        continue;
      }
      const raw = await res.text();

      // FIX 4: detect HTML response (not a real iCal feed) and log first 200 chars
      if (raw.trimStart().startsWith('<')) {
        feedResult.errors.push(`Got HTML instead of iCal: ${raw.slice(0, 200).replace(/\s+/g, ' ')}`);
        results.push(feedResult);
        continue;
      }

      // 2. Parse iCal
      let jcal: unknown;
      try {
        jcal = ICAL.parse(raw);
      } catch (e) {
        feedResult.errors.push(`Parse error: ${String(e).slice(0, 80)} | Raw: ${raw.slice(0, 100)}`);
        results.push(feedResult);
        continue;
      }

      const comp = new ICAL.Component(jcal as string | unknown[]);
      const vevents = comp.getAllSubcomponents('vevent');
      feedResult.fetched = vevents.length;

      // 3. Fetch existing events for this source to deduplicate
      const { data: existingRows } = await adminSupabase
        .from('events')
        .select('title, start_date')
        .eq('source_id', feed.id)
        .gte('start_date', today);

      const existingSet = new Set(
        (existingRows ?? []).map(r => `${r.title}||${r.start_date?.slice(0, 10)}`)
      );

      // 4. Process events
      for (const vevent of vevents) {
        try {
          const event = new ICAL.Event(vevent);

          const startDate = icalDateToISO(vevent.getFirstProperty('dtstart'));
          if (!startDate || startDate < today) {
            feedResult.skipped++;
            continue;
          }

          const title = event.summary?.trim();
          if (!title || title.length < 3) {
            feedResult.skipped++;
            continue;
          }

          // Deduplicate by title + start_date
          const dedupeKey = `${title}||${startDate}`;
          if (existingSet.has(dedupeKey)) {
            feedResult.skipped++;
            continue;
          }
          existingSet.add(dedupeKey);

          const endDate = icalDateToISO(vevent.getFirstProperty('dtend'));
          const locationRaw = event.location?.trim() ?? null;
          const descRaw = event.description?.trim() ?? null;
          const description = descRaw ? stripHtml(descRaw).slice(0, 3000) : null;
          const urlProp = vevent.getFirstProperty('url');
          const registrationUrl = urlProp
            ? String(urlProp.getFirstValue()).trim() || null
            : null;

          const organizerProp = vevent.getFirstProperty('organizer');
          const organizerRaw = organizerProp
            ? String(organizerProp.getFirstValue()).replace(/^mailto:/i, '').trim()
            : null;
          const organization = organizerRaw && organizerRaw.length > 2 && !organizerRaw.includes('@')
            ? organizerRaw
            : feed.organization;

          const isOnline = !!(locationRaw && /online|virtual|webinar|zoom|teams|remote/i.test(locationRaw));
          const region = inferRegion(locationRaw);
          const searchText = `${title} ${description ?? ''} ${locationRaw ?? ''}`;
          const sdgGoals = inferSdgGoals(searchText);

          const classified = classifyEventSync({
            title,
            organization,
            description,
            sdg_goals: sdgGoals,
          });

          const { error } = await adminSupabase.from('events').insert({
            title,
            description,
            start_date: startDate,
            end_date: endDate,
            location: locationRaw,
            registration_url: registrationUrl,
            organization,
            is_online: isOnline,
            region,
            sdg_goals: sdgGoals,
            sdg_inferred: true,
            format: isOnline ? 'virtual' : 'in_person',
            event_type: 'conference',
            status: 'published',
            confidence_score: 5,
            quality_score: 4,
            is_public: true,
            is_side_event: false,
            is_recurring: false,
            language: 'en',
            source_id: feed.id,
            source_url: feed.url,
            speakers: null,
            category: classified?.category ?? null,
            category_secondary: classified && classified.secondary.length > 0 ? classified.secondary : null,
            category_confidence: classified?.confidence ?? null,
            category_source: classified?.source ?? null,
            category_classified_at: classified ? new Date().toISOString() : null,
          });

          if (error) {
            feedResult.errors.push(`Insert error: ${error.message.slice(0, 80)}`);
          } else {
            feedResult.saved++;
          }
        } catch (evErr) {
          feedResult.errors.push(`Event error: ${String(evErr).slice(0, 80)}`);
        }
      }
    } catch (fetchErr) {
      feedResult.errors.push(`Fetch error: ${String(fetchErr).slice(0, 80)}`);
    }

    results.push(feedResult);
  }

  return NextResponse.json({ results });
}
