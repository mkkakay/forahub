import { type NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const RELIEFWEB_ENDPOINT = 'https://api.reliefweb.int/v1/training';
const APP_NAME = 'forahub.org';

// Map ReliefWeb theme names to SDG numbers
const THEME_SDG_MAP: [RegExp, number][] = [
  [/poverty/i, 1],
  [/food|hunger|agriculture|nutrition/i, 2],
  [/health|disease|medical|epidemic|hiv|aids|malaria/i, 3],
  [/education|learning|training|school/i, 4],
  [/gender|women|girls/i, 5],
  [/water|sanitation|hygiene|wash/i, 6],
  [/energy|electricity|renewable/i, 7],
  [/employment|labour|labor|economic growth|livelihood/i, 8],
  [/innovation|industry|infrastructure|technology/i, 9],
  [/inequality|migrant|refugee|displacement/i, 10],
  [/urban|city|shelter|housing/i, 11],
  [/consumption|production|waste/i, 12],
  [/climate|carbon|emission|disaster/i, 13],
  [/ocean|marine|fisheries/i, 14],
  [/biodiversity|forest|land|ecosystem|environment/i, 15],
  [/peace|justice|governance|human rights|conflict|protection/i, 16],
  [/partnership|cooperation|coordination/i, 17],
];

function inferSdgGoals(themes: { name?: string }[] | undefined): number[] {
  if (!Array.isArray(themes) || themes.length === 0) return [];
  const found = new Set<number>();
  for (const t of themes) {
    const name = t?.name;
    if (!name) continue;
    for (const [pattern, sdg] of THEME_SDG_MAP) {
      if (pattern.test(name)) found.add(sdg);
    }
  }
  return Array.from(found).sort((a, b) => a - b);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toISODate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

interface ReliefWebEvent {
  id: number | string;
  fields?: {
    title?: string;
    body?: string;
    date?: { start?: string; end?: string };
    city?: string;
    country?: { name?: string }[];
    format?: { name?: string }[];
    source?: { name?: string }[];
    url?: string;
    theme?: { name?: string }[];
  };
}

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  if (!process.env.ADMIN_SECRET || adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let limit = 1000;
  let offset = 0;
  try {
    const body = await req.json() as { limit?: number; offset?: number };
    if (typeof body.limit === 'number') limit = Math.min(Math.max(1, body.limit), 1000);
    if (typeof body.offset === 'number') offset = Math.max(0, body.offset);
  } catch { /* empty body ok */ }

  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];

  const url = new URL(RELIEFWEB_ENDPOINT);
  url.searchParams.set('appname', APP_NAME);
  url.searchParams.set('profile', 'full');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('filter[field]', 'date.start');
  url.searchParams.set('filter[value][from]', today);

  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  let payload: { data?: ReliefWebEvent[] };
  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const text = await res.text();
      const errMsg = `ReliefWeb HTTP ${res.status}: ${text.slice(0, 200)}`;
      await adminSupabase.from('source_status').upsert({
        source_id: 'reliefweb_api',
        organization: 'ReliefWeb (OCHA)',
        url: RELIEFWEB_ENDPOINT,
        last_attempted_at: new Date().toISOString(),
        status: 'error',
        last_error: errMsg,
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }
    payload = await res.json() as { data?: ReliefWebEvent[] };
  } catch (err) {
    const errMsg = `ReliefWeb fetch failed: ${String(err).slice(0, 200)}`;
    await adminSupabase.from('source_status').upsert({
      source_id: 'reliefweb_api',
      organization: 'ReliefWeb (OCHA)',
      url: RELIEFWEB_ENDPOINT,
      last_attempted_at: new Date().toISOString(),
      status: 'error',
      last_error: errMsg,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: errMsg }, { status: 502 });
  }

  const items = Array.isArray(payload.data) ? payload.data : [];
  fetched = items.length;

  for (const item of items) {
    try {
      const fields = item.fields ?? {};
      const title = fields.title?.trim();
      const startDate = toISODate(fields.date?.start);

      if (!title || !startDate) {
        skipped++;
        continue;
      }

      const endDate = toISODate(fields.date?.end);
      const description = fields.body ? stripHtml(fields.body).slice(0, 2000) : null;

      const formatNames = (fields.format ?? []).map(f => f?.name ?? '');
      const isOnline = formatNames.some(n => /online/i.test(n));

      const city = fields.city?.trim();
      const countryName = fields.country?.[0]?.name?.trim();
      let location: string | null = null;
      if (city && countryName) location = `${city}, ${countryName}`;
      else if (countryName) location = countryName;
      else if (city) location = city;
      else if (isOnline) location = 'Online';

      const organizationName = fields.source?.[0]?.name?.trim() ?? 'ReliefWeb';
      const registrationUrl = fields.url ?? null;
      const externalId = `reliefweb_${item.id}`;
      const sdgGoals = inferSdgGoals(fields.theme);

      const { data: existing } = await adminSupabase
        .from('events')
        .select('id')
        .eq('source_type', 'reliefweb')
        .eq('external_id', externalId)
        .maybeSingle();

      const row = {
        title: title.slice(0, 500),
        description,
        start_date: startDate,
        end_date: endDate,
        location,
        is_online: isOnline,
        organization: organizationName,
        registration_url: registrationUrl,
        external_id: externalId,
        source_type: 'reliefweb',
        sdg_goals: sdgGoals,
        sdg_inferred: sdgGoals.length > 0,
        format: isOnline ? 'virtual' : 'in_person',
        event_type: 'training',
        status: 'published',
        confidence_score: 5,
        quality_score: 4,
        is_public: true,
        is_side_event: false,
        is_recurring: false,
        language: 'en',
        source_id: 'reliefweb_api',
        source_url: RELIEFWEB_ENDPOINT,
      };

      if (existing) {
        const { error } = await adminSupabase
          .from('events')
          .update(row)
          .eq('id', existing.id);
        if (error) {
          errors.push(`${externalId}: update – ${error.message.slice(0, 120)}`);
        } else {
          updated++;
        }
      } else {
        const { error } = await adminSupabase.from('events').insert(row);
        if (error) {
          errors.push(`${externalId}: insert – ${error.message.slice(0, 120)}`);
        } else {
          inserted++;
        }
      }
    } catch (err) {
      errors.push(`event error: ${String(err).slice(0, 120)}`);
    }
  }

  const durationSeconds = Math.round((Date.now() - startTime) / 1000);

  const eventsLastRun = inserted + updated;
  await adminSupabase.from('source_status').upsert({
    source_id: 'reliefweb_api',
    organization: 'ReliefWeb (OCHA)',
    url: RELIEFWEB_ENDPOINT,
    last_attempted_at: new Date().toISOString(),
    last_success_at: eventsLastRun > 0 ? new Date().toISOString() : null,
    consecutive_failures: eventsLastRun > 0 ? 0 : 1,
    status: eventsLastRun > 0 ? 'healthy' : 'idle',
    events_last_run: eventsLastRun,
    last_error: errors.length > 0 ? errors.slice(0, 5).join(' | ').slice(0, 500) : null,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({
    fetched,
    inserted,
    updated,
    skipped,
    errors,
    durationSeconds,
  });
}
