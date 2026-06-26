// Landing page shown immediately after a successful self-serve account
// deletion. Public (no auth — the account is gone), no PII rendered.

import Link from "next/link";
import { Metadata } from "next";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Account deleted — ForaHub",
  robots: { index: false, follow: false },
};

export default function GoodbyePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <nav className="bg-[#0f2a4a] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/" className="text-white text-xl font-bold tracking-tight">
            Fora<span className="text-[#4ea8de]">Hub</span>
          </Link>
        </div>
      </nav>
      <main id="main-content" className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-8 w-full max-w-md text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <Check className="w-7 h-7 text-emerald-700" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2a4a] dark:text-slate-100 mb-2">
            Your account has been deleted
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
            We&apos;ve removed your profile, saved events, alerts, notifications, and
            analytics rows. You should also receive a confirmation email within a
            few minutes.
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed mt-3">
            Thank you for being part of ForaHub. You&apos;re always welcome to sign
            up again if you change your mind.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Back to ForaHub
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center text-sm font-semibold text-[#0f2a4a] dark:text-slate-100 border border-gray-200 dark:border-slate-700 hover:border-[#4ea8de] hover:text-[#3a95cc] px-5 py-2.5 rounded-xl transition-colors"
            >
              Create a new account
            </Link>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-6">
            Didn&apos;t request this?{" "}
            <a href="mailto:admin@forahub.org" className="text-[#4ea8de] hover:underline">
              admin@forahub.org
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
