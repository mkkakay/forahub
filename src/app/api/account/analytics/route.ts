// DELETE /api/account/analytics
//
// Erase every event_analytics_events row for the signed-in user. We
// scope STRICTLY to user_id = auth.uid() so a user can only purge
// their own logs, never another user's.

import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "signin_required" }, { status: 401 });

  const { data, error } = await adminSupabase
    .from("event_analytics_events")
    .delete()
    .eq("user_id", user.id)
    .select("id");
  if (error) return sanitizeApiError(error, "account/analytics", 500);

  return NextResponse.json({
    success: true,
    deleted_rows: (data ?? []).length,
  });
}
