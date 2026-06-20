"use client";

// Sitewide consent banner. Mounts at the bottom of every page via the
// root layout. Three states:
//
//   - "pending"        → banner visible, decline + accept buttons.
//   - "granted" / "declined" → banner hidden (user can revisit at /profile).
//   - "auto_declined"  → DNT or GPC sent by the browser. Banner stays
//                        hidden by design — respecting the signal is the
//                        whole point — and a small note in the privacy
//                        preferences UI explains why the toggle is locked.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAnalyticsConsent } from "@/context/AnalyticsConsentContext";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

export default function CookieConsent() {
  const { lang } = useLanguage();
  const { consent, grant, decline } = useAnalyticsConsent();
  // Render-gated on mount to avoid SSR hydration mismatch — the consent
  // state depends on localStorage which doesn't exist server-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;
  if (consent !== "pending") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto bg-[#0f2a4a] border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-300 flex-1">
          {t(lang, "cookie.message")}{" "}
          <Link href="/privacy#analytics" className="text-[#4ea8de] hover:underline">
            What we log
          </Link>
          {" · "}
          <Link href="/profile#privacy" className="text-[#4ea8de] hover:underline">
            Change later in your profile
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="text-sm px-4 py-2 rounded-lg border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-colors"
          >
            {t(lang, "cookie.decline")}
          </button>
          <button
            onClick={grant}
            className="text-sm px-4 py-2 rounded-lg bg-[#4ea8de] text-white font-semibold hover:bg-[#3a95cc] transition-colors"
          >
            {t(lang, "cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
