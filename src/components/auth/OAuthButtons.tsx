"use client";

// Shared OAuth-first sign-in buttons used by /auth/signup, /auth/signin,
// and /claim's pre-signin panel. Microsoft is listed first because the
// majority of corporate users (WHO, World Bank, UN agencies, etc.) run
// Microsoft 365; Google is the second-most-common work identity. Facebook
// is kept for parity with the existing signup page but rendered smaller.
//
// All providers route through /auth/callback with the same `next` param so
// the user lands back on the originating page (e.g. /claim?org=…) once
// the session cookie is set.

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Props {
  next: string | null;
  /** When true (default), users see the "Continue with Microsoft 365 /
   *  Google" copy and large primary buttons. The signup/signin pages set
   *  this; smaller call sites can render the same icons but with their
   *  own surrounding chrome. */
  large?: boolean;
}

type Provider = "azure" | "google" | "facebook";

export default function OAuthButtons({ next, large = true }: Props) {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  function callbackUrl(): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return next
      ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${origin}/auth/callback`;
  }

  async function go(provider: Provider, scopes?: string) {
    setLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl(),
        ...(scopes ? { scopes } : {}),
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  const big = "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm";
  const microsoftBtn = `${big} bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 disabled:opacity-60`;
  const googleBtn = `${big} bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-800 dark:text-slate-100 border border-gray-300 dark:border-slate-600 disabled:opacity-60`;
  const facebookBtn = "w-full flex items-center justify-center gap-2.5 px-4 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-900 border border-gray-200 dark:border-slate-700 transition-colors";

  return (
    <div className={large ? "space-y-3" : "space-y-2"}>
      <button
        type="button"
        onClick={() => go("azure", "email")}
        disabled={loading !== null}
        className={microsoftBtn}
        aria-label="Continue with Microsoft 365"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" aria-hidden="true">
          <path fill="#F25022" d="M1 1h10v10H1z" />
          <path fill="#7FBA00" d="M12 1h10v10H12z" />
          <path fill="#00A4EF" d="M1 12h10v10H1z" />
          <path fill="#FFB900" d="M12 12h10v10H12z" />
        </svg>
        {loading === "azure" ? "Redirecting…" : "Continue with Microsoft 365"}
      </button>

      <button
        type="button"
        onClick={() => go("google")}
        disabled={loading !== null}
        className={googleBtn}
        aria-label="Continue with Google"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {loading === "google" ? "Redirecting…" : "Continue with Google"}
      </button>

      <button
        type="button"
        onClick={() => go("facebook")}
        disabled={loading !== null}
        className={facebookBtn}
        aria-label="Continue with Facebook"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        {loading === "facebook" ? "Redirecting…" : "Continue with Facebook"}
      </button>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
