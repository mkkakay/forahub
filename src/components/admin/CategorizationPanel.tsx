"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Tag, ChevronDown, ChevronRight, Loader2, Play, AlertCircle, Sparkles,
} from "lucide-react";
import { EVENT_CATEGORIES, type CategoryKey } from "@/lib/categories";

interface Stats {
  total: number;
  uncategorized: number;
  low_confidence: number;
  by_category: Record<string, number>;
  by_source: Record<string, number>;
}

interface RunSummary {
  mode: "keyword_only" | "ai";
  batch_size: number;
  processed: number;
  skipped: number;
  by_source: Record<string, number>;
  total_cost_usd: number;
  remaining: number;
}

interface LowConfEvent {
  id: string;
  title: string;
  organization: string | null;
  category: CategoryKey;
  category_secondary: CategoryKey[] | null;
  category_confidence: number;
  category_source: string;
  sdg_goals: number[] | null;
  start_date: string;
}

const SOURCE_LABELS: Record<string, string> = {
  ai: "AI",
  keyword: "Keyword",
  sdg_inferred: "SDG hint",
  admin: "Admin",
  submitter: "Submitter",
};

export default function CategorizationPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lowConf, setLowConf] = useState<LowConfEvent[]>([]);
  const [showLowConf, setShowLowConf] = useState(false);
  const [running, setRunning] = useState<"keyword_only" | "ai" | null>(null);
  const [lastRun, setLastRun] = useState<RunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categorize-events?stats=1", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setStats(json as Stats);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLowConf = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categorize-events?low_confidence=1", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setLowConf((json.events ?? []) as LowConfEvent[]);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  async function runClassify(mode: "keyword_only" | "ai") {
    setRunning(mode);
    setError(null);
    setLastRun(null);
    try {
      const res = await fetch("/api/admin/categorize-events", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setLastRun(json as RunSummary);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setRunning(null);
    }
  }

  async function setCategory(eventId: string, category: CategoryKey) {
    try {
      const res = await fetch("/api/admin/categorize-events", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, category }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setLowConf(prev => prev.filter(e => e.id !== eventId));
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  const classifiedTotal = stats ? stats.total - stats.uncategorized : 0;

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Tag size={18} className="text-violet-400" />
          <h2 className="text-white font-semibold">Event Categorization</h2>
          <span className="text-xs text-blue-500">
            {stats
              ? `${classifiedTotal}/${stats.total} classified · ${stats.uncategorized} pending · ${stats.low_confidence} low-confidence`
              : "humanitarian / development / nexus / policy / research"}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-200 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-white">dismiss</button>
            </div>
          )}

          {/* Per-category breakdown */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {EVENT_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const count = stats.by_category[cat.key] ?? 0;
                return (
                  <div key={cat.key} className="rounded-lg border border-blue-900/40 bg-[#0f2a4a] px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-blue-400 font-medium">
                      <Icon size={12} style={{ color: cat.color }} />
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <p className="text-white text-xl font-bold tabular-nums mt-0.5">{count}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Source breakdown */}
          {stats && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-blue-500 uppercase tracking-wider font-medium">Sources:</span>
              {Object.entries(stats.by_source).map(([src, count]) => (
                <span key={src} className="px-2 py-0.5 rounded-full bg-[#0f2a4a] border border-blue-900/40 text-blue-200">
                  {SOURCE_LABELS[src] ?? src} · {count}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => runClassify("keyword_only")}
              disabled={running !== null}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg bg-[#0f2a4a] border border-blue-900/40 text-white hover:bg-[#143559] disabled:opacity-50"
            >
              {running === "keyword_only" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Keyword + SDG pass (free)
            </button>
            <button
              onClick={() => runClassify("ai")}
              disabled={running !== null}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
            >
              {running === "ai" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Full pass (AI fallback)
            </button>
            <button
              onClick={() => {
                setShowLowConf(s => !s);
                if (!showLowConf && lowConf.length === 0) loadLowConf();
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border border-blue-900/40 text-blue-200 hover:bg-[#0f2a4a]"
            >
              {showLowConf ? "Hide" : "Review"} low-confidence ({stats?.low_confidence ?? 0})
            </button>
          </div>

          {/* Last run summary */}
          {lastRun && (
            <div className="text-xs text-blue-200 bg-[#0f2a4a] border border-blue-900/40 rounded-lg px-3 py-2 space-y-1">
              <div>
                <span className="text-blue-400 uppercase tracking-wider mr-2">Last run ({lastRun.mode}):</span>
                processed <span className="font-semibold text-white">{lastRun.processed}</span>,
                skipped <span className="font-semibold text-white">{lastRun.skipped}</span>,
                remaining <span className="font-semibold text-white">{lastRun.remaining}</span>
              </div>
              <div>
                <span className="text-blue-400 uppercase tracking-wider mr-2">Cost:</span>
                <span className="font-semibold text-white">${lastRun.total_cost_usd.toFixed(4)}</span>
                <span className="text-blue-500 ml-2">
                  ({Object.entries(lastRun.by_source).map(([s, c]) => `${SOURCE_LABELS[s] ?? s} ${c}`).join(", ") || "no hits"})
                </span>
              </div>
            </div>
          )}

          {/* Low-confidence review */}
          {showLowConf && (
            <div className="border border-blue-900/40 rounded-lg overflow-hidden">
              <div className="bg-[#0f2a4a] px-3 py-2 text-xs uppercase tracking-wider text-blue-400 font-medium">
                Lowest-confidence classifications — pick the right category to lock it in
              </div>
              {lowConf.length === 0 ? (
                <div className="px-3 py-4 text-xs text-blue-500">No low-confidence events. {stats?.low_confidence === 0 ? "All clean." : "Loading…"}</div>
              ) : (
                <ul className="divide-y divide-blue-900/40">
                  {lowConf.map(ev => (
                    <li key={ev.id} className="px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-white font-semibold line-clamp-1">{ev.title}</p>
                        <span className="text-[11px] text-blue-400 shrink-0">
                          {(ev.category_confidence * 100).toFixed(0)}% · {SOURCE_LABELS[ev.category_source] ?? ev.category_source}
                        </span>
                      </div>
                      <p className="text-xs text-blue-400">
                        {ev.organization ?? "—"} · current: <span className="text-blue-200 font-medium">{ev.category}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {EVENT_CATEGORIES.map(cat => {
                          const Icon = cat.icon;
                          const active = ev.category === cat.key;
                          return (
                            <button
                              key={cat.key}
                              onClick={() => setCategory(ev.id, cat.key)}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                                active
                                  ? "border-white/40 text-white bg-white/10"
                                  : "border-blue-900/40 text-blue-200 hover:bg-[#0f2a4a]"
                              }`}
                            >
                              <Icon size={10} style={{ color: cat.color }} />
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
