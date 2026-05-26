"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronDown, ChevronRight, Loader2, Upload, Sparkles,
  Search, AlertCircle, Check, X, Link as LinkIcon, Play, Star,
} from "lucide-react";

interface EventRow {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  sdg_goals: number[] | null;
  banner_image_url: string | null;
  banner_fetched_at: string | null;
  banner_display_mode: "contain" | "cover" | null;
  is_featured: boolean | null;
  featured_until: string | null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

export default function EventsBannerPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pasteUrls, setPasteUrls] = useState<Record<string, string>>({});
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillResult, setBackfillResult] = useState<
    null | { processed: number; success: number; pexels_hits: number; unsplash_hits: number; failures: number }
  >(null);

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/events", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setEvents((json.data ?? []) as EventRow[]);
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
    if (!query.trim()) return events;
    const q = query.trim().toLowerCase();
    return events.filter(
      e =>
        e.title.toLowerCase().includes(q) ||
        (e.organization ?? "").toLowerCase().includes(q)
    );
  }, [events, query]);

  function flashSaved(id: string) {
    setSavedFlash(id);
    setTimeout(() => setSavedFlash(s => (s === id ? null : s)), 2500);
  }

  async function uploadFile(eventId: string, file: File) {
    setBusyId(eventId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("event_id", eventId);
      const res = await fetch("/api/admin/events/upload-banner", {
        method: "POST",
        headers,
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      flashSaved(eventId);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusyId(null);
    }
  }

  async function setUrl(eventId: string) {
    const url = (pasteUrls[eventId] ?? "").trim();
    if (!url) {
      setError("Paste a URL first");
      return;
    }
    setBusyId(eventId);
    setError(null);
    try {
      const res = await fetch("/api/admin/events/set-banner-url", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, banner_url: url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setPasteUrls(p => ({ ...p, [eventId]: "" }));
      flashSaved(eventId);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusyId(null);
    }
  }

  async function changeDisplayMode(eventId: string, mode: "contain" | "cover") {
    // Optimistic UI: update local state immediately so the toggle responds.
    setEvents(list => list.map(e => (e.id === eventId ? { ...e, banner_display_mode: mode } : e)));
    setBusyId(eventId);
    setError(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, banner_display_mode: mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      flashSaved(eventId);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function runBackfill() {
    setBackfillBusy(true);
    setBackfillResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/backfill-banners", {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setBackfillResult({
        processed: json.processed ?? 0,
        success: json.success ?? 0,
        pexels_hits: json.pexels_hits ?? 0,
        unsplash_hits: json.unsplash_hits ?? 0,
        failures: json.failures ?? 0,
      });
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBackfillBusy(false);
    }
  }

  async function toggleFeatured(eventId: string, next: boolean) {
    setEvents(list => list.map(e => (e.id === eventId ? { ...e, is_featured: next } : e)));
    setBusyId(eventId);
    setError(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, is_featured: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      flashSaved(eventId);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function refetchPexels(eventId: string) {
    setBusyId(eventId);
    setError(null);
    try {
      const res = await fetch("/api/events/fetch-banner", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      flashSaved(eventId);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusyId(null);
    }
  }

  const inputClass =
    "w-full bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40";

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-[#4ea8de]" />
          <h2 className="text-white font-semibold">Event Banners</h2>
          <span className="text-xs text-blue-500">
            {events.length > 0
              ? `${events.length} upcoming · ${events.filter(e => e.banner_image_url).length} with banners`
              : "upload or re-fetch banners for upcoming events"}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-4">
          <div className="text-xs text-blue-400 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2">
            Showing the next 50 upcoming events. Upload a specific photo (max 5MB), paste a URL, or re-fetch the banner (Pexels → Unsplash) for a fresh stock image. Featured events display in the Events page strip when 3+ have real banners. Run banner backfill if needed.
          </div>

          <div className="flex items-start gap-3 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">Run banner backfill</p>
              <p className="text-xs text-blue-400 mt-0.5">
                Fetches SDG-aware banners (Pexels → Unsplash) for up to 50 events with no banner yet.
              </p>
              {backfillResult && (
                <p className="text-xs text-blue-300 mt-2">
                  Processed {backfillResult.processed} · {backfillResult.success} success
                  ({backfillResult.pexels_hits} Pexels, {backfillResult.unsplash_hits} Unsplash)
                  · {backfillResult.failures} failed
                </p>
              )}
            </div>
            <button
              onClick={runBackfill}
              disabled={backfillBusy}
              className="shrink-0 inline-flex items-center gap-1.5 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
            >
              {backfillBusy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              {backfillBusy ? "Running…" : "Run banner backfill"}
            </button>
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

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by event title or organization…"
              className="w-full bg-[#0a1a2e] border border-blue-900/40 text-white placeholder-blue-500 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
            />
          </div>

          {loading && events.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm">No matching upcoming events.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(event => {
                const isBusy = busyId === event.id;
                return (
                  <div key={event.id} className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-3 grid grid-cols-1 lg:grid-cols-[160px_1fr_auto] gap-3">
                    {/* Banner thumbnail */}
                    <div className="w-full lg:w-[160px] h-24 rounded-md border border-blue-900/40 overflow-hidden bg-white flex items-center justify-center">
                      {event.banner_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.banner_image_url}
                          alt=""
                          className={
                            event.banner_display_mode === "contain"
                              ? "w-full h-full object-contain"
                              : "w-full h-full object-cover"
                          }
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[10px] text-blue-500 px-2 text-center">No banner yet</span>
                      )}
                    </div>

                    {/* Event meta + paste-URL field */}
                    <div className="space-y-2 min-w-0">
                      <div>
                        <p className="text-white text-sm font-semibold line-clamp-2">{event.title}</p>
                        <p className="text-blue-400 text-xs mt-0.5">
                          {event.organization ?? "—"} · {formatDate(event.start_date)}
                          {event.sdg_goals && event.sdg_goals.length > 0 && (
                            <span className="ml-2 text-blue-500">SDG {event.sdg_goals.join(", ")}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <LinkIcon size={12} className="text-blue-500 shrink-0" />
                        <input
                          type="url"
                          value={pasteUrls[event.id] ?? ""}
                          onChange={e => setPasteUrls(p => ({ ...p, [event.id]: e.target.value }))}
                          placeholder="Paste image URL (any source)"
                          className={inputClass}
                        />
                        <button
                          onClick={() => setUrl(event.id)}
                          disabled={isBusy || !(pasteUrls[event.id] ?? "").trim()}
                          className="shrink-0 bg-[#0d2240] hover:bg-[#1a3f6e] disabled:opacity-40 text-white text-xs font-semibold px-2.5 py-1.5 rounded border border-blue-900/40 hover:border-[#4ea8de]/50 transition-colors"
                        >
                          Set
                        </button>
                      </div>
                      {/* Feature toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!event.is_featured}
                          disabled={isBusy}
                          onChange={e => toggleFeatured(event.id, e.target.checked)}
                          className="accent-amber-400"
                        />
                        <Star size={12} className={event.is_featured ? "text-amber-400 fill-amber-300" : "text-blue-500"} />
                        <span className={`text-[11px] font-semibold ${event.is_featured ? "text-amber-300" : "text-blue-300"}`}>
                          Feature this event
                        </span>
                        <span className="text-[10px] text-blue-500">
                          {event.is_featured
                            ? event.featured_until
                              ? `until ${new Date(event.featured_until).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                              : "active"
                            : "appears at top of /events for 30 days"}
                        </span>
                      </label>

                      {/* Display-mode toggle — auto-saves */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Banner</span>
                        <div className="inline-flex rounded border border-blue-900/40 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => changeDisplayMode(event.id, "cover")}
                            className={`text-[11px] font-semibold px-3 py-1 transition-colors ${
                              (event.banner_display_mode ?? "cover") === "cover"
                                ? "bg-[#4ea8de] text-white"
                                : "bg-[#0a1a2e] text-blue-300 hover:bg-[#0d2240]"
                            }`}
                          >
                            Photo (fill)
                          </button>
                          <button
                            type="button"
                            onClick={() => changeDisplayMode(event.id, "contain")}
                            className={`text-[11px] font-semibold px-3 py-1 border-l border-blue-900/40 transition-colors ${
                              event.banner_display_mode === "contain"
                                ? "bg-[#4ea8de] text-white"
                                : "bg-[#0a1a2e] text-blue-300 hover:bg-[#0d2240]"
                            }`}
                          >
                            Logo (fit)
                          </button>
                        </div>
                        <span className="text-[10px] text-blue-500">auto-saves</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2 lg:items-end">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                        {isBusy ? <Loader2 size={12} className="animate-spin" /> : savedFlash === event.id ? <Check size={12} /> : <Upload size={12} />}
                        {isBusy ? "Working…" : savedFlash === event.id ? "Saved" : "Upload banner"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={isBusy}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) {
                              uploadFile(event.id, f);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <button
                        onClick={() => refetchPexels(event.id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-white border border-blue-900/40 hover:border-[#4ea8de]/50 disabled:opacity-40 rounded px-2 py-1.5 transition-colors"
                      >
                        <Sparkles size={12} /> Re-fetch banner
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
