"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2, ChevronDown, ChevronRight, Loader2, Search, RefreshCw,
  AlertCircle, Check, Star, Moon, X, Upload,
} from "lucide-react";

interface ResolvedOrg {
  slug: string;
  name: string;
  short: string;
  description: string;
  color: string;
  logo: string;
  domain: string;
  matchPatterns: string[];
  needs_dark_background: boolean;
  logo_url: string | null;
  is_featured: boolean;
  display_order: number;
  has_override: boolean;
}

interface RowDraft {
  display_name: string;
  short_name: string;
  description: string;
  manual_logo_url: string;
  needs_dark_background: boolean;
  brand_color: string;
  is_featured: boolean;
  display_order: number;
}

function draftFromOrg(o: ResolvedOrg): RowDraft {
  return {
    display_name: o.name,
    short_name: o.short,
    description: o.description,
    manual_logo_url: o.logo_url ?? "",
    needs_dark_background: o.needs_dark_background,
    brand_color: o.color,
    is_featured: o.is_featured,
    display_order: o.display_order,
  };
}

export default function OrganizationsPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<ResolvedOrg[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [refreshingSlug, setRefreshingSlug] = useState<string | null>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/organizations", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const list = (json.data ?? []) as ResolvedOrg[];
      list.sort((a, b) => a.name.localeCompare(b.name));
      setOrgs(list);
      setDrafts(Object.fromEntries(list.map(o => [o.slug, draftFromOrg(o)])));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const filtered = useMemo(() => {
    if (!query.trim()) return orgs;
    const q = query.trim().toLowerCase();
    return orgs.filter(
      o =>
        o.name.toLowerCase().includes(q) ||
        o.short.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        o.domain.toLowerCase().includes(q)
    );
  }, [orgs, query]);

  function updateDraft(slug: string, patch: Partial<RowDraft>) {
    setDrafts(d => ({ ...d, [slug]: { ...d[slug], ...patch } }));
  }

  async function save(slug: string) {
    const draft = drafts[slug];
    if (!draft) return;
    setSavingSlug(slug);
    setError(null);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSavedFlash(slug);
      setTimeout(() => setSavedFlash(s => (s === slug ? null : s)), 2500);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSavingSlug(null);
    }
  }

  async function uploadLogo(slug: string, file: File) {
    setUploadingSlug(slug);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      const res = await fetch("/api/admin/organizations/upload-logo", {
        method: "POST",
        headers,
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSavedFlash(slug);
      setTimeout(() => setSavedFlash(s => (s === slug ? null : s)), 2500);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setUploadingSlug(null);
    }
  }

  async function refreshLogo(slug: string) {
    setRefreshingSlug(slug);
    setError(null);
    try {
      const res = await fetch("/api/admin/organizations/refresh-logo", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setRefreshingSlug(null);
    }
  }

  const inputClass =
    "w-full bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-0.5";

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-[#4ea8de]" />
          <h2 className="text-white font-semibold">Organizations</h2>
          <span className="text-xs text-blue-500">
            {orgs.length > 0
              ? `${orgs.length} total · ${orgs.filter(o => o.is_featured).length} featured · ${orgs.filter(o => o.has_override).length} with overrides`
              : "manage logos, display names, featured calendars"}
          </span>
        </div>
        {open ? (
          <ChevronDown size={18} className="text-blue-400" />
        ) : (
          <ChevronRight size={18} className="text-blue-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-4">
          <div className="text-xs text-blue-400 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2">
            Overrides layer on top of the static registry. Empty fields fall back to the registry default. Use the dark-background toggle for orgs with light/white logos that disappear on white tiles.
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="break-words">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, short name, slug, or domain…"
              className="w-full bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
            />
          </div>

          {loading && orgs.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm">No organizations match.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(org => {
                const draft = drafts[org.slug] ?? draftFromOrg(org);
                const isSaving = savingSlug === org.slug;
                const isRefreshing = refreshingSlug === org.slug;
                return (
                  <div
                    key={org.slug}
                    className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-3 grid grid-cols-1 lg:grid-cols-[88px_1fr_auto] gap-3"
                  >
                    {/* Logo preview */}
                    <div
                      className="w-full lg:w-[88px] h-20 rounded-md border border-blue-900/40 flex items-center justify-center p-2"
                      style={{
                        backgroundColor: draft.needs_dark_background
                          ? "#0f2a4a"
                          : draft.brand_color
                          ? `${draft.brand_color}14`
                          : "#0a1a2e",
                      }}
                    >
                      {draft.manual_logo_url || org.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={draft.manual_logo_url || org.logo_url || ""}
                          alt={draft.short_name || org.short}
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span
                          className="text-sm font-bold text-center leading-tight"
                          style={{ color: draft.needs_dark_background ? "#fff" : (draft.brand_color || "#4ea8de") }}
                        >
                          {draft.short_name || org.short}
                        </span>
                      )}
                    </div>

                    {/* Form fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="md:col-span-2 flex items-center gap-3 mb-1">
                        <code className="text-[11px] text-blue-400 bg-[#0d2240] px-1.5 py-0.5 rounded">{org.slug}</code>
                        {org.has_override && (
                          <span className="text-[10px] text-amber-300 bg-amber-900/30 border border-amber-700/40 rounded px-1.5 py-0.5">
                            override active
                          </span>
                        )}
                        {draft.is_featured && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#4ea8de] bg-[#4ea8de]/10 border border-[#4ea8de]/30 rounded px-1.5 py-0.5">
                            <Star size={10} /> featured
                          </span>
                        )}
                        {draft.needs_dark_background && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-300 bg-blue-900/30 border border-blue-700/40 rounded px-1.5 py-0.5">
                            <Moon size={10} /> dark bg
                          </span>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Display name</label>
                        <input value={draft.display_name} onChange={e => updateDraft(org.slug, { display_name: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Short name</label>
                        <input value={draft.short_name} onChange={e => updateDraft(org.slug, { short_name: e.target.value })} className={inputClass} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Logo URL override (empty = use Brandfetch cache)</label>
                        <div className="flex items-center gap-2">
                          <input
                            value={draft.manual_logo_url}
                            onChange={e => updateDraft(org.slug, { manual_logo_url: e.target.value })}
                            placeholder="https://… (or upload a file →)"
                            className={inputClass}
                          />
                          <label className="shrink-0 cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#0d2240] hover:bg-[#1a3f6e] border border-blue-900/40 hover:border-[#4ea8de]/50 rounded px-2 py-1.5 transition-colors">
                            {uploadingSlug === org.slug ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Upload size={12} />
                            )}
                            {uploadingSlug === org.slug ? "Uploading…" : "Upload"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/svg+xml"
                              className="hidden"
                              disabled={uploadingSlug === org.slug}
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  uploadLogo(org.slug, f);
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>
                        </div>
                        <p className="text-[10px] text-blue-500 mt-1">Upload: PNG/JPG/SVG/WebP, max 2MB — replaces the URL and auto-saves.</p>
                      </div>
                      <div>
                        <label className={labelClass}>Brand color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={draft.brand_color || "#0f2a4a"}
                            onChange={e => updateDraft(org.slug, { brand_color: e.target.value })}
                            className="h-7 w-10 bg-[#0a1a2e] border border-blue-900/40 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={draft.brand_color}
                            onChange={e => updateDraft(org.slug, { brand_color: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Display order</label>
                        <input
                          type="number"
                          value={draft.display_order}
                          onChange={e => updateDraft(org.slug, { display_order: Number(e.target.value) || 0 })}
                          className={inputClass}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-blue-200">
                        <input
                          type="checkbox"
                          checked={draft.needs_dark_background}
                          onChange={e => updateDraft(org.slug, { needs_dark_background: e.target.checked })}
                          className="accent-[#4ea8de]"
                        />
                        Needs dark background (light logo)
                      </label>
                      <label className="flex items-center gap-2 text-xs text-blue-200">
                        <input
                          type="checkbox"
                          checked={draft.is_featured}
                          onChange={e => updateDraft(org.slug, { is_featured: e.target.checked })}
                          className="accent-[#4ea8de]"
                        />
                        Featured on homepage
                      </label>
                    </div>

                    {/* Action column */}
                    <div className="flex lg:flex-col gap-2 lg:items-end">
                      <button
                        onClick={() => save(org.slug)}
                        disabled={isSaving}
                        className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
                      >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : savedFlash === org.slug ? <Check size={12} /> : null}
                        {isSaving ? "Saving…" : savedFlash === org.slug ? "Saved" : "Save"}
                      </button>
                      <button
                        onClick={() => refreshLogo(org.slug)}
                        disabled={isRefreshing}
                        className="text-xs text-blue-300 hover:text-white border border-blue-900/40 hover:border-[#4ea8de]/50 disabled:opacity-40 rounded px-2 py-1.5 transition-colors flex items-center gap-1.5"
                      >
                        {isRefreshing ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        {isRefreshing ? "Fetching…" : "Refresh from Brandfetch"}
                      </button>
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
