"use client";

// Sign-in page. Same OAuth-primary layout as /auth/signup so the patterns
// stay consistent across the auth surface. Microsoft 365 and Google sit
// above the email/password fold; email/password is reachable via the
// collapsible "Or sign in with email" section.

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import OAuthButtons from "@/components/auth/OAuthButtons";

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#0f172a]" />}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const { lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const signupHref = next ? `/auth/signup?next=${encodeURIComponent(next)}` : "/auth/signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push(next ?? "/"); router.refresh(); }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex flex-col">
      <nav className="bg-[#0f2a4a] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/" className="text-white text-xl font-bold tracking-tight">Fora<span className="text-[#4ea8de]">Hub</span></Link>
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-1">{t(lang, "auth.signin")}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
            Don&apos;t have an account?{" "}
            <Link href={signupHref} className="text-[#4ea8de] hover:underline font-medium">Sign up</Link>
          </p>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 mb-5">
            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-emerald-700 dark:text-emerald-300 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-900 dark:text-emerald-100">
                <span className="font-semibold">Fastest path:</span> sign in with your work Google or Microsoft account.
              </p>
            </div>
          </div>

          <OAuthButtons next={next} />

          <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-5">
            <button
              type="button"
              onClick={() => setShowEmail(v => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 uppercase tracking-wider"
            >
              <span>Or sign in with email</span>
              {showEmail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showEmail && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t(lang, "auth.email")}</label>
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
                    placeholder="you@example.com" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-xs font-medium text-gray-600 dark:text-gray-300">{t(lang, "auth.password")}</label>
                    <Link href="/auth/forgot-password" className="text-xs text-[#4ea8de] hover:underline">{t(lang, "auth.forgotpassword")}</Link>
                  </div>
                  <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
                    placeholder="••••••••" />
                </div>
                {error && <p className="text-red-600 text-xs bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-3 py-2 rounded-md">{error}</p>}
                <button type="submit" disabled={loading}
                  className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1">
                  {loading ? "Signing in…" : t(lang, "auth.signin")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
