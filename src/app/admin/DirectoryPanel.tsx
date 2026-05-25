"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Network, ChevronDown, ChevronRight, Loader2, Search, AlertCircle,
  Check, X, Trash2, ShieldCheck, Star,
} from "lucide-react";
import { parseApiResponse } from "@/lib/admin/fetchJson";
import { orgTypeBadge, ORG_TYPE_LABEL } from "@/app/submit/_components/orgTypes";

interface DirectoryRow {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  aliases: string[] | null;
  org_type: string;
  region: string | null;
  domain: string | null;
  logo_url: string | null;
  tier: number;
  is_verified: boolean;
  description: string | null;
  source: string;
  status: string;
  submission_count: number;
  updated_at: string;
}

interface EditDraft {
  name: string;
  short_name: string;
  aliases: string;
  org_type: string;
  region: string;
  domain: string;
  logo_url: string;
  tier: number;
  is_verified: boolean;
  status: string;
}

const STATUS_OPTIONS = ["active", "pending", "rejected", "merged"];
const TYPE_OPTIONS = Object.keys(ORG_TYPE_LABEL);
const TIER_OPTIONS = [1, 2, 3];

function draftFromRow(r: DirectoryRow): EditDraft {
  return {
    name: r.name,
    short_name: r.short_name ?? "",
    aliases: (r.aliases ?? []).join(", "),
    org_type: r.org_type,
    region: r.region ?? "",
    domain: r.domain ?? "",
    logo_url: r.logo_url ?? "",
    tier: r.tier,
    is_verified: r.is_verified,
    status: r.status,
  };
}

