import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/organizations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public — invoked by the /submit combobox when the user types an org name
// that doesn't exist in the directory and clicks "+ Add new organization".
// Inserts a tier-3 community-submitted row with status='pending'. Admin
// reviews via the Directory panel and promotes to tier 2 or rejects.
//
// Idempotent: if the slug already exists we bump submission_count and return
// the existing row (so a duplicate "Add" doesn't error).
export async function POST(req: NextRequest) {
  let body: { name?: string; org_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (name.length < 2 || name.length > 200) {
    return NextResponse.json({ error: "name must be 2-200 chars" }, { status: 400 });
  }
  const slug = slugify(name);
  if (!slug) return NextResponse.json({ error: "Could not derive slug from name" }, { status: 400 });

  // Sanitize org_type — default to "other" if absent or unknown.
  const ALLOWED_TYPES = new Set([
    "un_agency", "un_fund", "un_programme", "multilateral", "ifi",
    "foundation", "ngo", "government", "university", "think_tank",
    "civil_society", "private_sector", "media", "other",
  ]);
  const orgType = body.org_type && ALLOWED_TYPES.has(body.org_type) ? body.org_type : "other";

  // Check for existing.
  const { data: existing } = await adminSupabase
    .from("organizations_directory")
    .select("id, slug, name, short_name, org_type, region, tier, logo_url, submission_count, status")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    // Bump count, return existing.
    await adminSupabase
      .from("organizations_directory")
      .update({ submission_count: (existing.submission_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return NextResponse.json({
      data: existing,
      created: false,
      message: "Organization already exists in the directory.",
    });
  }

  const { data, error } = await adminSupabase
    .from("organizations_directory")
    .insert({
      slug,
      name,
      short_name: name.length <= 30 ? name : null,
      org_type: orgType,
      tier: 3,
      source: "submission",
      status: "pending",
      submission_count: 1,
    })
    .select("id, slug, name, short_name, org_type, region, tier, logo_url")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, created: true });
}
