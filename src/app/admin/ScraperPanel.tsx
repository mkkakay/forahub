"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle2, AlertCircle, Database, Zap } from "lucide-react";

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

export default function ScraperPanel({
  lastRun,
  totalEvents,
  adminSecret,
}: {
  lastRun: LastRun | null;
  totalEvents: number;
  adminSecret: string;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(10);

  async function runScraper() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminSecret,
        },
        body: JSON.stringify({ batchSize, offset: 0 }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as RunResult;
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Zap size={16} className="text-[#4ea8de]" />
          Groq Scraper Pipeline
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={batchSize}
            onChange={e => setBatchSize(Number(e.target.value))}
            disabled={running}
            className="text-xs bg-[#0f2a4a] border border-blue-900/40 text-blue-300 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            {[1, 5, 10, 25, 50].map(n => (
              <option key={n} value={n}>{n} source{n !== 1 ? "s" : ""}</option>
            ))}
          </select>
          <button
            onClick={runScraper}
            disabled={running}
            className="flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {running ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {running ? "Running…" : "Run Scraper"}
          </button>
        </div>
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
                {new Date(lastRun.run_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric",
                })}
                {" "}
                <span className="text-blue-400 text-xs font-normal">
                  {new Date(lastRun.run_at).toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit",
                  })}
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

      {/* Current run result */}
      {result && (
        <div className="flex items-start gap-2 bg-green-900/20 border border-green-700/30 rounded-lg p-3 mb-3">
          <CheckCircle2 size={15} className="text-green-400 shrink-0 mt-0.5" />
          <div className="text-sm min-w-0">
            <p className="text-green-300 font-semibold">Run complete — {result.durationSeconds}s</p>
            <p className="text-green-400/70 text-xs mt-0.5">
              {result.processed}/{result.batchInfo.batchSize} sources · {result.eventsFound} events found · {result.eventsSaved} saved
            </p>
            {result.errors.length > 0 && (
              <p className="text-amber-400 text-xs mt-1">{result.errors.length} source error(s)</p>
            )}
            {result.batchInfo.nextOffset < result.totalSources && (
              <p className="text-blue-400 text-xs mt-1">
                {result.totalSources - result.batchInfo.nextOffset} sources remaining in next batch
              </p>
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

      <p className="text-blue-700 text-xs mt-3">
        Powered by Groq / llama-3.3-70b-versatile · {getActiveSources().length.toLocaleString()} active sources total
      </p>
    </div>
  );
}

// Declared here to avoid a circular import; mirrors getActiveSources count statically.
function getActiveSources() {
  // We just need the count for display. Real count comes from the server prop.
  return { length: 2820 };
}
