import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/organizations";

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
  const orgSlug = slugify(organization);
  const { data: overrideRow } = await adminSupabase
    .from("organization_overrides")
    .select("is_verified")
    .eq("slug", orgSlug)
    .maybeSingle();
  const orgVerified = !!(overrideRow as { is_verified?: boolean } | null)?.is_verified;

  const submitterIsAdmin = await isAdminUserId(submittedByUserId);

  const autoApprove = orgVerified || submitterIsAdmin;
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

  // ── Insert ────────────────────────────────────────────────────────
  const insertRow: Record<string, unknown> = {
    title,
    description,
    organization,
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
    is_featured: false,
  };

  const { data, error } = await adminSupabase
    .from("events")
    .insert(insertRow)
    .select("id, title, submission_status")
    .single();

  if (error) {
    console.error("[events/submit] insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const message = autoApprove
    ? orgVerified
      ? `${organization} is a verified organization — your event is live now.`
      : "Approved automatically (admin submission) — your event is live."
    : "Submitted for review. Our team will publish within 24 hours and email you when it's approved.";

  return NextResponse.json({
    event_id: data.id,
    status: data.submission_status,
    auto_approved: autoApprove,
    message,
  });
}
