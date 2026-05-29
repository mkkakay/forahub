"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Image as ImageIcon, ChevronDown, ChevronRight, Loader2, Upload, Check, X, AlertCircle,
  Link as LinkIcon,
} from "lucide-react";

interface PageBannerRow {
  id: string;
  page_key: string;
  image_url: string | null;
  overlay_level: "light" | "medium" | "dark";
  is_active: boolean;
  variant: "standard" | "slim";
  updated_at: string;
}

const PAGE_LABELS: Record<string, { name: string; url: string }> = {
  about: { name: "About", url: "/about" },
  abstracts: { name: "Abstracts", url: "/abstracts" },
  alerts: { name: "Alerts", url: "/alerts" },
  assistant: { name: "AI Assistant", url: "/assistant" },
  claim: { name: "Claim Org", url: "/claim" },
  contact: { name: "Contact", url: "/contact" },
  dashboard: { name: "Dashboard", url: "/dashboard" },
  "data-sources": { name: "Data Sources", url: "/data-sources" },
  events: { name: "Events", url: "/events" },
  help: { name: "Help Center", url: "/help" },
  map: { name: "Global Map", url: "/map" },
  notifications: { name: "Notifications", url: "/notifications" },
  offline: { name: "Offline", url: "/offline" },
  "payment-cancel": { name: "Payment — Cancelled", url: "/payment/cancel" },
  "payment-success": { name: "Payment — Success", url: "/payment/success" },
  pricing: { name: "Pricing", url: "/pricing" },
  privacy: { name: "Privacy Policy", url: "/privacy" },
  profile: { name: "Profile", url: "/profile" },
  saved: { name: "Saved Events", url: "/saved" },
  submit: { name: "Submit Event", url: "/submit" },
  "submit-bulk": { name: "Submit — Bulk", url: "/submit/bulk" },
  "submit-single": { name: "Submit — Single", url: "/submit/single" },
  terms: { name: "Terms of Service", url: "/terms" },
};

