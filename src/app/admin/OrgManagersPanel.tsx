"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users, ChevronDown, ChevronRight, Loader2, AlertCircle,
  CheckCircle2, X, BadgeCheck, Trash2,
} from "lucide-react";

interface Manager {
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

interface ListResponse {
  managers: Manager[];
  count: number;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function viaLabel(via: string | null): string {
  if (via === "domain_match") return "domain match";
  if (via === "admin_review") return "admin review";
  if (via === "manual_backfill") return "backfill";
  return via ?? "—";
}

export default function OrgManagersPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const headers = useMemo(
    () => ({ "x-admin-key": adminSecret }) as const,
    [adminSecret],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/managers", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as ListResponse);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);
  useEffect(() => { if (!open) refresh(); }, [open, refresh]);

  async function removeManager(m: Manager) {
    setActingId(m.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/managers", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(prev => prev
        ? { managers: prev.managers.filter(p => p.id !== m.id), count: Math.max(0, prev.count - 1) }
        : prev,
      );
      setConfirmId(null);
      setToast(`Removed ${m.email} from ${m.org_name}.`);
      window.setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setActingId(null);
    }
  }

  const all = data?.managers ?? [];
  const q = filter.trim().toLowerCase();
  const filtered = q
    ? all.filter(m =>
        m.email.toLowerCase().includes(q) ||
        m.org_name.toLowerCase().includes(q) ||
        m.org_slug.toLowerCase().includes(q),
      )
    : all;

  // Group by org for display.
  const byOrg = new Map<string, { name: string; domain: string | null; verified: boolean; rows: Manager[] }>();
  filtered.forEach(m => {
    const k = m.org_slug;
    if (!byOrg.has(k)) {
      byOrg.set(k, { name: m.org_name, domain: m.org_domain, verified: !!m.org_is_verified, rows: [] });
    }
    byOrg.get(k)!.rows.push(m);
  });

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={18} className="text-sky-300" />
          <h2 className="text-white font-semibold">Org Managers</h2>
          {data && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] text-[11px] font-bold rounded-full bg-sky-400 text-[#0f2a4a] px-1.5">
              {data.count}
            </span>
          )}
          <span className="text-xs text-blue-500">
            verified manager seats across orgs
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

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by email, org name, or slug…"
              className="flex-1 min-w-[200px] bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <button onClick={refresh} disabled={loading} className="text-xs text-[#4ea8de] hover:underline">
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {loading && all.length === 0 && (
            <div className="px-4 py-10 text-center text-blue-500 text-sm inline-flex items-center justify-center gap-2 w-full">
              <Loader2 size={14} className="animate-spin" /> Loading managers…
            </div>
          )}
          {!loading && all.length === 0 && (
            <div className="px-4 py-10 text-center text-blue-400 text-sm">
              No verified manager seats yet.
            </div>
          )}

          <ul className="space-y-3">
            {Array.from(byOrg.entries()).map(([slug, group]) => (
              <li key={slug} className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold text-sm">{group.name}</h3>
                      {group.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5 bg-emerald-900/30 text-emerald-300 border border-emerald-700/40">
                          <BadgeCheck size={10} /> verified
                        </span>
                      )}
                      <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-sky-900/30 text-sky-300 border border-sky-700/40">
                        {group.rows.length} {group.rows.length === 1 ? "manager" : "managers"}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-400 mt-0.5">
                      /{slug}{group.domain && <> · domain on file <span className="font-mono">@{group.domain}</span></>}
                    </p>
                  </div>
                </div>

                <ul className="divide-y divide-blue-900/40 border border-blue-900/40 rounded-md">
                  {group.rows.map(m => {
                    const busy = actingId === m.id;
                    const confirming = confirmId === m.id;
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <div className="text-white truncate">{m.email}</div>
                          <div className="text-[11px] text-blue-400">
                            via {viaLabel(m.added_via)} · verified {fmtDate(m.verified_at ?? m.added_at)}
                          </div>
                        </div>
                        {confirming ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-amber-300">Remove?</span>
                            <button
                              onClick={() => removeManager(m)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white font-semibold text-[11px] px-2 py-1 rounded"
                            >
                              {busy ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-blue-400 hover:text-blue-200 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(m.id)}
                            disabled={busy}
                            className="shrink-0 inline-flex items-center gap-1 text-[11px] text-red-300 hover:text-red-200 hover:bg-red-900/20 rounded px-2 py-1 border border-red-900/40"
                          >
                            <Trash2 size={10} /> Remove
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>

          <p className="text-[11px] text-blue-500">
            Removing a manager only revokes that seat. The org-level claimed/verified badge stays put until an admin clears it on the org row.
          </p>
        </div>
      )}
    </div>
  );
}
