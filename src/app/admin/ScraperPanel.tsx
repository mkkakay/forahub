"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play, Square, Loader2, CheckCircle2, AlertCircle,
  Database, Zap, ListChecks, Clock, AlertTriangle, Globe,
} from "lucide-react";

const TOTAL_SOURCES = 2874;
const FULL_BATCH_SIZE = 5;
const BETWEEN_BATCH_DELAY_MS = 5_000;
const LS_KEY = "forahub_full_scrape_progress";

interface LastRun {
  run_at: string;
  sources_processed: number;
  events_found: number;
  events_saved: number;
  duration_seconds: number | null;
  errors: string | null;
}

interface RunResult {
  processed: number;
  eventsFound: number;
  eventsSaved: number;
  errors: string[];
  totalSources: number;
  batchInfo: { offset: number; batchSize: number; nextOffset: number };
  durationSeconds: number;
}

interface FullScrapeProgress {
  offset: number;
  totalFound: number;
  totalSaved: number;
  totalErrors: number;
  startedAt: number; // ms epoch
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export default function ScraperPanel({
  lastRun,
  totalEvents,
  adminSecret,
}: {
  lastRun: LastRun | null;
  totalEvents: number;
  adminSecret: string;
}) {
  // ── Single-batch state ────────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(10);

  // ── ReliefWeb importer state ──────────────────────────────────────────────
  interface ReliefWebResult {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
    durationSeconds: number;
    error?: string;
  }
  const [rwRunning, setRwRunning] = useState(false);
  const [rwLimit, setRwLimit] = useState(1000);
  const [rwResult, setRwResult] = useState<ReliefWebResult | null>(null);
  const [rwError, setRwError] = useState<string | null>(null);

  async function runReliefWebImport() {
    setRwRunning(true);
    setRwResult(null);
    setRwError(null);
    try {
      const res = await fetch("/api/import-reliefweb", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminSecret },
        body: JSON.stringify({ limit: rwLimit, offset: 0 }),
      });
      const data = (await res.json()) as ReliefWebResult;
      if (!res.ok) {
        setRwError(data.error ?? `HTTP ${res.status}`);
      } else {
        setRwResult(data);
      }
    } catch (err) {
      setRwError(String(err));
    } finally {
      setRwRunning(false);
    }
  }

  // ── Full scrape state ─────────────────────────────────────────────────────
  const [fullRunning, setFullRunning] = useState(false);
  const [fullDone, setFullDone] = useState(false);
  const [fullProgress, setFullProgress] = useState<FullScrapeProgress | null>(null);
  const [waitingNext, setWaitingNext] = useState(false);
  const stopRef = useRef(false);

  // Restore progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const p = JSON.parse(saved) as FullScrapeProgress;
        // Only restore if incomplete
        if (p.offset < TOTAL_SOURCES) setFullProgress(p);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Single-batch run ──────────────────────────────────────────────────────
  async function runScraper() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminSecret },
        body: JSON.stringify({ batchSize, offset: 0 }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      setResult((await res.json()) as RunResult);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  }

  // ── Full scrape run ───────────────────────────────────────────────────────
  async function startFullScrape(resumeFrom?: number) {
    stopRef.current = false;
    setFullRunning(true);
    setFullDone(false);
    setError(null);
    setResult(null);

    const initialOffset = resumeFrom ?? 0;
    const startedAt = fullProgress?.startedAt ?? Date.now();

    let progress: FullScrapeProgress = {
      offset: initialOffset,
      totalFound: fullProgress?.totalFound ?? 0,
      totalSaved: fullProgress?.totalSaved ?? 0,
      totalErrors: fullProgress?.totalErrors ?? 0,
      startedAt,
    };

    if (resumeFrom == null) {
      // Fresh start — clear old progress
      progress = { offset: 0, totalFound: 0, totalSaved: 0, totalErrors: 0, startedAt: Date.now() };
      setFullProgress(progress);
      localStorage.removeItem(LS_KEY);
    }

    while (progress.offset < TOTAL_SOURCES) {
      if (stopRef.current) break;

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": adminSecret },
          body: JSON.stringify({ batchSize: FULL_BATCH_SIZE, offset: progress.offset }),
        });

        if (!res.ok) {
          await res.text();
          progress = { ...progress, totalErrors: progress.totalErrors + 1 };
        } else {
          const data = (await res.json()) as RunResult;
          progress = {
            ...progress,
            offset: progress.offset + FULL_BATCH_SIZE,
            totalFound: progress.totalFound + data.eventsFound,
            totalSaved: progress.totalSaved + data.eventsSaved,
            totalErrors: progress.totalErrors + data.errors.length,
          };
        }
      } catch {
        progress = {
          ...progress,
          offset: progress.offset + FULL_BATCH_SIZE,
          totalErrors: progress.totalErrors + 1,
        };
      }

      // Cap offset at total
      if (progress.offset > TOTAL_SOURCES) progress = { ...progress, offset: TOTAL_SOURCES };

      setFullProgress(progress);
      localStorage.setItem(LS_KEY, JSON.stringify(progress));

      if (progress.offset >= TOTAL_SOURCES || stopRef.current) break;

      // Wait between batches
      setWaitingNext(true);
      await new Promise(resolve => setTimeout(resolve, BETWEEN_BATCH_DELAY_MS));
      setWaitingNext(false);
    }

    setFullRunning(false);
    if (progress.offset >= TOTAL_SOURCES) {
      setFullDone(true);
      localStorage.removeItem(LS_KEY);
    }
  }

  function stopFullScrape() {
    stopRef.current = true;
  }

  function clearProgress() {
    setFullProgress(null);
    setFullDone(false);
    localStorage.removeItem(LS_KEY);
  }

  // ── Derived display values ────────────────────────────────────────────────
  const processedSources = fullProgress?.offset ?? 0;
  const pct = Math.min(100, Math.round((processedSources / TOTAL_SOURCES) * 100));

  let eta = "";
  if (fullRunning && fullProgress && fullProgress.offset > 0) {
    const elapsed = Date.now() - fullProgress.startedAt;
    const rate = fullProgress.offset / elapsed; // sources per ms
    const remaining = TOTAL_SOURCES - fullProgress.offset;
    eta = rate > 0 ? fmtDuration(remaining / rate) : "";
  }

  const isAnyRunning = running || fullRunning;

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Zap size={16} className="text-[#4ea8de]" />
          Claude Haiku Scraper Pipeline
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={batchSize}
            onChange={e => setBatchSize(Number(e.target.value))}
            disabled={isAnyRunning}
            className="text-xs bg-[#0f2a4a] border border-blue-900/40 text-blue-300 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            {[1, 5, 10, 25, 50].map(n => (
              <option key={n} value={n}>{n} source{n !== 1 ? "s" : ""}</option>
            ))}
          </select>
          <button
            onClick={runScraper}
            disabled={isAnyRunning}
            className="flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? "Running…" : "Run Batch"}
          </button>
        </div>
      </div>

      {/* ── Full Scrape section ─────────────────────────────────────────── */}
      <div className="bg-[#0a1a30] border border-blue-900/30 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white text-sm font-semibold flex items-center gap-2">
            <ListChecks size={14} className="text-[#4ea8de]" />
            Full Scrape — All {TOTAL_SOURCES.toLocaleString()} Sources
          </p>
          <div className="flex items-center gap-2">
            {/* Resume button shown when paused progress exists */}
            {!fullRunning && fullProgress && fullProgress.offset < TOTAL_SOURCES && !fullDone && (
              <button
                onClick={() => startFullScrape(fullProgress.offset)}
                disabled={isAnyRunning}
                className="text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Resume ({fullProgress.offset.toLocaleString()} done)
              </button>
            )}
            {fullRunning ? (
              <button
                onClick={stopFullScrape}
                className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Square size={12} fill="currentColor" />
                Stop
              </button>
            ) : (
              <button
                onClick={() => startFullScrape()}
                disabled={isAnyRunning}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {fullDone
                  ? <><CheckCircle2 size={14} /> Run Again</>
                  : <><Play size={14} /> Run Full Scrape</>
                }
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {(fullRunning || (fullProgress && fullProgress.offset > 0)) && (
          <>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-blue-300 font-medium">
                {fullRunning && waitingNext
                  ? `Waiting 5s… then processing ${Math.min(processedSources + FULL_BATCH_SIZE, TOTAL_SOURCES).toLocaleString()} of ${TOTAL_SOURCES.toLocaleString()}`
                  : fullRunning
                  ? `Processing ${processedSources.toLocaleString()} of ${TOTAL_SOURCES.toLocaleString()} sources…`
                  : fullDone
                  ? `Completed — all ${TOTAL_SOURCES.toLocaleString()} sources processed`
                  : `Paused at ${processedSources.toLocaleString()} of ${TOTAL_SOURCES.toLocaleString()} sources`
                }
              </span>
              <span className="text-blue-500">{pct}%</span>
            </div>
            <div className="w-full bg-[#0f2a4a] rounded-full h-2 mb-3 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: fullDone
                    ? "linear-gradient(90deg, #22c55e, #16a34a)"
                    : "linear-gradient(90deg, #4ea8de, #3b82f6)",
                }}
              />
            </div>

            {/* Live stats */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[
                { label: "Sources Done", value: processedSources.toLocaleString(), color: "text-white" },
                { label: "Events Found", value: (fullProgress?.totalFound ?? 0).toLocaleString(), color: "text-blue-300" },
                { label: "Events Saved", value: (fullProgress?.totalSaved ?? 0).toLocaleString(), color: "text-green-400" },
                { label: "Errors", value: (fullProgress?.totalErrors ?? 0).toLocaleString(), color: fullProgress?.totalErrors ? "text-amber-400" : "text-blue-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0f2a4a] rounded-lg p-2 text-center">
                  <p className="text-blue-600 text-[10px]">{label}</p>
                  <p className={`font-bold tabular-nums text-sm ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* ETA / elapsed */}
            {fullRunning && fullProgress && (
              <div className="flex items-center gap-1.5 text-blue-600 text-xs">
                <Clock size={10} />
                <span>
                  Elapsed: {fmtDuration(Date.now() - fullProgress.startedAt)}
                  {eta && <> · ETA: {eta}</>}
                  {waitingNext && <span className="text-blue-500"> · next batch in 5s</span>}
                </span>
              </div>
            )}

            {/* Done summary */}
            {fullDone && (
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle2 size={14} className="text-green-400" />
                <p className="text-green-300 text-sm font-semibold">
                  Full scrape complete · {(fullProgress?.totalSaved ?? 0).toLocaleString()} events saved
                </p>
                <button onClick={clearProgress} className="ml-auto text-blue-600 hover:text-blue-400 text-xs">
                  Clear
                </button>
              </div>
            )}
          </>
        )}

        {!fullRunning && !fullDone && (!fullProgress || fullProgress.offset === 0) && (
          <p className="text-blue-700 text-xs">
            Processes all {TOTAL_SOURCES.toLocaleString()} sources in batches of {FULL_BATCH_SIZE}, with a 5s pause between batches.
            Progress is saved — safe to close and resume.
          </p>
        )}
      </div>

      {/* Persistent stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#0f2a4a] rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Database size={11} className="text-blue-400" />
            <p className="text-blue-400 text-xs">Total Events in DB</p>
          </div>
          <p className="text-white text-2xl font-bold tabular-nums">{totalEvents.toLocaleString()}</p>
        </div>
        <div className="bg-[#0f2a4a] rounded-lg p-3">
          <p className="text-blue-400 text-xs mb-1">Last Run</p>
          {lastRun ? (
            <>
              <p className="text-white text-sm font-semibold">
                {new Date(lastRun.run_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" "}
                <span className="text-blue-400 text-xs font-normal">
                  {new Date(lastRun.run_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
              {lastRun.duration_seconds && (
                <p className="text-blue-500 text-xs mt-0.5">{lastRun.duration_seconds}s</p>
              )}
            </>
          ) : (
            <p className="text-blue-600 text-sm">Never run</p>
          )}
        </div>
      </div>

      {/* Last run detail stats */}
      {lastRun && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Sources", value: lastRun.sources_processed, color: "text-white" },
            { label: "Found", value: lastRun.events_found, color: "text-blue-300" },
            { label: "Saved", value: lastRun.events_saved, color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0f2a4a] rounded-lg p-2 text-center">
              <p className="text-blue-500 text-xs">{label}</p>
              <p className={`font-bold tabular-nums ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Single-batch result */}
      {result && (
        <div className="flex items-start gap-2 bg-green-900/20 border border-green-700/30 rounded-lg p-3 mb-3">
          <CheckCircle2 size={15} className="text-green-400 shrink-0 mt-0.5" />
          <div className="text-sm min-w-0">
            <p className="text-green-300 font-semibold">Batch complete — {result.durationSeconds}s</p>
            <p className="text-green-400/70 text-xs mt-0.5">
              {result.processed}/{result.batchInfo.batchSize} sources · {result.eventsFound} found · {result.eventsSaved} saved
            </p>
            {result.errors.length > 0 && (
              <p className="text-amber-400 text-xs mt-1">{result.errors.length} source error(s)</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/30 rounded-lg p-3">
          <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm break-all">{error}</p>
        </div>
      )}

      {/* ReliefWeb Importer */}
      <div className="bg-[#0a1a30] border border-blue-900/30 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white text-sm font-semibold flex items-center gap-2">
            <Globe size={14} className="text-[#4ea8de]" />
            ReliefWeb Importer
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={1000}
              value={rwLimit}
              onChange={e => setRwLimit(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))}
              disabled={rwRunning}
              className="text-xs bg-[#0f2a4a] border border-blue-900/40 text-blue-300 rounded-lg px-2 py-1.5 w-24 focus:outline-none focus:border-[#4ea8de]/50"
              placeholder="Limit"
            />
            <button
              onClick={runReliefWebImport}
              disabled={rwRunning || isAnyRunning}
              className="flex items-center gap-1.5 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {rwRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {rwRunning ? "Importing…" : "Run ReliefWeb Import"}
            </button>
          </div>
        </div>

        <p className="text-blue-700 text-xs mb-3">
          Imports humanitarian training events from the OCHA ReliefWeb API. No API key, no token cost.
        </p>

        {rwResult && (
          <>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[
                { label: "Fetched", value: rwResult.fetched, color: "text-white" },
                { label: "Inserted", value: rwResult.inserted, color: "text-green-400" },
                { label: "Updated", value: rwResult.updated, color: "text-blue-300" },
                { label: "Errors", value: rwResult.errors?.length ?? 0, color: rwResult.errors?.length ? "text-amber-400" : "text-blue-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0f2a4a] rounded-lg p-2 text-center">
                  <p className="text-blue-600 text-[10px]">{label}</p>
                  <p className={`font-bold tabular-nums text-sm ${color}`}>{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#0f2a4a] rounded-lg p-2 mb-2 text-blue-400 text-xs">
              Skipped: {rwResult.skipped} · Duration: {rwResult.durationSeconds}s
            </div>
            <pre className="bg-[#0f2a4a] border border-blue-900/40 rounded-lg p-3 text-xs text-blue-200 overflow-x-auto max-h-48">
              {JSON.stringify(rwResult, null, 2)}
            </pre>
          </>
        )}

        {rwError && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/30 rounded-lg p-3">
            <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm break-all">{rwError}</p>
          </div>
        )}
      </div>

      {/* Blocked sources notice */}
      <div className="bg-[#0a1a30] border border-amber-900/30 rounded-lg p-4 mt-4">
        <p className="text-amber-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
          <AlertTriangle size={12} />
          Blocked sources — manual review required
        </p>
        <p className="text-blue-600 text-xs leading-relaxed">
          IISD iCal and IISD event pages currently return Cloudflare challenge pages to server-side
          requests. These sources are tracked as blocked/manual-review, not active automated sources.
        </p>
      </div>

      <p className="text-blue-700 text-xs mt-3">
        Powered by Claude Haiku · {TOTAL_SOURCES.toLocaleString()} active sources total
      </p>
    </div>
  );
}
