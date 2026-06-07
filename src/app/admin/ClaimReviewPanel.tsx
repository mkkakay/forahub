"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, ChevronDown, ChevronRight, Loader2, AlertCircle, ExternalLink,
  CheckCircle2, X, BadgeCheck, Building2,
} from "lucide-react";

interface PendingClaim {
  id: string;
  org_slug: string;
  user_email: string;
  user_id: string | null;
  status: string;
  verification_path: string | null;
  claimant_name: string | null;
  claimant_role: string | null;
  claimant_proof_url: string | null;
  claimant_message: string | null;
  claimed_at: string | null;
  created_at: string;
  org_name: string;
  org_domain: string | null;
  org_source: string;
  org_tier: number | null;
  org_logo_url: string | null;
}

interface StatusResponse {
  pending: PendingClaim[];
  count: number;
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sourceBadge(source: string, tier: number | null): { label: string; cls: string } {
  const tierLabel = tier ? ` · T${tier}` : "";
  if (source === "manual")  return { label: `manual${tierLabel}`,   cls: "bg-emerald-900/30 text-emerald-300 border-emerald-700/40" };
  if (source === "ror")     return { label: `ror${tierLabel}`,      cls: "bg-sky-900/30 text-sky-300 border-sky-700/40" };
  if (source === "iati")    return { label: `iati${tierLabel}`,     cls: "bg-violet-900/30 text-violet-300 border-violet-700/40" };
  if (source === "submission") return { label: `submission${tierLabel}`, cls: "bg-amber-900/30 text-amber-300 border-amber-700/40" };
  return { label: `${source}${tierLabel}`, cls: "bg-slate-700/50 text-slate-300 border-slate-700/60" };
}

export default function ClaimReviewPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-row UI state: which action is being prompted, what reason text.
  const [denyPromptFor, setDenyPromptFor] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const headers = useMemo(
    () => ({ "x-admin-key": adminSecret }) as const,
    [adminSecret],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/claim-review", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as StatusResponse);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);
  // Always fetch the count even when collapsed so the badge stays current.
  useEffect(() => { if (!open) refresh(); }, [open, refresh]);

  async function act(claim: PendingClaim, action: "approve" | "approve_no_badge" | "deny", reason?: string) {
    setActingId(claim.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/claim-review", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: claim.id, action, denial_reason: reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      // Drop the row locally so the panel updates immediately.
      setData(prev => prev
        ? { pending: prev.pending.filter(p => p.id !== claim.id), count: Math.max(0, prev.count - 1) }
        : prev,
      );
      setDenyPromptFor(null);
      setDenyReason("");
      if (action === "deny") {
        setToast(json.email_sent
          ? `Denied ${claim.org_name} — denial email sent to ${claim.user_email}`
          : `Denied ${claim.org_name} — email send failed (${json.email_reason ?? "unknown"}); claim status updated`,
        );
      } else if (action === "approve") {
        setToast(`Approved ${claim.org_name} with verified badge.`);
      } else {
        setToast(`Approved ${claim.org_name} (no badge).`);
      }
      window.setTimeout(() => setToast(null), 6000);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setActingId(null);
    }
  }

  const pending = data?.pending ?? [];
  const count = data?.count ?? 0;
  const domainMatches = (c: PendingClaim) => c.org_domain && emailDomain(c.user_email) === c.org_domain.toLowerCase();

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-300" />
          <h2 className="text-white font-semibold">Claim Review</h2>
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] text-[11px] font-bold rounded-full bg-amber-400 text-[#0f2a4a] px-1.5">
              {count}
            </span>
          )}
          <span className="text-xs text-blue-500">
            {count === 0 ? "no claims awaiting review" : `${count} awaiting review`}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-3">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200"><X size={14} /></button>
            </div>
          )}
          {toast && (
            <div className="flex items-start gap-2 text-sm text-emerald-200 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">{toast}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-300">
              Email-verified claims that did <strong>not</strong> auto-pass the domain match. Approve grants ownership; the verified badge is optional. Deny requires a reason and emails the claimant.
            </p>
            <button onClick={refresh} disabled={loading} className="text-xs text-[#4ea8de] hover:underline">
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {loading && pending.length === 0 && (
            <div className="px-4 py-10 text-center text-blue-500 text-sm inline-flex items-center justify-center gap-2 w-full">
              <Loader2 size={14} className="animate-spin" /> Loading queue…
            </div>
          )}
          {!loading && pending.length === 0 && (
            <div className="px-4 py-10 text-center text-blue-400 text-sm">
              Queue is empty.
            </div>
          )}

          <ul className="space-y-3">
            {pending.map(claim => {
              const match = domainMatches(claim);
              const claimantDomain = emailDomain(claim.user_email);
              const isDenying = denyPromptFor === claim.id;
              const busy = actingId === claim.id;
              const src = sourceBadge(claim.org_source, claim.org_tier);

              return (
                <li
                  key={claim.id}
                  className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-4"
                >
                  {/* Header — org + source + submitted */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="shrink-0 w-12 h-12 rounded-md bg-white border border-blue-900/40 flex items-center justify-center overflow-hidden">
                      {claim.org_logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={claim.org_logo_url} alt="" className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <Building2 size={18} className="text-blue-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold text-sm">{claim.org_name}</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border rounded px-1.5 py-0.5 ${src.cls}`}>
                          {src.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-400 mt-0.5">/{claim.org_slug}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-blue-400 whitespace-nowrap">
                      submitted {fmtDate(claim.created_at)}
                    </span>
                  </div>

                  {/* Domain compare row — the visual at-a-glance check */}
                  <div className="grid sm:grid-cols-2 gap-2 mb-3">
                    <div className="bg-[#0d2240] border border-blue-900/40 rounded-md px-3 py-2">
                      <div className="text-[10px] text-blue-400 uppercase tracking-wider">Org domain</div>
                      <div className="text-white text-sm font-mono break-all">
                        {claim.org_domain ? `@${claim.org_domain}` : <span className="text-blue-500">none on file</span>}
                      </div>
                    </div>
                    <div className={`border rounded-md px-3 py-2 ${match ? "bg-emerald-900/20 border-emerald-700/40" : "bg-amber-900/20 border-amber-700/40"}`}>
                      <div className={`text-[10px] uppercase tracking-wider ${match ? "text-emerald-300" : "text-amber-300"}`}>
                        Claimant email domain {match ? "(matches)" : "(does NOT match)"}
                      </div>
                      <div className="text-white text-sm font-mono break-all">@{claimantDomain}</div>
                    </div>
                  </div>

                  {/* Claimant + meta */}
                  <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
                    <div><span className="text-blue-400">Name:</span> <span className="text-white">{claim.claimant_name ?? <span className="text-blue-500">—</span>}</span></div>
                    <div><span className="text-blue-400">Email:</span> <span className="text-white break-all">{claim.user_email}</span></div>
                    <div><span className="text-blue-400">Role:</span> <span className="text-white">{claim.claimant_role ?? <span className="text-blue-500">—</span>}</span></div>
                    <div>
                      <span className="text-blue-400">Proof:</span>{" "}
                      {claim.claimant_proof_url
                        ? <a href={claim.claimant_proof_url} target="_blank" rel="noopener noreferrer" className="text-[#4ea8de] hover:underline inline-flex items-center gap-1">link <ExternalLink size={10} /></a>
                        : <span className="text-blue-500">—</span>}
                    </div>
                    {claim.claimant_message && (
                      <div className="sm:col-span-2 mt-1">
                        <span className="text-blue-400">Message:</span>{" "}
                        <span className="text-white whitespace-pre-wrap">{claim.claimant_message}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isDenying && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => act(claim, "approve")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-xs px-3 py-1.5 rounded"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />}
                        Approve + Badge
                      </button>
                      <button
                        onClick={() => act(claim, "approve_no_badge")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-xs px-3 py-1.5 rounded"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Approve (no badge)
                      </button>
                      <button
                        onClick={() => { setDenyPromptFor(claim.id); setDenyReason(""); }}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white font-semibold text-xs px-3 py-1.5 rounded"
                      >
                        <X size={12} /> Deny…
                      </button>
                    </div>
                  )}

                  {isDenying && (
                    <div className="bg-[#0d2240] border border-red-900/40 rounded-md p-3 space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-red-300">
                        Denial reason (sent to the claimant)
                      </label>
                      <textarea
                        value={denyReason}
                        onChange={e => setDenyReason(e.target.value)}
                        rows={3}
                        placeholder="e.g. We weren't able to confirm your affiliation from the link you shared. Please reply with an official staff page or @{orgdomain} email."
                        className="w-full bg-[#0a1a2e] border border-red-900/40 text-white placeholder-blue-500 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => { setDenyPromptFor(null); setDenyReason(""); }}
                          className="text-blue-400 hover:text-blue-200 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => act(claim, "deny", denyReason.trim())}
                          disabled={busy || denyReason.trim().length < 4}
                          className="inline-flex items-center gap-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white font-semibold text-xs px-3 py-1.5 rounded"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                          Deny + Email
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