export default function DirectoryPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (tierFilter) params.set("tier", tierFilter);
      if (typeFilter) params.set("org_type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "200");
      const res = await fetch(`/api/admin/directory?${params}`, { headers });
      const parsed = await parseApiResponse<{ data: DirectoryRow[] }>(res);
      if (!parsed.ok) throw new Error(parsed.error);
      setRows(parsed.data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [adminSecret, q, tierFilter, typeFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  function startEdit(row: DirectoryRow) {
    setEditingId(row.id);
    setDrafts(d => ({ ...d, [row.id]: draftFromRow(row) }));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function updateDraft(id: string, patch: Partial<EditDraft>) {
    setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function save(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setBusyId(id);
    setError(null);
    try {
      const payload = {
        id,
        name: draft.name,
        short_name: draft.short_name,
        aliases: draft.aliases,
        org_type: draft.org_type,
        region: draft.region,
        domain: draft.domain,
        logo_url: draft.logo_url,
        tier: draft.tier,
        is_verified: draft.is_verified,
        status: draft.status,
      };
      const res = await fetch("/api/admin/directory", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.error);
      setSavedFlash(id);
      setTimeout(() => setSavedFlash(s => (s === id ? null : s)), 2000);
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function quickAction(id: string, patch: Partial<EditDraft>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/directory", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.error);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRow(row: DirectoryRow) {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/directory", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.error);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const tiers = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
    for (const r of rows) tiers[r.tier] = (tiers[r.tier] ?? 0) + 1;
    return tiers;
  }, [rows]);

  const inputClass =
    "w-full bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40";
  const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-0.5";

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Network size={18} className="text-[#4ea8de]" />
          <h2 className="text-white font-semibold">Organization Directory</h2>
          <span className="text-xs text-blue-500">
            {rows.length > 0
              ? `${rows.length} shown · T1: ${counts[1] ?? 0} · T2: ${counts[2] ?? 0} · T3: ${counts[3] ?? 0}`
              : "tiered directory — tier 1 curated, tier 3 community-submitted"}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="break-words">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Filter bar */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_180px_140px_auto] gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search name, short, slug…"
                className="w-full bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
                onKeyDown={e => e.key === "Enter" && refresh()}
              />
            </div>
            <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="bg-[#0a1a2e] border border-blue-900/40 text-white text-sm rounded-lg px-2 py-2">
              <option value="">All tiers</option>
              {TIER_OPTIONS.map(t => <option key={t} value={t}>Tier {t}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-[#0a1a2e] border border-blue-900/40 text-white text-sm rounded-lg px-2 py-2">
              <option value="">All types</option>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{ORG_TYPE_LABEL[t]}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0a1a2e] border border-blue-900/40 text-white text-sm rounded-lg px-2 py-2">
              <option value="all">Any status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={refresh}
              className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              {loading ? "Loading…" : "Apply"}
            </button>
          </div>

          {loading && rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm">No organizations match.</div>
          ) : (
            <div className="space-y-2">
              {rows.map(row => {
                const badge = orgTypeBadge(row.org_type);
                const isEditing = editingId === row.id;
                const draft = drafts[row.id] ?? draftFromRow(row);
                const isBusy = busyId === row.id;
                return (
                  <div key={row.id} className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-3">
                    <div className="grid grid-cols-1 lg:grid-cols-[48px_1fr_auto] gap-3 items-start">
                      <div className="w-12 h-12 rounded bg-white border border-blue-900/40 flex items-center justify-center overflow-hidden">
                        {row.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.logo_url} alt="" className="max-w-full max-h-full object-contain p-0.5" />
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400">{(row.short_name ?? row.name).slice(0, 3).toUpperCase()}</span>
                        )}
                      </div>

                      {!isEditing ? (
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-white text-sm font-semibold truncate">{row.name}</p>
                            <code className="text-[10px] text-blue-400 bg-[#0d2240] px-1 rounded">{row.slug}</code>
                            <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>
                              {badge.label}
                            </span>
                            <span className="text-[10px] font-semibold text-blue-300 bg-blue-900/40 border border-blue-700/40 rounded px-1.5 py-0.5">
                              T{row.tier}
                            </span>
                            {row.region && (
                              <span className="text-[10px] text-blue-400 bg-[#0d2240] rounded px-1.5 py-0.5">
                                {row.region}
                              </span>
                            )}
                            {row.is_verified && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-300 bg-emerald-900/30 border border-emerald-700/40 rounded px-1.5 py-0.5">
                                <ShieldCheck size={10} /> verified
                              </span>
                            )}
                            {row.status !== "active" && (
                              <span className="text-[10px] font-semibold text-amber-300 bg-amber-900/30 border border-amber-700/40 rounded px-1.5 py-0.5">
                                {row.status}
                              </span>
                            )}
                            {row.source !== "manual" && (
                              <span className="text-[10px] text-blue-500">via {row.source}</span>
                            )}
                          </div>
                          {row.aliases && row.aliases.length > 0 && (
                            <p className="text-[11px] text-blue-400 mt-1 truncate">aka: {row.aliases.join(", ")}</p>
                          )}
                          {row.domain && (
                            <p className="text-[11px] text-blue-500 mt-0.5 truncate">{row.domain}</p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 min-w-0">
                          <div><label className={labelClass}>Name</label><input value={draft.name} onChange={e => updateDraft(row.id, { name: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Short name</label><input value={draft.short_name} onChange={e => updateDraft(row.id, { short_name: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Type</label>
                            <select value={draft.org_type} onChange={e => updateDraft(row.id, { org_type: e.target.value })} className={inputClass}>
                              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{ORG_TYPE_LABEL[t]}</option>)}
                            </select>
                          </div>
                          <div><label className={labelClass}>Tier</label>
                            <select value={draft.tier} onChange={e => updateDraft(row.id, { tier: Number(e.target.value) })} className={inputClass}>
                              {TIER_OPTIONS.map(t => <option key={t} value={t}>Tier {t}</option>)}
                            </select>
                          </div>
                          <div><label className={labelClass}>Region</label><input value={draft.region} onChange={e => updateDraft(row.id, { region: e.target.value })} className={inputClass} placeholder="global / africa / etc." /></div>
                          <div><label className={labelClass}>Domain</label><input value={draft.domain} onChange={e => updateDraft(row.id, { domain: e.target.value })} className={inputClass} /></div>
                          <div className="md:col-span-2"><label className={labelClass}>Logo URL</label><input value={draft.logo_url} onChange={e => updateDraft(row.id, { logo_url: e.target.value })} className={inputClass} /></div>
                          <div className="md:col-span-2"><label className={labelClass}>Aliases (comma-separated)</label><input value={draft.aliases} onChange={e => updateDraft(row.id, { aliases: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Status</label>
                            <select value={draft.status} onChange={e => updateDraft(row.id, { status: e.target.value })} className={inputClass}>
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-blue-200 mt-5">
                            <input type="checkbox" checked={draft.is_verified} onChange={e => updateDraft(row.id, { is_verified: e.target.checked })} className="accent-[#4ea8de]" />
                            Verified
                          </label>
                        </div>
                      )}

                      <div className="flex lg:flex-col gap-2 lg:items-end">
                        {isEditing ? (
                          <>
                            <button onClick={() => save(row.id)} disabled={isBusy} className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-50 text-white text-xs font-semibold rounded px-3 py-1.5 flex items-center gap-1">
                              {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                            </button>
                            <button onClick={cancelEdit} className="text-xs text-blue-400 hover:text-blue-200 px-2 py-1.5">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(row)} className="text-xs text-blue-300 hover:text-white border border-blue-900/40 hover:border-[#4ea8de]/50 rounded px-2 py-1">Edit</button>
                            {row.tier !== 1 && (
                              <button onClick={() => quickAction(row.id, { tier: 1 })} disabled={isBusy} className="text-xs text-amber-300 hover:text-amber-200 border border-amber-900/40 hover:border-amber-500/50 rounded px-2 py-1 inline-flex items-center gap-1">
                                <Star size={11} /> Promote to T1
                              </button>
                            )}
                            {!row.is_verified && (
                              <button onClick={() => quickAction(row.id, { is_verified: true })} disabled={isBusy} className="text-xs text-emerald-300 hover:text-emerald-200 border border-emerald-900/40 hover:border-emerald-500/50 rounded px-2 py-1 inline-flex items-center gap-1">
                                <ShieldCheck size={11} /> Verify
                              </button>
                            )}
                            {row.status === "pending" && (
                              <button onClick={() => quickAction(row.id, { status: "active" })} disabled={isBusy} className="text-xs text-green-300 hover:text-green-200 border border-green-900/40 hover:border-green-500/50 rounded px-2 py-1 inline-flex items-center gap-1">
                                <Check size={11} /> Approve
                              </button>
                            )}
                            {savedFlash === row.id && (
                              <span className="text-[10px] text-green-400 inline-flex items-center gap-1"><Check size={10} /> Saved</span>
                            )}
                            <button onClick={() => deleteRow(row)} disabled={isBusy} className="text-xs text-red-300 hover:text-red-100 border border-red-900/40 hover:border-red-500/50 rounded px-2 py-1 inline-flex items-center gap-1">
                              <Trash2 size={11} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
