"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award, ChevronDown, ChevronRight, Upload, Trash2, Pencil, Loader2,
  AlertCircle, X, Link as LinkIcon, Eye, EyeOff, Check, AlertTriangle,
} from "lucide-react";

interface TrustLogo {
  id: string;
  name: string;
  image_url: string;
  storage_path: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

type Tab = "file" | "url";

// Soft-check on the client. Server still enforces hard limits.
const MAX_RASTER_DIM = 400;
const MAX_BYTES_CLIENT = 500 * 1024;

export default function TrustLogosPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("file");
  const [rows, setRows] = useState<TrustLogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // add-form state
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [addOk, setAddOk] = useState(false);

  // edit row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<TrustLogo>>({});

  // track which thumbnails failed to load — surfaces dead URLs to the admin.
  const [imgFailures, setImgFailures] = useState<Set<string>>(new Set());
  function markFailed(id: string) {
    setImgFailures(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }
  function clearFailed(id: string) {
    setImgFailures(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/trust-logos", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows((json.data ?? []) as TrustLogo[]);
      setImgFailures(new Set());
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  function resetForm() {
    setName("");
    setFile(null);
    setImageUrl("");
    setDisplayOrder(0);
    const input = document.getElementById("trust-logo-file") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  async function checkRasterDimensions(f: File): Promise<void> {
    // SVG dimensions aren't meaningful here — skip.
    if (f.type === "image/svg+xml") return;
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        if (img.width > MAX_RASTER_DIM || img.height > MAX_RASTER_DIM) {
          console.warn(`trust-logo upload: ${img.width}×${img.height} larger than recommended ${MAX_RASTER_DIM}px`);
        }
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      img.src = url;
    });
  }

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAddOk(false);
    if (!name.trim()) { setError("Name is required"); return; }
    if (!file) { setError("Choose an image first"); return; }
    if (file.size > MAX_BYTES_CLIENT) {
      setError(`File exceeds 500KB (${(file.size / 1024).toFixed(1)}KB)`);
      return;
    }
    setSubmitting(true);
    try {
      await checkRasterDimensions(file);
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("file", file);
      fd.append("display_order", String(displayOrder));
      const res = await fetch("/api/admin/trust-logos", { method: "POST", headers, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      resetForm();
      setAddOk(true);
      await refresh();
      setTimeout(() => setAddOk(false), 2500);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAddOk(false);
    if (!name.trim()) { setError("Name is required"); return; }
    if (!imageUrl.trim()) { setError("URL is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/trust-logos", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          image_url: imageUrl.trim(),
          display_order: displayOrder,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      resetForm();
      setAddOk(true);
      await refresh();
      setTimeout(() => setAddOk(false), 2500);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  async function patch(id: string, body: Partial<TrustLogo>) {
    setError(null);
    try {
      const res = await fetch("/api/admin/trust-logos", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows(rs => rs.map(r => (r.id === id ? (json.data as TrustLogo) : r)));
      // If the image_url just changed, give the browser a chance to retry the
      // load before we still show it as failed.
      if (body.image_url) clearFailed(id);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  async function handleDelete(row: TrustLogo) {
    if (!window.confirm(`Delete "${row.name}"? This removes the row${row.storage_path ? " and the uploaded file." : "."}`)) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/trust-logos", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows(rs => rs.filter(r => r.id !== row.id));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  function startEdit(row: TrustLogo) {
    setEditingId(row.id);
    setEditDraft({
      name: row.name,
      image_url: row.image_url,
      display_order: row.display_order,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    await patch(editingId, editDraft);
    setEditingId(null);
    setEditDraft({});
  }

  const inputClass =
    "w-full bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1";
  const tabBtnClass = (t: Tab) =>
    `flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
      tab === t ? "text-white border-[#4ea8de]" : "text-blue-400 border-transparent hover:text-blue-200"
    }`;

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Award size={18} className="text-amber-300" />
          <h2 className="text-white font-semibold">Trust Strip Logos</h2>
          <span className="text-xs text-blue-500">
            {rows.length > 0
              ? `${rows.filter(r => r.is_active).length} active / ${rows.length} total`
              : "homepage trust-strip — upload or paste"}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-5">
          <div className="text-xs text-blue-400 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2">
            SVG / PNG / WebP only, max 500KB, recommended ≤ 400px. Rendered at 40px tall in the strip.
            Use either a file upload or paste a URL (e.g. a Brandfetch or Wikipedia SVG).
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="break-words flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Add form */}
          <div className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg overflow-hidden">
            <div className="flex border-b border-blue-900/40 bg-[#0d2240]">
              <button onClick={() => setTab("file")} className={tabBtnClass("file")}>
                <Upload size={12} /> Upload File
              </button>
              <button onClick={() => setTab("url")} className={tabBtnClass("url")}>
                <LinkIcon size={12} /> Paste URL
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                <div>
                  <label className={labelClass}>Organization name (alt text)</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. WHO" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Display order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={e => setDisplayOrder(Number(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
              </div>

              {tab === "file" && (
                <form onSubmit={handleFileSubmit} className="space-y-3">
                  <div>
                    <label className={labelClass}>Image file (SVG / PNG / WebP, max 500KB)</label>
                    <input
                      id="trust-logo-file"
                      type="file"
                      accept="image/svg+xml,image/png,image/webp"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-blue-200 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#4ea8de] file:text-white hover:file:bg-[#3a95cc] file:cursor-pointer"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !file || !name.trim()}
                    className="w-full bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {submitting ? "Uploading…" : "Upload Logo"}
                  </button>
                </form>
              )}

              {tab === "url" && (
                <form onSubmit={handleUrlSubmit} className="space-y-3">
                  <div>
                    <label className={labelClass}>Image URL (https only)</label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://upload.wikimedia.org/wikipedia/.../logo.svg"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !imageUrl.trim() || !name.trim()}
                    className="w-full bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                    {submitting ? "Saving…" : "Save URL"}
                  </button>
                </form>
              )}

              {addOk && (
                <div className="text-xs text-green-300 flex items-center gap-1.5">
                  <Check size={14} /> Logo added.
                </div>
              )}
            </div>
          </div>

          {/* Existing logos list */}
          <div className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-blue-900/40 flex items-center justify-between">
              <h3 className="text-white text-sm font-semibold">
                Existing logos
                {imgFailures.size > 0 && (
                  <span className="ml-2 text-[11px] font-semibold text-amber-300">
                    {imgFailures.size} broken
                  </span>
                )}
              </h3>
              <button onClick={refresh} className="text-xs text-[#4ea8de] hover:underline">
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loading && rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-blue-500 text-sm flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-blue-500 text-sm">
                No logos yet. The public strip falls back to the hardcoded set until you add some here.
              </div>
            ) : (
              <ul className="divide-y divide-blue-900/40">
                {rows.map(row => {
                  const failed = imgFailures.has(row.id);
                  return (
                    <li key={row.id} className="p-3 grid grid-cols-1 md:grid-cols-[110px_1fr_auto] gap-3 items-start">
                      {/* Thumbnail */}
                      <div className="w-full md:w-[110px] h-16 rounded-md border border-blue-900/40 bg-white flex items-center justify-center overflow-hidden">
                        {failed ? (
                          <div className="flex flex-col items-center gap-1 text-amber-700 px-2">
                            <AlertTriangle size={14} />
                            <span className="text-[10px] font-semibold text-center leading-tight">image failed to load</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.image_url}
                            alt={row.name}
                            className="max-h-12 max-w-24 object-contain"
                            loading="lazy"
                            onError={() => markFailed(row.id)}
                          />
                        )}
                      </div>

                      {/* Editable / display body */}
                      {editingId === row.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2">
                            <div>
                              <label className={labelClass}>Name</label>
                              <input
                                value={editDraft.name ?? ""}
                                onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Order</label>
                              <input
                                type="number"
                                value={editDraft.display_order ?? 0}
                                onChange={e => setEditDraft(d => ({ ...d, display_order: Number(e.target.value) || 0 }))}
                                className={inputClass}
                              />
                            </div>
                          </div>
                          <div>
                            <label className={labelClass}>Image URL</label>
                            <input
                              type="url"
                              value={editDraft.image_url ?? ""}
                              onChange={e => setEditDraft(d => ({ ...d, image_url: e.target.value }))}
                              className={inputClass}
                            />
                            <p className="text-[10px] text-blue-500 mt-1">
                              Edit URL only — to replace an uploaded file, delete this row and upload a new one.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={saveEdit} className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-xs font-semibold px-3 py-1.5 rounded">
                              Save
                            </button>
                            <button onClick={() => { setEditingId(null); setEditDraft({}); }} className="text-blue-400 hover:text-blue-200 text-xs">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="text-white text-sm font-semibold flex items-center gap-2">
                            {row.name}
                            {failed && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-900/30 border border-amber-700/40 rounded px-1.5 py-0.5">
                                <AlertTriangle size={10} /> image failed to load
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-blue-400 mt-0.5 truncate">{row.image_url}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-blue-400">
                            <span className="bg-[#0d2240] border border-blue-900/40 rounded px-1.5 py-0.5">order {row.display_order}</span>
                            <span className="bg-[#0d2240] border border-blue-900/40 rounded px-1.5 py-0.5">
                              {row.storage_path ? "uploaded" : "external URL"}
                            </span>
                            {!row.is_active && (
                              <span className="bg-amber-900/30 border border-amber-700/40 text-amber-300 rounded px-1.5 py-0.5">hidden</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex md:flex-col gap-2 md:items-end">
                        <button
                          onClick={() => patch(row.id, { is_active: !row.is_active })}
                          title={row.is_active ? "Hide from strip" : "Show in strip"}
                          className="flex items-center gap-1 text-xs text-blue-300 hover:text-white border border-blue-900/40 hover:border-[#4ea8de]/50 rounded px-2 py-1"
                        >
                          {row.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                          {row.is_active ? "Active" : "Hidden"}
                        </button>
                        {editingId !== row.id && (
                          <button
                            onClick={() => startEdit(row)}
                            className="flex items-center gap-1 text-xs text-blue-300 hover:text-white border border-blue-900/40 hover:border-[#4ea8de]/50 rounded px-2 py-1"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(row)}
                          className="flex items-center gap-1 text-xs text-red-300 hover:text-red-100 border border-red-900/40 hover:border-red-500/50 rounded px-2 py-1"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
