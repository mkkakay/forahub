// Admin endpoint for the multi-manager model.
//
//   GET    → list every org_managers row, joined to the org for context.
//   DELETE → remove a manager seat by id. Does NOT flip is_claimed/is_verified
//            on the org — the badge stays until an admin explicitly clears it.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  const adminKey = req.headers.get("x-admin-key");
  return !!adminSecret && adminKey === adminSecret;
}

interface ManagerRow {
  id: string;
  org_slug: string;
  user_id: string;
  email: string;
  role: string;
  added_at: string;
  verified_at: string | null;
  added_via: string | null;
  org_name: string;
  org_domain: string | null;
  org_is_verified: boolean | null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await adminSupabase
    .from("org_managers")
    .select(`
      id, org_slug, user_id, email, role, added_at, verified_at, added_via,
      organizations_directory:org_slug (
        name, domain, is_verified
      )
    `)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: ManagerRow[] = ((data ?? []) as Array<Record<string, unknown>>).map(r => {
    const orgRel = (r.organizations_directory ?? {}) as Record<string, unknown>;
    return {
      id: r.id as string,
      org_slug: r.org_slug as string,
      user_id: r.user_id as string,
      email: (r.email as string) ?? "",
      role: (r.role as string) ?? "manager",
      added_at: r.added_at as string,
      verified_at: (r.verified_at ?? null) as string | null,
      added_via: (r.added_via ?? null) as string | null,
      org_name: (orgRel.name as string) ?? (r.org_slug as string),
      org_domain: (orgRel.domain ?? null) as string | null,
      org_is_verified: (orgRel.is_verified ?? null) as boolean | null,
    };
  });

  return NextResponse.json({ managers: rows, count: rows.length });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string };
  try { body = await req.json(); } catch { body = {}; }
  const id = body.id?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await adminSupabase.from("org_managers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
