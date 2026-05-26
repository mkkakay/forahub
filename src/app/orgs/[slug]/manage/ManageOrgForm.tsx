"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, X, Link as LinkIcon, AtSign, Briefcase, Globe, Image as ImageIcon } from "lucide-react";
import { parseApiResponse } from "@/lib/admin/fetchJson";

interface Initial {
  name: string;
  short_name: string;
  description: string;
  logo_url: string;
  website_url: string;
  twitter_url: string;
  linkedin_url: string;
}

const labelClass = "block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5";
const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de] transition-colors";

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
          website_url: form.website_url.trim(),
          twitter_url: form.twitter_url.trim(),
          linkedin_url: form.linkedin_url.trim(),
        }),
      });
      const parsed = await parseApiResponse<{ success: boolean }>(res);
      if (!parsed.ok) {
        setError(parsed.error || "Could not save changes.");
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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6 space-y-5">
      <h2 className="text-lg font-bold text-[#0f2a4a]">Profile</h2>

      <div className="flex items-center gap-3">
        <div className="shrink-0 w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
          {form.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo_url} alt="" className="max-w-full max-h-full object-contain p-1" />
          ) : (
            <ImageIcon className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <label className={labelClass}>Logo URL</label>
          <div className="relative">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={form.logo_url}
              onChange={e => update("logo_url", e.target.value)}
              placeholder="https://example.org/logo.svg"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
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

      <div>
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

      <div>
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
        <div>
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
        <div>
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
  );
}
