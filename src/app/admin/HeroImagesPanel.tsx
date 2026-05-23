"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown, ChevronRight, Image as ImageIcon, Upload, Trash2, Pencil,
  Eye, EyeOff, Loader2, Check, AlertCircle, X, Link as LinkIcon, Sparkles,
  FileText, Wand2,
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

type Tab = "file" | "url" | "topic";

interface AiSuggestion {
  title: string;
  subtitle: string;
  cta_text: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function HeroImagesPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("file");
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // shared metadata
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [order, setOrder] = useState<number>(0);

  // file tab
  const [file, setFile] = useState<File | null>(null);

  // url tab
  const [sourceUrl, setSourceUrl] = useState("");

  // topic tab
  const [topic, setTopic] = useState("");

  // upload state
  const [submitting, setSubmitting] = useState(false);
  const [uploadOk, setUploadOk] = useState(false);

  // ai suggestion state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"image" | "topic">("image");
  const [aiTopic, setAiTopic] = useState("");
  const [aiRunning, setAiRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  function resetUploadForm() {
    setFile(null);
    setSourceUrl("");
    setTopic("");
    setTitle("");
    setSubtitle("");
    setCtaText("");
    setCtaUrl("");
    setOrder(0);
    const input = document.getElementById("hero-file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function applySuggestion(s: AiSuggestion) {
    setTitle(s.title);
    setSubtitle(s.subtitle);
    setCtaText(s.cta_text);
  }

  async function runAiSuggestion() {
    setAiRunning(true);
    setAiError(null);
    try {
      let payload: { mode: "image"; image_url: string } | { mode: "topic"; topic: string };
      if (aiMode === "image") {
        if (tab === "file") {
          if (!file) throw new Error("Choose a file first");
          const dataUrl = await fileToDataUrl(file);
          payload = { mode: "image", image_url: dataUrl };
        } else if (tab === "url") {
          if (!sourceUrl.trim()) throw new Error("Enter an image URL first");
          payload = { mode: "image", image_url: sourceUrl.trim() };
        } else {
          throw new Error("Image mode requires the File or URL tab");
        }
      } else {
        const t = aiTopic.trim();
        if (!t) throw new Error("Enter a topic");
        payload = { mode: "topic", topic: t };
      }

      const res = await fetch("/api/admin/hero-images/suggest-text", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      applySuggestion(json.data as AiSuggestion);
      setAiOpen(false);
      setAiTopic("");
    } catch (err) {
      setAiError(String(err instanceof Error ? err.message : err));
    } finally {
      setAiRunning(false);
    }
  }

  async function runTopicOnlyGenerate() {
    setSubmitting(true);
    setError(null);
    try {
      const t = topic.trim();
      if (!t) throw new Error("Enter a topic");
      const res = await fetch("/api/admin/hero-images/suggest-text", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "topic", topic: t }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      applySuggestion(json.data as AiSuggestion);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose an image first");
      return;
    }
    setSubmitting(true);
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

      resetUploadForm();
      setUploadOk(true);
      await refresh();
      setTimeout(() => setUploadOk(false), 3000);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUrlUpload(e: React.FormEvent) {
    e.preventDefault();
    const u = sourceUrl.trim();
    if (!u) {
      setError("Paste a URL first");
      return;
    }
    setSubmitting(true);
    setError(null);
    setUploadOk(false);
    try {
      const res = await fetch("/api/admin/hero-images", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: u,
          title: title || null,
          subtitle: subtitle || null,
          cta_text: ctaText || null,
          cta_url: ctaUrl || null,
          display_order: order,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      resetUploadForm();
      setUploadOk(true);
      await refresh();
      setTimeout(() => setUploadOk(false), 3000);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
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

  const tabBtnClass = (t: Tab) =>
    `flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
      tab === t
        ? "text-white border-[#4ea8de]"
        : "text-blue-400 border-transparent hover:text-blue-200"
    }`;

  const metadataSection = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2 flex items-center justify-between">
          <label className={`${labelClass} mb-0`}>Overlay text</label>
          <button
            type="button"
            onClick={() => { setAiOpen(true); setAiError(null); }}
            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#4ea8de] hover:text-white border border-[#4ea8de]/40 hover:border-[#4ea8de] rounded-full px-2.5 py-1 transition-colors"
          >
            <Sparkles size={12} /> Generate text with AI
          </button>
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
      </div>
    </>
  );

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
          <div className="text-xs text-blue-400 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2">
            When at least one image is active here, the homepage hero uses these instead of Pexels. Upload Canva exports (PNG/JPG/WebP, max 5MB).
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

          {/* Upload card with tabs */}
          <div className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg overflow-hidden">
            <div className="flex border-b border-blue-900/40 bg-[#0d2240]">
              <button onClick={() => setTab("file")} className={tabBtnClass("file")}>
                <Upload size={12} /> Upload File
              </button>
              <button onClick={() => setTab("url")} className={tabBtnClass("url")}>
                <LinkIcon size={12} /> Add from URL
              </button>
              <button onClick={() => setTab("topic")} className={tabBtnClass("topic")}>
                <Wand2 size={12} /> Generate from Topic
              </button>
            </div>

            <div className="p-4 space-y-4">
              {tab === "file" && (
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <label className={labelClass}>Image file (JPG / PNG / WebP, max 5MB)</label>
                    <input
                      id="hero-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-blue-200 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#4ea8de] file:text-white hover:file:bg-[#3a95cc] file:cursor-pointer"
                    />
                  </div>
                  {metadataSection}
                  <button
                    type="submit"
                    disabled={submitting || !file}
                    className="w-full bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {submitting ? "Uploading…" : "Upload"}
                  </button>
                </form>
              )}

              {tab === "url" && (
                <form onSubmit={handleUrlUpload} className="space-y-4">
                  <div>
                    <label className={labelClass}>Image URL or page URL (Unsplash, Pexels, Pixabay)</label>
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={e => setSourceUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-... or https://unsplash.com/photos/..."
                      className={inputClass}
                    />
                    <p className="text-[11px] text-blue-500 mt-1">
                      Direct image URLs upload fastest. For page URLs, we extract the og:image tag.
                    </p>
                  </div>
                  {metadataSection}
                  <button
                    type="submit"
                    disabled={submitting || !sourceUrl.trim()}
                    className="w-full bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                    {submitting ? "Fetching…" : "Fetch & Save"}
                  </button>
                </form>
              )}

              {tab === "topic" && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Topic for AI text generation</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder='e.g. "COP31 climate summit in Belém" or "World Health Assembly 2027"'
                      className={inputClass}
                    />
                    <p className="text-[11px] text-blue-500 mt-1">
                      Generates title / subtitle / CTA only. Switch to a different tab afterwards to upload the actual image.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runTopicOnlyGenerate}
                    disabled={submitting || !topic.trim()}
                    className="w-full bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {submitting ? "Generating…" : "Generate Suggestions"}
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-blue-900/40">
                    <div className="md:col-span-2 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      Generated text (editable)
                    </div>
                    <div>
                      <label className={labelClass}>Title</label>
                      <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Subtitle</label>
                      <input value={subtitle} onChange={e => setSubtitle(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>CTA text</label>
                      <input value={ctaText} onChange={e => setCtaText(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>CTA URL</label>
                      <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
              )}

              {uploadOk && (
                <div className="text-xs text-green-300 flex items-center gap-1.5">
                  <Check size={14} /> Image saved successfully.
                </div>
              )}
            </div>
          </div>

          {/* AI suggestion modal */}
          {aiOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
              <div className="w-full max-w-md bg-[#0d2240] border border-[#4ea8de]/40 rounded-2xl shadow-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Sparkles size={16} className="text-[#4ea8de]" />
                    <h3 className="font-semibold">Generate overlay text</h3>
                  </div>
                  <button onClick={() => setAiOpen(false)} className="text-blue-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiMode("image")}
                    disabled={tab === "topic"}
                    className={`px-3 py-3 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      aiMode === "image"
                        ? "bg-[#4ea8de] border-[#4ea8de] text-white"
                        : "bg-[#0a1a2e] border-blue-900/40 text-blue-200 hover:border-[#4ea8de]/40"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={tab === "topic" ? "Not available on this tab" : "Use vision on the selected image"}
                  >
                    <ImageIcon size={12} /> From this image
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiMode("topic")}
                    className={`px-3 py-3 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      aiMode === "topic"
                        ? "bg-[#4ea8de] border-[#4ea8de] text-white"
                        : "bg-[#0a1a2e] border-blue-900/40 text-blue-200 hover:border-[#4ea8de]/40"
                    }`}
                  >
                    <FileText size={12} /> From a topic
                  </button>
                </div>
                {aiMode === "topic" && (
                  <div>
                    <label className={labelClass}>Topic</label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      placeholder='e.g. "COP31 climate summit"'
                      className={inputClass}
                      autoFocus
                    />
                  </div>
                )}
                {aiMode === "image" && tab !== "topic" && (
                  <p className="text-xs text-blue-400">
                    Will use {tab === "file" ? "the selected file" : "the URL pasted above"} to generate text.
                  </p>
                )}
                {aiError && (
                  <div className="flex items-start gap-2 text-xs text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <span className="break-words">{aiError}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={runAiSuggestion}
                    disabled={aiRunning || (aiMode === "topic" && !aiTopic.trim())}
                    className="flex-1 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {aiRunning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {aiRunning ? "Generating…" : "Generate"}
                  </button>
                  <button
                    onClick={() => setAiOpen(false)}
                    className="text-blue-400 hover:text-blue-200 text-sm px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

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
