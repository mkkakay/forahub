"use client";

// "Delete my account" action — embedded in the Profile page's Danger
// Zone. Two-step: button → modal with a typed "DELETE" confirmation
// input. The API also requires the literal string "DELETE" so even a
// stray accidental POST can't trigger it.
//
// Sole-manager guard: if the API returns 409 with an `orgs` payload,
// we surface the list with deep links into each org's manage page so
// the user can add another manager (or transfer ownership) first.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface OrphanOrg {
  slug: string;
  name: string;
}

type Result =
  | { kind: "idle" }
  | { kind: "error"; text: string }
  | { kind: "sole_manager"; orgs: OrphanOrg[] };

export default function DeleteAccountAction() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>({ kind: "idle" });

  function reset() {
    setConfirm("");
    setResult({ kind: "idle" });
  }

  function close() {
    if (busy) return;
    setOpen(false);
    reset();
  }

  async function performDelete() {
    if (confirm !== "DELETE") return;
    setBusy(true);
    setResult({ kind: "idle" });
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json?.error === "sole_manager") {
        setResult({ kind: "sole_manager", orgs: Array.isArray(json.orgs) ? json.orgs : [] });
        return;
      }
      if (!res.ok) {
        setResult({
          kind: "error",
          text:
            json?.error === "invalid_confirmation"
              ? "Please type DELETE exactly to confirm."
              : "Something went wrong. Please try again, or email admin@forahub.org.",
        });
        return;
      }
      // Sign out client-side and head to the goodbye page. We don't
      // refresh first because the server session cookie is now bound
      // to a deleted user — Supabase will clear it on the next read,
      // and the goodbye page is public anyway.
      await supabase.auth.signOut();
      router.replace("/goodbye");
    } catch {
      setResult({
        kind: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="danger" className="scroll-mt-24">
      <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-900/10 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-300" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-[#0f2a4a] dark:text-slate-100">
              Delete my account
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
              This permanently removes your profile, saved events, alerts,
              notifications, and analytics rows. Events you submitted stay on
              ForaHub but are no longer attributed to you. This action is
              <span className="font-semibold"> irreversible</span>.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Delete my account
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 id="delete-account-title" className="text-lg font-bold text-[#0f2a4a] dark:text-slate-100">
                Delete account — are you sure?
              </h3>
              <button
                type="button"
                onClick={close}
                aria-label="Close dialog"
                className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 disabled:opacity-60"
                disabled={busy}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {result.kind === "sole_manager" ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">
                  You&apos;re the <span className="font-semibold">only manager</span> of
                  {result.orgs.length === 1 ? " this organization" : " these organizations"}.
                  Deleting your account would leave
                  {result.orgs.length === 1 ? " it" : " them"} without anyone able
                  to manage events or update the profile. Add another manager (or
                  ask an admin to transfer the seat) first, then come back here.
                </p>
                <ul className="border border-gray-200 dark:border-slate-700 rounded-xl divide-y divide-gray-100 dark:divide-slate-700">
                  {result.orgs.map((o) => (
                    <li key={o.slug} className="px-3 py-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[#0f2a4a] dark:text-slate-100 truncate">
                        {o.name}
                      </span>
                      <Link
                        href={`/orgs/${encodeURIComponent(o.slug)}/manage?tab=team`}
                        className="shrink-0 text-xs font-semibold text-[#0f2a4a] dark:text-slate-100 border border-gray-200 dark:border-slate-700 hover:border-[#4ea8de] hover:text-[#3a95cc] rounded-md px-2.5 py-1"
                      >
                        Manage team →
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white"
                  >
                    Got it
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">
                  This will permanently delete your account and all personal data
                  we hold. Events you submitted stay public but are no longer
                  linked to you.
                </p>
                <p className="text-sm text-gray-700 dark:text-slate-200 mt-2 mb-3">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm.
                </p>
                <label htmlFor="delete-confirm" className="sr-only">Type DELETE to confirm account deletion</label>
                <input
                  id="delete-confirm"
                  type="text"
                  autoComplete="off"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
                {result.kind === "error" && (
                  <p className="mt-3 text-xs text-red-700 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
                    {result.text}
                  </p>
                )}
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="text-sm font-medium px-3 py-2 rounded-lg text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={performDelete}
                    disabled={busy || confirm !== "DELETE"}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900/40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                    {busy ? "Deleting…" : "Delete my account"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
