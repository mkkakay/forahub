"use client";

// Account-first signup. OAuth providers (Microsoft 365 + Google) are the
// primary path because they set `email_confirmed_at` instantly via the
// provider handshake — corporate inboxes (WHO, World Bank, etc.) that
// greylist Supabase's shared sender never have to wait on a confirmation
// email. Email/password is still here as a secondary path.

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import OAuthButtons from "@/components/auth/OAuthButtons";

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900" />}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const signinHref = next ? `/auth/signin?next=${encodeURIComponent(next)}` : "/auth/signin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Pass `next` through Supabase's confirmation link too — if the user
    // ends up on the email path, the link in their inbox should still
    // round-trip back to wherever they started (e.g. /claim?org=…).
    const emailRedirectTo = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      fetch("/api/send-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});
      router.push(next ?? "/onboarding");
      router.refresh();
    } else {
      setConfirmed(true);
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 font-sans flex flex-col">
        <nav className="bg-[#0f2a4a] shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link href="/" className="text-white text-xl font-bold tracking-tight">
                Fora<span className="text-[#4ea8de]">Hub</span>
              </Link>
            </div>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-8 w-full max-w-md text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f2a4a] dark:text-slate-100 mb-2">Check your email</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
              account, then{" "}
              <Link href={signinHref} className="text-[#4ea8de] hover:underline font-medium">
                sign in
              </Link>
              .
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">
              Corporate inboxes can take a few minutes. Tip: signing up with Microsoft 365 or Google skips this step entirely.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 font-sans flex flex-col">
      <nav className="bg-[#0f2a4a] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="text-white text-xl font-bold tracking-tight">
              Fora<span className="text-[#4ea8de]">Hub</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-[#0f2a4a] dark:text-slate-100 mb-1">Create an account</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-5">
            Already have an account?{" "}
            <Link href={signinHref} className="text-[#4ea8de] hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5">
            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-900">
                <span className="font-semibold">Fastest path:</span> sign in with your work Google or Microsoft account, no email confirmation needed.
              </p>
            </div>
          </div>

          <OAuthButtons next={next} />

          <div className="mt-6 border-t border-gray-100 dark:border-slate-800 pt-5">
            <button
              type="button"
              onClick={() => setShowEmail(v => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 uppercase tracking-wider"
            >
              <span>Or sign up with email</span>
              {showEmail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showEmail && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4ea8de] focus:border-transparent"
                    placeholder="you@yourorg.org"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4ea8de] focus:border-transparent"
                    placeholder="At least 6 characters"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-md">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1"
                >
                  {loading ? "Creating account…" : "Create Account"}
                </button>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 text-center">
                  We&apos;ll send one confirmation email. Corporate inboxes may take a few minutes to deliver it.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
