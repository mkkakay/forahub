"use client";

// Live team-management panel. The server page lists current managers and
// pending invites at first paint; this component layers on the
// invite-form, resend, revoke, and remove-manager actions. All four
// actions go through APIs that re-check isOrgManager server-side, so the
// UI gating here is for ergonomics — never the source of authority.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, AlertCircle, CheckCircle2, X, Loader2, Trash2,
  Send, RefreshCw, Crown, ShieldCheck, UserPlus, Clock, Info,
} from "lucide-react";

export interface ManagerView {
  id: string;
  user_id: string;
  email: string;
  role: string;
  added_at: string;
  verified_at: string | null;
  added_via: string | null;
  is_founder: boolean;
  is_self: boolean;
  can_autopublish: boolean;
  autopublish_granted_at: string | null;
  /** True iff added_via is a "trusted" tier — the toggle is hidden for
   *  these seats because they always autopublish by virtue of how they
   *  joined. */
  is_trusted: boolean;
}

export interface InviteView {
  id: string;
  invited_email: string;
  invited_by_email: string | null;
  note: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

interface Props {
  slug: string;
  orgName: string;
  orgDomain: string | null;
  managers: ManagerView[];
  invites: InviteView[];
  /** True iff the signed-in viewer is a domain-verified manager — only
   *  these callers see the autopublish toggle on other seats. The server
   *  re-checks regardless. */
  viewerIsDomainVerified: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERROR_COPY: Record<string, string> = {
  signin_required: "You're signed out. Refresh and sign in again to manage the team.",
  not_a_manager: "Only verified managers of this org can do that.",
  not_domain_verified: "Only managers with a verified work-email can change instant-publish access.",
  invalid_email: "That doesn't look like a valid email address.",
  already_a_manager: "That email is already on the team.",
  last_manager: "An org needs at least one manager. You can't remove the last seat.",
  founder_protected: "The founding manager seat is protected. Ask an admin to transfer it.",
  invite_not_found: "We couldn't find that invitation — it may have been revoked already.",
  invite_not_pending: "That invitation has already been accepted or revoked.",
  invite_expired: "That invitation has expired.",
  manager_not_found: "We couldn't find that team member.",
  can_autopublish_required: "Pick on or off and try again.",
  org_not_found: "We couldn't find this organization.",
  email_send_failed: "Invitation saved, but the email didn't send. Try resending in a few minutes.",
};

function friendly(code: string | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!code) return fallback;
  return ERROR_COPY[code] ?? fallback;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function viaLabel(added_via: string | null): { label: string; Icon: typeof ShieldCheck } {
  if (added_via === "invitation") return { label: "Invited", Icon: UserPlus };
  if (added_via === "domain_match" || added_via === "oauth_session") return { label: "Verified via work email", Icon: ShieldCheck };
  if (added_via === "admin_review") return { label: "Verified via admin review", Icon: ShieldCheck };
  return { label: "Verified", Icon: ShieldCheck };
}

function initialFor(email: string): string {
  const t = (email || "").trim();
  if (!t) return "?";
  const at = t.indexOf("@");
  const local = at > 0 ? t.slice(0, at) : t;
  return (local[0] || "?").toUpperCase();
}

export default function TeamPanel(props: Props) {
  const router = useRouter();
  const [managers, setManagers] = useState<ManagerView[]>(props.managers);
  const [invites, setInvites] = useState<InviteView[]>(props.invites);

  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function flash(kind: "ok" | "error", text: string) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 5000);
  }

