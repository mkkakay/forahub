"use client";

// Sitewide consent bar — slim restrained variant. Visual only; the
// underlying consent gate (DNT/GPC auto-decline, persisted choice,
// never-resurface after a decision, server-side double-check in
// /api/analytics/event) is all in AnalyticsConsentContext + the
// analytics route. Don't touch.
//
// Layout rules:
//   - Mobile: bottom-16 (sits above BottomNav h-16).
//   - Desktop: bottom-4 centered floating card (compact, light shadow).
//   - z-[45] keeps us above content + BottomNav (z-40), below the
//     AIWidget open drawer (z-50).
//   - Inner pr-20 / md:pr-28 reserves room for the AIWidget bubble
//     pinned at right-4 / md:right-6.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAnalyticsConsent } from "@/context/AnalyticsConsentContext";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

export default function CookieConsent() {
  const { lang } = useLanguage();
  const { consent, grant, decline } = useAnalyticsConsent();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;
  if (consent !== "pending") return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-16 md:bottom-4 z-[45] px-4 md:px-0 pointer-events-none"
    >
      <div
        className="pointer-events-auto mx-auto max-w-3xl bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border border-gray-200/80 rounded-xl shadow-[0_10px_30px_-12px_rgba(15,42,74,0.18)] px-4 md:px-5 py-3 md:py-3.5 pr-20 md:pr-28
                   flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <p className="text-[13px] leading-snug text-gray-700 flex-1">
          {t(lang, "cookie.message")}{" "}
          <Link href="/privacy#analytics" className="text-[#0f2a4a] hover:underline whitespace-nowrap">
            What we log
          </Link>
          <span className="text-gray-300 mx-1" aria-hidden="true">·</span>
          <Link href="/profile#privacy" className="text-[#0f2a4a] hover:underline whitespace-nowrap">
            Change later
          </Link>
        </p>
        <div className="flex gap-2 shrink-0 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={decline}
            className="flex-1 sm:flex-none text-[13px] font-medium px-3.5 py-1.5 rounded-lg text-gray-600 hover:text-[#0f2a4a] hover:bg-gray-100 transition-colors"
          >
            {t(lang, "cookie.decline")}
          </button>
          <button
            type="button"
            onClick={grant}
            className="flex-1 sm:flex-none text-[13px] font-semibold px-3.5 py-1.5 rounded-lg bg-[#0f2a4a] text-white hover:bg-[#1a3f6e] transition-colors"
          >
            {t(lang, "cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
