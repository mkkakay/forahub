import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CandidateRow {
  id: string;
  title: string;
  start_date: string;
  organization: string | null;
}

/** Simple JS-side similarity for the duplicate check.
 *
 * pg_trgm is already enabled (migration 022) and gives us a fast index, but
 * Supabase's REST API doesn't expose the `similarity()` function directly.
 * We could create an RPC, but the candidate set is small (events within ±3
 * days of the submitted date), so a JS-side Jaccard-on-trigrams is plenty.
 */
function trigrams(s: string): Set<string> {
  const padded = `  ${s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()}  `;
  const set = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
  return set;
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  ta.forEach(t => { if (tb.has(t)) intersection++; });
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export async function POST(req: NextRequest) {
  let body: { title?: string; start_date?: string; organization?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const startStr = (body.start_date ?? "").trim();

  if (title.length < 5) return NextResponse.json({ error: "title must be at least 5 characters" }, { status: 400 });
  if (!startStr) return NextResponse.json({ error: "start_date required" }, { status: 400 });

  const start = new Date(startStr);
  if (isNaN(start.getTime())) return NextResponse.json({ error: "start_date is not a valid date" }, { status: 400 });

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const windowStart = new Date(start.getTime() - THREE_DAYS_MS).toISOString();
  const windowEnd = new Date(start.getTime() + THREE_DAYS_MS).toISOString();

  // Pull candidates in the ±3-day window, accepting either of the two
  // approval flags (existing scraper events use status='published',
  // new submissions use submission_status='approved').
  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, start_date, organization, status, submission_status")
    .gte("start_date", windowStart)
    .lte("start_date", windowEnd)
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const candidates = ((data ?? []) as (CandidateRow & { status: string | null; submission_status: string | null })[])
    .filter(c => c.status === "published" || c.submission_status === "approved");

  const scored = candidates
    .map(c => ({
      id: c.id,
      title: c.title,
      start_date: c.start_date,
      organization: c.organization,
      similarity_score: Number(similarity(title, c.title).toFixed(3)),
      event_url: `/events/${c.id}`,
    }))
    .filter(c => c.similarity_score > 0.4)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 5);

  return NextResponse.json({
    has_duplicates: scored.length > 0,
    candidates: scored,
  });
}
