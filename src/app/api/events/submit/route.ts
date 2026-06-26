import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { adminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/organizations";
import { geocodeLocation } from "@/lib/geo/geocode";
import { classifyEventSync } from "@/lib/categories/classify";
import { isCategoryKey, type CategoryKey, type CategorySource } from "@/lib/categories";
import { evaluateAutoPublish } from "@/lib/orgs/autoPublish";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Source = "flyer_ai" | "url_ai" | "manual";

interface SubmitBody {
  title?: string;
  description?: string;
  organization?: string;
  start_date?: string;
  end_date?: string | null;
  registration_deadline?: string | null;
  timezone?: string;
  format?: "in_person" | "virtual" | "hybrid";
  location?: string | null;
  online_url?: string | null;
  registration_url?: string | null;
  will_be_recorded?: boolean;
  recording_url?: string | null;
  capacity?: number | null;
  primary_sdg?: number | null;
  banner_image_url?: string | null;
  uploaded_flyer_url?: string | null;
  cost_type?: "free" | "paid" | "sliding_scale" | "donor_funded" | null;
  cost_details?: string | null;
  target_audience?: string[] | null;
  co_organizers?: string | null;
  speakers?: string | null; // textarea — serialized to text[] on insert
  event_languages?: string[] | null;
  // Category — submitter can confirm/override the suggestion from /api/events/categorize.
  category?: string | null;
  category_secondary?: string[] | null;
  source?: Source;
  // Anonymous-only:
  submitter_email?: string;
  // Logged-in:
  submitted_by_user_id?: string;
}

const ALLOWED_COST = new Set(["free", "paid", "sliding_scale", "donor_funded"]);
const ALLOWED_AUDIENCE = new Set([
  "all", "researchers", "government", "civil_society",
  "private_sector", "youth", "donors", "invite_only",
]);

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function isAdminUserId(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data: { user } } = await adminSupabase.auth.admin.getUserById(userId);
    if (!user) return false;
    // app_metadata.role === 'admin' OR user_metadata.is_admin === true
    const md = (user.app_metadata ?? {}) as { role?: string };
    const um = (user.user_metadata ?? {}) as { is_admin?: boolean };
    return md.role === "admin" || um.is_admin === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Required field validation ─────────────────────────────────────
  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  const organization = (body.organization ?? "").trim();
  const startDate = (body.start_date ?? "").trim();
  const format = body.format === "in_person" || body.format === "virtual" || body.format === "hybrid"
    ? body.format
    : null;
  const source: Source = body.source === "flyer_ai" || body.source === "url_ai" ? body.source : "manual";

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description required" }, { status: 400 });
  if (!organization) return NextResponse.json({ error: "organization required" }, { status: 400 });
  if (!startDate) return NextResponse.json({ error: "start_date required" }, { status: 400 });
  if (!format) return NextResponse.json({ error: "format must be in_person, virtual, or hybrid" }, { status: 400 });

  // start_date must parse
  const startParsed = new Date(startDate);
  if (isNaN(startParsed.getTime())) {
    return NextResponse.json({ error: "start_date is not a valid date" }, { status: 400 });
  }
  let endParsed: Date | null = null;
  if (body.end_date) {
    endParsed = new Date(body.end_date);
    if (isNaN(endParsed.getTime())) {
      return NextResponse.json({ error: "end_date is not a valid date" }, { status: 400 });
    }
  }

  // ── Identity: logged-in vs anonymous ──────────────────────────────
  const submittedByUserId = body.submitted_by_user_id?.trim() || null;
  let submitterEmail = (body.submitter_email ?? "").trim() || null;

  if (submittedByUserId) {
    // Pull canonical email from auth so a client can't impersonate a different address.
    try {
      const { data: { user } } = await adminSupabase.auth.admin.getUserById(submittedByUserId);
      submitterEmail = user?.email ?? submitterEmail;
    } catch {
      // Fall through — submitterEmail may still be set from the request body.
    }
  } else {
    // Anonymous submissions require a contact email.
    if (!submitterEmail) {
      return NextResponse.json({ error: "submitter_email required for anonymous submissions" }, { status: 400 });
    }
    if (!isEmail(submitterEmail)) {
      return NextResponse.json({ error: "submitter_email is not a valid email" }, { status: 400 });
    }
  }

  // ── Auto-approve eligibility ──────────────────────────────────────
  //
  // Three tiers, evaluated in order:
  //
  //   (1) Org-manager auto-publish (NEW). Requires a signed-in user whose
  //       seat in org_managers covers this org slug AND the seat has
  //       effective auto-publish (domain_match/oauth_session OR
  //       can_autopublish=true granted by a domain-verified manager). The
  //       evaluator also enforces the rolling-24h soft cap per org —
  //       beyond N auto-publishes in 24h, submissions fall through to the
  //       review queue with a friendly explanation.
  //
  //   (2) Legacy organization_overrides.is_verified flag. Still honoured
  //       for the anonymous/public path so anything that already auto-
  //       published before this feature continues to. NOTE: this is a
  //       DIFFERENT field from organizations_directory.is_verified — the
  //       badge UI reads the directory column; this gate reads overrides.
  //
  //   (3) Admin-submitter override. Admin user posts → auto-approve.
  const orgSlug = slugify(organization);
  const submitterIsAdmin = await isAdminUserId(submittedByUserId);

  let autoApprove = false;
  let autoBranch: "manager" | "legacy" | "admin" | null = null;
  let capHit: { recent: number; cap: number; windowHours: number } | null = null;
  let autoPublishedByUserId: string | null = null;

  if (submittedByUserId) {
    const eva = await evaluateAutoPublish({ orgSlug, userId: submittedByUserId });
    if (eva.outcome === "publish") {
      autoApprove = true;
      autoBranch = "manager";
      autoPublishedByUserId = submittedByUserId;
    } else if (eva.outcome === "cap_hit") {
      // The signed-in user is allowed to auto-publish in principle, but the
      // org has already burned its rolling-24h budget. Route to review and
      // surface the cap context to the client so the UI copy is honest.
      capHit = { recent: eva.recent, cap: eva.cap, windowHours: eva.windowHours };
    }
    // not_granted / not_a_manager → fall through to the legacy / admin gates.
  }

  if (!autoApprove) {
    const { data: overrideRow } = await adminSupabase
      .from("organization_overrides")
      .select("is_verified")
      .eq("slug", orgSlug)
      .maybeSingle();
    const legacyVerified = !!(overrideRow as { is_verified?: boolean } | null)?.is_verified;
    if (legacyVerified) { autoApprove = true; autoBranch = "legacy"; }
    else if (submitterIsAdmin) { autoApprove = true; autoBranch = "admin"; }
  }

  const submissionStatus = autoApprove ? "approved" : "pending";

  // sdg_goals is an int[]; convert single primary_sdg → array.
  const sdgGoals = typeof body.primary_sdg === "number" && body.primary_sdg >= 1 && body.primary_sdg <= 17
    ? [body.primary_sdg]
    : [];

  // ── Extended-field validation ─────────────────────────────────────
  const costType =
    body.cost_type && ALLOWED_COST.has(body.cost_type) ? body.cost_type : "free";
  const audience = Array.isArray(body.target_audience)
    ? body.target_audience.filter(a => typeof a === "string" && ALLOWED_AUDIENCE.has(a))
    : null;
  const languages = Array.isArray(body.event_languages)
    ? body.event_languages
        .filter(l => typeof l === "string" && l.trim().length > 0)
        .map(l => l.trim())
    : null;
  // `speakers` is text[] in the DB; the submit form sends a textarea string.
  // Split on newlines OR commas, trim each, drop empties.
  const speakersArr = typeof body.speakers === "string" && body.speakers.trim()
    ? body.speakers.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
    : null;
  const regDeadline = body.registration_deadline ? new Date(body.registration_deadline) : null;
  if (regDeadline && isNaN(regDeadline.getTime())) {
    return NextResponse.json({ error: "registration_deadline is not a valid date" }, { status: 400 });
  }

  // Category: submitter-set values lock the row so the AI bulk pass leaves
  // them alone. Falls back to the keyword + SDG classifier when not provided.
  let category: CategoryKey | null = null;
  let categorySecondary: CategoryKey[] = [];
  let categoryConfidence: number | null = null;
  let categorySource: CategorySource | null = null;
  let categoryLocked = false;
  if (isCategoryKey(body.category)) {
    category = body.category;
    categorySecondary = Array.isArray(body.category_secondary)
      ? (body.category_secondary.filter(isCategoryKey) as CategoryKey[])
          .filter(k => k !== category)
          .slice(0, 2)
      : [];
    categoryConfidence = 1.0;
    categorySource = "submitter";
    categoryLocked = true;
  } else {
    const auto = classifyEventSync({
      title,
      organization,
      description,
      sdg_goals: sdgGoals,
    });
    if (auto) {
      category = auto.category;
      categorySecondary = auto.secondary;
      categoryConfidence = auto.confidence;
      categorySource = auto.source;
    }
  }

  // ── Insert ────────────────────────────────────────────────────────
  const insertRow: Record<string, unknown> = {
    title,
    description,
    organization,
    // Stable slug so the manage-page Events panel and the 24h-cap query can
    // count this row against the org. Populated for ALL signed-in submissions
    // (not just auto-publish) so the panel shows pending review rows too.
    org_slug: orgSlug,
    start_date: startParsed.toISOString(),
    end_date: endParsed ? endParsed.toISOString() : null,
    registration_deadline: regDeadline ? regDeadline.toISOString() : null,
    timezone: (body.timezone ?? "UTC").trim() || "UTC",
    format,
    location: body.location?.trim() || null,
    online_url: body.online_url?.trim() || null,
    registration_url: body.registration_url?.trim() || null,
    will_be_recorded: !!body.will_be_recorded,
    recording_url: body.recording_url?.trim() || null,
    capacity:
      typeof body.capacity === "number" && body.capacity > 0
        ? Math.floor(body.capacity)
        : null,
    sdg_goals: sdgGoals,
    banner_image_url: body.banner_image_url?.trim() || null,
    banner_fetched_at: body.banner_image_url ? new Date().toISOString() : null,
    uploaded_flyer_url: body.uploaded_flyer_url?.trim() || null,
    cost_type: costType,
    cost_details: body.cost_details?.trim() || null,
    target_audience: audience && audience.length > 0 ? audience : null,
    co_organizers: body.co_organizers?.trim() || null,
    speakers: speakersArr,
    event_languages: languages && languages.length > 0 ? languages : ["en"],
    // Existing scraper-driven status — published if we're auto-approving, else pending.
    status: autoApprove ? "published" : "pending",
    // New user-driven submission moderation.
    submission_status: submissionStatus,
    submission_source: source,
    submitted_by_user_id: submittedByUserId,
    submitter_email: submitterEmail,
    submitted_at: new Date().toISOString(),
    // Auto-publish audit. Only set when the NEW manager branch is the
    // reason for the auto-approve — the legacy and admin branches don't
    // count against the 24h cap so they leave these NULL.
    auto_published_at: autoBranch === "manager" ? new Date().toISOString() : null,
    auto_published_by_user_id: autoBranch === "manager" ? autoPublishedByUserId : null,
    is_featured: false,
    category,
    category_secondary: categorySecondary.length > 0 ? categorySecondary : null,
    category_confidence: categoryConfidence,
    category_source: categorySource,
    category_locked: categoryLocked,
    category_classified_at: category ? new Date().toISOString() : null,
  };

  const { data, error } = await adminSupabase
    .from("events")
    .insert(insertRow)
    .select("id, title, submission_status")
    .single();

  if (error) {
    console.error("[events/submit] insert failed:", error.message);
    return sanitizeApiError(error, "events/submit", 500);
  }

  // Auto-geocode in-person events in the background so they appear on the map
  // without blocking the submission response.
  const locationText = typeof insertRow.location === "string" ? insertRow.location : null;
  if (locationText && format !== "virtual") {
    const eventId = data.id;
    const task = (async () => {
      const result = await geocodeLocation(locationText);
      await adminSupabase
        .from("events")
        .update({
          latitude: result.lat ?? null,
          longitude: result.lng ?? null,
          geocode_status: result.status,
          geocode_error: result.error ?? null,
          geocoded_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    })();
    try { waitUntil(task); } catch { void task.catch(() => {}); }
  }

  const message = autoApprove
    ? autoBranch === "manager"
      ? `You're a verified manager of ${organization} — your event is live now.`
      : autoBranch === "legacy"
        ? `${organization} is a verified organization — your event is live now.`
        : "Approved automatically (admin submission) — your event is live."
    : capHit
      ? `Your event was submitted and will appear after a quick review. ${organization} has hit its ${capHit.cap}-event-per-${capHit.windowHours}h soft cap, so further auto-publishes are paused until tomorrow.`
      : "Submitted for review. Our team will publish within 24 hours and email you when it's approved.";

  return NextResponse.json({
    event_id: data.id,
    status: data.submission_status,
    auto_approved: autoApprove,
    auto_branch: autoBranch,
    cap_hit: capHit ? { ...capHit } : null,
    message,
  });
}
