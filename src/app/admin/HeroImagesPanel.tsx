"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown, ChevronRight, Image as ImageIcon, Upload, Trash2, Pencil,
  Eye, EyeOff, Loader2, Check, AlertCircle, X,
} from "lucide-react";

interface HeroImage {
  id: string;
  storage_path: string;
  public_url: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  display_order: number;
  is_active: boolean;
  uploaded_at: string;
}

export default function HeroImagesPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // upload form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [order, setOrder] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [uploadOk, setUploadOk] = useState(false);

  // edit row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<HeroImage>>({});

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hero-images", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setImages(json.data ?? []);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose an image first");
      return;
    }
    setUploading(true);
    setError(null);
    setUploadOk(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (title) fd.append("title", title);
      if (subtitle) fd.append("subtitle", subtitle);
      if (ctaText) fd.append("cta_text", ctaText);
      if (ctaUrl) fd.append("cta_url", ctaUrl);
      fd.append("display_order", String(order));

      const res = await fetch("/api/admin/hero-images", {
        method: "POST",
        headers,
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

      setFile(null);
      setTitle("");
      setSubtitle("");
      setCtaText("");
      setCtaUrl("");
      setOrder(0);
      setUploadOk(true);
      const input = document.getElementById("hero-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      await refresh();
      setTimeout(() => setUploadOk(false), 3000);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleActive(img: HeroImage) {
    setError(null);
    try {
      const res = await fetch("/api/admin/hero-images", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: img.id, is_active: !img.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  function startEdit(img: HeroImage) {
    setEditingId(img.id);
    setEditDraft({
      title: img.title,
      subtitle: img.subtitle,
      cta_text: img.cta_text,
      cta_url: img.cta_url,
      display_order: img.display_order,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/hero-images", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editDraft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setEditingId(null);
      setEditDraft({});
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  async function handleDelete(img: HeroImage) {
    if (!window.confirm(`Delete this hero image${img.title ? ` ("${img.title}")` : ""}? This removes it from storage.`)) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/hero-images", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: img.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  const inputClass =
    "w-full bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1";

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-[#4ea8de]" />
          <h2 className="text-white font-semibold">Hero Images</h2>
          <span className="text-xs text-blue-500">
            {images.length > 0 ? `${images.filter(i => i.is_active).length} active / ${images.length} total` : "manage homepage slideshow"}
          </span>
        </div>
        {open ? (
          <ChevronDown size={18} className="text-blue-400" />
        ) : (
          <ChevronRight size={18} className="text-blue-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-6">
          {/* Status banner */}
          <div className="text-xs text-blue-400 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2">
            When at least one image is active here, the homepage hero uses these instead of Pexels. Upload Canva exports (PNG/JPG, max 5MB).
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

          {/* Upload form */}
          <form onSubmit={handleUpload} className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-4">
            <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
              <Upload size={14} /> Upload new image
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className={labelClass}>Image file (JPG / PNG, max 5MB)</label>
                <input
                  id="hero-file-input"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-blue-200 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#4ea8de] file:text-white hover:file:bg-[#3a95cc] file:cursor-pointer"
                />
              </div>
              <div>
                <label className={labelClass}>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. SDG High Level Political Forum" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Subtitle</label>
                <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Short caption beneath the title" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>CTA text</label>
                <input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. View Event" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>CTA URL</label>
                <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="/events or https://..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Display order</label>
                <input
                  type="number"
                  value={order}
                  onChange={e => setOrder(Number(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </div>
            {uploadOk && (
              <div className="mt-3 text-xs text-green-300 flex items-center gap-1.5">
                <Check size={14} /> Image uploaded successfully.
              </div>
            )}
          </form>

          {/* Existing images table */}
          <div className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-blue-900/40 flex items-center justify-between">
              <h3 className="text-white text-sm font-semibold">Existing images</h3>
              <button onClick={refresh} className="text-xs text-[#4ea8de] hover:underline">
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {loading && images.length === 0 ? (
              <div className="px-4 py-8 text-center text-blue-500 text-sm flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : images.length === 0 ? (
              <div className="px-4 py-8 text-center text-blue-500 text-sm">No hero images uploaded yet. Pexels is in use.</div>
            ) : (
              <div className="divide-y divide-blue-900/40">
                {images.map(img => (
                  <div key={img.id} className="p-4 grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-4 items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.public_url}
                      alt={img.title ?? "Hero image"}
                      className="w-full md:w-[120px] h-20 object-cover rounded-md border border-blue-900/40"
                    />
                    {editingId === img.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className={labelClass}>Title</label>
                            <input value={editDraft.title ?? ""} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Subtitle</label>
                            <input value={editDraft.subtitle ?? ""} onChange={e => setEditDraft(d => ({ ...d, subtitle: e.target.value }))} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>CTA text</label>
                            <input value={editDraft.cta_text ?? ""} onChange={e => setEditDraft(d => ({ ...d, cta_text: e.target.value }))} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>CTA URL</label>
                            <input value={editDraft.cta_url ?? ""} onChange={e => setEditDraft(d => ({ ...d, cta_url: e.target.value }))} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Order</label>
                            <input type="number" value={editDraft.display_order ?? 0} onChange={e => setEditDraft(d => ({ ...d, display_order: Number(e.target.value) || 0 }))} className={inputClass} />
                          </div>
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
                      <div>
                        <p className="text-white text-sm font-semibold">{img.title || <span className="italic text-blue-500">No title</span>}</p>
                        {img.subtitle && <p className="text-blue-300 text-xs mt-0.5">{img.subtitle}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-blue-400">
                          <span className="bg-[#0d2240] border border-blue-900/40 rounded px-1.5 py-0.5">order {img.display_order}</span>
                          {img.cta_text && (
                            <span className="bg-[#0d2240] border border-blue-900/40 rounded px-1.5 py-0.5">
                              CTA: {img.cta_text}{img.cta_url ? ` → ${img.cta_url}` : ""}
                            </span>
                          )}
                          {!img.is_active && (
                            <span className="bg-amber-900/30 border border-amber-700/40 text-amber-300 rounded px-1.5 py-0.5">inactive</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex md:flex-col gap-2 md:items-end">
                      <button
                        onClick={() => handleToggleActive(img)}
                        title={img.is_active ? "Hide from slideshow" : "Show in slideshow"}
                        className="flex items-center gap-1 text-xs text-blue-300 hover:text-white border border-blue-900/40 hover:border-[#4ea8de]/50 rounded px-2 py-1"
                      >
                        {img.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                        {img.is_active ? "Active" : "Hidden"}
                      </button>
                      {editingId !== img.id && (
                        <button
                          onClick={() => startEdit(img)}
                          className="flex items-center gap-1 text-xs text-blue-300 hover:text-white border border-blue-900/40 hover:border-[#4ea8de]/50 rounded px-2 py-1"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(img)}
                        className="flex items-center gap-1 text-xs text-red-300 hover:text-red-100 border border-red-900/40 hover:border-red-500/50 rounded px-2 py-1"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
