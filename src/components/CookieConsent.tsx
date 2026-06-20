"use client";

// Sitewide consent bar. Positioning rules:
//
//   - Mobile: sits at `bottom-16` so it never covers the BottomNav (h-16,
//     z-40). The mobile AIWidget bubble pins to `bottom-20 right-4 z-40` —
//     we reserve `pr-20` on the inner container so its bubble doesn't
//     overlap the banner's text.
//   - Desktop: flush at `bottom-0` with `pr-44` reserving room for the
//     AIWidget bubble at `bottom-6 right-6`.
//   - z-45 — above content + BottomNav (z-40), below the AIWidget open
//     drawer (z-50). The bar never wins over an actively-open AI session.
//
// The bar dismisses on Accept / Decline (writing through the analytics
// consent context) and does not reappear after that — the context is the
// single source of truth and resolves to "pending" only when there is no
// stored choice AND no DNT/GPC signal.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, X } from "lucide-react";
import { useAnalyticsConsent } from "@/context/AnalyticsConsentContext";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

export default function CookieConsent() {
  const { lang } = useLanguage();
  const { consent, grant, decline } = useAnalyticsConsent();
  // Render-gated on mount to avoid SSR hydration mismatch — consent state
  // depends on localStorage which doesn't exist server-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;
  if (consent !== "pending") return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      // z-[45] keeps it above content (z-40 BottomNav) but below the
      // AIWidget open drawer (z-50). bottom-16 on mobile = above BottomNav;
      // bottom-0 on desktop = flush.
      className="fixed inset-x-0 bottom-16 md:bottom-0 z-[45]
                 border-t border-white/10 bg-[#0f2a4a]/95 backdrop-blur
                 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.45)]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4
                      pr-20 md:pr-44
                      flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <Shield size={16} className="shrink-0 mt-0.5 text-[#4ea8de]" aria-hidden="true" />
          <p className="text-[13px] leading-snug text-gray-200">
            {t(lang, "cookie.message")}{" "}
            <Link href="/privacy#analytics" className="text-[#4ea8de] hover:text-white underline-offset-2 hover:underline whitespace-nowrap">
              What we log
            </Link>
            {" · "}
            <Link href="/profile#privacy" className="text-[#4ea8de] hover:text-white underline-offset-2 hover:underline whitespace-nowrap">
              Change later in your profile
            </Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={decline}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg border border-white/20 text-gray-200 hover:text-white hover:border-white/40 transition-colors"
          >
            <X size={13} aria-hidden="true" />
            {t(lang, "cookie.decline")}
          </button>
          <button
            type="button"
            onClick={grant}
            className="flex-1 sm:flex-none inline-flex items-center justify-center text-[13px] font-semibold px-4 py-2 rounded-lg bg-[#4ea8de] text-white hover:bg-[#3a95cc] transition-colors"
          >
            {t(lang, "cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
