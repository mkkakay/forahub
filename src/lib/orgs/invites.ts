import { adminSupabase } from "@/lib/supabase/admin";

export interface OrgInviteRow {
  id: string;
  org_slug: string;
  invited_email: string;
  token: string;
  invited_by_user_id: string;
  invited_by_email: string | null;
  note: string | null;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
  revoked_at: string | null;
  created_at: string;
}

const INVITE_TTL_DAYS = 7;
const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;

export const ORG_INVITE_TTL_DAYS = INVITE_TTL_DAYS;

export function newInviteToken(): string {
  // crypto.randomUUID() gives ~122 bits of entropy — plenty for a single-use
  // bearer + the row is indexed by token + status, so we don't need a
  // longer/derived secret.
  return crypto.randomUUID().replace(/-/g, "");
}

export function inviteExpiry(): string {
  return new Date(Date.now() + INVITE_TTL_MS).toISOString();
}

export async function findInviteByToken(token: string): Promise<OrgInviteRow | null> {
  const { data, error } = await adminSupabase
    .from("org_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) return null;
  return (data as OrgInviteRow | null) ?? null;
}

export async function listPendingInvites(orgSlug: string): Promise<OrgInviteRow[]> {
  const { data, error } = await adminSupabase
    .from("org_invites")
    .select("*")
    .eq("org_slug", orgSlug)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as OrgInviteRow[]) ?? [];
}
