"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

// Only allow same-origin redirect targets (path beginning with "/" and not
// "//"). Prevents an open-redirect via ?next=https://attacker.example.
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function SocialButton({
  provider,
  label,
  icon,
  scopes,
  next,
}: {
  provider: "google" | "apple" | "azure" | "facebook";
  label: string;
  icon: React.ReactNode;
  scopes?: string;
  next: string | null;
}) {
  const [loading, setLoading] = useState(false);
  async function handleOAuth() {
    setLoading(true);
    const callback = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callback,
        ...(scopes ? { scopes } : {}),
      },
    });
  }
  return (
    <button onClick={handleOAuth} disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-60 transition-colors">
      {icon}
      {loading ? "Redirecting…" : label}
    </button>
  );
}

export default function SignInPage() {
  // useSearchParams() must sit under a Suspense boundary for static
  // prerendering (Next 14 app router). The page is "use client" but Next
  // still tries to evaluate it during build; the boundary keeps that path
  // happy.
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
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-1">{t(lang, "auth.signin")}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Don&apos;t have an account?{" "}
            <Link href={signupHref} className="text-[#4ea8de] hover:underline font-medium">Sign up</Link>
          </p>
          <div className="space-y-3 mb-5">
            <SocialButton provider="google" next={next} label={t(lang, "auth.google")}
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
            />
            <SocialButton provider="azure" next={next} label="Continue with Microsoft" scopes="email"
              icon={<svg className="w-5 h-5" viewBox="0 0 23 23"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M12 1h10v10H12z"/><path fill="#00A4EF" d="M1 12h10v10H1z"/><path fill="#FFB900" d="M12 12h10v10H12z"/></svg>}
            />
            <SocialButton provider="facebook" next={next} label="Continue with Facebook"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
            />
          </div>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">{t(lang, "auth.or")}</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t(lang, "auth.email")}</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
                placeholder="you@example.com" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t(lang, "auth.password")}</label>
                <Link href="/auth/forgot-password" className="text-xs text-[#4ea8de] hover:underline">{t(lang, "auth.forgotpassword")}</Link>
              </div>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
                placeholder="••••••••" />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1">
              {loading ? "Signing in…" : t(lang, "auth.signin")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
