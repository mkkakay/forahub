"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Globe2, ChevronDown, ChevronRight, Loader2, Plus, Trash2, Upload,
  Sparkles, AlertCircle, Check, Eye, EyeOff, X,
} from "lucide-react";

interface Region {
  slug: string;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface Draft {
  name: string;
  description: string;
  banner_image_url: string;
  display_order: number;
  is_active: boolean;
}

function draftFromRegion(r: Region): Draft {
  return {
    name: r.name,
    description: r.description ?? "",
    banner_image_url: r.banner_image_url ?? "",
    display_order: r.display_order,
    is_active: r.is_active,
  };
}

export default function RegionsPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [pexelsQueries, setPexelsQueries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // new-region form
  const [newOpen, setNewOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newOrder, setNewOrder] = useState<number>(99);

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/regions", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const list = (json.data ?? []) as Region[];
      setRegions(list);
      setDrafts(Object.fromEntries(list.map(r => [r.slug, draftFromRegion(r)])));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  function updateDraft(slug: string, patch: Partial<Draft>) {
    setDrafts(d => ({ ...d, [slug]: { ...d[slug], ...patch } }));
  }

  async function save(slug: string) {
    const draft = drafts[slug];
    if (!draft) return;
    setBusySlug(slug);
    setError(null);
    try {
      const res = await fetch("/api/admin/regions", {
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
      setBusySlug(null);
    }
  }

  async function fetchFromPexels(slug: string) {
    setBusySlug(slug);
    setError(null);
    try {
      const res = await fetch("/api/admin/regions/fetch-banner", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ slug, query: pexelsQueries[slug] || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusySlug(null);
    }
  }

  async function uploadFile(slug: string, file: File) {
    setBusySlug(slug);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      const res = await fetch("/api/admin/regions/upload-banner", {
        method: "POST",
        headers,
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusySlug(null);
    }
  }

  async function deleteRegion(slug: string, name: string) {
    if (!window.confirm(`Delete region "${name}"? This cannot be undone.`)) return;
    setBusySlug(slug);
    setError(null);
    try {
      const res = await fetch("/api/admin/regions", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusySlug(null);
    }
  }

  async function createRegion() {
    const slug = newSlug.trim();
    const name = newName.trim();
    if (!slug || !name) {
      setError("Slug and name are required");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/admin/regions", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, display_order: newOrder }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setNewSlug("");
      setNewName("");
      setNewOrder(99);
      setNewOpen(false);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
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
          <Globe2 size={18} className="text-[#4ea8de]" />
          <h2 className="text-white font-semibold">Regions</h2>
          <span className="text-xs text-blue-500">
            {regions.length > 0
              ? `${regions.length} total · ${regions.filter(r => r.is_active).length} active · ${regions.filter(r => r.banner_image_url).length} with banners`
              : "manage Explore by Region tiles + landmark banners"}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-4">
          <div className="text-xs text-blue-400 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2">
            Banners can come from: a pasted URL, a file upload (goes to the hero-images bucket), or a Pexels landmark search. Inactive regions are hidden from the homepage.
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

          {/* Add new region */}
          <div className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg">
            <button
              onClick={() => setNewOpen(o => !o)}
              className="w-full flex items-center gap-2 text-left text-sm font-semibold text-white px-3 py-2 hover:bg-[#0d2240] transition-colors"
            >
              <Plus size={14} /> Add region
            </button>
            {newOpen && (
              <div className="p-3 border-t border-blue-900/40 grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <label className={labelClass}>Slug</label>
                  <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="latin-america" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Name</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Latin America" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Order</label>
                  <input
                    type="number"
                    value={newOrder}
                    onChange={e => setNewOrder(Number(e.target.value) || 99)}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={createRegion}
                    className="w-full bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-xs font-semibold px-3 py-1.5 rounded"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading && regions.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-3">
              {regions.map(region => {
                const draft = drafts[region.slug] ?? draftFromRegion(region);
                const isBusy = busySlug === region.slug;
                return (
                  <div key={region.slug} className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-3 grid grid-cols-1 lg:grid-cols-[160px_1fr_auto] gap-3">
                    {/* Banner preview */}
                    <div className="w-full lg:w-[160px] h-24 rounded-md border border-blue-900/40 overflow-hidden bg-[#0d2240] flex items-center justify-center">
                      {draft.banner_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={draft.banner_image_url}
                          alt={draft.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[10px] text-blue-500 px-2 text-center">No banner — Explore tile uses a navy gradient fallback</span>
                      )}
                    </div>

                    {/* Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="md:col-span-2 flex items-center gap-2 mb-1">
                        <code className="text-[11px] text-blue-400 bg-[#0d2240] px-1.5 py-0.5 rounded">{region.slug}</code>
                        {draft.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-green-300 bg-green-900/30 border border-green-700/40 rounded px-1.5 py-0.5"><Eye size={10} /> active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-900/30 border border-amber-700/40 rounded px-1.5 py-0.5"><EyeOff size={10} /> hidden</span>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Name</label>
                        <input value={draft.name} onChange={e => updateDraft(region.slug, { name: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Display order</label>
                        <input
                          type="number"
                          value={draft.display_order}
                          onChange={e => updateDraft(region.slug, { display_order: Number(e.target.value) || 0 })}
                          className={inputClass}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Description</label>
                        <input value={draft.description} onChange={e => updateDraft(region.slug, { description: e.target.value })} className={inputClass} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Banner image URL</label>
                        <input
                          value={draft.banner_image_url}
                          onChange={e => updateDraft(region.slug, { banner_image_url: e.target.value })}
                          placeholder="https://… (or use Upload / Pexels below)"
                          className={inputClass}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-blue-200">
                        <input
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={e => updateDraft(region.slug, { is_active: e.target.checked })}
                          className="accent-[#4ea8de]"
                        />
                        Active (visible on homepage)
                      </label>

                      {/* Pexels search row */}
                      <div className="md:col-span-2 border-t border-blue-900/40 pt-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
                        <div>
                          <label className={labelClass}>Pexels landmark query (optional override)</label>
                          <input
                            value={pexelsQueries[region.slug] ?? ""}
                            onChange={e => setPexelsQueries(q => ({ ...q, [region.slug]: e.target.value }))}
                            placeholder="leave blank to use the per-region default"
                            className={inputClass}
                          />
                        </div>
                        <button
                          onClick={() => fetchFromPexels(region.slug)}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 bg-[#0d2240] hover:bg-[#1a3f6e] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded border border-blue-900/40 hover:border-[#4ea8de]/50 transition-colors"
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          Fetch from Pexels
                        </button>
                      </div>

                      {/* File upload */}
                      <div className="md:col-span-2">
                        <label className={labelClass}>Or upload a file (JPG / PNG / WebP, max 5MB)</label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) {
                              uploadFile(region.slug, f);
                              e.target.value = "";
                            }
                          }}
                          className="w-full text-xs text-blue-200 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#4ea8de] file:text-white hover:file:bg-[#3a95cc] file:cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2 lg:items-end">
                      <button
                        onClick={() => save(region.slug)}
                        disabled={isBusy}
                        className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
                      >
                        {isBusy ? <Loader2 size={12} className="animate-spin" /> : savedFlash === region.slug ? <Check size={12} /> : <Upload size={12} />}
                        {isBusy ? "Working…" : savedFlash === region.slug ? "Saved" : "Save"}
                      </button>
                      <button
                        onClick={() => deleteRegion(region.slug, region.name)}
                        disabled={isBusy}
                        className="flex items-center gap-1 text-xs text-red-300 hover:text-red-100 border border-red-900/40 hover:border-red-500/50 rounded px-2 py-1.5 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Delete
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