  const canActOnManagers = managers.length > 1;

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setInviteError(ERROR_COPY.invalid_email);
      return;
    }
    if (managers.some(m => m.email.toLowerCase() === trimmed.toLowerCase())) {
      setInviteError(ERROR_COPY.already_a_manager);
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`/api/orgs/${props.slug}/team/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, note: note.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(friendly(json?.error));
        return;
      }
      // Optimistically pull the latest invites list so the new row shows up.
      await refreshInvites();
      setEmail("");
      setNote("");
      flash("ok", json.email_sent
        ? `Invitation sent to ${trimmed}.`
        : `Invitation saved for ${trimmed}, but the email didn't send. Try resending in a minute.`);
    } catch {
      setInviteError("Something went wrong. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function refreshInvites() {
    try {
      const res = await fetch(`/api/orgs/${props.slug}/team/invites`);
      const json = await res.json();
      if (res.ok) setInvites((json.invites ?? []) as InviteView[]);
    } catch { /* silent — keeps old state */ }
  }

  async function resendInvite(inv: InviteView) {
    setActingId(inv.id);
    try {
      const res = await fetch(`/api/orgs/${props.slug}/team/invites/${inv.id}/resend`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        flash("error", friendly(json?.error));
        return;
      }
      await refreshInvites();
      flash("ok", json.email_sent ? `Invitation re-sent to ${inv.invited_email}.` : `Invitation refreshed, but the email didn't send.`);
    } catch {
      flash("error", "Something went wrong. Please try again.");
    } finally {
      setActingId(null);
    }
  }

  async function revokeInvite(inv: InviteView) {
    setActingId(inv.id);
    try {
      const res = await fetch(`/api/orgs/${props.slug}/team/invites/${inv.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        flash("error", friendly(json?.error));
        return;
      }
      setInvites(prev => prev.filter(p => p.id !== inv.id));
      setRevokeConfirmId(null);
      flash("ok", `Invitation to ${inv.invited_email} revoked.`);
    } catch {
      flash("error", "Something went wrong. Please try again.");
    } finally {
      setActingId(null);
    }
  }

  async function toggleAutoPublish(m: ManagerView, next: boolean) {
    setActingId(m.id);
    try {
      const res = await fetch(`/api/orgs/${props.slug}/team/managers/${m.id}/autopublish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ can_autopublish: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        flash("error", friendly(json?.error));
        return;
      }
      setManagers(prev => prev.map(p => p.id === m.id ? { ...p, can_autopublish: next, autopublish_granted_at: next ? new Date().toISOString() : null } : p));
      flash("ok", next
        ? `${m.email} can now publish events instantly.`
        : `${m.email} will route through review going forward.`);
    } catch {
      flash("error", "Something went wrong. Please try again.");
    } finally {
      setActingId(null);
    }
  }

  async function removeManager(m: ManagerView) {
    setActingId(m.id);
    try {
      const res = await fetch(`/api/orgs/${props.slug}/team/managers/${m.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        flash("error", friendly(json?.error));
        return;
      }
      if (m.is_self) {
        // We just removed ourselves — manage access is gone. Bounce home.
        router.push(`/?removed=${encodeURIComponent(props.slug)}`);
        router.refresh();
        return;
      }
      setManagers(prev => prev.filter(p => p.id !== m.id));
      setRemoveConfirmId(null);
      flash("ok", `${m.email} removed from the team.`);
    } catch {
      flash("error", "Something went wrong. Please try again.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_1px_2px_rgba(15,42,74,0.04)]">
      <header className="p-5 md:p-6 border-b border-gray-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-slate-100">Team</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Invite colleagues to help manage events and profile updates. Anyone at <span className="font-mono">@{props.orgDomain ?? "your work domain"}</span> can join automatically.
        </p>
      </header>

      {toast && (
        <div className={`mx-5 md:mx-6 mt-4 flex items-start gap-2 text-sm rounded-xl px-3 py-2 border ${
          toast.kind === "ok"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toast.kind === "ok"
            ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            : <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />}
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)} className={toast.kind === "ok" ? "text-emerald-500 hover:text-emerald-700" : "text-red-500 hover:text-red-700"}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Current managers — restrained Linear/Vercel/Notion-style list.
          Single accent color, muted metadata, no competing pills. */}
      <div className="p-5 md:p-6 space-y-3">
        <h3 className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider inline-flex items-center gap-2">
          Members
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-1 tabular-nums">{managers.length}</span>
        </h3>
        <ul className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
          {managers.map(m => {
            const via = viaLabel(m.added_via);
            const ViaIcon = via.Icon;
            const isFounderRow = m.is_founder;
            const removeDisabled = !canActOnManagers || isFounderRow;
            const removeReason = isFounderRow
              ? "Founding manager — protected. Ask an admin to transfer."
              : !canActOnManagers ? "Can't remove the last manager." : null;
            const showToggle = props.viewerIsDomainVerified && !m.is_trusted;
            const effectiveAutoPub = m.is_trusted || m.can_autopublish;
            return (
              <li key={m.id} className="group px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Avatar — single initial, muted gray. Same size for
                      every row, sets a consistent rhythm. */}
                  <div
                    className="shrink-0 w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-slate-300 select-none"
                    aria-hidden="true"
                  >
                    {initialFor(m.email)}
                  </div>

                  {/* Email + tiny role indicators. "You" is muted text,
                      Founder is a small icon — no colored pills. */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-gray-900 dark:text-slate-100 font-medium truncate">
                        {m.email || "(unknown email)"}
                      </span>
                      {isFounderRow && (
                        <Crown
                          className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0"
                          aria-label="Founding manager"
                        />
                      )}
                      {m.is_self && (
                        <span className="text-xs text-gray-600 dark:text-slate-400 shrink-0">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1.5 truncate">
                      <ViaIcon className="w-3 h-3 text-gray-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
                      <span className="truncate">{via.label}</span>
                      <span className="text-gray-300 dark:text-slate-600" aria-hidden="true">·</span>
                      <span className="truncate">Joined {fmtDate(m.verified_at ?? m.added_at)}</span>
                    </div>
                  </div>

                  {/* Right-side controls — instant-publish toggle (if
                      applicable) + remove button. Toggle uses the brand
                      accent ONLY when on; off-state is neutral gray. */}
                  <div className="shrink-0 hidden sm:flex items-center gap-3">
                    {showToggle && (
                      <PublishToggle
                        on={m.can_autopublish}
                        busy={actingId === m.id}
                        onChange={(next) => toggleAutoPublish(m, next)}
                      />
                    )}
                    {!showToggle && effectiveAutoPub && (
                      // Read-only "Instant publish" hint for non-grant-capable
                      // viewers — just a muted line, no colored chip.
                      <span className="text-xs text-gray-500 dark:text-slate-400">Instant publish</span>
                    )}
                    <RemoveControl
                      m={m}
                      confirmId={removeConfirmId}
                      actingId={actingId}
                      disabled={removeDisabled}
                      reason={removeReason}
                      onAskConfirm={() => setRemoveConfirmId(m.id)}
                      onCancel={() => setRemoveConfirmId(null)}
                      onConfirm={() => removeManager(m)}
                    />
                  </div>
                </div>

                {/* Mobile-only second row for actions, so the email line
                    above doesn't get cramped. */}
                <div className="sm:hidden mt-3 flex items-center justify-between gap-3 pl-12">
                  {showToggle && (
                    <PublishToggle
                      on={m.can_autopublish}
                      busy={actingId === m.id}
                      onChange={(next) => toggleAutoPublish(m, next)}
                    />
                  )}
                  {!showToggle && effectiveAutoPub && (
                    <span className="text-xs text-gray-500 dark:text-slate-400">Instant publish</span>
                  )}
                  <RemoveControl
                    m={m}
                    confirmId={removeConfirmId}
                    actingId={actingId}
                    disabled={removeDisabled}
                    reason={removeReason}
                    onAskConfirm={() => setRemoveConfirmId(m.id)}
                    onCancel={() => setRemoveConfirmId(null)}
                    onConfirm={() => removeManager(m)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pending invites */}
      <div className="px-5 md:px-6 pb-5 md:pb-6 space-y-3 border-t border-gray-100 dark:border-slate-800 pt-5 md:pt-6">
        <h3 className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider inline-flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-400 dark:text-slate-500" /> Pending invitations
          {invites.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-1 tabular-nums">{invites.length}</span>
          )}
        </h3>
        {invites.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-slate-400">
            No invitations are waiting on a reply.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
            {invites.map(inv => (
              <li key={inv.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-900 dark:text-slate-100 truncate font-medium">{inv.invited_email}</div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                      sent {fmtDate(inv.created_at)}
                      {inv.invited_by_email && <> by {inv.invited_by_email}</>}
                      <> · expires {fmtDate(inv.expires_at)}</>
                    </div>
                    {inv.note && (
                      <div className="mt-1 text-[12px] text-gray-700 dark:text-slate-200 italic border-l-2 border-gray-200 dark:border-slate-700 pl-2">
                        &ldquo;{inv.note}&rdquo;
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resendInvite(inv)}
                      disabled={actingId === inv.id}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-700 border border-blue-200 hover:bg-blue-50 disabled:opacity-50 rounded px-2 py-1"
                    >
                      {actingId === inv.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Resend
                    </button>
                    {revokeConfirmId === inv.id ? (
                      <>
                        <button
                          onClick={() => revokeInvite(inv)}
                          disabled={actingId === inv.id}
                          className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-[11px] px-2 py-1 rounded"
                        >
                          {actingId === inv.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                          Confirm
                        </button>
                        <button
                          onClick={() => setRevokeConfirmId(null)}
                          className="text-[11px] text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevokeConfirmId(inv.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-red-700 border border-red-200 hover:bg-red-50 rounded px-2 py-1"
                      >
                        <Trash2 className="w-3 h-3" /> Revoke
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invite form */}
      <div className="border-t border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/60 rounded-b-2xl px-5 md:px-6 py-5">
        <h3 className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100 inline-flex items-center gap-2">
          <UserPlus className="w-3.5 h-3.5 text-[#0f2a4a] dark:text-slate-100" /> Invite a co-manager
        </h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 mt-1 inline-flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            Any email works — including external collaborators outside <span className="font-mono">@{props.orgDomain ?? "your domain"}</span>. They&apos;ll be asked to sign in with the invited email to accept.
          </span>
        </p>
        <form onSubmit={submitInvite} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3">
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@example.org"
                required
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de]"
              />
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="inline-flex items-center justify-center gap-2 bg-[#0f2a4a] hover:bg-[#1a3f6e] disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm whitespace-nowrap"
            >
              {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {inviting ? "Sending…" : "Send invite"}
            </button>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Optional note — appears in the email and on the accept page."
            rows={2}
            maxLength={500}
            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de] resize-none"
          />
          {inviteError && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
              <span className="flex-1">{inviteError}</span>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

// ─── Restrained sub-components for the manager row ───────────────────

function PublishToggle({
  on, busy, onChange,
}: { on: boolean; busy: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 cursor-pointer select-none">
      <span className="hidden sm:inline">Instant publish</span>
      <span className="sm:hidden">Instant publish</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy}
        onClick={() => onChange(!on)}
        className={
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60 " +
          (on ? "bg-[#0f2a4a]" : "bg-gray-200 dark:bg-slate-700")
        }
      >
        <span
          className={
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-slate-800 shadow transition-transform " +
            (on ? "translate-x-5" : "translate-x-1")
          }
        />
      </button>
      {busy && <Loader2 size={10} className="animate-spin text-gray-400 dark:text-slate-500" />}
    </label>
  );
}

function RemoveControl({
  m, confirmId, actingId, disabled, reason,
  onAskConfirm, onCancel, onConfirm,
}: {
  m: ManagerView;
  confirmId: string | null;
  actingId: string | null;
  disabled: boolean;
  reason: string | null;
  onAskConfirm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (confirmId === m.id) {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={actingId === m.id}
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800 disabled:opacity-60"
        >
          {actingId === m.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          {m.is_self ? "Leave team" : "Confirm remove"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onAskConfirm}
      title={reason ?? (m.is_self ? "Remove yourself from the team" : "Remove from team")}
      aria-label={m.is_self ? "Leave team" : `Remove ${m.email}`}
      className={
        "inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors " +
        (disabled
          ? "text-gray-300 dark:text-slate-600 cursor-not-allowed"
          : "text-gray-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50")
      }
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
