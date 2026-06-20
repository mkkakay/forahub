"use client";

// Self-serve "erase my analytics rows" button for /data-deletion.
// Calls DELETE /api/account/analytics which only erases rows owned by
// the signed-in user (server scopes the WHERE to auth.uid()). Displays
// the row count returned by the endpoint so the user has visible
// confirmation.

import { useState } from "react";
import { Loader2, Trash2, CheckCircle2, AlertCircle, ShieldOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function AnalyticsDeleteAction() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  // Show / hide based on auth state — anon visitors see nothing to delete.
  if (signedIn === null) {
    void supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }

  async function deleteRows() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/account/analytics", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setResult({ kind: "error", text: json?.error === "signin_required"
          ? "Sign in first, then try again."
          : "Something went wrong. Please try again, or email admin@forahub.org." });
        return;
      }
      setResult({ kind: "ok", text: `${json.deleted_rows ?? 0} analytics row(s) erased.` });
      setConfirming(false);
    } catch {
      setResult({ kind: "error", text: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === false) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-gray-500">
        <ShieldOff size={12} /> Sign in to see this option.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5"
        >
          <Trash2 size={13} /> Erase my analytics rows now
        </button>
      ) : (
        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-amber-700">This is irreversible — confirm?</span>
          <button
            type="button"
            onClick={deleteRows}
            disabled={busy}
            className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-xs px-3 py-1.5 rounded-lg"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Confirm erase
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
      {result && (
        <div className={`inline-flex items-start gap-1.5 text-xs rounded-md px-2.5 py-1.5 border ${
          result.kind === "ok"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {result.kind === "ok" ? <CheckCircle2 size={12} className="mt-0.5" /> : <AlertCircle size={12} className="mt-0.5" />}
          {result.text}
        </div>
      )}
    </div>
  );
}
