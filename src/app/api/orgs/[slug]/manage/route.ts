import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrgRow {
  claimed_by_user_id: string | null;
  is_claimed: boolean | null;
}

const MAX_TEXT = 600;
const MAX_NAME = 120;

function trimOrNull(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

async function authorize(slug: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const userId = u.user?.id ?? null;
  if (!userId) return { ok: false, status: 401, error: "not_signed_in" };

  const { data, error } = await adminSupabase
    .from("organizations_directory")
    .select("claimed_by_user_id, is_claimed")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  const org = data as OrgRow | null;
  if (!org) return { ok: false, status: 404, error: "org_not_found" };
  if (!org.is_claimed || org.claimed_by_user_id !== userId) {
    return { ok: false, status: 403, error: "not_authorized" };
  }
  return { ok: true };
}

export async function PATCH(req: NextRequest, ctx: { params: { slug: string } }) {
  const slug = ctx.params.slug;
  const auth = await authorize(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  if ("name" in body) patch.name = trimOrNull(body.name, MAX_NAME);
  if ("short_name" in body) patch.short_name = trimOrNull(body.short_name, MAX_NAME);
  if ("description" in body) patch.description = trimOrNull(body.description, MAX_TEXT);
  if ("logo_url" in body) patch.logo_url = trimOrNull(body.logo_url, 600);
  if ("website_url" in body) patch.website_url = trimOrNull(body.website_url, 300);
  if ("twitter_url" in body) patch.twitter_url = trimOrNull(body.twitter_url, 300);
  if ("linkedin_url" in body) patch.linkedin_url = trimOrNull(body.linkedin_url, 300);

  if (!patch.name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from("organizations_directory")
    .update(patch)
    .eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