export default function PageBannersPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PageBannerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [pasteUrls, setPasteUrls] = useState<Record<string, string>>({});

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/page-banners", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows((json.data ?? []) as PageBannerRow[]);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  function flash(key: string) {
    setSavedKey(key);
    setTimeout(() => setSavedKey(k => (k === key ? null : k)), 2500);
  }

  async function patch(key: string, payload: Partial<PageBannerRow>) {
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/page-banners", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ page_key: key, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows(rs => rs.map(r => (r.page_key === key ? (json.data as PageBannerRow) : r)));
      flash(key);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusyKey(null);
    }
  }

  async function upload(key: string, file: File) {
    setBusyKey(key);
    setError(null);
    // Soft validation: warn if width < 1200, file too large, far-from-landscape ratio
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("File too large (max 5MB)");
      // Quick width sniff via Image() — non-blocking warning, not a hard block.
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          if (img.width < 1200) console.warn(`page-banner upload: width ${img.width}px below recommended 1200px`);
          const ratio = img.width / Math.max(1, img.height);
          if (ratio < 2 || ratio > 8) console.warn(`page-banner upload: aspect ${ratio.toFixed(2)} far from landscape`);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
        img.src = url;
      });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page_key", key);
      const res = await fetch("/api/admin/page-banners/upload", { method: "POST", headers, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      // Server auto-enables is_active when an image is uploaded — mirror
      // that in local state so the toggle reflects the new "on" state.
      setRows(rs => rs.map(r => (r.page_key === key ? { ...r, image_url: json.image_url as string, is_active: true } : r)));
      flash(key);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusyKey(null);
    }
  }

  async function setUrl(key: string) {
    const url = (pasteUrls[key] ?? "").trim();
    if (!url) return;
    await patch(key, { image_url: url });
    setPasteUrls(p => ({ ...p, [key]: "" }));
  }

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-amber-300" />
          <h2 className="text-white font-semibold">Page Banners</h2>
          <span className="text-xs text-blue-500">
            {rows.length > 0
              ? `${rows.length} pages · ${rows.filter(r => r.is_active).length} using custom image`
              : "header background for each top-level page"}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-3">
          <p className="text-xs text-blue-400 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2">
            Upload or paste a hero image for any top-level page. The default navy header is used until you toggle &quot;Use image&quot; on.
            Recommended: 1920×400px landscape image. Mandatory overlay is applied automatically — Light / Medium / Dark just adjusts darkness.
          </p>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="break-words flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          )}

          {loading && rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map(row => {
                const isBusy = busyKey === row.page_key;
                return (
                  <li key={row.page_key} className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-3 grid grid-cols-1 lg:grid-cols-[200px_1fr_auto] gap-3">
                    {/* Thumbnail */}
                    <div className="w-full lg:w-[200px] h-24 rounded-md border border-blue-900/40 overflow-hidden bg-[#0f2a4a] flex items-center justify-center">
                      {row.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-[10px] text-blue-500 px-2 text-center">Using default navy</span>
                      )}
                    </div>

                    {/* Settings */}
                    <div className="space-y-2 min-w-0">
                      <div>
                        <p className="text-white text-sm font-semibold">
                          {(PAGE_LABELS[row.page_key]?.name) ?? row.page_key}
                          <span className="text-blue-500 text-[10px] font-normal ml-2">{row.page_key}</span>
                        </p>
                        <p className="text-blue-400 text-[11px] font-mono mt-0.5">
                          {PAGE_LABELS[row.page_key]?.url ?? `/${row.page_key}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <LinkIcon size={12} className="text-blue-500 shrink-0" />
                        <input
                          type="url"
                          value={pasteUrls[row.page_key] ?? ""}
                          onChange={e => setPasteUrls(p => ({ ...p, [row.page_key]: e.target.value }))}
                          placeholder="Or paste image URL"
                          className="flex-1 bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
                        />
                        <button
                          onClick={() => setUrl(row.page_key)}
                          disabled={isBusy || !(pasteUrls[row.page_key] ?? "").trim()}
                          className="shrink-0 bg-[#0d2240] hover:bg-[#1a3f6e] disabled:opacity-40 text-white text-xs font-semibold px-2.5 py-1.5 rounded border border-blue-900/40"
                        >
                          Set
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Overlay</span>
                          <div className="inline-flex rounded border border-blue-900/40 overflow-hidden">
                            {(["light", "medium", "dark"] as const).map(level => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => patch(row.page_key, { overlay_level: level })}
                                className={`text-[11px] font-semibold px-3 py-1 transition-colors ${
                                  row.overlay_level === level
                                    ? "bg-[#4ea8de] text-white"
                                    : "bg-[#0a1a2e] text-blue-300 hover:bg-[#0d2240]"
                                } ${level !== "light" ? "border-l border-blue-900/40" : ""}`}
                              >
                                {level[0].toUpperCase() + level.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Size</span>
                          <select
                            value={row.variant}
                            onChange={e => patch(row.page_key, { variant: e.target.value as "standard" | "slim" })}
                            className="bg-[#0a1a2e] border border-blue-900/40 text-white text-[11px] font-semibold rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
                          >
                            <option value="standard">Standard</option>
                            <option value="slim">Slim</option>
                          </select>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={row.is_active}
                          disabled={isBusy || !row.image_url}
                          onChange={e => patch(row.page_key, { is_active: e.target.checked })}
                          className="accent-emerald-400"
                        />
                        <span className={`text-[11px] font-semibold ${row.is_active ? "text-emerald-300" : "text-blue-300"}`}>
                          {row.is_active ? "Using image" : "Using default navy"}
                        </span>
                        {!row.image_url && <span className="text-[10px] text-blue-500">(upload an image first)</span>}
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2 lg:items-end">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                        {isBusy ? <Loader2 size={12} className="animate-spin" /> : savedKey === row.page_key ? <Check size={12} /> : <Upload size={12} />}
                        {isBusy ? "Working…" : savedKey === row.page_key ? "Saved" : "Upload image"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={isBusy}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) { upload(row.page_key, f); e.target.value = ""; }
                          }}
                        />
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
