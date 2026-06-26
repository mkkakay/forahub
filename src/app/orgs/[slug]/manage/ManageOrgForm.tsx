"use client";

// Profile-tab form. The per-field completeness nudge that used to live
// at the top of this component was replaced by the page-level
// OrgSetupChecklist — which measures profile + team + events together
// rather than only profile fields. This file is the form only.
//
// Cover/logo image support: each field accepts EITHER a pasted URL
// (validated as http/https + image-y extension hint, live previewed) OR
// a direct file upload that posts to /api/orgs/[slug]/manage/upload.
// The upload endpoint reuses the same imageUpload helpers + hero-images
// bucket the /admin event-banner uploader uses, so we have one
// storage convention to operate.

import { useState, useRef } from "react";
import {
  Loader2, CheckCircle2, AlertCircle, X, Link as LinkIcon, AtSign,
  Briefcase, Globe, Image as ImageIcon, Upload,
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

// Labels read as proper field names, not tiny caps. Uppercase tracking-
// wider made the form feel like a tabular editor; sm + semibold reads
// as a confident institutional form. Section headers retain the small-
// caps treatment so they stay clearly subordinate to the form.
const labelClass = "block text-sm font-semibold text-gray-800 dark:text-slate-100 mb-1.5";
const inputClass =
  "w-full bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400/90 dark:placeholder-slate-500/90 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/30 focus:border-[#4ea8de] transition-colors";

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

  function update<K extends keyof Initial>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

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
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_1px_2px_rgba(15,42,74,0.04)] p-5 md:p-7"
      >
        <header className="mb-6">
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-slate-100">Profile</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            This information appears on your public organization page.
          </p>
        </header>

        {/* ── 1. Brand ────────────────────────────────────────── */}
        <SectionHeader title="Brand" subtitle="Logo and cover image." />

        <div id="field-logo" className="scroll-mt-24">
          <label htmlFor="org-logo-url" className={labelClass}>Logo</label>
          <ImageField
            slug={slug}
            kind="logo"
            value={form.logo_url}
            onChange={(v) => update("logo_url", v)}
            previewClass="w-20 h-20 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200/80 dark:border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0"
            previewMode="contain"
            placeholder="Paste an https://… URL, or upload an image."
          />
        </div>

        <div id="field-cover" className="scroll-mt-24 mt-5">
          <label htmlFor="org-cover-url" className={labelClass}>Cover image</label>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-1.5">Recommended: 1200 × 400px or larger, landscape.</p>
          <ImageField
            slug={slug}
            kind="cover"
            value={form.cover_image_url}
            onChange={(v) => update("cover_image_url", v)}
            previewClass="w-32 h-16 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200/80 dark:border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0"
            previewMode="cover"
            placeholder="Paste an https://… URL, or upload an image."
          />
        </div>

        {/* ── 2. Basic information ────────────────────────────── */}
        <SectionHeader title="Basic information" subtitle="What appears on your public page." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="field-name" className="scroll-mt-24">
            <label htmlFor="org-name" className={labelClass}>Display name <span className="text-rose-500" aria-label="required">*</span></label>
            <input
              id="org-name"
              value={form.name}
              onChange={e => update("name", e.target.value)}
              maxLength={120}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="org-short-name" className={labelClass}>Short name</label>
            <input
              id="org-short-name"
              value={form.short_name}
              onChange={e => update("short_name", e.target.value)}
              maxLength={120}
              placeholder="e.g. WHO"
              className={inputClass}
            />
          </div>
        </div>

        <div id="field-description" className="scroll-mt-24 mt-5">
          <label htmlFor="org-description" className={labelClass}>Description</label>
          <textarea
            id="org-description"
            value={form.description}
            onChange={e => update("description", e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="One short paragraph about your organization."
            className={inputClass}
          />
          <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-1">{form.description.length}/600</p>
        </div>

        {/* ── 3. Online presence ──────────────────────────────── */}
        <SectionHeader title="Online presence" subtitle="Where people can find you elsewhere." />

        <div id="field-website" className="scroll-mt-24">
          <label htmlFor="org-website" className={labelClass}>Website</label>
          <div className="relative">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" aria-hidden="true" />
            <input
              id="org-website"
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
            <label htmlFor="org-twitter" className={labelClass}>Twitter / X</label>
            <div className="relative">
              <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" aria-hidden="true" />
              <input
                id="org-twitter"
                type="url"
                value={form.twitter_url}
                onChange={e => update("twitter_url", e.target.value)}
                placeholder="https://x.com/yourorg"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          <div id="field-linkedin" className="scroll-mt-24">
            <label htmlFor="org-linkedin" className={labelClass}>LinkedIn</label>
            <div className="relative">
              <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-700" aria-hidden="true" />
              <input
                id="org-linkedin"
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

        <div className="flex items-center justify-end gap-3 mt-7 pt-5 border-t border-gray-100 dark:border-slate-800">
          {saved && (
            <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] disabled:bg-gray-300 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mt-8 mb-5 pt-6 first:mt-0 first:pt-0 first:border-t-0 border-t border-gray-100 dark:border-slate-800">
      <h3 className="text-base font-bold text-[#0f2a4a] dark:text-slate-100">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
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
            <ImageIcon className="w-6 h-6 text-gray-300 dark:text-slate-600" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" aria-hidden="true" />
            <input
              type="url"
              id={`org-${kind}-url`}
              aria-label={`${kind === "logo" ? "Logo" : "Cover image"} URL`}
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f2a4a] dark:text-slate-100 border border-gray-200 dark:border-slate-700 hover:border-[#4ea8de] hover:text-[#3a95cc] disabled:opacity-60 rounded-lg px-2.5 py-1.5 transition-colors"
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
            <span className="text-[11px] text-gray-500 dark:text-slate-400">JPEG, PNG, or WebP · max 5MB</span>
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
