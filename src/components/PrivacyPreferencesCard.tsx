"use client";

// Privacy preferences card surfaced on /profile. Lets a signed-in user
// flip analytics consent on / off after the initial banner, and explains
// why the toggle is locked when the browser sends DNT or GPC. Calls the
// same grant/decline mutators the banner uses, so localStorage +
// profiles.analytics_consent + the session-scoped anonymous id all stay
// in lockstep.

import { Shield, Info, Loader2, Check, X } from "lucide-react";
import { useState } from "react";
import { useAnalyticsConsent } from "@/context/AnalyticsConsentContext";

export default function PrivacyPreferencesCard() {
  const { consent, allowed, browserOptedOut, grant, decline } = useAnalyticsConsent();
  const [busy, setBusy] = useState(false);

  async function flip(next: boolean) {
    setBusy(true);
    try {
      if (next) grant(); else decline();
    } finally {
      // grant/decline don't return a promise — keeping the spinner
      // visible briefly so the UI feels responsive on slow clients.
      window.setTimeout(() => setBusy(false), 200);
    }
  }

  return (
    <div
      id="privacy"
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5"
    >
      <h2 className="font-bold text-[#0f2a4a] dark:text-white flex items-center gap-2 mb-1">
        <Shield size={16} className="text-[#4ea8de]" /> Privacy preferences
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Event analytics help organizations see which of their events get attention. Logging is off by default; turning it on records your views, saves, and registration clicks (no IP address, no precise location, no cross-site tracking).{" "}
        <a href="/privacy#analytics" className="text-[#4ea8de] hover:underline">What we log</a>.
      </p>

      {browserOptedOut ? (
        <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2.5">
          <Info size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <span>
            Your browser is sending a Do-Not-Track or Global Privacy Control signal, so analytics is automatically off and the toggle is locked. To opt in, disable that browser setting.
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#0f2a4a] dark:text-white">
              Analytics logging is {allowed ? "on" : "off"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {consent === "pending"
                ? "You haven't made a choice yet."
                : allowed
                  ? "You can turn it off at any time. Existing logs will be deleted on request — see Data deletion."
                  : "No views, saves, or clicks are being logged from your account."}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => flip(false)}
              disabled={busy || !allowed}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                allowed
                  ? "text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                  : "text-gray-300 dark:text-gray-600 border-gray-200 dark:border-slate-700 cursor-not-allowed"
              }`}
            >
              {busy && !allowed ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Turn off
            </button>
            <button
              type="button"
              onClick={() => flip(true)}
              disabled={busy || allowed}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                allowed
                  ? "text-gray-300 dark:text-gray-600 border border-gray-200 dark:border-slate-700 cursor-not-allowed"
                  : "bg-[#4ea8de] hover:bg-[#3a95cc] text-white"
              }`}
            >
              {busy && allowed ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Turn on
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-600 dark:text-gray-500 mt-3">
        To erase any logs already recorded under your account, see <a href="/data-deletion#analytics" className="underline">Data deletion → Analytics logs</a>.
      </p>
    </div>
  );
}
