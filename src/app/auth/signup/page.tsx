"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// Only same-origin path redirects survive validation; everything else is
// dropped so ?next=https://attacker.example can't ride the auth flow.
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function SignupPage() {
  // Suspense wraps useSearchParams so the page survives static prerendering.
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const signinHref = next ? `/auth/signin?next=${encodeURIComponent(next)}` : "/auth/signin";

  const [oauthLoading, setOauthLoading] = useState<"google" | "azure" | "facebook" | null>(null);

  function oauthRedirectTo(): string {
    return next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;
  }

  async function handleGoogleOAuth() {
    setOauthLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: oauthRedirectTo() },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  }

  async function handleMicrosoftOAuth() {
    setOauthLoading("azure");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "email",
        redirectTo: oauthRedirectTo(),
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  }

  async function handleFacebookOAuth() {
    setOauthLoading("facebook");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: oauthRedirectTo() },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // If the user arrived from /claim?org=…, ask Supabase to bounce the
    // confirmation link straight back to /claim so they land on the
    // claim-now button instead of the home page.
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

    // If session is immediately available, email confirmation is disabled
    if (data.session) {
      // Send welcome email (best-effort, don't block)
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
      <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-md text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f2a4a] mb-2">Check your email</h1>
            <p className="text-gray-500 text-sm">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
              account, then{" "}
              <Link href="/auth/signin" className="text-[#4ea8de] hover:underline font-medium">
                sign in
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-[#0f2a4a] mb-1">Create an account</h1>
          <p className="text-gray-500 text-sm mb-6">
            Already have an account?{" "}
            <Link href={signinHref} className="text-[#4ea8de] hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <div className="flex flex-col gap-3 mb-5">
            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {oauthLoading === "google" ? "Redirecting…" : "Continue with Google"}
            </button>
            <button
              type="button"
              onClick={handleMicrosoftOAuth}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23">
                <path fill="#F25022" d="M1 1h10v10H1z" />
                <path fill="#7FBA00" d="M12 1h10v10H12z" />
                <path fill="#00A4EF" d="M1 12h10v10H1z" />
                <path fill="#FFB900" d="M12 12h10v10H12z" />
              </svg>
              {oauthLoading === "azure" ? "Redirecting…" : "Continue with Microsoft"}
            </button>
            <button
              type="button"
              onClick={handleFacebookOAuth}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {oauthLoading === "facebook" ? "Redirecting…" : "Continue with Facebook"}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4ea8de] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4ea8de] focus:border-transparent"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-60 text-white font-semibold py-2.5 rounded-md text-sm transition-colors mt-1"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
