import { adminSupabase } from "@/lib/supabase/admin";

export interface OrgManagerRow {
  id: string;
  org_slug: string;
  user_id: string;
  email: string;
  role: string;
  added_at: string;
  verified_at: string | null;
  added_via: string | null;
}

/** True iff the user holds a manager seat on this org. The /claim flow,
 *  /orgs/[slug]/manage server page, and the manage PATCH route all gate on
 *  this same predicate so they can't disagree. */
export async function isOrgManager(orgSlug: string, userId: string): Promise<boolean> {
  const { data, error } = await adminSupabase
    .from("org_managers")
    .select("id")
    .eq("org_slug", orgSlug)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/** Idempotent insert. Returns the resulting row (whether inserted or
 *  pre-existing). */
export async function addOrgManager(opts: {
  orgSlug: string;
  userId: string;
  email: string;
  verifiedAt?: string | null;
  addedVia?: string | null;
}): Promise<OrgManagerRow | null> {
  const verifiedAt = opts.verifiedAt ?? new Date().toISOString();
  const { data, error } = await adminSupabase
    .from("org_managers")
    .upsert(
      {
        org_slug: opts.orgSlug,
        user_id: opts.userId,
        email: opts.email,
        role: "manager",
        verified_at: verifiedAt,
        added_via: opts.addedVia ?? null,
      },
      { onConflict: "org_slug,user_id" },
    )
    .select()
    .maybeSingle();
  if (error) return null;
  return data as OrgManagerRow | null;
}

export async function listOrgManagers(orgSlug: string): Promise<OrgManagerRow[]> {
  const { data, error } = await adminSupabase
    .from("org_managers")
    .select("id, org_slug, user_id, email, role, added_at, verified_at, added_via")
    .eq("org_slug", orgSlug)
    .order("added_at", { ascending: true });
  if (error) return [];
  return (data as OrgManagerRow[]) ?? [];
}
