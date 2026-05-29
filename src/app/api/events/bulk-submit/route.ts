import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { adminSupabase } from "@/lib/supabase/admin";
import { geocodeLocation } from "@/lib/geo/geocode";
import { classifyEventSync } from "@/lib/categories/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BulkEventInput {
  title?: string;
  description?: string | null;
  organization?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  is_online?: boolean | null;
  registration_url?: string | null;
  primary_sdg?: number | null;
}

interface BulkSubmitBody {
  events?: BulkEventInput[];
  submitter_email?: string;
  submitted_by_user_id?: string;
  source_type?: string;
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: BulkSubmitBody;
  try {
    body = (await req.json()) as BulkSubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) {
    return NextResponse.json({ error: "events array required and must be non-empty" }, { status: 400 });
  }
  if (events.length > 100) {
    return NextResponse.json({ error: "Maximum 100 events per bulk submission" }, { status: 400 });
  }

  // ── Identity ──────────────────────────────────────────────────────
  const submittedByUserId = body.submitted_by_user_id?.trim() || null;
  let submitterEmail = (body.submitter_email ?? "").trim() || null;

  if (submittedByUserId) {
    try {
      const { data: { user } } = await adminSupabase.auth.admin.getUserById(submittedByUserId);
      submitterEmail = user?.email ?? submitterEmail;
    } catch {
      // Fall through
    }
  } else {
    if (!submitterEmail || !isEmail(submitterEmail)) {
      return NextResponse.json(
        { error: "submitter_email required (valid email) for anonymous submissions" },
        { status: 400 }
      );
    }
  }

  const sourceType = (body.source_type ?? "").trim() || "unknown";
  const submissionSource = `bulk_${sourceType}`;
  const submittedAt = new Date().toISOString();

  // Use a shared batch_id so admin can group these together later.
  const bulkBatchId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  type SkipReason = { index: number; title: string; reason: string };
  const skipped: SkipReason[] = [];
  const validRows: Record<string, unknown>[] = [];

  events.forEach((evt, index) => {
    const title = (evt.title ?? "").trim();
    if (!title) {
      skipped.push({ index, title: "(untitled)", reason: "missing title" });
      return;
    }
    const startRaw = (evt.start_date ?? "").trim();
    if (!startRaw) {
      skipped.push({ index, title, reason: "missing start_date" });
      return;
    }
    const startDate = new Date(startRaw);
    if (isNaN(startDate.getTime())) {
      skipped.push({ index, title, reason: "invalid start_date" });
      return;
    }
    let endDate: Date | null = null;
    if (evt.end_date) {
      const d = new Date(evt.end_date);
      if (!isNaN(d.getTime())) endDate = d;
    }

    const description = (evt.description ?? "").trim();
    const organization = (evt.organization ?? "").trim() || "Unknown";
    const location = (evt.location ?? "").trim() || null;
    const isOnline = !!evt.is_online;
    const format = isOnline ? "virtual" : location ? "in_person" : "virtual";
    const regUrl = (evt.registration_url ?? "").trim() || null;
    const sdg =
      typeof evt.primary_sdg === "number" && evt.primary_sdg >= 1 && evt.primary_sdg <= 17
        ? [Math.floor(evt.primary_sdg)]
        : [];

    const classified = classifyEventSync({
      title,
      organization,
      description: description || null,
      sdg_goals: sdg,
    });

    validRows.push({
      title,
      description: description || `Imported event: ${title}`,
      organization,
      start_date: startDate.toISOString(),
      end_date: endDate ? endDate.toISOString() : null,
      timezone: "UTC",
      format,
      location,
      online_url: isOnline ? regUrl : null,
      registration_url: regUrl,
      sdg_goals: sdg,
      event_languages: ["en"],
      status: "pending",
      submission_status: "pending",
      submission_source: submissionSource,
      submission_batch_id: bulkBatchId,
      submitted_by_user_id: submittedByUserId,
      submitter_email: submitterEmail,
      submitted_at: submittedAt,
      is_featured: false,
      category: classified?.category ?? null,
      category_secondary: classified && classified.secondary.length > 0 ? classified.secondary : null,
      category_confidence: classified?.confidence ?? null,
      category_source: classified?.source ?? null,
      category_classified_at: classified ? new Date().toISOString() : null,
    });
  });

  if (validRows.length === 0) {
    return NextResponse.json(
      {
        submitted: 0,
        skipped: skipped.length,
        skipped_reasons: skipped,
        error: "No events passed validation",
      },
      { status: 400 }
    );
  }

  // Insert without submission_batch_id first; if the column doesn't exist yet,
  // retry without it. This keeps the route working even if the migration hasn't run.
  let inserted = 0;
  let insertError: string | null = null;

  const { data, error } = await adminSupabase
    .from("events")
    .insert(validRows)
    .select("id, location, format");

  let insertedRows: { id: string; location: string | null; format: string | null }[] = [];

  if (error) {
    // If the column doesn't exist, fall back to inserting without batch_id.
    if (/submission_batch_id/i.test(error.message)) {
      const stripped = validRows.map(row => {
        const copy = { ...row };
        delete copy.submission_batch_id;
        return copy;
      });
      const retry = await adminSupabase.from("events").insert(stripped).select("id, location, format");
      if (retry.error) {
        insertError = retry.error.message;
      } else {
        insertedRows = (retry.data ?? []) as typeof insertedRows;
        inserted = insertedRows.length;
      }
    } else {
      insertError = error.message;
    }
  } else {
    insertedRows = (data ?? []) as typeof insertedRows;
    inserted = insertedRows.length;
  }

  if (insertError) {
    console.error("[events/bulk-submit] insert failed:", insertError);
    return NextResponse.json({ error: insertError }, { status: 500 });
  }

  // Background-geocode every in-person event in the batch.
  const geocodeTargets = insertedRows.filter(r => r.location && r.format !== "virtual");
  if (geocodeTargets.length > 0) {
    const task = (async () => {
      for (const row of geocodeTargets) {
        const result = await geocodeLocation(row.location);
        await adminSupabase
          .from("events")
          .update({
            latitude: result.lat ?? null,
            longitude: result.lng ?? null,
            geocode_status: result.status,
            geocode_error: result.error ?? null,
            geocoded_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        await new Promise(r => setTimeout(r, 500));
      }
    })();
    try { waitUntil(task); } catch { void task.catch(() => {}); }
  }

  return NextResponse.json({
    submitted: inserted,
    skipped: skipped.length,
    skipped_reasons: skipped,
    batch_id: bulkBatchId,
    message: `${inserted} event${inserted === 1 ? "" : "s"} submitted for review.`,
  });
}
