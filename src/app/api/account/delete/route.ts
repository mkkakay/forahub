// DELETE /api/account
//
// Self-serve account deletion for the signed-in user. STRICTLY scoped
// to the session user — the route never accepts a user_id from the
// client. The Supabase admin client is used only to run the final
// admin.deleteUser() call and to bypass RLS for the attribution
// scrub; ownership is established via `sb.auth.getUser()` first.
//
// Why this route exists at all (vs. relying on CASCADE alone):
//   1. Several FK columns on `events` / `event_series` / `org_*`
//      reference auth.users WITHOUT an ON DELETE clause, so Postgres
//      would block admin.deleteUser() until those are nulled.
//   2. We need the org-orphan guard (a user who is the only manager of
//      an org cannot be allowed to delete their account silently —
//      that would leave the org un-claimable).
//   3. We send the GDPR-receipt confirmation email AFTER deletion
//      succeeds so the user always gets a record of the action.
//
// Contract:
//   Method:  POST  (browsers can't send a body with DELETE without
//                   tooling, and the request needs a confirmation
//                   field — POST is the pragmatic choice here.)
//   Body:    { confirm: "DELETE" }
//            Server requires the literal string "DELETE" so a stray
//            click can't trigger the action.
//   Errors:
//     401 signin_required
//     400 invalid_confirmation
//     409 sole_manager   + { orgs: [{slug, name}] }
//     500 server_error   (via sanitizeApiError; full error logged)
//   Success:
//     200 { success: true, email_sent: boolean }

import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sanitizeApiError } from "@/lib/security/apiError";
import { renderAccountDeletedEmail } from "@/lib/email/accountDeleted";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DeleteBody {
  confirm?: unknown;
}

interface OrphanOrg {
  slug: string;
  name: string;
}

/**
 * Find every org where the user is the SOLE manager.
 * If `user` deletes their account, those orgs would be left with zero
 * managers — un-claimable, un-editable. Block the deletion with the
 * list so the UI can ask the user to add another manager first.
 */
async function findSoleManagedOrgs(userId: string): Promise<OrphanOrg[]> {
  const { data: myRows, error: myErr } = await adminSupabase
    .from("org_managers")
    .select("org_slug")
    .eq("user_id", userId);
  if (myErr) throw myErr;
  const mySlugs = ((myRows ?? []) as { org_slug: string }[]).map(r => r.org_slug);
  if (mySlugs.length === 0) return [];

  const { data: allRows, error: allErr } = await adminSupabase
    .from("org_managers")
    .select("org_slug, user_id")
    .in("org_slug", mySlugs);
  if (allErr) throw allErr;
  const others = (allRows ?? []) as { org_slug: string; user_id: string }[];

  // A slug is "sole" if no row exists for it with a different user_id.
  const orphanedSlugs = mySlugs.filter(slug =>
    !others.some(m => m.org_slug === slug && m.user_id !== userId)
  );
  if (orphanedSlugs.length === 0) return [];

  const { data: orgs, error: orgsErr } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name")
    .in("slug", orphanedSlugs);
  if (orgsErr) throw orgsErr;
  // Preserve the order we found the orphans in so the UI list is stable.
  const byName = new Map(((orgs ?? []) as OrphanOrg[]).map(o => [o.slug, o.name]));
  return orphanedSlugs.map(slug => ({ slug, name: byName.get(slug) ?? slug }));
}

/**
 * Null out attribution FK columns that reference auth.users without
 * an ON DELETE clause. Without this step, admin.deleteUser() will fail
 * with a foreign-key violation on the first such row. Each UPDATE
 * targets ONLY rows where the column matches the deleting user — no
 * cross-user touch.
 */
async function scrubAttribution(userId: string): Promise<void> {
  // events — keep the event content, remove the link to the user.
  await adminSupabase.from("events")
    .update({ submitted_by_user_id: null })
    .eq("submitted_by_user_id", userId);
  await adminSupabase.from("events")
    .update({ auto_published_by_user_id: null })
    .eq("auto_published_by_user_id", userId);

  // event_series — same shape.
  await adminSupabase.from("event_series")
    .update({ auto_published_by_user_id: null })
    .eq("auto_published_by_user_id", userId);

  // org_managers — clear "this autopublish flag was granted by user X"
  // on every OTHER manager's row. (The user's own row vanishes via
  // CASCADE on user_id.)
  await adminSupabase.from("org_managers")
    .update({ autopublish_granted_by: null, autopublish_granted_at: null })
    .eq("autopublish_granted_by", userId);

  // org_invites — keep historical invite rows (audit trail) but null
  // the FK columns the user touched.
  await adminSupabase.from("org_invites")
    .update({ accepted_user_id: null })
    .eq("accepted_user_id", userId);

  // org_claims — legacy table, may still hold rows. Null the FK so the
  // claim history is preserved without blocking the delete.
  await adminSupabase.from("org_claims")
    .update({ user_id: null })
    .eq("user_id", userId);

  // organizations_directory — legacy single-owner column. We still null
  // it for orgs that haven't been migrated to org_managers fully.
  await adminSupabase.from("organizations_directory")
    .update({ claimed_by_user_id: null })
    .eq("claimed_by_user_id", userId);
}

async function sendConfirmationEmail(email: string, deletedAt: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;
  const { subject, html, text } = renderAccountDeletedEmail({ email, deletedAt });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "ForaHub <admin@forahub.org>",
        to: email,
        subject,
        html,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // 1. Establish identity from the server session — never from the body.
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "signin_required" }, { status: 401 });

  // 2. Required typed confirmation. The literal "DELETE" string is what
  //    the UI asks the user to type into the modal — keeps a stray POST
  //    from triggering the action.
  let body: DeleteBody;
  try { body = (await req.json()) as DeleteBody; } catch { body = {}; }
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "invalid_confirmation" }, { status: 400 });
  }

  // 3. Org-orphan guard.
  try {
    const orphans = await findSoleManagedOrgs(user.id);
    if (orphans.length > 0) {
      return NextResponse.json(
        { error: "sole_manager", orgs: orphans },
        { status: 409 },
      );
    }
  } catch (err) {
    return sanitizeApiError(err, "account/delete:orphan_check", 500);
  }

  // 4. Capture the email NOW — once admin.deleteUser() runs the auth
  //    row is gone and we lose the address we'd send the receipt to.
  const userEmail = user.email ?? "";

  // 5. Null attribution columns so the auth-user delete doesn't trip
  //    a foreign-key violation on a column without ON DELETE handling.
  try {
    await scrubAttribution(user.id);
  } catch (err) {
    return sanitizeApiError(err, "account/delete:scrub", 500);
  }

  // 6. Delete the auth user. CASCADE handles profiles, saved_events,
  //    abstracts, keyword_alerts, notifications, push_subscriptions,
  //    referrals, event_analytics_events, org_managers, org_invites
  //    (where the user is the inviter), and event_series (where the
  //    user is the creator).
  const { error: delErr } = await adminSupabase.auth.admin.deleteUser(user.id);
  if (delErr) return sanitizeApiError(delErr, "account/delete:auth_user", 500);

  // 7. Receipt email. Best-effort: if Resend is unconfigured or fails
  //    we don't surface that as an error — the deletion already
  //    succeeded and the user has the in-app confirmation.
  const deletedAt = new Date().toISOString();
  const emailSent = userEmail
    ? await sendConfirmationEmail(userEmail, deletedAt)
    : false;

  return NextResponse.json({ success: true, email_sent: emailSent });
}
