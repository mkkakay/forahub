"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If session is immediately available, email confirmation is disabled
    if (data.session) {
      router.push("/");
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
            <div className="text-4xl mb-4">📬</div>
            <h1 className="text-2xl font-bold text-[#0f2a4a] mb-2">Check your email</h1>
            <p className="text-gray-500 text-sm">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
              account, then{" "}
              <Link href="/auth/login" className="text-[#4ea8de] hover:underline font-medium">
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
            <Link href="/auth/login" className="text-[#4ea8de] hover:underline font-medium">
              Sign in
            </Link>
          </p>

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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
