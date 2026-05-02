import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedEvent, UpsertResult } from './types';

// Using a permissive Supabase client type to avoid complex generic constraints
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ── String similarity ─────────────────────────────────────────────────────────

/** Normalise a title for comparison: lowercase, strip punctuation, collapse whitespace. */
function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Jaccard similarity on word bigrams. Returns 0–1. */
function titleSimilarity(a: string, b: string): number {
  const bigrams = (s: string): Set<string> => {
    const words = normaliseTitle(s).split(' ');
    const set = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) set.add(`${words[i]} ${words[i + 1]}`);
    if (words.length === 1) set.add(words[0]); // single-word title
    return set;
  };
  const sa = bigrams(a);
  const sb = bigrams(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let intersection = 0;
  sa.forEach(g => { if (sb.has(g)) intersection++; });
  return intersection / (sa.size + sb.size - intersection);
}

/** Two date ranges overlap (or are close within 7 days). */
function datesOverlap(
  aStart: string | undefined,
  aEnd: string | undefined,
  bStart: string | undefined,
  bEnd: string | undefined,
): boolean {
  if (!aStart || !bStart) return false;
  const as = new Date(aStart).getTime();
  const ae = aEnd ? new Date(aEnd).getTime() : as + 86_400_000;
  const bs = new Date(bStart).getTime();
  const be = bEnd ? new Date(bEnd).getTime() : bs + 86_400_000;
  const BUFFER = 7 * 86_400_000;
  return as - BUFFER <= be && bs - BUFFER <= ae;
}

// ── Auto-publish rules ────────────────────────────────────────────────────────

function shouldAutoPublish(event: ExtractedEvent): boolean {
  if (!event.title || !event.start_date) return false;
  if (event.confidence_score < 4) return false;
  if (event.quality_score < 3) return false;
  const start = new Date(event.start_date);
  const now = new Date();
  if (start <= now) return false;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() + 24);
  if (start > cutoff) return false;
  return true;
}

// ── Upsert logic ──────────────────────────────────────────────────────────────

export async function deduplicateAndUpsert(
  events: ExtractedEvent[],
  sourceId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
  dryRun = false,
): Promise<UpsertResult> {
  const result: UpsertResult = { inserted: 0, updated: 0, rejected: 0, pendingReview: 0 };

  if (events.length === 0) return result;

  const supabase: AnySupabaseClient = createClient(supabaseUrl, serviceRoleKey);

  // Discard events missing required fields
  const valid = events.filter(e => {
    if (!e.title || e.title.trim().length < 3) return false;
    if (!e.start_date) return false;
    const start = new Date(e.start_date);
    if (isNaN(start.getTime())) return false;
    if (start < new Date()) return false; // past events dropped
    return true;
  });
  result.rejected += events.length - valid.length;

  // Fetch existing events for dedup window (next 24 months)
  const lookAhead = new Date();
  lookAhead.setMonth(lookAhead.getMonth() + 24);

  const { data: existingRows } = await supabase
    .from('events')
    .select('id, title, start_date, end_date, series_name, parent_event_id, source_id')
    .gte('start_date', new Date().toISOString())
    .lte('start_date', lookAhead.toISOString());

  const existing = existingRows ?? [];

  for (const event of valid) {
    // Check for duplicate: title ≥85% similar AND dates overlap
    const dupe = existing.find(row => {
      const sim = titleSimilarity(event.title, row.title);
      if (sim < 0.85) return false;
      return datesOverlap(event.start_date, event.end_date, row.start_date, row.end_date ?? undefined);
    });

    const status = shouldAutoPublish(event) ? 'published' : 'pending';
    if (status === 'pending') result.pendingReview++;

    // Build the DB row
    const location = [event.location_venue, event.location_city, event.location_country]
      .filter(Boolean).join(', ') || null;

    const row = {
      title: event.title,
      description: event.description ?? null,
      start_date: event.start_date,
      end_date: event.end_date ?? null,
      location,
      organization: event.organization,
      sdg_goals: event.sdg_goals,
      event_type: event.event_type ?? 'conference',
      format: event.format ?? 'in_person',
      registration_url: event.registration_url ?? null,
      status,
      source_url: event.source_url,
      source_id: sourceId,
      confidence_score: event.confidence_score,
      quality_score: event.quality_score,
      event_brief: event.event_brief ?? null,
      is_side_event: event.is_side_event,
      parent_conference_name: event.parent_conference_name ?? null,
      is_recurring: event.is_recurring,
      series_name: event.series_name ?? null,
      sdg_inferred: event.sdg_inferred,
      region: event.region ?? null,
      cost_type: event.cost_type ?? null,
      cost_amount: event.cost_amount ?? null,
      audience_level: event.audience_level ?? null,
      is_public: event.is_public,
      expected_attendance: event.expected_attendance ?? null,
      speakers: event.speakers.length ? event.speakers : null,
      language: event.language,
      title_original: event.title_original ?? null,
      description_original: event.description_original ?? null,
    };

    if (dupe) {
      // Update only if we have new information (higher quality or new fields)
      const currentQuality = (dupe as Record<string, unknown>).quality_score as number ?? 0;
      if (event.quality_score > currentQuality || event.registration_url) {
        if (!dryRun) {
          await supabase.from('events').update(row).eq('id', dupe.id);
          // Update deadlines
          await upsertDeadlines(supabase, dupe.id, event);
        }
        result.updated++;
      }
      // else: skip — existing record is better
    } else {
      if (dryRun) {
        result.inserted++;
        continue;
      }

      // Resolve parent event for side events
      let parentEventId: string | null = null;
      if (event.is_side_event && event.parent_conference_name) {
        const { data: parent } = await supabase
          .from('events')
          .select('id')
          .ilike('title', `%${event.parent_conference_name.slice(0, 30)}%`)
          .gte('start_date', new Date().toISOString())
          .limit(1)
          .single();
        parentEventId = parent?.id ?? null;
      }

      // Resolve recurring parent (previous year's edition by series_name)
      let seriesParentId: string | null = null;
      if (event.is_recurring && event.series_name) {
        const { data: prev } = await supabase
          .from('events')
          .select('id')
          .eq('series_name', event.series_name)
          .lt('start_date', event.start_date!)
          .order('start_date', { ascending: false })
          .limit(1)
          .single();
        seriesParentId = prev?.id ?? null;
      }

      const { data: inserted, error } = await supabase
        .from('events')
        .insert({ ...row, parent_event_id: parentEventId ?? seriesParentId ?? null })
        .select('id')
        .single();

      if (error) {
        console.error('[upsert] insert error:', error.message);
        result.rejected++;
        continue;
      }

      await upsertDeadlines(supabase, inserted.id, event);
      result.inserted++;

      // Add to in-memory list so later events in the same batch can detect this as a dupe
      existing.push({
        id: inserted.id,
        title: event.title,
        start_date: event.start_date!,
        end_date: event.end_date ?? null,
        series_name: event.series_name ?? null,
        parent_event_id: parentEventId,
        source_id: sourceId,
      });
    }
  }

  return result;
}

async function upsertDeadlines(
  supabase: AnySupabaseClient,
  eventId: string,
  event: ExtractedEvent,
): Promise<void> {
  if (!event.deadlines || event.deadlines.length === 0) return;
  for (const dl of event.deadlines) {
    if (!dl.date || isNaN(new Date(dl.date).getTime())) continue;
    await supabase.from('event_deadlines').upsert(
      { event_id: eventId, deadline_type: dl.type, deadline_date: dl.date, description: dl.description ?? null },
      { onConflict: 'event_id,deadline_type' },
    );
  }
}
