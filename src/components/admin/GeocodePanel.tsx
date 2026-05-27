"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapPin, ChevronDown, ChevronRight, Loader2, Play, AlertCircle, X, RefreshCw, AlertTriangle,
} from "lucide-react";

interface Status {
  locationiq_configured: boolean;
  with_coords: number;
  pending: number;
  failed: number;
  last_failed: { id: string; title: string; location: string | null; geocode_error: string | null }[];
}

interface RunSummary {
  processed: number;
  success: number;
  failed: number;
  skipped: number;
  remaining: number;
  provider_warning: string | null;
}

export default function GeocodePanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [lastRun, setLastRun] = useState<RunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/geocode-events", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setStatus(json as Status);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  async function runGeocoding() {
    setRunning(true);
    setError(null);
    setLastRun(null);
    try {
      const res = await fetch("/api/admin/geocode-events", { method: "POST", headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setLastRun({
        processed: json.processed ?? 0,
        success: json.success ?? 0,
        failed: json.failed ?? 0,
        skipped: json.skipped ?? 0,
        remaining: json.remaining ?? 0,
        provider_warning: json.provider_warning ?? null,
      });
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setRunning(false);
    }
  }

  async function retryFailed() {
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/geocode-events", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_failed" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-emerald-400" />
          <h2 className="text-white font-semibold">Geocoding</h2>
          <span className="text-xs text-blue-500">
            {status
              ? `${status.with_coords} with coords · ${status.pending} pending · ${status.failed} failed`
              : "lat/lng for the global events map"}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-4">
          {status && !status.locationiq_configured && (
            <div className="flex items-start gap-2 text-xs text-amber-200 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold">LOCATIONIQ_API_KEY not set.</span>{" "}
                Falling back to Nominatim (1 req/sec, no bulk usage policy). Sign up at{" "}
                <a className="underline" href="https://locationiq.com" target="_blank" rel="noopener noreferrer">locationiq.com</a>{" "}
                and add the key to Vercel env vars for faster batch geocoding.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="break-words flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="With coordinates" value={status?.with_coords ?? 0} tone="emerald" />
            <Stat label="Pending" value={status?.pending ?? 0} tone="blue" />
            <Stat label="Failed" value={status?.failed ?? 0} tone="red" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runGeocoding}
              disabled={running}
              className="inline-flex items-center gap-1.5 bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
            >
              {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              {running ? "Running…" : "Run geocoding (100 events)"}
            </button>
            <button
              onClick={retryFailed}
              disabled={retrying || (status?.failed ?? 0) === 0}
              className="inline-flex items-center gap-1.5 text-xs text-amber-200 hover:text-white border border-amber-700/40 hover:border-amber-400/60 disabled:opacity-40 rounded px-2 py-1.5 transition-colors"
            >
              {retrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Retry failed events
            </button>
          </div>

          {lastRun && (
            <div className="text-xs text-blue-300 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2">
              Last run · processed {lastRun.processed} · {lastRun.success} success · {lastRun.failed} failed ·{" "}
              {lastRun.skipped} skipped · {lastRun.remaining} remaining
              {lastRun.provider_warning && (
                <p className="mt-1 text-amber-300">{lastRun.provider_warning}</p>
              )}
            </div>
          )}

          {status && status.last_failed.length > 0 && (
            <div className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg overflow-hidden">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-400 border-b border-blue-900/40">
                Recent failures
              </div>
              <ul className="divide-y divide-blue-900/20">
                {status.last_failed.map(f => (
                  <li key={f.id} className="px-3 py-2 text-xs">
                    <p className="text-white truncate">{f.title}</p>
                    <p className="text-blue-400 mt-0.5 truncate">
                      <span className="text-blue-500">location:</span> {f.location || "—"}
                    </p>
                    <p className="text-red-300 mt-0.5 truncate">
                      <span className="text-red-400">error:</span> {f.geocode_error || "unknown"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "blue" | "red" }) {
  const ring =
    tone === "emerald" ? "border-emerald-700/40 text-emerald-300" :
    tone === "red" ? "border-red-700/40 text-red-300" :
    "border-blue-900/40 text-blue-200";
  return (
    <div className={`bg-[#0a1a2e] border ${ring} rounded-lg p-3`}>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[10px] uppercase tracking-wider text-blue-400 mt-0.5">{label}</p>
    </div>
  );
}
