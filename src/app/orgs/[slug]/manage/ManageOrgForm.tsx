"use client";

// Org profile form + a completeness nudge that lives at the top of the
// same component. Both halves share state so the nudge updates as the
// manager types — no round-trip required.
//
// Cover/logo image support: each field accepts EITHER a pasted URL
// (validated as http/https + image-y extension hint, live previewed) OR
// a direct file upload that posts to /api/orgs/[slug]/manage/upload.
// The upload endpoint reuses the same imageUpload helpers + hero-images
// bucket the /admin event-banner uploader uses, so we have one
// storage convention to operate.

import { useMemo, useState, useRef } from "react";
import {
  Loader2, CheckCircle2, AlertCircle, X, Link as LinkIcon, AtSign,
  Briefcase, Globe, Image as ImageIcon, Upload, ExternalLink,
  Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import { parseApiResponse } from "@/lib/admin/fetchJson";

interface Initial {
  name: string;
  short_name: string;
  description: string;
  logo_url: string;
  cover_image_url: string;
  website_url: string;
  twitter_url: string;
  linkedin_url: string;
}

const labelClass = "block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5";
const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de] transition-colors";

// Field weights used to compute the completeness %. Required fields
// weigh more so a manager who only adds the name reads "10%", not "50%".
// Weights are tuned so a full profile reads exactly 100%.
const FIELD_WEIGHTS: Array<{
  key: keyof Initial;
  weight: number;
  label: string;
  anchor: string;
  hint: string;
}> = [
  { key: "name",            weight: 5,  label: "Display name",  anchor: "field-name",     hint: "Required" },
  { key: "logo_url",        weight: 18, label: "Logo",          anchor: "field-logo",     hint: "Square mark or wordmark" },
  { key: "cover_image_url", weight: 18, label: "Cover image",   anchor: "field-cover",    hint: "1200×400+ banner" },
  { key: "description",     weight: 18, label: "Description",   anchor: "field-description", hint: "One short paragraph" },
  { key: "website_url",     weight: 15, label: "Website",       anchor: "field-website",  hint: "Your homepage URL" },
  { key: "twitter_url",     weight: 13, label: "Twitter / X",   anchor: "field-twitter",  hint: "Profile URL" },
  { key: "linkedin_url",    weight: 13, label: "LinkedIn",      anchor: "field-linkedin", hint: "Company page URL" },
];

