"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

export type GeolocationOutcome =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: "denied" | "unavailable" | "timeout" | "unsupported" };

export interface UseMyLocationButtonProps {
  onLocate: (result: GeolocationOutcome) => void;
  label?: string;
  compact?: boolean;
  className?: string;
}

const TIMEOUT_MS = 10_000;

export default function UseMyLocationButton({
  onLocate,
  label = "Use my location",
  compact = false,
  className = "",
}: UseMyLocationButtonProps) {
  const [busy, setBusy] = useState(false);

  // Hide entirely on browsers without geolocation support.
  if (typeof window !== "undefined" && !("geolocation" in navigator)) {
    return null;
  }

  function detect() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      onLocate({ ok: false, reason: "unsupported" });
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setBusy(false);
        onLocate({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      err => {
        setBusy(false);
        if (err.code === err.PERMISSION_DENIED) {
          onLocate({ ok: false, reason: "denied" });
        } else if (err.code === err.TIMEOUT) {
          onLocate({ ok: false, reason: "timeout" });
        } else {
          onLocate({ ok: false, reason: "unavailable" });
        }
      },
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 5 * 60_000 }
    );
  }

  const baseClasses = compact
    ? "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-60"
    : "inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={detect}
      disabled={busy}
      className={`${baseClasses} ${className}`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} className="text-emerald-600" />}
      {busy ? "Detecting…" : label}
    </button>
  );
}
