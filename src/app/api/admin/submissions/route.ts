import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security/timing";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // User-driven submissions waiting for review.
  // submission_source IS NOT NULL excludes scraper-originated rows.
  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, organization, start_date, end_date, location, format, submitter_email, submitted_by_user_id, submission_source, submitted_at, registration_url, description")
    .eq("submission_status", "pending")
    .not("submission_source", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (error) return sanitizeApiError(error, "admin/submissions", 500);
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  const action = body.action;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const patch: Record<string, unknown> =
    action === "approve"
      ? { submission_status: "approved", status: "published" }
      : { submission_status: "rejected", status: "rejected" };

  if (action === "reject" && body.reason) {
    // Optional rejection reason — append to event_brief for now; future could be its own column.
    patch.event_brief = `[Rejected] ${body.reason.trim()}`.slice(0, 1000);
  }

  const { data, error } = await adminSupabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select("id, submission_status, status")
    .single();

  if (error) return sanitizeApiError(error, "admin/submissions", 500);
  return NextResponse.json({ data });
}
