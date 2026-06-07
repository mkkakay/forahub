"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Database, ChevronDown, ChevronRight, Play, Pause, Loader2,
  CheckCircle2, AlertCircle, Trash2, RefreshCw,
} from "lucide-react";

type Source = "ror" | "iati";

interface JobRow {
  id: string;
  source: Source;
  status: "running" | "completed" | "failed" | "cancelled";
  next_cursor: string | null;
  rows_seen: number;
  rows_inserted: number;
  rows_updated: number;
  rows_merged: number;
  rows_skipped: number;
  last_error: string | null;
  started_at: string;
  finished_at: string | null;
}

interface StatusResponse {
  directoryCounts: Record<string, number>;
  jobs: JobRow[];
}

interface BatchResponse {
  ok: boolean;
  job_id: string;
  source: Source;
  batch: {
    rows_seen: number;
    rows_inserted: number;
    rows_updated: number;
    rows_merged: number;
    rows_skipped: number;
  };
  next_cursor: number;
  total_results: number;
  done: boolean;
}

export default function OrgImportPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState<Source | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Last in-flight batch summary, surfaced live as the loop progresses.
  const [progress, setProgress] = useState<{ source: Source; batch: BatchResponse } | null>(null);

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import-orgs", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setStatus(json as StatusResponse);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setRefreshing(false);
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  async function runLoop(source: Source) {
    setError(null);
    setRunning(source);
    let jobId: string | undefined;
    try {
      // Loop: each POST returns done=true when the source is drained.
      // Each batch is small enough to fit Vercel's serverless timeout.
      while (true) {
        const res = await fetch("/api/admin/import-orgs", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ source, pages: 8, job_id: jobId }),
        });
        const json = (await res.json()) as BatchResponse | { error: string };
        if (!res.ok || !("ok" in json)) {
          throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
        }
        jobId = json.job_id;
        setProgress({ source, batch: json });
        await refresh();
        if (json.done) break;
        // Yield a tick so React can repaint between batches.
        await new Promise(r => setTimeout(r, 30));
      }
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setRunning(null);
    }
  }

  async function deleteSource(source: Source) {
    if (!window.confirm(`Delete every imported ${source.toUpperCase()} row from the directory? Manual + submission rows are untouched.`)) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/import-orgs", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  function statusPill(s: JobRow["status"]): { label: string; cls: string; icon: React.ReactNode } {
    if (s === "completed") return { label: "Completed", cls: "bg-emerald-900/30 text-emerald-300 border-emerald-700/40", icon: <CheckCircle2 size={10} /> };
    if (s === "running") return { label: "Running", cls: "bg-blue-900/30 text-blue-300 border-blue-700/40", icon: <Loader2 size={10} className="animate-spin" /> };
    if (s === "failed") return { label: "Failed", cls: "bg-red-900/30 text-red-300 border-red-700/40", icon: <AlertCircle size={10} /> };
    return { label: "Cancelled", cls: "bg-amber-900/30 text-amber-300 border-amber-700/40", icon: <Pause size={10} /> };
  }

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database size={18} className="text-sky-300" />
          <h2 className="text-white font-semibold">Directory Bulk Import</h2>
          <span className="text-xs text-blue-500">
            ROR + IATI bulk import — Phase 1 of directory growth
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="break-words flex-1">{error}</span>
            </div>
          )}

          <div className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2 text-xs text-blue-300">
            <strong>Integrity rule:</strong> ROR + IATI rows land at tier 2 with{" "}
            <code className="text-sky-300">domain_verified_via=&quot;ror&quot;</code> /{" "}
            <code className="text-sky-300">domain_verified_via=&quot;iati&quot;</code> when a website is on record
            (<code className="text-sky-300">domain_confidence=1.0</code>). Rows without a website land findable but at confidence 0 — they still go through admin review on claim, never auto-verify.
          </div>

          {/* Directory size by source */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Directory size by source</h3>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="text-xs text-[#4ea8de] hover:underline flex items-center gap-1.5"
              >
                <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {(["manual", "ror", "iati", "submission", "auto_discovered"] as const).map(src => (
                <div key={src} className="bg-[#0a1a2e] border border-blue-900/40 rounded-md px-3 py-2">
                  <div className="text-[10px] text-blue-400 uppercase tracking-wider">{src}</div>
                  <div className="text-white font-semibold text-lg">
                    {(status?.directoryCounts[src] ?? 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-source controls */}
          <div className="grid md:grid-cols-2 gap-3">
            {(["ror", "iati"] as const).map(src => {
              const isRunning = running === src;
              const last = status?.jobs.find(j => j.source === src);
              return (
                <div key={src} className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold text-sm uppercase tracking-wider">{src}</h3>
                    {last && (() => {
                      const p = statusPill(last.status);
                      return (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5 border ${p.cls}`}>
                          {p.icon} {p.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[11px] text-blue-400 mb-3">
                    {src === "ror"
                      ? "Research Organization Registry — universities, research institutes, hospitals, govt labs, funders. CC0. ~110K rows."
                      : "IATI Datastore — bilateral donors, multilaterals, INGOs, foundations registered as aid actors. Public domain. ~3–5K rows."}
                  </p>
                  {isRunning && progress?.source === src && (
                    <div className="mb-2 text-xs text-blue-200 bg-blue-900/30 border border-blue-900/40 rounded px-2 py-1.5">
                      Batch: +{progress.batch.batch.rows_inserted} new, +{progress.batch.batch.rows_updated} updated, +{progress.batch.batch.rows_merged} merged. Cursor {progress.batch.next_cursor.toLocaleString()} / {progress.batch.total_results.toLocaleString()}.
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => runLoop(src)}
                      disabled={isRunning || running !== null}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:bg-blue-900/40 disabled:text-blue-500 text-white font-semibold px-3 py-1.5 rounded text-xs transition-colors"
                    >
                      {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      {isRunning ? "Running…" : last?.status === "completed" ? "Re-run (idempotent)" : "Run import"}
                    </button>
                    <button
                      onClick={() => deleteSource(src)}
                      disabled={isRunning || running !== null}
                      className="inline-flex items-center justify-center gap-1.5 text-red-300 hover:text-red-100 border border-red-900/40 hover:border-red-500/50 rounded px-2 py-1.5 text-xs"
                      title={`Delete every ${src.toUpperCase()} row`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {last && (
                    <div className="mt-2 text-[11px] text-blue-400 grid grid-cols-2 gap-x-3 gap-y-0.5">
                      <span>Seen: {last.rows_seen.toLocaleString()}</span>
                      <span>Inserted: {last.rows_inserted.toLocaleString()}</span>
                      <span>Updated: {last.rows_updated.toLocaleString()}</span>
                      <span>Merged: {last.rows_merged.toLocaleString()}</span>
                      <span>Skipped: {last.rows_skipped.toLocaleString()}</span>
                      {last.last_error && (
                        <span className="col-span-2 text-red-300 mt-1 break-words">⚠ {last.last_error}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