function valuePresent(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function looksLikeHttpsUrl(v: string): boolean {
  const t = v.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

export default function ManageOrgForm({ slug, initial }: { slug: string; initial: Initial }) {
  const [form, setForm] = useState<Initial>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudgeCollapsed, setNudgeCollapsed] = useState(false);

  function update<K extends keyof Initial>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

  const completeness = useMemo(() => {
    const total = FIELD_WEIGHTS.reduce((s, f) => s + f.weight, 0);
    const filled = FIELD_WEIGHTS.reduce(
      (s, f) => s + (valuePresent(form[f.key] as string) ? f.weight : 0),
      0,
    );
    const pct = Math.round((filled / total) * 100);
    const missing = FIELD_WEIGHTS.filter(f => !valuePresent(form[f.key] as string));
    return { pct, missing };
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!form.name.trim()) {
      setError("Display name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(slug)}/manage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          short_name: form.short_name.trim(),
          description: form.description.trim(),
          logo_url: form.logo_url.trim(),
          cover_image_url: form.cover_image_url.trim(),
          website_url: form.website_url.trim(),
          twitter_url: form.twitter_url.trim(),
          linkedin_url: form.linkedin_url.trim(),
        }),
      });
      const parsed = await parseApiResponse<{ success: boolean }>(res);
      if (!parsed.ok) {
        setError(parsed.error === "not_authorized"
          ? "You don't have permission to edit this org."
          : parsed.error || "Could not save changes.");
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <CompletenessNudge
        pct={completeness.pct}
        missing={completeness.missing}
        collapsed={nudgeCollapsed}
        onToggleCollapsed={() => setNudgeCollapsed(v => !v)}
      />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6 space-y-6"
      >
        <h2 className="text-lg font-bold text-[#0f2a4a]">Profile</h2>

        {/* Logo + name row */}
        <div id="field-logo" className="scroll-mt-24">
          <label className={labelClass}>Logo</label>
          <ImageField
            slug={slug}
            kind="logo"
            value={form.logo_url}
            onChange={(v) => update("logo_url", v)}
            previewClass="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0"
            previewMode="contain"
            placeholder="Paste an https://… URL, or upload an image."
          />
        </div>

        {/* Cover image */}
        <div id="field-cover" className="scroll-mt-24">
          <label className={labelClass}>Cover image</label>
          <ImageField
            slug={slug}
            kind="cover"
            value={form.cover_image_url}
            onChange={(v) => update("cover_image_url", v)}
            previewClass="w-32 h-16 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0"
            previewMode="cover"
            placeholder="1200×400+ banner. Paste an https://… URL or upload."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="field-name" className="scroll-mt-24">
            <label className={labelClass}>Display name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => update("name", e.target.value)}
              maxLength={120}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Short name</label>
            <input
              value={form.short_name}
              onChange={e => update("short_name", e.target.value)}
              maxLength={120}
              placeholder="e.g. WHO"
              className={inputClass}
            />
          </div>
        </div>

        <div id="field-description" className="scroll-mt-24">
          <label className={labelClass}>Description</label>
          <textarea
            value={form.description}
            onChange={e => update("description", e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="One short paragraph about your organization."
            className={inputClass}
          />
          <p className="text-[11px] text-gray-400 mt-1">{form.description.length}/600</p>
        </div>

        <div id="field-website" className="scroll-mt-24">
          <label className={labelClass}>Website</label>
          <div className="relative">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
            <input
              type="url"
              value={form.website_url}
              onChange={e => update("website_url", e.target.value)}
              placeholder="https://yourorg.org"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="field-twitter" className="scroll-mt-24">
            <label className={labelClass}>Twitter / X</label>
            <div className="relative">
              <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
              <input
                type="url"
                value={form.twitter_url}
                onChange={e => update("twitter_url", e.target.value)}
                placeholder="https://x.com/yourorg"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          <div id="field-linkedin" className="scroll-mt-24">
            <label className={labelClass}>LinkedIn</label>
            <div className="relative">
              <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-700" />
              <input
                type="url"
                value={form.linkedin_url}
                onChange={e => update("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/company/yourorg"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Completeness nudge ──────────────────────────────────────────────

function CompletenessNudge({
  pct, missing, collapsed, onToggleCollapsed,
}: {
  pct: number;
  missing: { key: string; label: string; anchor: string; hint: string }[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const isComplete = pct === 100;
  return (
    <section className={`rounded-2xl border shadow-sm overflow-hidden ${
      isComplete
        ? "bg-emerald-50 border-emerald-200"
        : "bg-gradient-to-br from-[#0f2a4a] via-[#1a3f6e] to-[#1f4d83] border-blue-900/20"
    }`}>
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left ${isComplete ? "" : "text-white"}`}
        aria-expanded={!collapsed}
      >
        <Sparkles size={16} className={isComplete ? "text-emerald-700" : "text-[#bfe1ff]"} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold inline-flex items-center gap-2 ${isComplete ? "text-emerald-900" : "text-white"}`}>
            {isComplete
              ? "Your profile is complete — nice."
              : `Profile ${pct}% complete`}
            {!isComplete && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-white/15 border border-white/15">
                {missing.length} field{missing.length === 1 ? "" : "s"} left
              </span>
            )}
          </p>
          <ProgressBar pct={pct} dark={!isComplete} />
        </div>
        {!isComplete && (
          <span className="shrink-0 text-white/70" aria-hidden="true">
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        )}
      </button>
      {!isComplete && !collapsed && (
        <div className="px-5 pb-5">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {missing.map(f => (
              <li key={f.key}>
                <a
                  href={`#${f.anchor}`}
                  className="group flex items-start gap-2 bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/25 rounded-xl px-3 py-2.5 transition-colors"
                >
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center text-[10px] font-bold text-white/80 shrink-0">
                    +
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-white">{f.label}</span>
                    <span className="block text-[11px] text-white/70">{f.hint}</span>
                  </span>
                  <ExternalLink size={11} className="ml-auto mt-1 text-white/40 group-hover:text-white/80 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ProgressBar({ pct, dark }: { pct: number; dark: boolean }) {
  const trackCls = dark ? "bg-white/15" : "bg-emerald-100";
  const fillCls = dark
    ? "bg-gradient-to-r from-[#4ea8de] to-emerald-400"
    : "bg-emerald-500";
  return (
    <div className={`mt-2 h-1.5 w-full rounded-full ${trackCls} overflow-hidden`}>
      <div
        className={`h-full ${fillCls} transition-all duration-500`}
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Image field (paste URL + upload + preview) ──────────────────────

function ImageField({
  slug, kind, value, onChange, previewClass, previewMode, placeholder,
}: {
  slug: string;
  kind: "logo" | "cover";
  value: string;
  onChange: (next: string) => void;
  previewClass: string;
  previewMode: "contain" | "cover";
  placeholder: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const previewUrl = value.trim();
  const showPreview = previewUrl && looksLikeHttpsUrl(previewUrl);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch(`/api/orgs/${encodeURIComponent(slug)}/manage/upload`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(friendlyUploadError(json?.error));
        return;
      }
      // Server already persists the URL on the org row. We mirror it into
      // the local form state so the manager sees the preview immediately
      // and a subsequent "Save changes" press doesn't blank the column.
      onChange(json.url as string);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className={previewClass}>
          {showPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className={previewMode === "cover"
                ? "w-full h-full object-cover"
                : "max-w-full max-h-full object-contain p-1"}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-gray-300" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className={`${inputClass} pl-9 pr-3`}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f2a4a] border border-gray-200 hover:border-[#4ea8de] hover:text-[#3a95cc] disabled:opacity-60 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <span className="text-[11px] text-gray-500">JPEG, PNG, or WebP · max 5MB</span>
          </div>
        </div>
      </div>
      {uploadError && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span className="flex-1">{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700">
            <X size={12} />
          </button>
        </div>
      )}
      {previewUrl && !looksLikeHttpsUrl(previewUrl) && (
        <p className="text-[11px] text-amber-700">URL must start with https:// (or http://).</p>
      )}
    </div>
  );
}

function friendlyUploadError(code: string | null | undefined): string {
  switch (code) {
    case "signin_required": return "You're signed out. Refresh and try again.";
    case "not_a_manager":   return "Only verified managers can upload images for this org.";
    case "kind_required":   return "Couldn't tell which image slot this was for.";
    case "file_required":   return "Pick a file before uploading.";
    case "org_not_found":   return "We couldn't find this organization.";
    case "invalid_multipart": return "Couldn't read that upload. Try again.";
    default: return code && code.length < 120
      ? code
      : "Upload failed. Please try again or paste an https:// URL instead.";
  }
}
