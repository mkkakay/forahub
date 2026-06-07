"use client";

import { useState } from "react";
import { Loader2, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { parseApiResponse } from "@/lib/admin/fetchJson";

interface Props {
  orgSlug: string;
  prefillEmail: string;
}

interface ApiResponse {
  email_sent?: boolean;
  error?: string;
  message?: string;
}

export default function ResendForm({ orgSlug, prefillEmail }: Props) {
  const [email, setEmail] = useState(prefillEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orgs/request-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_slug: orgSlug, email: email.trim() }),
      });
      const parsed = await parseApiResponse<ApiResponse>(res);
      if (!parsed.ok) {
        setError(parsed.error || "Could not send a new link. Please try again.");
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 text-left bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <CheckCircle2 size={16} className="mt-0.5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">A new verification email is on its way.</p>
          <p className="text-xs text-emerald-800 mt-0.5">Check your inbox (and spam folder). The new link is valid for 1 hour.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 text-left">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
        Your work email
      </label>
      <div className="relative">
        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@yourorg.org"
          required
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de]"
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        {submitting ? "Sending…" : "Send a new verification email"}
      </button>
    </form>
  );
}
